"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import NotificationBell from "@/components/NotificationBell";
import MentionTextarea from "@/components/MentionTextarea";

type Community = {
  id: string;
  slug: string;
  name: string;
  icon: string;
  category: string;
  category_order: number;
  display_order: number;
};

type Topic = { id: string; title: string; body: string; community_id: string; author_id: string; created_at: string };
type Profile = { id: string; username: string; display_name: string; reputation: number; avatar_url: string | null };

const fallbackGods = [
  ["⚖️", "Kael", "Justice", "Modération & équité"],
  ["💗", "Nyra", "Liens", "Rencontres & relations"],
  ["📚", "Eon", "Archives", "Mémoire du forum"],
  ["🎲", "Mira", "Animation", "Événements & communautés"],
];

export default function Home() {
  const router = useRouter();
  const supabase = createClient();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [replyCounts, setReplyCounts] = useState<Record<string, number>>({});
  const [selectedCommunity, setSelectedCommunity] = useState("blabla");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [communityId, setCommunityId] = useState("");
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadForum() {
      const [{ data: communityRows }, { data: topicRows }] = await Promise.all([
        supabase
          .from("communities")
          .select("id,slug,name,icon,category,category_order,display_order")
          .order("category_order")
          .order("display_order"),
        supabase
          .from("topics")
          .select("id,title,body,community_id,author_id,created_at")
          .order("created_at", { ascending: false })
          .limit(12),
      ]);

      setCommunities(communityRows ?? []);
      setTopics(topicRows ?? []);

      const defaultCommunity = communityRows?.find(c => c.slug === "blabla") ?? communityRows?.[0];
      if (defaultCommunity) {
        setSelectedCommunity(defaultCommunity.slug);
        setCommunityId(defaultCommunity.id);
      }

      setLoading(false);
    }

    loadForum();
  }, []);

  const categories = useMemo(() => {
    const groups = new Map<string, Community[]>();

    for (const community of communities) {
      const existing = groups.get(community.category) ?? [];
      existing.push(community);
      groups.set(community.category, existing);
    }

    return [...groups.entries()].sort(
      (a, b) => (a[1][0]?.category_order ?? 99) - (b[1][0]?.category_order ?? 99)
    );
  }, [communities]);

  const selected = communities.find(c => c.slug === selectedCommunity);

  function openComposer() {
    setMessage("");
    setTitle("");
    setBody("");
    const community = selected ?? communities[0];
    if (community) setCommunityId(community.id);
    setOpen(true);
  }

  async function createTopic(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (title.trim().length < 3 || body.trim().length < 3 || !communityId) {
      setMessage("Ajoutez un titre, un message et une communauté.");
      return;
    }

    setPublishing(true);
    const { data: claims } = await supabase.auth.getClaims();

    if (!claims?.claims?.sub) {
      router.push("/login");
      return;
    }

    const { data, error } = await supabase
      .from("topics")
      .insert({
        community_id: communityId,
        author_id: claims.claims.sub,
        title: title.trim(),
        body: body.trim(),
      })
      .select("id")
      .single();

    setPublishing(false);

    if (error) {
      setMessage("Impossible de publier ce sujet pour le moment.");
      return;
    }

    setOpen(false);
    router.push(`/topic?id=${data.id}`);
  }

  const visibleTopics = topics.filter(topic => !selected || topic.community_id === selected.id);

  return (
    <main>
      <header>
        <div className="brand">PRYSM<span>✦</span></div>
        <nav><a className="active">Forum</a><a href="/search">Recherche</a><a href="/messages">Messages</a><a>Rencontres</a><a>Communautés</a><a>Panthéon</a></nav>
        <div className="headerTools"><NotificationBell /><a className="profile" href="/profile">☾ <span>Mon profil</span></a></div>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">✦ LE FORUM QUI EST VIVANT</p>
          <h1>Un espace pour<br/><em>être soi.</em></h1>
          <p className="intro">Discuter, rire, débattre, rencontrer des gens et trouver sa communauté. PRYSM rassemble les couleurs qui font notre monde.</p>
          <button className="primary" onClick={openComposer}>+ Créer un sujet</button>
        </div>
        <div className="orb">✦<small>PRYSM</small></div>
      </section>

      <div className="layout">
        <aside className="forumSidebar">
          <div className="sideTitle">FORUM <span>+</span></div>

          {loading ? (
            <div className="community">Chargement…</div>
          ) : (
            categories.map(([category, items]) => (
              <div className="forumCategory" key={category}>
                <div className="categoryTitle">{category}</div>
                <div className="subforums">
                  {items.map(community => (
                    <button
                      className={community.slug === selectedCommunity ? "community selected" : "community"}
                      key={community.id}
                      onClick={() => setSelectedCommunity(community.slug)}
                    >
                      <span className="communityIcon">{community.icon}</span>
                      <span className="communityName">{community.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </aside>

        <section className="feed">
          <div className="feedHead">
            <div>
              <span className="eyebrow">SOUS-FORUM</span>
              <h2>{selected?.icon} {selected?.name ?? "Blabla"}</h2><button className="subforumLink" onClick={() => selected && router.push(`/community/${selected.slug}`)}>Voir le sous-forum →</button>
            </div>
            <button className="filter">Les plus récents ▾</button>
          </div>

          {loading ? (
            <article className="topic">
              <div className="topicBody"><p>Chargement des discussions…</p></div>
            </article>
          ) : visibleTopics.length === 0 ? (
            <article className="topic">
              <div className="topicBody">
                <h3>Ce sous-forum attend son premier sujet.</h3>
                <p>Pourquoi ne pas lancer la discussion ?</p>
              </div>
            </article>
          ) : (
            visibleTopics.map(topic => {
              const community = communities.find(c => c.id === topic.community_id);

              return (
                <article className="topic" key={topic.id} onClick={() => router.push(`/topic?id=${topic.id}`)}>
                  <div className="topicIcon">{community?.icon ?? "✦"}</div>
                  <div className="topicBody">
                    <h3>{topic.title}</h3>
                    <p>{community?.name ?? "Discussion"} · <button className="authorLink" onClick={event => { event.stopPropagation(); router.push(`/profile/${profiles[topic.author_id]?.username}`); }}>{profiles[topic.author_id]?.display_name ?? "Membre"}</button> · {new Date(topic.created_at).toLocaleDateString("fr-FR")}</p>
                  </div>
                  <div className="stats"><span>💬 {replyCounts[topic.id] ?? 0}</span><span>⭐ {profiles[topic.author_id]?.reputation ?? 0}</span></div>
                </article>
              );
            })
          )}
        </section>

        <aside className="pantheon">
          <div className="sideTitle">LE PANTHÉON <span>✦</span></div>
          {fallbackGods.map(god => (
            <div className="god" key={god[1]}>
              <div className="godIcon">{god[0]}</div>
              <div><strong>{god[1]}</strong><small>{god[2]} · {god[3]}</small></div>
            </div>
          ))}
          <div className="aiNote">Les divinités sont des IA clairement identifiées. Elles assistent la communauté sans se faire passer pour des membres humains.</div>
        </aside>
      </div>

      {open && (
        <div className="modal" onClick={() => setOpen(false)}>
          <div className="modalCard" onClick={event => event.stopPropagation()}>
            <button className="close" onClick={() => setOpen(false)}>×</button>
            <p className="eyebrow">NOUVELLE DISCUSSION</p>
            <h2>Qu'avez-vous envie de partager ?</h2>

            <form className="authForm" onSubmit={createTopic}>
              <label>
                Sous-forum
                <select value={communityId} onChange={event => setCommunityId(event.target.value)} required>
                  <option value="" disabled>Choisir un sous-forum</option>
                  {categories.map(([category, items]) => (
                    <optgroup key={category} label={category}>
                      {items.map(community => (
                        <option key={community.id} value={community.id}>{community.icon} {community.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>

              <label>
                Titre
                <input value={title} onChange={event => setTitle(event.target.value)} maxLength={160} placeholder="Le titre de votre sujet" required />
              </label>

              <label>
                Message
                <MentionTextarea value={body} onChange={setBody} placeholder="Écrivez votre sujet…" />
              </label>

              {message && <p className="authMessage">{message}</p>}
              <button className="primary" type="submit" disabled={publishing}>
                {publishing ? "Publication…" : "Publier le sujet"}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
