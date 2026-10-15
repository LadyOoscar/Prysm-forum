import Link from "next/link";

export const metadata = { title: "Mentions légales", description: "Informations légales du site PRYSM." };

export default function MentionsLegalesPage() {
  return <main className="shell legal-page">
    <header className="page-head compact"><p className="eyebrow">Informations du service</p><h1>Mentions légales</h1><p className="lead">Les informations essentielles sur l’éditeur et l’hébergement de PRYSM.</p></header>
    <div className="notice error" role="alert"><strong>Ne pas publier avant validation juridique.</strong><br />L’identité de l’éditrice est volontairement absente de cette version de travail. Cette omission en production n’est possible que si PRYSM relève bien de l’édition à titre non professionnel et si les informations d’identification requises ont été communiquées au préalable à l’hébergeur, conformément à l’article 6, III, 2 de la LCEN.</div>
    <section className="legal-section"><h2>Édition du site</h2>
      <p><strong>Nom du service :</strong> PRYSM</p>
      <p><strong>Adresse du site :</strong> <a href="https://prysm-clean.onrender.com">https://prysm-clean.onrender.com</a></p>
      <p><strong>Statut déclaré :</strong> personne physique éditant le service à titre personnel. Le caractère non professionnel doit être confirmé au regard de l’activité réelle du forum.</p>
      <p><strong>Identité et domicile de l’éditrice :</strong> non affichés dans cette version préparatoire. Leur omission publique dépend de la validation du régime légal d’anonymat et de la communication préalable des informations exigées à l’hébergeur.</p>
      <p><strong>Contact :</strong> morgane.spiria@gmail.com</p>
      <p><strong>Publication :</strong> les mentions définitives relatives à la direction de la publication doivent être validées avec le régime d’anonymat applicable avant mise en ligne.</p>
    </section>
    <section className="legal-section"><h2>Hébergement</h2>
      <p><strong>Application web :</strong> Render Services, Inc.</p>
      <p><strong>Adresse :</strong> 525 Brannan Street, San Francisco, CA 94131, États-Unis (adresse indiquée dans le Data Processing Addendum de Render).</p>
      <p><strong>Site de l’hébergeur :</strong> <a href="https://render.com" target="_blank" rel="noreferrer">render.com</a></p>
      <p><strong>Base de données, authentification et stockage :</strong> Supabase Pte. Ltd., 65 Chulia Street, #38-02/03, OCBC Centre, Singapour 049513, sous réserve de confirmer l’entité contractante dans le compte. Le projet Supabase de production est configuré dans la région AWS eu-west-3 (Paris). Supabase précise que certains traitements techniques ou sous-traitants peuvent intervenir hors de la région choisie.</p>
      <p><strong>Région de l’application Render :</strong> Frankfurt, Allemagne. Les coordonnées contractuelles de Render et de Supabase doivent être vérifiées à nouveau avant publication définitive.</p>
    </section>
    <section className="legal-section"><h2>Propriété intellectuelle</h2>
      <p>Les éléments originaux créés pour PRYSM sont protégés par les règles applicables de propriété intellectuelle. Les contenus publiés par les membres restent soumis aux droits de leurs auteurs et titulaires de droits. Toute réutilisation d’un contenu tiers doit respecter sa licence et les autorisations applicables.</p>
      <p>Pour signaler un contenu susceptible de porter atteinte à un droit, contactez l’équipe à l’adresse morgane.spiria@gmail.com en indiquant l’URL concernée et les éléments permettant d’examiner la demande.</p>
    </section>
    <section className="legal-section"><h2>Signalement de contenus illicites</h2>
      <p>Un contenu peut être signalé depuis les outils disponibles sur le forum lorsqu’ils sont proposés. Pour une notification formelle, une voie de contact dédiée doit être renseignée ici : morgane.spiria@gmail.com. Décrivez précisément le contenu, son emplacement, le motif du signalement et joignez les éléments utiles. N’envoyez que les données personnelles nécessaires au traitement de la demande.</p>
    </section>
    <section className="legal-section"><h2>Liens utiles</h2><ul><li><Link href="/politique-confidentialite">Politique de confidentialité</Link></li><li><Link href="/conditions-utilisation">Conditions d’utilisation</Link></li></ul></section>
    <p className="legal-note">Document préparatoire à faire vérifier et compléter en fonction du statut réel de l’éditeur et des services effectivement exploités.</p>
  </main>;
}
