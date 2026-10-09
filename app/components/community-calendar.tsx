"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowser } from "../../lib/supabase-browser";

type CommunityEvent = {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  starts_at: string;
  event_type: "online" | "in_person";
  location_label: string;
  capacity: number | null;
  status: "scheduled" | "cancelled";
};
type Participant = { event_id: string; user_id: string };\ntype EventCount = { event_id: string; participant_count: number };

const monthNames = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const weekdays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function formatDate(value: string) {
  return new Date(value).toLocaleString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function CommunityCalendar() {
  const supabase = useMemo(() => createSupabaseBrowser(), []);
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);\n  const [eventCounts, setEventCounts] = useState<EventCount[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [eventType, setEventType] = useState<"online" | "in_person">("online");
  const [locationLabel, setLocationLabel] = useState("");
  const [capacity, setCapacity] = useState("");

  const loadEvents = useCallback(async () => {
    setLoading(true);
    const [{ data: authData }, { data: eventRows, error: eventError }, { data: participantRows }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from("community_events").select("id,creator_id,title,description,starts_at,event_type,location_label,capacity,status").eq("status", "scheduled").gte("starts_at", new Date().toISOString()).order("starts_at", { ascending: true }).limit(100),
      supabase.from("community_event_participants").select("event_id,user_id"),
    ]);
    setUserId(authData.user?.id ?? null);
    if (eventError) setError("Le calendrier est momentanément indisponible.");
    else setError("");
    setEvents((eventRows ?? []) as CommunityEvent[]);
    setParticipants((participantRows ?? []) as Participant[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { void loadEvents(); }, [loadEvents]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CommunityEvent[]>();
    for (const event of events) {
      const key = dateKey(new Date(event.starts_at));
      map.set(key, [...(map.get(key) ?? []), event]);
    }
    return map;
  }, [events]);

  const days = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7;
    const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return [...Array(offset).fill(null), ...Array.from({ length: count }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1))];
  }, [month]);

  const visibleEvents = useMemo(() => {
    if (selectedDay) return eventsByDay.get(selectedDay) ?? [];
    return events.filter((event) => {
      const d = new Date(event.starts_at);
      return d.getFullYear() === month.getFullYear() && d.getMonth() === month.getMonth();
    });
  }, [events, eventsByDay, month, selectedDay]);

  async function createEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId) { setError("Connecte-toi pour proposer un rendez-vous."); return; }
    const date = new Date(startsAt);
    if (!startsAt || Number.isNaN(date.getTime()) || date <= new Date()) {
      setError("Choisis une date future pour ce rendez-vous."); return;
    }
    setSaving(true); setError("");
    const { error: insertError } = await supabase.from("community_events").insert({
      creator_id: userId, title: title.trim(), description: description.trim(), starts_at: date.toISOString(),
      event_type: eventType, location_label: eventType === "in_person" ? locationLabel.trim() : "",
      capacity: capacity ? Number(capacity) : null, status: "scheduled",
    });
    setSaving(false);
    if (insertError) { setError("Impossible de créer le rendez-vous. Vérifie les champs et réessaie."); return; }
    setTitle(""); setDescription(""); setStartsAt(""); setLocationLabel(""); setCapacity("");
    setShowCreate(false); setSelectedDay(null); await loadEvents();
  }

  async function toggleParticipation(event: CommunityEvent) {
    if (!userId) { setError("Connecte-toi pour t’inscrire à un rendez-vous."); return; }
    setError("");
    const joined = participants.some((p) => p.event_id === event.id && p.user_id === userId);
    if (joined) {
      const { error: leaveError } = await supabase.from("community_event_participants").delete().eq("event_id", event.id).eq("user_id", userId);
      if (leaveError) setError("Impossible de retirer ton inscription.");
    } else {
      const count = eventCounts.find((item) => item.event_id === event.id)?.participant_count ?? 0;
      if (event.capacity && count >= event.capacity) { setError("Ce rendez-vous est complet."); return; }
      const { error: joinError } = await supabase.from("community_event_participants").insert({ event_id: event.id, user_id: userId });
      if (joinError) setError("Impossible de t’inscrire. Le rendez-vous est peut-être complet.");
    }
    await loadEvents();
  }

  async function cancelEvent(event: CommunityEvent) {
    if (!userId || event.creator_id !== userId) return;
    if (!window.confirm("Annuler ce rendez-vous ?")) return;
    const { error: cancelError } = await supabase.from("community_events").update({ status: "cancelled" }).eq("id", event.id).eq("creator_id", userId);
    if (cancelError) setError("Impossible d’annuler ce rendez-vous.");
    else await loadEvents();
  }

  return (
    <section className="community-calendar" id="rendez-vous">
      <div className="calendar-heading">
        <div><p className="eyebrow">La communauté, en vrai</p><h2>Nos rendez-vous.</h2><p className="calendar-intro">Des moments pour jouer, discuter, créer et se retrouver, en ligne comme dans la vraie vie.</p></div>
        <button className="button primary" type="button" onClick={() => { setShowCreate((v) => !v); setError(""); }}>{showCreate ? "Fermer" : "+ Proposer un rendez-vous"}</button>
      </div>

      {showCreate && <form className="event-create-form" onSubmit={createEvent}>
        <h3>Créer un rendez-vous</h3>
        <label>Titre<input required minLength={4} maxLength={100} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex. Soirée jeux de société" /></label>
        <label>Description<textarea maxLength={1000} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Au programme, ce qu’il faut prévoir…" /></label>
        <div className="event-form-grid">
          <label>Date et heure<input required type="datetime-local" min={new Date(Date.now() + 60000).toISOString().slice(0, 16)} value={startsAt} onChange={(e) => setStartsAt(e.target.value)} /></label>
          <label>Format<select value={eventType} onChange={(e) => setEventType(e.target.value as "online" | "in_person")}><option value="online">En ligne</option><option value="in_person">En présentiel</option></select></label>
        </div>
        {eventType === "in_person" && <label>Lieu général (pas d’adresse privée)<input maxLength={120} value={locationLabel} onChange={(e) => setLocationLabel(e.target.value)} placeholder="Ex. Bordeaux, café du centre-ville" /></label>}
        <label>Nombre maximum de participants<input type="number" min={2} max={500} value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="Sans limite" /></label>
        <button className="button primary" type="submit" disabled={saving}>{saving ? "Création…" : "Publier le rendez-vous"}</button>
      </form>}

      {error && <p className="calendar-error" role="alert">{error}</p>}

      <div className="calendar-layout">
        <div className="calendar-month">
          <div className="calendar-month-nav"><button type="button" className="calendar-arrow" aria-label="Mois précédent" onClick={() => { setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1)); setSelectedDay(null); }}>‹</button><h3>{monthNames[month.getMonth()]} <span>{month.getFullYear()}</span></h3><button type="button" className="calendar-arrow" aria-label="Mois suivant" onClick={() => { setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1)); setSelectedDay(null); }}>›</button></div>
          <div className="calendar-grid">{weekdays.map((day) => <div className="calendar-weekday" key={day}>{day}</div>)}{days.map((day, i) => {
            if (!day) return <div className="calendar-day blank" key={`blank-${i}`} />;
            const key = dateKey(day);
            const hasEvents = Boolean(eventsByDay.get(key)?.length);
            return <button type="button" key={key} className={`calendar-day${hasEvents ? " has-events" : ""}${selectedDay === key ? " selected" : ""}${key === dateKey(new Date()) ? " today" : ""}`} onClick={() => setSelectedDay(selectedDay === key ? null : key)} aria-label={`${day.getDate()} ${monthNames[month.getMonth()]}${hasEvents ? ", rendez-vous prévus" : ""}`}>{day.getDate()}{hasEvents && <i />}</button>;
          })}</div>
          <p className="calendar-legend"><i /> Un ou plusieurs rendez-vous</p>
        </div>
        <div className="calendar-events">
          <div className="calendar-events-title"><div><p className="eyebrow">{selectedDay ? "Date sélectionnée" : "À l’agenda"}</p><h3>{selectedDay ? new Date(`${selectedDay}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long" }) : "Ce mois-ci"}</h3></div>{selectedDay && <button type="button" className="calendar-clear" onClick={() => setSelectedDay(null)}>Tout le mois</button>}</div>
          {loading ? <p className="calendar-muted">Chargement des rendez-vous…</p> : visibleEvents.length === 0 ? <div className="calendar-empty"><span>✦</span><strong>Rien de prévu pour le moment.</strong><p>Une idée de sortie ou de soirée ? Lance le premier rendez-vous.</p></div> : <div className="calendar-event-list">{visibleEvents.map((event) => {
            const count = eventCounts.find((item) => item.event_id === event.id)?.participant_count ?? 0;
            const joined = Boolean(userId && participants.some((p) => p.event_id === event.id && p.user_id === userId));
            const full = Boolean(event.capacity && count >= event.capacity && !joined);
            return <article className="calendar-event" key={event.id}><div className={`event-type-mark ${event.event_type}`}>{event.event_type === "online" ? "⌘" : "⌖"}</div><div className="calendar-event-main"><time>{formatDate(event.starts_at)}</time><h4>{event.title}</h4>{event.description && <p>{event.description}</p>}<div className="calendar-event-meta"><span>{event.event_type === "online" ? "En ligne" : "En présentiel"}</span>{event.event_type === "in_person" && event.location_label && <span>{event.location_label}</span>}<span>{count}{event.capacity ? ` / ${event.capacity}` : ""} participant{count > 1 ? "s" : ""}</span></div><div className="calendar-event-actions">{userId && event.creator_id === userId && <button type="button" className="calendar-clear" onClick={() => void cancelEvent(event)}>Annuler</button>}<button type="button" className={`button ${joined ? "" : "primary"}`} disabled={full} onClick={() => void toggleParticipation(event)}>{joined ? "Je me désinscris" : full ? "Complet" : "Je participe"}</button></div></div></article>;
          })}</div>}
        </div>
      </div>
      <p className="calendar-privacy">Les lieux précis et adresses privées ne doivent pas être publiés ici. Privilégie un lieu public et un point de rendez-vous sûr.</p>
    </section>
  );
}
