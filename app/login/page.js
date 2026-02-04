"use client";

import { Construction, Wrench, HardHat, Cog } from "lucide-react";

export default function UnderConstruction() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-base-300 via-base-200 to-base-300 p-8">
      <div className="text-center max-w-lg">
        {/* Animated icons */}
        <div className="relative flex justify-center items-center mb-8">
          {/* Spinning cog - left */}
          <div className="absolute -left-4 top-0 animate-spin-slow">
            <Cog className="w-12 h-12 text-warning opacity-60" />
          </div>

          {/* Main construction icon */}
          <div className="relative z-10 bg-warning/20 p-6 rounded-full animate-pulse">
            <Construction className="w-24 h-24 text-warning" />
          </div>

          {/* Spinning cog - right */}
          <div className="absolute -right-4 top-0 animate-spin-slow-reverse">
            <Cog className="w-12 h-12 text-warning opacity-60" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-4xl font-bold text-base-content mb-4">
          Under Construction
        </h1>

        {/* Subtitle */}
        <p className="text-lg text-base-content/70 mb-8">
          We're building something amazing. Check back soon!
        </p>

        {/* Decorative tools */}
        <div className="flex justify-center gap-6 mb-8">
          <div className="tooltip" data-tip="Working hard">
            <Wrench className="w-8 h-8 text-primary animate-bounce" style={{ animationDelay: "0ms" }} />
          </div>
          <div className="tooltip" data-tip="Safety first">
            <HardHat className="w-8 h-8 text-secondary animate-bounce" style={{ animationDelay: "150ms" }} />
          </div>
          <div className="tooltip" data-tip="Building">
            <Construction className="w-8 h-8 text-accent animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full max-w-xs mx-auto">
          <div className="flex justify-between text-sm text-base-content/60 mb-2">
            <span>Progress</span>
            <span>Loading...</span>
          </div>
          <progress className="progress progress-warning w-full" />
        </div>
      </div>

      {/* Custom animations */}
      <style jsx>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes spin-slow-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        :global(.animate-spin-slow) {
          animation: spin-slow 8s linear infinite;
        }
        :global(.animate-spin-slow-reverse) {
          animation: spin-slow-reverse 8s linear infinite;
        }
      `}</style>
    </main>
  );
}
