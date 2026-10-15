# PRYSM LAB — environnement de test isolé

## Objectif

Cette branche sert à préparer les essais de PRYSM sans modifier le site public. Elle est basée sur `pwa-foundation` et inclut la préparation PWA en cours.

- Production : `prysm-clean` → https://prysm-clean.onrender.com
- Branche de laboratoire : `prysm-lab`
- Aucune migration ou opération Supabase de production ne doit être exécutée depuis ce laboratoire.
- Ne jamais configurer le laboratoire avec les clés ou l'URL Supabase de production.

## État actuel

- [x] Branche Git séparée créée à partir de `pwa-foundation`.
- [x] Base de production laissée intacte.
- [x] Aucun branchement Supabase payant créé.
- [x] Aucune nouvelle ressource Render créée.
- [ ] Créer une base Supabase de test gratuite, indépendante, avec données synthétiques.
- [ ] Configurer un service Render séparé pointant exclusivement vers cette base.
- [ ] Ajouter l'URL du service de test aux URL de redirection Auth de la base de test uniquement.
- [ ] Tester inscription/connexion, publications, notifications, upload, responsive et installation PWA.

## Configuration du service de test

Le projet attend les variables suivantes :

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SITE_URL` (URL du service de test, si utilisée par le parcours concerné)

**Ne pas démarrer une instance publique tant que les deux variables Supabase ne pointent pas vers une base de test isolée.** Une URL ou une clé factice n'est pas un mode démo fiable : plusieurs routes interrogent Supabase au rendu et les tests seraient trompeurs.

## Données de test

Utiliser uniquement des comptes et contenus synthétiques. Ne pas importer de dump de production, d'adresses e-mail réelles, de messages privés, de jetons, ni de médias privés.

## Retour vers la production

Les corrections validées doivent passer par une pull request revue vers `prysm-clean`. Ne pas fusionner automatiquement `prysm-lab` et ne pas connecter ce service à la base de production.
