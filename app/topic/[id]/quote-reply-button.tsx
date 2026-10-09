"use client";

export default function QuoteReplyButton({ postId, body, author }: { postId: string; body: string; author: string }) {
  function quote() {
    window.dispatchEvent(new CustomEvent("prysm:quote-post", { detail: { postId, body, author } }));
    document.querySelector(".reply-box")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  return <button type="button" className="button ghost quote-reply-button" onClick={quote}>↪ Répondre avec citation</button>;
}
