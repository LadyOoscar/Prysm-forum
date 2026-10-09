/**
 * Writes the actual recording duration into a WebM Segment/Info element.
 * MediaRecorder commonly emits WebM with no Duration element, which makes
 * browsers estimate or misreport the timeline used by audio controls.
 */
function readVint(bytes: Uint8Array, offset: number, isSize = false) {
  if (offset >= bytes.length) return null;
  const first = bytes[offset];
  let mask = 0x80;
  let length = 1;
  while (length <= 8 && (first & mask) === 0) {
    mask >>= 1;
    length++;
  }
  if (length > 8 || offset + length > bytes.length) return null;
  let value = isSize ? first & (mask - 1) : first;
  for (let i = 1; i < length; i++) value = value * 256 + bytes[offset + i];
  const unknown = isSize && value === Math.pow(2, 7 * length) - 1;
  return { length, value, unknown };
}

function elementAt(bytes: Uint8Array, offset: number) {
  const id = readVint(bytes, offset);
  if (!id) return null;
  const size = readVint(bytes, offset + id.length, true);
  if (!size) return null;
  const dataStart = offset + id.length + size.length;
  const dataEnd = size.unknown ? bytes.length : dataStart + size.value;
  if (dataStart > bytes.length || dataEnd > bytes.length || dataEnd < dataStart) return null;
  return { id: id.value, idLength: id.length, sizeLength: size.length, dataStart, dataEnd, size };
}

function encodeSize(value: number) {
  for (let length = 1; length <= 8; length++) {
    if (value < Math.pow(2, 7 * length) - 1) {
      let remaining = value;
      const result = new Uint8Array(length);
      for (let i = length - 1; i >= 0; i--) {
        result[i] = remaining & 0xff;
        remaining = Math.floor(remaining / 256);
      }
      result[0] |= 1 << (8 - length);
      return result;
    }
  }
  throw new Error("WebM element is too large");
}

function concat(parts: Uint8Array[]) {
  const output = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function encodeElement(id: number, payload: Uint8Array) {
  const idBytes = id > 0xffffff
    ? new Uint8Array([(id >>> 24) & 0xff, (id >>> 16) & 0xff, (id >>> 8) & 0xff, id & 0xff])
    : id > 0xffff
      ? new Uint8Array([(id >>> 16) & 0xff, (id >>> 8) & 0xff, id & 0xff])
      : new Uint8Array([(id >>> 8) & 0xff, id & 0xff]);
  return concat([idBytes, encodeSize(payload.length), payload]);
}

function uintValue(bytes: Uint8Array, start: number, end: number) {
  let value = 0;
  for (let i = start; i < end; i++) value = value * 256 + bytes[i];
  return value;
}

export async function fixWebmDuration(blob: Blob, durationMs: number): Promise<Blob> {
  if (!blob.type.toLowerCase().includes("webm") || !Number.isFinite(durationMs) || durationMs <= 0) return blob;
  try {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let segment = null;
    for (let offset = 0; offset < bytes.length;) {
      const element = elementAt(bytes, offset);
      if (!element) break;
      if (element.id === 0x18538067) { segment = element; break; }
      if (element.dataEnd <= offset) break;
      offset = element.dataEnd;
    }
    if (!segment) return blob;

    let info = null;
    for (let offset = segment.dataStart; offset < segment.dataEnd;) {
      const element = elementAt(bytes, offset);
      if (!element || element.dataEnd <= offset) break;
      if (element.id === 0x1549a966) { info = element; break; }
      offset = element.dataEnd;
    }
    if (!info) return blob;

    let timecodeScale = 1_000_000;
    let durationElement = null;
    for (let offset = info.dataStart; offset < info.dataEnd;) {
      const element = elementAt(bytes, offset);
      if (!element || element.dataEnd <= offset) break;
      if (element.id === 0x2ad7b1) timecodeScale = uintValue(bytes, element.dataStart, element.dataEnd) || timecodeScale;
      if (element.id === 0x4489) durationElement = element;
      offset = element.dataEnd;
    }

    // WebM Duration is a float measured in TimecodeScale units.
    const durationUnits = (durationMs * 1_000_000) / timecodeScale;
    const floatBytes = new Uint8Array(8);
    new DataView(floatBytes.buffer).setFloat64(0, durationUnits, false);

    const infoParts: Uint8Array[] = [];
    let cursor = info.dataStart;
    if (durationElement) {
      infoParts.push(bytes.slice(info.dataStart, durationElement.dataStart));
      infoParts.push(encodeElement(0x4489, floatBytes));
      infoParts.push(bytes.slice(durationElement.dataEnd, info.dataEnd));
    } else {
      infoParts.push(bytes.slice(info.dataStart, info.dataEnd));
      infoParts.push(encodeElement(0x4489, floatBytes));
    }
    const newInfo = encodeElement(0x1549a966, concat(infoParts));
    const segmentPayload = concat([
      bytes.slice(segment.dataStart, info.dataStart),
      newInfo,
      bytes.slice(info.dataEnd, segment.dataEnd),
    ]);

    const segmentId = bytes.slice(segment.dataStart - segment.sizeLength - segment.idLength, segment.dataStart - segment.sizeLength);
    const segmentSizeBytes = segment.size.unknown
      ? bytes.slice(segment.dataStart - segment.sizeLength, segment.dataStart)
      : encodeSize(segmentPayload.length);
    const segmentHeader = concat([segmentId, segmentSizeBytes]);
    const rebuilt = concat([
      bytes.slice(0, segment.dataStart - segment.sizeLength - segment.idLength),
      segmentHeader,
      segmentPayload,
    ]);
    return new Blob([rebuilt], { type: blob.type || "audio/webm" });
  } catch {
    // A malformed or unsupported WebM must still remain playable.
    return blob;
  }
}
