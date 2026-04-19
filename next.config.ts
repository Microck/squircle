import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const DEFAULT_ALLOWED_DEV_ORIGINS = ["127.0.0.1", "localhost"];
const extraAllowedDevOrigins = (process.env.ALLOWED_DEV_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedDevOrigins = [...new Set([...DEFAULT_ALLOWED_DEV_ORIGINS, ...extraAllowedDevOrigins])];
const isDevelopment = process.env.NODE_ENV !== "production";
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}`,
  "connect-src 'self' ws: wss:",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  // Keep the committed config local-only; opt into extra dev hosts via ALLOWED_DEV_ORIGINS.
  allowedDevOrigins,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(), payment=(), usb=()" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
  turbopack: {
    root: fileURLToPath(new URL("./", import.meta.url)),
  },
};

export default nextConfig;
