alter table public.site_decorations drop constraint if exists site_decorations_slot_check;
alter table public.site_decorations add constraint site_decorations_slot_check check (slot = any (array['banner-accueil','tab-accueil','tab-forum','tab-rencontres','tab-orbite','tab-messages','tab-profil','header-accueil','header-forum','header-rencontres','header-orbite','header-messages','header-profil','panel-home','panel-forum','panel-rencontres','panel-orbite','panel-profil']::text[]));
alter table public.site_decorations drop constraint if exists site_decorations_width_px_check;
alter table public.site_decorations add constraint site_decorations_width_px_check check (width_px >= 12 and width_px <= 1200);
alter table public.site_decorations drop constraint if exists site_decorations_height_px_check;
alter table public.site_decorations add constraint site_decorations_height_px_check check (height_px >= 12 and height_px <= 500);
