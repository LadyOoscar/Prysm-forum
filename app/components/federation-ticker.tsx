"use client";

import { useEffect, useRef, useState } from "react";

type Transmission = {
  name: string;
  label: string;
  text: string;
  speaker: string;
  theme: string;
  secret?: boolean;
};

const TRANSMISSIONS: Transmission[] = [
  { name: "PRÉSIDENCE VOSS", label: "COMMUNIQUÉ PRÉSIDENTIEL", text: "LE PRÉSIDENT VOSS RAPPELLE QUE LA FÉDÉRATION N'A JAMAIS COMMIS D'ERREUR. LES ERREURS SIGNALÉES SONT DES RÉUSSITES MAL COMPRISES.", speaker: "PRÉSIDENCE FÉDÉRALE", theme: "presidence" },
  { name: "ARIANE VALCOURT", label: "LE JOURNAL DE LA VICTOIRE", text: "NOS CITOYENS N'ONT AUCUNE RAISON DE S'INQUIÉTER. LES RAISONS DE S'INQUIÉTER ONT TOUTES ÉTÉ PRISES EN CHARGE PAR NOS SERVICES.", speaker: "FÉDÉRATION TV • ÉDITION NATIONALE", theme: "news" },
  { name: "GÉN. IRA STRAKE", label: "FLASH DU HAUT COMMANDEMENT", text: "LA SITUATION EST SOUS CONTRÔLE. LES PERSONNES AFFIRMANT LE CONTRAIRE SERONT INVITÉES À CONSTATER CE CONTRÔLE DEPUIS UNE POSITION PLUS ÉLOIGNÉE.", speaker: "ÉTAT-MAJOR FÉDÉRAL", theme: "military" },
  { name: "COL. BASILE KORD", label: "POINT SUR LES AFFAIRES INEXISTANTES", text: "CE DOCUMENT N'EXISTE PAS. SA CONSULTATION CONSTITUE UNE VIOLATION DE SON INEXISTENCE. NOUS DÉMENTONS DONC SON CONTENU AVEC FERMETÉ.", speaker: "BUREAU DES DÉMENTIS", theme: "classified" },
  { name: "LÉO MAXIME", label: "SERVIR, C'EST SOURIRE", text: "DERRIÈRE MOI, UN QUARTIER ENTIÈREMENT DÉTRUIT. MAIS REGARDEZ CETTE FORMIDABLE SOLIDARITÉ AUTOUR DE LA DERNIÈRE BOULANGERIE ENCORE DEBOUT !", speaker: "REPORTAGES DU BONHEUR", theme: "field" },
  { name: "PR. ÉMILE BALTHAZAR", label: "LA MINUTE DES STATISTIQUES", text: "LA POPULATION EST 34 % PLUS HEUREUSE QU'HIER. LES DONNÉES D'HIER ONT ÉTÉ RÉVISÉES POUR GARANTIR LA CONTINUITÉ DU BONHEUR.", speaker: "INSTITUT FÉDÉRAL DES STATISTIQUES", theme: "science" },
  { name: "ODETTE GRIMAUD", label: "VOTRE DOSSIER NOUS EST CHER", text: "VOTRE DEMANDE A ÉTÉ REFUSÉE AVEC SUCCÈS. POUR CONTESTER CETTE DÉCISION, VEUILLEZ DÉPOSER LE FORMULAIRE 88-B DANS LE BUREAU QUI N'EXISTE PLUS.", speaker: "DIRECTION DES FORMULAIRES", theme: "bureaucracy" },
  { name: "SÉBASTIEN SOLEIL", label: "SERVIR, C'EST VIVRE !", text: "ICI, TOUT LE MONDE GAGNE ! CERTAINS GAGNENT SIMPLEMENT DAVANTAGE DE DEVOIRS, UNE FORMATION CIVIQUE ET UN CERTIFICAT DE SATISFACTION.", speaker: "DIVERTISSEMENT FÉDÉRAL", theme: "entertainment" },
  { name: "DR MIREILLE SEREIN", label: "SANTÉ ET SÉRÉNITÉ", text: "NOUS NE CONSTATONS AUCUNE HAUSSE INQUIÉTANTE. NOUS AVONS SIMPLEMENT CHANGÉ LA DÉFINITION DU MOT « INQUIÉTANT » POUR PLUS DE CLARTÉ.", speaker: "MINISTÈRE DE LA SANTÉ PUBLIQUE", theme: "medical" },
  { name: "CH. THÉODORE ABSOLU", label: "PENSER COMME IL FAUT", text: "LA LIBERTÉ CONSISTE À CHOISIR LIBREMENT CE QUI A ÉTÉ CHOISI POUR VOUS. TOUTE AUTRE DÉFINITION SERA EXAMINÉE PAR LA COMMISSION DE LA LIBERTÉ.", speaker: "CHANCELLERIE PHILOSOPHIQUE", theme: "philosophy" },
  { name: "CAP. SOLANGE MÉTÉORE", label: "MÉTÉO PATRIOTIQUE", text: "UN SOLEIL RADIEUX EST ATTENDU SUR L'ENSEMBLE DU TERRITOIRE. LES NUAGES DISSIDENTS SERONT NEUTRALISÉS AVANT LE BULLETIN DE MIDI.", speaker: "OBSERVATOIRE ATMOSPHÉRIQUE", theme: "weather" },
  { name: "VIVIANE PRESTIGE", label: "LE CITOYEN MODÈLE", text: "VOUS N'AVEZ PAS BESOIN DE VACANCES. VOUS AVEZ BESOIN DE REDÉCOUVRIR VOTRE VOCATION. LE REPOS EST UNE RÉCOMPENSE QUI SE MÉRITE ENCORE.", speaker: "AMBASSADE DU BON CITOYEN", theme: "influencer" },
  { name: "CELLULE DE CONTINUITÉ", label: "BULLETIN DE TRANQUILLITÉ", text: "LE TECHNICIEN N'EST PAS PRÉSENT. SI VOUS L'AVEZ APERÇU, VEUILLEZ IGNORER CETTE INFORMATION. IL N'Y A JAMAIS EU DE TECHNICIEN.", speaker: "CELLULE DE CONTINUITÉ", theme: "presidence" },
  { name: "SERVICE AUX CITOYENS", label: "CONSIGNE OFFICIELLE", text: "EN CAS DE DOUTE, CONSULTEZ LES INFORMATIONS OFFICIELLES. EN CAS DE CONTRADICTION, CONSULTEZ UNIQUEMENT LES INFORMATIONS OFFICIELLES LES PLUS RÉCENTES.", speaker: "MINISTÈRE DE LA VÉRITÉ OPÉRATIONNELLE", theme: "classified" },
  { name: "FLASH ÉCONOMIQUE", label: "INDICE DE CONFIANCE NATIONALE", text: "LA CONFIANCE NATIONALE ATTEINT 112 %. LES 12 % SUPPLÉMENTAIRES SONT ATTRIBUÉS À UN ENTHOUSIASME CITOYEN EXCEPTIONNEL.", speaker: "INSTITUT FÉDÉRAL DES STATISTIQUES", theme: "science" },
  { name: "DIRECTION DES RÉSEAUX", label: "AVIS DE SERVICE PUBLIC", text: "LE MOT DE PASSE DU RÉSEAU N'EST PAS « MOTDEPASSE ». LE NOUVEAU MOT DE PASSE EST CLASSIFIÉ. MERCI DE VOTRE COOPÉRATION.", speaker: "DIRECTION DES RÉSEAUX", theme: "bureaucracy" },
  { name: "FÉDÉRATION TV", label: "ÉDITION SPÉCIALE", text: "LA FÉDÉRATION DÉMENT FORMELLEMENT LA PERSISTANCE D'UNE TRANSMISSION NON AUTORISÉE. CETTE ANNONCE SERA REDIFFUSÉE JUSQU'À DISPARITION DU PROBLÈME.", speaker: "SERVICE DE CONTRÔLE DES TRANSMISSIONS", theme: "news" },
  { name: "MINISTÈRE DE L'ORDRE", label: "MESSAGE DE COHÉSION", text: "TOUTE ANOMALIE VISUELLE EST UN EXERCICE DE COHÉSION NATIONALE. NE LA PHOTOGRAPHIEZ PAS. NE LA NOMMEZ PAS. SOURIEZ.", speaker: "MINISTÈRE DE L'ORDRE PUBLIC", theme: "military" },
  { name: "SIGNAL INCONNU", label: "FRAGMENT INTERCEPTÉ • SOURCE NON IDENTIFIÉE", text: "LE PROGRAMME CONTINUE. NE CHERCHEZ PAS LA SALLE DE CONTRÔLE. SI CETTE TRANSMISSION VOUS EST PARVENUE, C'EST QUE QUELQU'UN A OUBLIÉ DE FERMER LA PORTE.", speaker: "ORIGINE INCONNUE // NE PAS ARCHIVER", theme: "technician", secret: true },
];

