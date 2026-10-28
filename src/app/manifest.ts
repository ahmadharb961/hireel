import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  const sizes = [48, 72, 96, 128, 144, 152, 192, 256, 384, 512];
  return {
    id: "/",
    name: "Hireel",
    short_name: "Hireel",
    description: "Video-first hiring. Discover talent through short intro videos.",
    start_url: "/welcome",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FAF9F6",
    theme_color: "#195C48",
    lang: "en",
    dir: "auto",
    categories: ["business", "productivity"],
    icons: [
      ...sizes.map((s) => ({ src: `/icons/icon-${s}.png`, sizes: `${s}x${s}`, type: "image/png", purpose: "any" as const })),
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
