import React from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useVideoStore } from "@/store/use-video-store";

interface Step {
  title: string;
  path: string;
  description: string;
}

const STEPS: Step[] = [
  { title: "Script Input", path: "/script", description: "Write your conversation" },
  { title: "Characters", path: "/characters", description: "Assign voices & avatars" },
  { title: "Generate Audio", path: "/generate", description: "Create voice lines" },
  { title: "Preview", path: "/preview", description: "Watch the conversation" },
  { title: "Export", path: "/export", description: "Render final video" },
];

export function WizardLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const currentStepIndex = STEPS.findIndex((s) => location.startsWith(s.path));

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-sidebar shrink-0 p-6 flex flex-col h-screen sticky top-0">
        <div className="mb-8">
          <h1 className="text-xl font-bold tracking-tight text-primary">ClipGoat<span className="text-foreground">Gen</span></h1>
          <p className="text-xs text-muted-foreground mt-1 tracking-wider uppercase">iMessage Video Studio</p>
        </div>

        <nav className="space-y-6 flex-1">
          {STEPS.map((step, i) => {
            const isActive = i === currentStepIndex;
            const isPast = i < currentStepIndex;
            const isFuture = i > currentStepIndex;

            return (
              <div key={step.path} className="relative">
                {i < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "absolute left-3 top-8 bottom-[-24px] w-px",
                      isPast ? "bg-primary" : "bg-border"
                    )}
                  />
                )}
                <Link
                  href={step.path}
                  className={cn(
                    "flex gap-3 items-start group relative z-10 transition-colors",
                    isFuture ? "pointer-events-none opacity-50" : "cursor-pointer"
                  )}
                >
                  <div
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium border-2 shrink-0 transition-colors",
                      isActive
                        ? "bg-primary border-primary text-primary-foreground shadow-[0_0_10px_rgba(0,180,255,0.5)]"
                        : isPast
                        ? "bg-primary/20 border-primary text-primary"
                        : "bg-transparent border-border text-muted-foreground"
                    )}
                  >
                    {i + 1}
                  </div>
                  <div className="pt-0.5">
                    <p
                      className={cn(
                        "text-sm font-medium leading-none",
                        isActive ? "text-foreground font-semibold" : "text-muted-foreground group-hover:text-foreground transition-colors"
                      )}
                    >
                      {step.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {step.description}
                    </p>
                  </div>
                </Link>
              </div>
            );
          })}
        </nav>

        <div className="mt-auto pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground">Version 1.0.0</p>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <div className="flex-1 overflow-auto bg-card">
          {children}
        </div>
      </main>
    </div>
  );
}