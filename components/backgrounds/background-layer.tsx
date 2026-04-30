"use client";

import dynamic from "next/dynamic";

const PixelSnowBackground = dynamic(
  () => import("@/components/backgrounds/pixel-snow").then((module) => module.PixelSnowBackground),
  { ssr: false },
);

export function BackgroundLayer() {
  return <PixelSnowBackground />;
}
