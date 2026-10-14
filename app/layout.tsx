import type { Metadata } from "next";
import "./globals.css";
import ActivityPulse from "./components/activity-pulse";
import SiteNav from "./components/site-nav";
import FederationTicker from "./components/federation-ticker";
import SoundControl from "./components/sound-control";

const siteUrl = "https://prysm-clean.onrender.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "PRYSM | Forum queer communautaire",
    template: "%s | PRYSM"
  },
  description: "PRYSM est un forum communautaire queer pour échanger, s'entraider, rencontrer des personnes et partager ses passions dans un espace inclusif.",
  applicationName: "PRYSM",
  alternates: {
    canonical: "/"
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large"
    }
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "PRYSM",
    title: "PRYSM | Forum queer communautaire",
    description: "Un forum queer, mille façons d’être soi. On échange, on s’entraide et on refait le monde.",
    locale: "fr_FR"
  },
  twitter: {
    card: "summary",
    title: "PRYSM | Forum queer communautaire",
    description: "Un espace communautaire queer pour échanger, s'entraider et partager ses passions."
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body><ActivityPulse /><SiteNav /><FederationTicker /><SoundControl />{children}</body>
    </html>
  );
}
