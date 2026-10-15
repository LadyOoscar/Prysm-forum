# PRYSM PWA foundation

This branch adds an installable Progressive Web App shell to the existing Next.js site. It is not a separate forum and does not create a second Supabase project.

## Shared data and identity
- The PWA uses the same site origin, existing Supabase browser client, publishable key, authentication flow, tables, RLS policies, and storage as the website.
- No database migration or new table is required for this foundation.
- Do not add the Supabase service-role key to browser code or service-worker configuration.

## Offline and caching policy
- The service worker is registered at `/sw.js`.
- Only `/offline.html` and `/prysm-icon.svg` are precached.
- Navigation requests use the network and fall back to the static offline screen.
- Authenticated pages, API responses, media, and Supabase data are never cached by this service worker. Offline posting and offline reading are intentionally not enabled.

## Local validation
1. Run `npm install` and `npm run build`.
2. Serve the production build over HTTPS (or localhost for development).
3. In browser devtools, inspect Application > Manifest and Service Workers.
4. Confirm the install option appears in a supported browser and the iOS Safari instructions are understandable.
5. Sign in, post/reply, open messages and notifications, upload media, then confirm these operations still use the existing Supabase account.
6. Disable the network and confirm navigation shows the offline screen, then restore the network and reload.

## Future store release
- Keep this web app as the single source of truth.
- Evaluate a Trusted Web Activity for Google Play and a thin Capacitor wrapper for iOS only after the PWA is tested on real devices.
- Store publication, push notifications, app icons in native raster formats, privacy disclosures, and store review requirements remain separate follow-up work.
