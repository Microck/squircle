import Image from "next/image";
import { PixelSnowBackground } from "@/components/backgrounds/pixel-snow";
import { SquircleEditor } from "@/components/editor";

export default function Home() {
  return (
    <main className="relative min-h-dvh overflow-x-hidden bg-background text-foreground">
      <PixelSnowBackground />
      <div className="relative z-10 flex min-h-dvh flex-col items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-3xl mx-auto flex flex-col items-center px-4 sm:px-0">
          <a
            aria-label="Open the Squircle GitHub repository"
            className="mb-12 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            href="https://github.com/Microck/squircle"
            rel="noreferrer"
            target="_blank"
            title="Open the Squircle GitHub repository"
          >
            <Image
              alt="Squircle Logo"
              className="h-20 w-20"
              height={80}
              priority
              src="/logo.svg"
              width={80}
            />
          </a>
          <SquircleEditor />
        </div>
      </div>
    </main>
  );
}
