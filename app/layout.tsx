import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PRYSM",
  description: "Forum social et rencontres, construit autour de la communauté."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}