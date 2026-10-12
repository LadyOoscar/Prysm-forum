import type { Metadata } from "next";
import "./globals.css";
import ActivityPulse from "./components/activity-pulse";
import SiteNav from "./components/site-nav";
import FederationTicker from "./components/federation-ticker";
import SoundControl from "./components/sound-control";

export const metadata: Metadata = {
  title: "PRYSM",
  description: "Forum social et rencontres, construit autour de la communauté."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body><ActivityPulse /><SiteNav /><FederationTicker /><SoundControl />{children}</body>
    </html>
  );
}