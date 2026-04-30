import type { Metadata, Viewport } from "next";
import { Fraunces, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-heading",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://squircle.micr.dev"),
  title: "Squircle - Rounded and squircle PNG exports in your browser",
  description:
    "Drop images, dial in rounded or squircle corners, and export transparent PNGs locally with no upload step.",
  applicationName: "Squircle",
  manifest: "/manifest.webmanifest",
  authors: [{ name: "Microck", url: "https://micr.dev" }],
  creator: "Microck",
  keywords: [
    "image corner editor",
    "squircle generator",
    "rounded corners png",
    "browser image tool",
  ],
  openGraph: {
    title: "Squircle",
    description:
      "Rounded corners or true squircles, rendered locally and exported as lossless PNGs.",
    siteName: "Squircle",
    type: "website",
    url: "https://squircle.micr.dev",
  },
  twitter: {
    card: "summary_large_image",
    title: "Squircle",
    description:
      "A browser-only image tool for rounded corners, squircles, and clean PNG exports.",
  },
};

export const viewport: Viewport = {
  themeColor: "#FDF1EC",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "dark h-full antialiased",
        geistMono.variable,
        inter.variable,
        fraunces.variable,
      )}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
