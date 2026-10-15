# PRYSM — audit interne confidentialité / RGPD

Date de l'audit : 15 octobre 2026  
Statut : audit technique initial, **pas une attestation de conformité juridique**.

## Traitements observés dans le code et le schéma

| Fonction | Données concernées | Point de vigilance |
| --- | --- | --- |
| Compte et connexion | Adresse e-mail, identifiant de compte, nom d'utilisateur, session | Vérifier la configuration de confirmation e-mail, durée de session, procédure de récupération et protection contre les mots de passe compromis. |
| Profil | Pseudo, nom affiché, bio, avatar, bannière, centres d'intérêt, titre, XP, réputation | Définir les champs réellement publics, la suppression et la durée de conservation. |
| Champs sensibles facultatifs | Pronoms, identité, orientation, drapeaux communautaires | Données susceptibles de révéler l'orientation sexuelle ou l'identité de genre. Consentement explicite distinct et visibilité publique séparée. |
| Âge et ville | Âge déclaré, ville saisie dans le profil | Données personnelles. La ville est utilisée pour la proximité du Gaydar ; aucune géolocalisation GPS ne doit être présentée comme utilisée par cette fonction. |
| Forum | Sujets, messages, réponses, citations, réactions, votes, stickers, pièces jointes et messages vocaux | Les publications peuvent révéler des informations sensibles dans le texte libre. Les règles de conservation et de retrait doivent être définies. |
| Messagerie | Membres des conversations, messages, pièces jointes éventuelles | L'interface indique que les messages ne sont pas supprimables par les membres. Définir la durée de conservation, le traitement à la fermeture d'un compte et l'information donnée aux correspondants. |
| Rencontres et découverte | Intentions, favoris, likes, invitations, matchs, blocages et ville | Chaque fonction doit respecter les choix de visibilité et de désactivation. Ne pas exposer les champs sensibles via des requêtes directes à la table de profils. |
| Stories | Médias, légendes, dates de création et d'expiration | Le schéma prévoit une expiration après 24 heures ; cela ne prouve pas que les fichiers sont supprimés physiquement. Vérifier le nettoyage de la base et du stockage. |
| Modération et sécurité | Signalements, sanctions, décisions de modération, événements anti-spam et traces techniques | Fixer des durées de conservation justifiées et limiter l'accès aux personnes habilitées. |
| Gaydar | Ville saisie, requête de géocodage vers Open-Meteo, calcul local de distance estimée | Informer clairement de l'envoi du nom de ville au prestataire. Vérifier les conditions du prestataire et ses journaux. Aucun GPS en direct n'est nécessaire au calcul actuel. |

## Prestataires observés

- **Render** : application web, région configurée à Francfort (Allemagne).
- **Supabase** : authentification, base de données et stockage ; projet de production en région AWS Paris. La région de base ne suffit pas à prouver que tous les traitements techniques et sous-traitants restent dans l'UE.
- **Open-Meteo** : géocodage des villes saisies dans le Gaydar.
- **YouTube / Google** : vérifier les intégrations vidéo et les requêtes effectivement déclenchées lorsqu'un média externe est affiché.

Les entités contractantes, accords de sous-traitance, listes de sous-traitants, transferts internationaux et garanties doivent être confirmés dans les comptes fournisseurs avant de figurer comme faits définitifs dans la politique publique.

## Mesures techniques en cours

- Les profils publics passent par une fonction qui ne restitue les champs sensibles que si la personne a activé leur affichage public et que le consentement est encore actif.
- Les privilèges d'accès anonyme à la table des profils ont été resserrés.
- Une PR en cours retire les lectures directes des champs sensibles aux rôles API et refactorise les écrans concernés vers des fonctions contrôlées.
- Le journal de consentement doit être append-only pour les comptes ordinaires.
- Les alertes Supabase concernant les fonctions privilégiées accessibles via l'API doivent être examinées fonction par fonction : une fonction publique de profil peut être intentionnelle si elle ne retourne que des champs publics ; toute fonction de suppression ou de découverte doit vérifier strictement l'identité et les autorisations.

## Informations nécessaires avant validation juridique

1. **Responsable du traitement** : identité légale et coordonnées de contact à communiquer aux personnes concernées. L'éventuel anonymat dans les mentions publiques au titre de la LCEN ne doit pas être confondu avec les obligations d'information RGPD.
2. **Contact de confidentialité** : utiliser une adresse dédiée qui ne révèle pas inutilement l'identité personnelle de l'exploitante, mais qui est réellement accessible et surveillée. Ne pas inventer une adresse ou publier un alias qui n'existe pas.
3. **Âge minimum du service** : le champ âge du profil accepte 18 ans et plus, mais cela ne prouve pas qu'un contrôle d'âge est appliqué à l'inscription. Décider si PRYSM est réservé aux adultes et implémenter le choix avant de l'affirmer dans les CGU.
4. **Durées par catégorie** : comptes, contenus publics, messages privés, pièces jointes, stories et fichiers associés, signalements, sanctions, journaux de sécurité et sauvegardes. Les durées annoncées doivent correspondre à un comportement réel et testable.
5. **Bases légales par finalité** : documenter la base de l'article 6 RGPD pour chaque finalité et l'exception de l'article 9 pour les données sensibles. Le consentement explicite à un champ sensible n'autorise pas automatiquement toutes les autres finalités.
6. **Droits et suppression** : documenter un canal opérationnel pour les demandes d'accès, rectification, effacement, opposition, limitation, portabilité et retrait du consentement ; vérifier les effets d'une suppression de compte sur les messages, publications, sauvegardes et signalements.
7. **Cookies et traceurs** : recenser ceux réellement déposés ou lus, y compris les intégrations tierces, avant de publier une déclaration définitive.
8. **Mineurs et risque** : évaluer les risques particuliers liés à un forum LGBTQIA+ qui traite potentiellement des données d'orientation sexuelle et d'identité de genre ; déterminer si une analyse d'impact est nécessaire.

## Sources de travail

- CNIL, définition des données sensibles : https://www.cnil.fr/fr/definition/donnee-sensible
- CNIL, conditions du consentement : https://www.cnil.fr/fr/les-bases-legales/consentement
- CNIL, information et transparence : https://cnil.fr/fr/conformite-rgpd-information-des-personnes-et-transparence
- CNIL, principes du RGPD : https://cnil.fr/fr/reglement-europeen-protection-donnees/chapitre2

**Ne pas publier ce document interne tel quel.** Il sert de registre de travail pour transformer les constats en règles réellement implémentées et en informations exactes pour les membres.
