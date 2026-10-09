"use client";

export default function QuoteReplyButton({ body, author }: { body: string; author: string }) {
  function quote() {
    window.dispatchEvent(new CustomEvent("prysm:quote-post", { detail: { body, author } }));
    document.querySelector(".reply-box")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  return <button type="button" className="button ghost quote-reply-button" onClick={quote}>↪ Citer pour répondre</button>;
}
