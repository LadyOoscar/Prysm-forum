-- Keep only the community flags selected for PRYSM.
-- Preserve existing transfeminine/transmasculine selections under the new MTF/FTM labels.
UPDATE public.profiles AS p
SET community_flags = COALESCE((
  SELECT array_agg(clean.flag ORDER BY clean.first_position)
  FROM (
    SELECT mapped.flag, MIN(mapped.position) AS first_position
    FROM (
      SELECT
        CASE old.flag
          WHEN 'transfeminine' THEN 'trans-mtf'
          WHEN 'transmasculine' THEN 'trans-ftm'
          ELSE old.flag
        END AS flag,
        old.position
      FROM unnest(COALESCE(p.community_flags, ARRAY[]::text[])) WITH ORDINALITY AS old(flag, position)
    ) AS mapped
    WHERE mapped.flag = ANY (ARRAY[
      'ally','gay','lesbian','trans-mtf','trans-ftm','bisexual','agender',
      'nonbinary','drag','bear','twink','pansexual','intersex','aromantic','sapio'
    ]::text[])
    GROUP BY mapped.flag
  ) AS clean
), ARRAY[]::text[])
WHERE p.community_flags IS DISTINCT FROM COALESCE((
  SELECT array_agg(clean.flag ORDER BY clean.first_position)
  FROM (
    SELECT mapped.flag, MIN(mapped.position) AS first_position
    FROM (
      SELECT CASE old.flag
        WHEN 'transfeminine' THEN 'trans-mtf'
        WHEN 'transmasculine' THEN 'trans-ftm'
        ELSE old.flag
      END AS flag, old.position
      FROM unnest(COALESCE(p.community_flags, ARRAY[]::text[])) WITH ORDINALITY AS old(flag, position)
    ) AS mapped
    WHERE mapped.flag = ANY (ARRAY[
      'ally','gay','lesbian','trans-mtf','trans-ftm','bisexual','agender',
      'nonbinary','drag','bear','twink','pansexual','intersex','aromantic','sapio'
    ]::text[])
    GROUP BY mapped.flag
  ) AS clean
), ARRAY[]::text[]);
