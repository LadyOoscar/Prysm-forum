import type { Metadata } from "next";
import "./globals.css";
import ActivityPulse from "./components/activity-pulse";

export const metadata: Metadata = {
  title: "PRYSM",
  description: "Forum social et rencontres, construit autour de la communauté."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body><ActivityPulse />{children}</body>
    </html>
  );
}