"use client";

import { useEffect, useState } from "react";

const TRANSMISSIONS = [
  { label: "COMMUNIQUÉ PRÉSIDENTIEL", text: "LE PRÉSIDENT VOSS RAPPELLE QUE LA FÉDÉRATION N'A JAMAIS COMMIS D'ERREUR. LES ERREURS SIGNALÉES SONT DES RÉUSSITES MAL COMPRISES.", speaker: "PRÉSIDENCE FÉDÉRALE" },
  { label: "CONSIGNE AUX CITOYENS", text: "EN CAS DE DOUTE, CONSULTEZ LES INFORMATIONS OFFICIELLES. EN CAS DE CONTRADICTION, CONSULTEZ UNIQUEMENT LES INFORMATIONS OFFICIELLES LES PLUS RÉCENTES.", speaker: "MINISTÈRE DE LA VÉRITÉ OPÉRATIONNELLE" },
  { label: "ALERTE DU COMMANDEMENT", text: "LA GÉNÉRALE STRAKE CONFIRME QUE LA SITUATION EST SOUS CONTRÔLE. TOUTE PERSONNE CONSTATANT LE CONTRAIRE EST PRIÉE DE RESTER CALME ET DE REGARDER AILLEURS.", speaker: "HAUT COMMANDEMENT" },
  { label: "FLASH ÉCONOMIQUE", text: "LA CONFIANCE NATIONALE ATTEINT 112 %. LES 12 % SUPPLÉMENTAIRES SONT ATTRIBUÉS À UN ENTHOUSIASME CITOYEN EXCEPTIONNEL.", speaker: "INSTITUT FÉDÉRAL DES STATISTIQUES" },
  { label: "AVIS DE SERVICE PUBLIC", text: "RAPPEL : LE MOT DE PASSE DU RÉSEAU N'EST PAS « MOTDEPASSE ». LE NOUVEAU MOT DE PASSE EST CLASSIFIÉ. MERCI DE VOTRE COOPÉRATION.", speaker: "DIRECTION DES RÉSEAUX" },
  { label: "ÉDITION SPÉCIALE", text: "LA FÉDÉRATION DÉMENT FORMELLEMENT LA PERSISTANCE D'UNE TRANSMISSION NON AUTORISÉE. CETTE ANNONCE SERA REDIFFUSÉE JUSQU'À DISPARITION DU PROBLÈME.", speaker: "FÉDÉRATION TV" },
  { label: "MESSAGE DU MINISTÈRE", text: "TOUTE ANOMALIE VISUELLE EST UN EXERCICE DE COHÉSION NATIONALE. NE LA PHOTOGRAPHIEZ PAS. NE LA NOMMEZ PAS. SOURIEZ.", speaker: "MINISTÈRE DE L'ORDRE PUBLIC" },
  { label: "BULLETIN DE TRANQUILLITÉ", text: "LE TECHNICIEN N'EST PAS PRÉSENT. SI VOUS L'AVEZ APERÇU, VEUILLEZ IGNORER CETTE INFORMATION. IL N'Y A JAMAIS EU DE TECHNICIEN.", speaker: "CELLULE DE CONTINUITÉ" },
];

function randomDelay() {
  return 26000 + Math.random() * 39000;
}

export default function FederationTicker() {
  const [messageIndex, setMessageIndex] = useState<number | null>(null);
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const schedule = (delay: number) => {
      timer = setTimeout(() => {
        if (cancelled) return;
        setMessageIndex(Math.floor(Math.random() * TRANSMISSIONS.length));
        setCycle((value) => value + 1);
        timer = setTimeout(() => {
          if (cancelled) return;
          setMessageIndex(null);
          schedule(randomDelay());
        }, 10500);
      }, delay);
    };

    schedule(14000 + Math.random() * 22000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  if (messageIndex === null) return null;
  const transmission = TRANSMISSIONS[messageIndex];
  const tickerText = `${transmission.text}     ✦     ${transmission.text}     ✦     `;

  return (
    <div className="federation-broadcast" key={cycle} role="status" aria-live="polite">
      <div className="federation-broadcast__topline">
        <span className="federation-broadcast__seal">FÉDÉRATION</span>
        <span className="federation-broadcast__label">{transmission.label}</span>
        <span className="federation-broadcast__live"><i /> TRANSMISSION OFFICIELLE</span>
      </div>
      <div className="federation-broadcast__ticker">
        <span className="federation-broadcast__ticker-text">{tickerText}</span>
      </div>
      <div className="federation-broadcast__footer">
        <span>{transmission.speaker}</span>
        <span className="federation-broadcast__footer-right">FIABILITÉ : ABSOLUE <b>◆</b></span>
      </div>
    </div>
  );
}
