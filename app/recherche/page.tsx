"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { createSupabaseBrowser } from "../../lib/supabase-browser";

type Result = {
  id: string;
  title: string;
  category: string;
  categorySlug: string;
  updated_at: string;
};

export default function SearchPage() {
  const supabase = createSupabaseBrowser();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [searched, setSearched] = useState(false);
  const [busy, setBusy] = useState(false);

  async function search(event: FormEvent) {
    event.preventDefault();
    const value = query.trim();
    if (!value) return;

    setBusy(true);
    setSearched(true);

    const pattern = `%${value.replace(/[%_]/g, "\\$&")}%`;
    const [{ data: topics }, { data: posts }] = await Promise.all([
      supabase
        .from("forum_topics")
        .select("id, title, updated_at, forum_categories!inner(name, slug)")
        .ilike("title", pattern)
        .order("updated_at", { ascending: false })
        .limit(30),
      supabase
        .from("forum_posts")
        .select("topic_id, created_at")
        .ilike("body", pattern)
        .order("created_at", { ascending: false })
        .limit(60),
    ]);

    const topicIds = [...new Set((posts ?? []).map((post) => post.topic_id))];
    let bodyTopics: any[] = [];

    if (topicIds.length) {
      const { data } = await supabase
        .from("forum_topics")
        .select("id, title, updated_at, forum_categories!inner(name, slug)")
        .in("id", topicIds)
        .limit(30);
      bodyTopics = data ?? [];
    }

    const combined = [...(topics ?? []), ...bodyTopics];
    const unique = Array.from(new Map(combined.map((topic: any) => [topic.id, topic])).values());

    setResults(
      unique.map((topic: any) => ({
        id: topic.id,
        title: topic.title,
        category: topic.forum_categories?.name ?? "Forum",
        categorySlug: topic.forum_categories?.slug ?? "",
        updated_at: topic.updated_at,
      })),
    );
    setBusy(false);
  }

  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/">PRYSM</Link>
        <nav>
          <Link href="/">Accueil</Link>
          <Link href="/forum">Forum</Link>
          <Link className="active" href="/recherche">Recherche</Link>
          <Link href="/#rencontres">Rencontres</Link>
          <Link href="/#messages">Messages</Link>
          <Link href="/#profil">Profil</Link>
        </nav>
      </header>

      <section className="page-head">
        <p className="eyebrow">Explorer</p>
        <h1>Recherche.</h1>
        <p className="lead">Retrouve une discussion à partir de son titre ou de son contenu.</p>
      </section>

      <form className="search-form" onSubmit={search}>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          minLength={2}
          maxLength={100}
          placeholder="Rechercher dans le forum..."
          aria-label="Rechercher dans le forum"
        />
        <button className="button primary" type="submit" disabled={busy || query.trim().length < 2}>
          {busy ? "Recherche..." : "Rechercher"}
        </button>
      </form>

      {searched && (
        <section className="search-results">
          <div className="section-title"><span>Résultats</span><strong>{results.length}</strong></div>
          {results.length === 0 ? (
            <div className="empty">
              <div className="empty-symbol">⌕</div>
              <h2>Aucun résultat</h2>
              <p>Essaie un autre mot ou une autre formulation.</p>
            </div>
          ) : (
            results.map((result) => (
              <Link className="search-result" href={`/topic/${result.id}`} key={result.id}>
                <div>
                  <span className="forum-kicker">{result.category}</span>
                  <h2>{result.title}</h2>
                </div>
                <span className="arrow">→</span>
              </Link>
            ))
          )}
        </section>
      )}
    </main>
  );
}
