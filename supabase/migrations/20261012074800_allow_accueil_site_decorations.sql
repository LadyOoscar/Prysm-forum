-- Allow decorations for the Accueil navigation tab and page header.
alter table public.site_decorations drop constraint if exists site_decorations_slot_check;
alter table public.site_decorations
  add constraint site_decorations_slot_check
  check (slot = any (array[
    'tab-accueil', 'tab-forum', 'tab-rencontres', 'tab-orbite', 'tab-messages', 'tab-profil',
    'header-accueil', 'header-forum', 'header-rencontres', 'header-orbite', 'header-messages', 'header-profil',
    'panel-home', 'panel-forum', 'panel-rencontres', 'panel-orbite', 'panel-profil'
  ]::text[]));
