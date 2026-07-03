import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND.name,
    short_name: "ScoreOps",
    description: BRAND.description,
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f4f6fb",
    theme_color: "#5b4ae0",
    orientation: "portrait-primary",
    lang: "es",
    icons: [
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
