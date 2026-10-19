"use client";

import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";

const PixelSnowBackground = dynamic(
  () => import("@/components/backgrounds/pixel-snow").then((module) => module.PixelSnowBackground),
  { ssr: false },
);
const reducedMotionQuery = "(prefers-reduced-motion: reduce)";
function subscribe(listener: () => void) {
  const query = window.matchMedia(reducedMotionQuery);
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}
function getSnapshot() {
  return window.matchMedia(reducedMotionQuery).matches;
}
function getServerSnapshot() {
  return true;
}

export function BackgroundLayer() {
  const reduceMotion = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return reduceMotion ? null : <PixelSnowBackground />;
}
