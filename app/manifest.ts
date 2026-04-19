import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Squircle",
    short_name: "Squircle",
    description: "Browser-only squircle and rounded-corner exports for PNGs and GIFs.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0b10",
    theme_color: "#FDF1EC",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
      {
        src: "/favicon.ico",
        sizes: "48x48",
        type: "image/x-icon",
      },
    ],
  };
}
