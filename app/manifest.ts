import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "PRYSM | Forum queer communautaire",
    short_name: "PRYSM",
    description: "Le forum queer communautaire, dans ta poche.",
    lang: "fr-FR",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "any",
    background_color: "#08091a",
    theme_color: "#08091a",
    categories: ["social", "lifestyle"],
    icons: [
      {
        src: "/prysm-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any"
      },
      {
        src: "/prysm-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable"
      }
    ]
  };
}
