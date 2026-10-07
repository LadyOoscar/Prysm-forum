"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import PrysmNav from "@/components/PrysmNav";
import Link from "next/link";

type Community = {
  id: string;
  slug: string;
  name: string;
  icon: string;
  category: string;
  description: string;
  banner_url: string | null;
};

export default function CommunitiesPage() {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("communities")
        .select("id,slug,name,icon,category,description,banner_url")
        .order("category")
        .order("name");
      setCommunities(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const groups = communities.reduce<Record<string, Community[]>>((all, community) => {
    (all[community.category] ??= []).push(community);
    return all;
  }, {});

  return (
    <main>
      <PrysmNav active="communities" />
      <div className="communityDirectory">
        <div className="directoryIntro">
          <p className="eyebrow">COMMUNAUTÉS</p>
          <h1>Les espaces de PRYSM</h1>
          <p>Choisis un sous-forum, rejoins la conversation et retrouve les membres qui partagent tes centres d'intérêt.</p>
        </div>

        {loading ? <p className="profileMuted">Chargement des communautés…</p> : Object.entries(groups).map(([category, items]) => (
          <section className="directoryGroup" key={category}>
            <div className="feedHead"><div><span className="eyebrow">{category}</span><h2>{items.length} espace{items.length !== 1 ? "s" : ""}</h2></div></div>
            <div className="communityGrid">
              {items.map(community => (
                <Link className="communityCard" href={`/community/${community.slug}`} key={community.id}>
                  <div className="communityCardIcon">{community.icon}</div>
                  <div>
                    <h3>{community.name}</h3>
                    <p>{community.description || "Un espace de discussion de PRYSM."}</p>
                  </div>
                  <span>→</span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
