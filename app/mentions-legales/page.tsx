import Link from "next/link";

export const metadata = { title: "Mentions légales", description: "Informations légales du site PRYSM." };

export default function MentionsLegalesPage() {
  return <main className="shell legal-page">
    <header className="page-head compact"><p className="eyebrow">Informations du service</p><h1>Mentions légales</h1><p className="lead">Les informations essentielles sur l’éditeur et l’hébergement de PRYSM.</p></header>
    <div className="notice error" role="alert"><strong>Informations à compléter avant publication.</strong><br />Les champs entre crochets nécessitent encore les coordonnées exactes de l’éditeur particulier. Cette page ne doit pas être considérée comme juridiquement complète tant que ces informations ne sont pas renseignées.</div>
    <section className="legal-section"><h2>Édition du site</h2>
      <p><strong>Nom du service :</strong> PRYSM</p>
      <p><strong>Adresse du site :</strong> <a href="https://prysm-clean.onrender.com">https://prysm-clean.onrender.com</a></p>
      <p><strong>Éditeur :</strong> [Nom et prénom de l’éditeur ou dénomination de la structure]</p>
      <p><strong>Statut :</strong> Particulier (éditeur personne physique, hors activité professionnelle à confirmer)</p>
      <p><strong>Adresse de l’éditeur :</strong> [Adresse postale à renseigner selon le statut applicable]</p>
      <p><strong>Contact :</strong> [Adresse e-mail de contact à créer ou renseigner]</p>
      <p><strong>Directeur ou directrice de la publication :</strong> [Nom à renseigner]</p>
    </section>
    <section className="legal-section"><h2>Hébergement</h2>
      <p><strong>Application web :</strong> Render Services, Inc.</p>
      <p><strong>Adresse :</strong> 525 Brannan Street, Suite 300, San Francisco, CA 94107, États-Unis.</p>
      <p><strong>Site de l’hébergeur :</strong> <a href="https://render.com" target="_blank" rel="noreferrer">render.com</a></p>
      <p>PRYSM utilise également Supabase pour certaines fonctions de base de données, d’authentification et de stockage. Les informations contractuelles et les régions exactes de traitement doivent être vérifiées dans la configuration des services utilisés.</p>
    </section>
    <section className="legal-section"><h2>Propriété intellectuelle</h2>
      <p>Les éléments originaux créés pour PRYSM sont protégés par les règles applicables de propriété intellectuelle. Les contenus publiés par les membres restent soumis aux droits de leurs auteurs et titulaires de droits. Toute réutilisation d’un contenu tiers doit respecter sa licence et les autorisations applicables.</p>
      <p>Pour signaler un contenu susceptible de porter atteinte à un droit, contactez l’équipe à l’adresse [adresse de contact à renseigner] en indiquant l’URL concernée et les éléments permettant d’examiner la demande.</p>
    </section>
    <section className="legal-section"><h2>Signalement de contenus illicites</h2>
      <p>Un contenu peut être signalé depuis les outils disponibles sur le forum lorsqu’ils sont proposés. Pour une notification formelle, une voie de contact dédiée doit être renseignée ici : [adresse de signalement à renseigner]. Décrivez précisément le contenu, son emplacement, le motif du signalement et joignez les éléments utiles. N’envoyez que les données personnelles nécessaires au traitement de la demande.</p>
    </section>
    <section className="legal-section"><h2>Liens utiles</h2><ul><li><Link href="/politique-confidentialite">Politique de confidentialité</Link></li><li><Link href="/conditions-utilisation">Conditions d’utilisation</Link></li></ul></section>
    <p className="legal-note">Document préparatoire à faire vérifier et compléter en fonction du statut réel de l’éditeur et des services effectivement exploités.</p>
  </main>;
}
