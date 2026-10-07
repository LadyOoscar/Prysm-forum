"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Suggestion = { id: string; username: string; display_name: string; avatar_url: string | null };

export default function MentionTextarea({
  value,
  onChange,
  placeholder,
  maxLength = 10000,
  rows = 6,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  maxLength?: number;
  rows?: number;
}) {
  const router = useRouter();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(0);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const match = value.match(/@([A-Za-z0-9_-]{0,32})$/);
    if (!match) {
      setOpen(false);
      return;
    }

    const term = match[1].toLowerCase();
    setQuery(term);
    setSelected(0);
    let cancelled = false;

    async function search() {
      setLoading(true);
      const { data } = await supabase
        .from("profiles")
        .select("id,username,display_name,avatar_url")
        .or(`username.ilike.%${term}%,display_name.ilike.%${term}%`)
        .order("username")
        .limit(8);
      if (!cancelled) {
        setSuggestions((data ?? []) as Suggestion[]);
        setOpen(true);
        setLoading(false);
      }
    }
    search();
    return () => { cancelled = true; };
  }, [value]);

  function choose(suggestion: Suggestion) {
    const replacement = value.replace(/@([A-Za-z0-9_-]{0,32})$/, `@${suggestion.username} `);
    onChange(replacement);
    setOpen(false);
    ref.current?.focus();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!open || suggestions.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelected(index => (index + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelected(index => (index - 1 + suggestions.length) % suggestions.length);
    } else if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      choose(suggestions[selected]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="mentionBox">
      <textarea
        ref={ref}
        value={value}
        onChange={event => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={rows}
        required
      />
      {open && (
        <div className="mentionSuggestions" role="listbox">
          {loading ? <div className="mentionEmpty">Recherche…</div> : suggestions.length === 0 ? (
            <div className="mentionEmpty">Aucun membre trouvé pour @{query}</div>
          ) : suggestions.map((suggestion, index) => (
            <button
              type="button"
              key={suggestion.id}
              className={index === selected ? "mentionSuggestion active" : "mentionSuggestion"}
              onMouseDown={event => { event.preventDefault(); choose(suggestion); }}
              role="option"
              aria-selected={index === selected}
            >
              <span className="mentionAvatar">
                {suggestion.avatar_url ? <img src={suggestion.avatar_url} alt="" /> : (suggestion.display_name || suggestion.username).charAt(0).toUpperCase()}
              </span>
              <span><strong>{suggestion.display_name || suggestion.username}</strong><small>@{suggestion.username}</small></span>
            </button>
          ))}
        </div>
      )}
      <p className="mentionHint">Tapez <strong>@</strong> pour mentionner un membre. Entrée ou Tab pour sélectionner.</p>
    </div>
  );
}
