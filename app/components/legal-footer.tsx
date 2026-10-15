import Link from "next/link";

export default function LegalFooter() {
  return <footer className="legal-footer" aria-label="Informations juridiques">
    <span>PRYSM · Forum communautaire queer</span>
    <nav aria-label="Liens juridiques">
      <Link href="/mentions-legales">Mentions légales</Link>
      <Link href="/politique-confidentialite">Confidentialité</Link>
      <Link href="/conditions-utilisation">Conditions d’utilisation</Link>
    </nav>
  </footer>;
}