const WEATHER_INDEX = TRANSMISSIONS.findIndex((item) => item.theme === "weather");
const MILITARY_INDEX = TRANSMISSIONS.findIndex((item) => item.theme === "military");
const SECRET_INDEX = TRANSMISSIONS.findIndex((item) => item.secret);
const REGULAR_ORDER = [1, 0, 3, 4, 5, 7, 8, 9, 11, 6, 13, 14, 15, 16];

export default function FederationTicker() {
  const [messageIndex, setMessageIndex] = useState<number | null>(null);
  const [cycle, setCycle] = useState(0);
  const [idleAlert, setIdleAlert] = useState(false);
  const broadcastCount = useRef(0);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSecretAt = useRef(0);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let orderIndex = 0;

    const markActive = () => {
      setIdleAlert(false);
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => setIdleAlert(true), 90000);
    };

    const activityEvents: Array<keyof WindowEventMap> = ["pointerdown", "keydown", "touchstart", "scroll"];
    activityEvents.forEach((event) => window.addEventListener(event, markActive, { passive: true }));
    idleTimer.current = setTimeout(() => setIdleAlert(true), 90000);

    const chooseNext = () => {
      broadcastCount.current += 1;
      const count = broadcastCount.current;

      // Première diffusion garantie : journal. Météo revient toutes les quatre diffusions.
      if (count === 1) return 1;
      // Le signal du Technicien est rare, mais garanti après 12 à 16 diffusions.
      if (count - lastSecretAt.current >= 12 + Math.floor(Math.random() * 5)) {
        lastSecretAt.current = count;
        return SECRET_INDEX;
      }
      if (idleAlert && count > 1) return MILITARY_INDEX;
      if (count % 4 === 0) return WEATHER_INDEX;

      const next = REGULAR_ORDER[orderIndex % REGULAR_ORDER.length];
      orderIndex += 1;
      return next;
    };

    const schedule = (delay: number) => {
      timer = setTimeout(() => {
        if (cancelled) return;
        setMessageIndex(chooseNext());
        setCycle((value) => value + 1);
        timer = setTimeout(() => {
          if (cancelled) return;
          setMessageIndex(null);
          schedule(35000 + Math.random() * 10000);
        }, 12000);
      }, delay);
    };

    // La bannière démarre rapidement, y compris si le système limite les animations.
    schedule(4500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (idleTimer.current) clearTimeout(idleTimer.current);
      activityEvents.forEach((event) => window.removeEventListener(event, markActive));
    };
  }, [idleAlert]);

  if (messageIndex === null) return null;
  const transmission = TRANSMISSIONS[messageIndex];
  const tickerText = `${transmission.text}     ✦     ${transmission.text}     ✦     `;

  return (
    <div className={`federation-broadcast federation-broadcast--${transmission.theme}${transmission.secret ? " federation-broadcast--secret" : ""}`} key={cycle} role="status" aria-live="polite">
      <div className="federation-broadcast__topline">
        <span className="federation-broadcast__seal">{transmission.name}</span>
        <span className="federation-broadcast__label">{transmission.label}</span>
        <span className="federation-broadcast__live"><i /> {transmission.secret ? "SIGNAL INTERCEPTÉ" : "TRANSMISSION OFFICIELLE"}</span>
      </div>
      <div className="federation-broadcast__ticker">
        <span className="federation-broadcast__ticker-text">{tickerText}</span>
      </div>
      <div className="federation-broadcast__footer">
        <span>{transmission.speaker}</span>
        <span className="federation-broadcast__footer-right">{transmission.secret ? "SIGNAL NON AUTORISÉ" : "FIABILITÉ : ABSOLUE"} <b>◆</b></span>
      </div>
    </div>
  );
}
