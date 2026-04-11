import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["100.124.44.113", "127.0.0.1", "localhost", "0.0.0.0"],
  turbopack: {
    root: fileURLToPath(new URL("./", import.meta.url)),
  },
};

export default nextConfig;
