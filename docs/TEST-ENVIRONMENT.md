# PRYSM LAB — environnement de test isolé

## Objectif

Cette branche sert à tester PRYSM sans modifier le site public. Elle est basée sur `pwa-foundation` et conserve la préparation PWA.

- Production : `prysm-clean` → https://prysm-clean.onrender.com
- Laboratoire : `prysm-lab` → https://prysm-lab.onrender.com
- Base de test dédiée : `prysm-lab` → https://tekyptihophszxpqzlxt.supabase.co
- Plan Render : gratuit
- Aucun branchement Supabase payant créé.
- Aucune donnée de production copiée.

## État actuel

- [x] Branche Git séparée `prysm-lab`.
- [x] Base Supabase indépendante créée dans la région eu-west-3.
- [x] Snapshot de schéma installé : 47 tables, fonctions, vues, index, déclencheurs et politiques RLS.
- [x] Compartiments de stockage recréés sans copier de fichiers.
- [x] RPC historique basé sur la proximité GPS désactivé dans le laboratoire.
- [x] Métadonnées du site configurées avec `NEXT_PUBLIC_SITE_URL`, sans vérification Google de production et avec indexation désactivée.
- [x] Service Render gratuit séparé créé et build Next.js réussi.
- [x] Migrations du snapshot alignées avec l'historique de la base de test.
- [ ] Ajouter `https://prysm-lab.onrender.com/**` aux URL de redirection Auth autorisées dans **le projet Supabase de test uniquement**.
- [ ] Tester inscription/confirmation e-mail, connexion, publications, messages, notifications, badges, stickers, uploads et installation PWA.
- [ ] Tester le rendu mobile et PC sur le service de laboratoire.

## Variables du service Render de test

Le service `prysm-lab` est configuré avec :

- `NEXT_PUBLIC_SUPABASE_URL` → URL de la base de test
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` → clé publishable de la base de test
- `NEXT_PUBLIC_SITE_URL` → https://prysm-lab.onrender.com

Ne jamais remplacer ces valeurs par l'URL ou la clé Supabase de production.

## Schéma et données

Le schéma a été reconstruit depuis les métadonnées PostgreSQL de production, puis installé dans le projet de test. Seules les définitions de schéma et de sécurité ont été reprises. Aucun compte, profil, sujet, publication, message privé, jeton ou fichier de production n'a été copié.

Le dossier de migrations de cette branche contient un snapshot du schéma actuel, et non la chaîne historique de migrations incrémentales. Les migrations de production restent dans `prysm-clean`. Pour tout changement futur, ajouter une nouvelle migration à la suite du snapshot et l'appliquer d'abord à la base `prysm-lab`.

## Sécurité

Le linter Supabase ne signale plus de RPC privilégié accessible aux visiteurs anonymes. Il conserve un avertissement sur `public.delete_auth_user_by_id(uuid)`, qui est réservé aux utilisateurs authentifiés et vérifie que l'identifiant ciblé correspond à leur propre compte. Ce contrôle est intentionnel pour la suppression de compte.

## Données de test

Utiliser uniquement des comptes et contenus synthétiques. Ne pas importer de dump de production, d'adresses e-mail réelles, de messages privés, de jetons ni de médias privés.

## Retour vers la production

Les corrections validées doivent passer par une pull request revue vers `prysm-clean`. Ne pas fusionner automatiquement `prysm-lab` et ne jamais connecter le service de laboratoire à la base de production.
