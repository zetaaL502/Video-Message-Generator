import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useVideoStore } from "@/store/use-video-store";
import { Button } from "@/components/ui/button";
import { useExportVideo } from "@workspace/api-client-react";
import { Play, Pause, Download, ChevronLeft, Battery, Wifi, Signal } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export default function PreviewPage() {
  const [, setLocation] = useLocation();
  const { parsedLines, characters, settings, timeline, jobId } = useVideoStore();
  const exportMutation = useExportVideo();

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRefs = useRef<Record<number, HTMLAudioElement>>({});
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // Initialize audio elements
  useEffect(() => {
    if (!jobId) return;
    
    parsedLines.forEach(line => {
      if (!line.isImage) {
        const audio = new Audio(`/api/imessage/audio-file/${jobId}/${line.index}`);
        audioRefs.current[line.index] = audio;
      }
    });

    return () => {
      Object.values(audioRefs.current).forEach(a => a.pause());
    };
  }, [jobId, parsedLines]);

  const totalDuration = timeline.length > 0 
    ? timeline[timeline.length - 1].startTime + timeline[timeline.length - 1].duration + 2000
    : 0;

  const togglePlayback = () => {
    if (isPlaying) {
      setIsPlaying(false);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      Object.values(audioRefs.current).forEach(a => a.pause());
    } else {
      setIsPlaying(true);
      startTimeRef.current = performance.now() - currentTime;
      animationRef.current = requestAnimationFrame(updateTime);
    }
  };

  const updateTime = (time: number) => {
    const elapsed = time - startTimeRef.current;
    if (elapsed >= totalDuration) {
      setIsPlaying(false);
      setCurrentTime(0);
      return;
    }
    
    setCurrentTime(elapsed);
    
    // Play appropriate audio
    timeline.forEach(entry => {
      if (entry.type === "text") {
        const audio = audioRefs.current[entry.lineIndex];
        if (audio && elapsed >= entry.startTime && elapsed < entry.startTime + 100) {
          if (audio.paused) {
            audio.currentTime = 0;
            audio.play().catch(e => console.log(e));
          }
        }
      }
    });

    animationRef.current = requestAnimationFrame(updateTime);
  };

  const handleExport = async () => {
    try {
      const res = await exportMutation.mutateAsync({
        data: {
          jobId: jobId || "no-job",
          timeline,
          settings
        }
      });
      useVideoStore.getState().setExportId(res.exportId);
      setLocation("/export");
    } catch (e) {
      console.error(e);
    }
  };

  // Determine which messages to show based on currentTime
  const visibleMessages = timeline.filter(t => t.startTime <= currentTime);
  const isTyping = timeline.find(t => currentTime >= t.startTime - 800 && currentTime < t.startTime);

  const contactName = parsedLines.length > 0 ? parsedLines.find(l => l.character !== parsedLines[0].character)?.character || parsedLines[0].character : "Contact";
  const contactChar = characters[contactName];

  const myCharacter = parsedLines.length > 0 ? parsedLines[0].character : "Me";

  return (
    <div className="flex h-full flex-col lg:flex-row animate-in fade-in duration-500">
      
      {/* Phone Preview Area */}
      <div className="flex-1 flex items-center justify-center p-8 bg-secondary/5 relative overflow-hidden">
        
        {/* The Phone Bezel */}
        <div className={cn(
          "relative overflow-hidden flex flex-col transition-all duration-300 shadow-2xl",
          settings.format === "9:16" ? "w-[360px] h-[780px]" : "w-[640px] h-[360px]",
          settings.showFrame ? "rounded-[44px] border-[12px] border-zinc-900 bg-zinc-950 shadow-[0_0_0_2px_rgba(255,255,255,0.1)_inset]" : "rounded-none border-none",
          settings.darkMode ? "bg-black" : "bg-white"
        )}>
          
          {/* iOS Status Bar */}
          <div className="h-12 w-full shrink-0 flex justify-between items-center px-6 pt-2 z-20">
            <div className={cn("text-xs font-semibold tracking-wide", settings.darkMode ? "text-white" : "text-black")}>9:41</div>
            
            {/* Dynamic Island (if vertical) */}
            {settings.showFrame && settings.format === "9:16" && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-28 h-7 bg-black rounded-full z-30" />
            )}

            <div className={cn("flex items-center gap-1.5", settings.darkMode ? "text-white" : "text-black")}>
              <Signal className="h-3.5 w-3.5" />
              <Wifi className="h-4 w-4" />
              <Battery className="h-4 w-4" />
            </div>
          </div>

          {/* iMessage Header */}
          <div className={cn(
            "flex flex-col items-center justify-center pb-2 shrink-0 border-b relative z-10 bg-opacity-90 backdrop-blur-md",
            settings.darkMode ? "border-zinc-800 bg-zinc-900/90 text-white" : "border-gray-200 bg-gray-50/90 text-black"
          )}>
            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center text-blue-500 text-sm font-medium">
              <ChevronLeft className="h-6 w-6 -mr-1" />
              <span className="hidden sm:inline">Messages</span>
            </div>
            
            <Avatar className="h-10 w-10 mb-1">
              <AvatarImage src={contactChar?.avatarUrl} />
              <AvatarFallback className="bg-gray-300 text-gray-600 text-xs">
                {contactName.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="text-xs font-medium">{contactName}</div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 overflow-hidden p-4 flex flex-col justify-end gap-1 relative z-0">
            <div className="w-full flex flex-col justify-end space-y-2 translate-y-0 transition-transform">
              
              {visibleMessages.slice(-8).map((msg, i) => {
                const line = parsedLines[msg.lineIndex];
                const isMe = line.character === myCharacter;
                const isLast = i === visibleMessages.length - 1;

                return (
                  <div key={i} className={cn(
                    "flex flex-col max-w-[75%] animate-in slide-in-from-bottom-2 fade-in duration-300",
                    isMe ? "self-end items-end" : "self-start items-start"
                  )}>
                    {line.isImage ? (
                      <div className="rounded-2xl overflow-hidden border border-black/10 max-w-[200px]">
                        <img src={line.imagePath || "https://placehold.co/400x300"} alt="attachment" className="w-full h-auto" />
                      </div>
                    ) : (
                      <div className={cn(
                        "px-4 py-2 text-[15px] leading-snug rounded-2xl relative",
                        isMe 
                          ? (settings.darkMode ? "bg-[#0B84FE] text-white" : "bg-[#34C759] text-white") 
                          : (settings.darkMode ? "bg-[#3A3A3C] text-white" : "bg-[#E9E9EB] text-black"),
                        isMe ? "rounded-br-sm" : "rounded-bl-sm"
                      )}>
                        {line.text}
                      </div>
                    )}
                    {isLast && isMe && (
                      <div className="text-[10px] text-gray-500 mt-1 mr-1">Delivered</div>
                    )}
                  </div>
                );
              })}

              {isTyping && (
                <div className={cn(
                  "self-start px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1 items-center animate-in fade-in w-16 h-9",
                  settings.darkMode ? "bg-[#3A3A3C]" : "bg-[#E9E9EB]"
                )}>
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0ms" }}/>
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "150ms" }}/>
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "300ms" }}/>
                </div>
              )}
            </div>
          </div>

          {/* iMessage Input Bar */}
          <div className={cn(
            "h-16 shrink-0 flex items-center px-4 gap-3 z-10",
            settings.darkMode ? "bg-zinc-900/90 border-zinc-800" : "bg-gray-50/90 border-gray-200"
          )}>
            <div className="h-8 w-8 rounded-full bg-gray-300/30 flex items-center justify-center shrink-0">
              <span className="text-xl leading-none font-bold text-blue-500">+</span>
            </div>
            <div className={cn(
              "flex-1 h-9 rounded-full px-3 flex items-center border",
              settings.darkMode ? "border-zinc-700 bg-black text-gray-400" : "border-gray-300 bg-white text-gray-500"
            )}>
              <span className="text-[15px]">iMessage</span>
            </div>
          </div>

        </div>

      </div>

      {/* Controls Sidebar */}
      <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-border bg-card p-6 flex flex-col justify-between">
        
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-bold">Preview</h3>
            <p className="text-sm text-muted-foreground mt-1">Review timing and layout</p>
          </div>

          <div className="space-y-4 bg-secondary/20 p-4 rounded-xl border border-border">
            <div className="flex items-center justify-center">
              <Button 
                size="icon" 
                variant="outline" 
                className="h-16 w-16 rounded-full border-primary/50 text-primary hover:bg-primary/10 transition-transform active:scale-95"
                onClick={togglePlayback}
              >
                {isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8 ml-1" />}
              </Button>
            </div>
            <div className="text-center text-sm font-medium tabular-nums text-muted-foreground">
              {(currentTime / 1000).toFixed(1)}s / {(totalDuration / 1000).toFixed(1)}s
            </div>
          </div>
        </div>

        <Button 
          size="lg" 
          className="w-full h-14 text-lg font-semibold shadow-lg shadow-primary/20"
          onClick={handleExport}
          disabled={exportMutation.isPending}
        >
          {exportMutation.isPending ? "Starting Export..." : "Export Video"} <Download className="ml-2 h-5 w-5" />
        </Button>

      </div>
    </div>
  );
}