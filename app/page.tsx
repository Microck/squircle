import { PixelSnowBackground } from "@/components/backgrounds/pixel-snow";
import { SquircleEditor } from "@/components/editor";

export default function Home() {
  return (
    <main className="relative min-h-dvh overflow-x-hidden bg-background text-foreground">
      <PixelSnowBackground />
      <div className="relative z-10 flex min-h-dvh flex-col items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-3xl mx-auto flex flex-col items-center px-4 sm:px-0">
          <img src="/logo.svg" alt="Squircle Logo" className="w-20 h-20 mb-12" />
          <SquircleEditor />
        </div>
      </div>
    </main>
  );
}
