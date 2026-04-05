import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useVideoStore, TimelineEntry } from "@/store/use-video-store";
import { Button } from "@/components/ui/button";
import { useExportVideo } from "@workspace/api-client-react";
import { Play, Pause, Download, ChevronLeft, ChevronRight, Battery, Wifi, Signal, Video } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export default function PreviewPage() {
  const [, setLocation] = useLocation();
  const {
    parsedLines, characters, settings, timeline, jobId,
    backgroundVideoId, contactName: storeContactName, contactStatus,
  } = useVideoStore();
  const exportMutation = useExportVideo();

  const [isPlaying, setIsPlaying] = useState(false);
  const [visibleCount, setVisibleCount] = useState(0);
  const [showTyping, setShowTyping] = useState(false);

  const audioRefs = useRef<Record<number, HTMLAudioElement>>({});
  const playbackRef = useRef(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const bgVideoRef = useRef<HTMLVideoElement>(null);

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

  // Scroll to bottom when messages appear
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [visibleCount, showTyping]);

  const myCharacter = parsedLines.length > 0 ? parsedLines[0].character : "Me";
  const derivedContact = parsedLines.find(l => l.character !== myCharacter)?.character
    || parsedLines[0]?.character
    || "Contact";
  const contactDisplayName = storeContactName || derivedContact;
  const contactChar = characters[derivedContact];

  const playAudioForEntry = (entry: TimelineEntry, idx: number) => {
    if (entry.type === "text") {
      const audio = audioRefs.current[entry.lineIndex];
      if (audio) {
        audio.currentTime = 0;
        audio.onended = () => {
          if (playbackRef.current) playSequence(idx + 1);
        };
        audio.play().catch(() => {
          if (playbackRef.current)
            setTimeout(() => playSequence(idx + 1), entry.duration || 2000);
        });
      } else {
        setTimeout(() => {
          if (playbackRef.current) playSequence(idx + 1);
        }, entry.duration || 2000);
      }
    } else {
      // Image/video — fixed 3 second display
      setTimeout(() => {
        if (playbackRef.current) playSequence(idx + 1);
      }, 3000);
    }
  };

  const playSequence = (idx: number) => {
    if (!playbackRef.current || idx >= timeline.length) {
      setIsPlaying(false);
      setShowTyping(false);
      playbackRef.current = false;
      return;
    }

    const entry = timeline[idx];
    const line = parsedLines[entry.lineIndex];
    const isMe = line.character === myCharacter;
    const prevLine = idx > 0 ? parsedLines[timeline[idx - 1].lineIndex] : null;
    const sameChar = prevLine?.character === line.character;

    if (!isMe && !sameChar) {
      // Show typing indicator 0.8s before revealing received message
      setShowTyping(true);
      typingTimerRef.current = setTimeout(() => {
        if (!playbackRef.current) return;
        setShowTyping(false);
        setVisibleCount(idx + 1);
        playAudioForEntry(entry, idx);
      }, 800);
    } else {
      // Sent messages or consecutive same-character: small gap only
      typingTimerRef.current = setTimeout(() => {
        if (!playbackRef.current) return;
        setVisibleCount(idx + 1);
        playAudioForEntry(entry, idx);
      }, sameChar ? 300 : 80);
    }
  };

  const startPlayback = () => {
    Object.values(audioRefs.current).forEach(a => {
      a.pause();
      a.currentTime = 0;
    });
    setVisibleCount(0);
    setShowTyping(false);
    playbackRef.current = true;
    setIsPlaying(true);
    if (bgVideoRef.current) {
      bgVideoRef.current.currentTime = 0;
      bgVideoRef.current.play().catch(() => {});
    }
    playSequence(0);
  };

  const stopPlayback = () => {
    playbackRef.current = false;
    setIsPlaying(false);
    setShowTyping(false);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    Object.values(audioRefs.current).forEach(a => a.pause());
    bgVideoRef.current?.pause();
  };

  const togglePlayback = () => {
    if (isPlaying) stopPlayback();
    else startPlayback();
  };

  const handleExport = async () => {
    try {
      const res = await exportMutation.mutateAsync({
        data: { jobId: jobId || "no-job", timeline, settings }
      });
      useVideoStore.getState().setExportId(res.exportId);
      setLocation("/export");
    } catch (e) {
      console.error(e);
    }
  };

  // Show only last 6 messages
  const visibleMessages = timeline.slice(0, visibleCount);
  const displayedMessages = visibleMessages.slice(-6);

  // Theme colors
  const chatBg = settings.darkMode ? "#000000" : "#FFFFFF";
  const sentBg = settings.darkMode ? "#0B84FE" : "#34C759";
  const recvBg = settings.darkMode ? "#3A3A3C" : "#E9E9EB";
  const sentText = "#FFFFFF";
  const recvText = settings.darkMode ? "#FFFFFF" : "#000000";

  return (
    <div className="flex h-full flex-col lg:flex-row animate-in fade-in duration-500">

      {/* Phone Preview Area */}
      <div className="flex-1 flex items-center justify-center p-6 relative overflow-hidden bg-zinc-950">

        {/* Background Video */}
        {backgroundVideoId && (
          <video
            ref={bgVideoRef}
            src={`/api/imessage/media/${backgroundVideoId}`}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ opacity: 0.75 }}
            loop
            playsInline
          />
        )}
        {!backgroundVideoId && (
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900" />
        )}

        {/* iPhone Bezel */}
        <div
          className={cn(
            "relative z-10 flex flex-col shadow-2xl overflow-hidden",
            settings.format === "9:16" ? "w-[310px] h-[672px]" : "w-[620px] h-[350px]",
            settings.showFrame
              ? "rounded-[44px] border-[10px] border-zinc-900"
              : "rounded-none border-none",
          )}
          style={{
            background: chatBg,
            boxShadow: settings.showFrame
              ? "0 0 0 1px #444 inset, 0 40px 100px rgba(0,0,0,0.9)"
              : undefined,
          }}
        >
          {/* Physical side buttons */}
          {settings.showFrame && settings.format === "9:16" && (
            <>
              <div className="absolute -left-[13px] top-[96px] w-[3px] h-[30px] bg-zinc-700 rounded-l" />
              <div className="absolute -left-[13px] top-[138px] w-[3px] h-[50px] bg-zinc-700 rounded-l" />
              <div className="absolute -left-[13px] top-[198px] w-[3px] h-[50px] bg-zinc-700 rounded-l" />
              <div className="absolute -right-[13px] top-[130px] w-[3px] h-[70px] bg-zinc-700 rounded-r" />
            </>
          )}

          {/* iOS Status Bar */}
          <div className="h-10 w-full shrink-0 flex justify-between items-center px-5 relative z-20">
            {settings.showFrame && settings.format === "9:16" && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full z-30" />
            )}
            <span className={cn("text-[12px] font-semibold tabular-nums z-10", settings.darkMode ? "text-white" : "text-black")}>
              9:41
            </span>
            <div className={cn("flex items-center gap-1 z-10", settings.darkMode ? "text-white" : "text-black")}>
              <Signal className="h-3 w-3" />
              <Wifi className="h-3 w-3" />
              <Battery className="h-[14px] w-[14px]" />
            </div>
          </div>

          {/* iMessage Header */}
          <div
            className={cn(
              "shrink-0 border-b",
              settings.darkMode ? "border-zinc-800" : "border-gray-200"
            )}
            style={{
              background: settings.darkMode ? "rgba(28,28,30,0.96)" : "rgba(249,249,249,0.96)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
            }}
          >
            {/* Top row: back + badge | video icon */}
            <div className="flex items-center justify-between px-3 pt-1 pb-0.5">
              <div className="flex items-center gap-1">
                <button className="flex items-center text-[#007AFF] -ml-1">
                  <ChevronLeft className="h-5 w-5" />
                  <span className="text-[14px] font-medium -ml-0.5">Messages</span>
                </button>
                <div
                  className="ml-1 text-white text-[9px] font-bold rounded-full flex items-center justify-center"
                  style={{
                    background: "#007AFF",
                    minWidth: 18,
                    height: 18,
                    padding: "0 4px",
                  }}
                >
                  99+
                </div>
              </div>
              <button className="text-[#007AFF]">
                <Video className="h-5 w-5" />
              </button>
            </div>

            {/* Center: avatar + name + status */}
            <div className="flex flex-col items-center pb-2">
              <Avatar className="h-11 w-11 mb-0.5">
                <AvatarImage src={contactChar?.avatarUrl} className="object-cover" />
                <AvatarFallback
                  className={cn(
                    "text-[13px] font-bold",
                    settings.darkMode ? "bg-zinc-600 text-white" : "bg-gray-300 text-gray-700"
                  )}
                >
                  {contactDisplayName.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-0.5">
                <span className={cn("text-[13px] font-semibold", settings.darkMode ? "text-white" : "text-black")}>
                  {contactDisplayName}
                </span>
                <ChevronRight className={cn("h-3.5 w-3.5", settings.darkMode ? "text-gray-500" : "text-gray-400")} />
              </div>
              {contactStatus && (
                <span className="text-[10px] text-gray-400 mt-0.5">{contactStatus}</span>
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div
            className="flex-1 overflow-y-auto px-3 py-2"
            style={{ background: chatBg, scrollBehavior: "smooth" }}
          >
            <div className="flex flex-col gap-1 justify-end min-h-full pb-1">

              {displayedMessages.map((msg, i) => {
                const line = parsedLines[msg.lineIndex];
                const isMe = line.character === myCharacter;

                // Grouping: detect first/last in a run of same-character bubbles
                const prevLine = i > 0 ? parsedLines[displayedMessages[i - 1].lineIndex] : null;
                const nextLine = i < displayedMessages.length - 1
                  ? parsedLines[displayedMessages[i + 1].lineIndex]
                  : null;
                const isLastInGroup = !nextLine || nextLine.character !== line.character;

                if (line.isImage) {
                  return (
                    <div
                      key={`${msg.lineIndex}-${i}`}
                      className={cn(
                        "flex max-w-[72%] imsg-bubble-in",
                        isMe ? "self-end" : "self-start"
                      )}
                    >
                      <div className="rounded-2xl overflow-hidden">
                        <img
                          src={line.imagePath || "https://placehold.co/200x150/888/fff?text=Image"}
                          alt="attachment"
                          className="max-w-[180px] h-auto block"
                        />
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={`${msg.lineIndex}-${i}`}
                    className={cn(
                      "flex flex-col max-w-[72%] imsg-bubble-in",
                      isMe ? "self-end items-end" : "self-start items-start"
                    )}
                  >
                    <div className="relative" style={{ paddingRight: isMe && isLastInGroup ? 8 : 0, paddingLeft: !isMe && isLastInGroup ? 8 : 0 }}>

                      {/* The bubble */}
                      <div
                        className="px-3.5 py-[7px] text-[14.5px] leading-snug"
                        style={{
                          background: isMe ? sentBg : recvBg,
                          color: isMe ? sentText : recvText,
                          borderRadius: isMe
                            ? (isLastInGroup ? "18px 18px 4px 18px" : "18px")
                            : (isLastInGroup ? "18px 18px 18px 4px" : "18px"),
                          fontFamily: '-apple-system, "SF Pro Text", BlinkMacSystemFont, "Helvetica Neue", sans-serif',
                          position: "relative",
                          zIndex: 1,
                        }}
                      >
                        {line.text}
                      </div>

                      {/* Tail for sent (right) bubble — only on last in group */}
                      {isLastInGroup && isMe && (
                        <>
                          <div style={{
                            position: "absolute", bottom: 0, right: 0,
                            width: 10, height: 14,
                            background: sentBg,
                            zIndex: 0,
                          }} />
                          <div style={{
                            position: "absolute", bottom: -1, right: -8,
                            width: 12, height: 16,
                            background: chatBg,
                            borderBottomLeftRadius: 9,
                            zIndex: 2,
                          }} />
                        </>
                      )}

                      {/* Tail for received (left) bubble — only on last in group */}
                      {isLastInGroup && !isMe && (
                        <>
                          <div style={{
                            position: "absolute", bottom: 0, left: 0,
                            width: 10, height: 14,
                            background: recvBg,
                            zIndex: 0,
                          }} />
                          <div style={{
                            position: "absolute", bottom: -1, left: -8,
                            width: 12, height: 16,
                            background: chatBg,
                            borderBottomRightRadius: 9,
                            zIndex: 2,
                          }} />
                        </>
                      )}
                    </div>

                    {/* Delivered text for last sent message */}
                    {i === displayedMessages.length - 1 && isMe && (
                      <div className="text-[10px] text-gray-400 mt-0.5 mr-2">Delivered</div>
                    )}
                  </div>
                );
              })}

              {/* Typing indicator */}
              {showTyping && (
                <div className="self-start imsg-bubble-in">
                  <div
                    className="flex gap-1 items-center px-3.5 py-[9px]"
                    style={{
                      background: recvBg,
                      borderRadius: "18px 18px 18px 4px",
                      width: 54,
                      height: 33,
                    }}
                  >
                    {[0, 160, 320].map((delay) => (
                      <div
                        key={delay}
                        className="rounded-full"
                        style={{
                          width: 7, height: 7,
                          background: "#8E8E93",
                          animation: "typingBounce 1.2s ease-in-out infinite",
                          animationDelay: `${delay}ms`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>
          </div>

          {/* iMessage Input Bar */}
          <div
            className={cn(
              "h-[52px] shrink-0 flex items-center px-3 gap-2 border-t",
              settings.darkMode ? "border-zinc-800" : "border-gray-200"
            )}
            style={{
              background: settings.darkMode ? "rgba(28,28,30,0.97)" : "rgba(249,249,249,0.97)",
            }}
          >
            <div className="h-7 w-7 rounded-full flex items-center justify-center shrink-0"
              style={{ background: settings.darkMode ? "#2C2C2E" : "#E5E5EA" }}>
              <span className="text-[18px] leading-none font-light text-[#007AFF]">+</span>
            </div>
            <div
              className={cn(
                "flex-1 h-[30px] rounded-full px-3.5 flex items-center text-[14px] border",
                settings.darkMode ? "border-zinc-600 text-gray-500" : "border-gray-300 text-gray-400"
              )}
              style={{ background: settings.darkMode ? "#1C1C1E" : "#FFFFFF" }}
            >
              iMessage
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
            <div className="text-center text-sm font-medium text-muted-foreground tabular-nums">
              Message {Math.min(visibleCount, timeline.length)} / {timeline.length}
            </div>
          </div>

          {/* Message preview list */}
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {timeline.map((entry, i) => {
              const line = parsedLines[entry.lineIndex];
              const isMe = line?.character === myCharacter;
              const done = i < visibleCount;
              return (
                <div
                  key={i}
                  className={cn(
                    "flex items-center gap-2 text-xs px-2 py-1.5 rounded-md transition-colors",
                    done ? "text-foreground" : "text-muted-foreground",
                    i === visibleCount - 1 && "bg-primary/10 text-primary"
                  )}
                >
                  <div className={cn(
                    "h-1.5 w-1.5 rounded-full shrink-0",
                    done ? (isMe ? "bg-green-500" : "bg-blue-500") : "bg-muted-foreground/30"
                  )} />
                  <span className="font-medium w-20 truncate shrink-0">{line?.character}</span>
                  <span className="truncate">{line?.text?.substring(0, 30)}{(line?.text?.length || 0) > 30 ? "…" : ""}</span>
                </div>
              );
            })}
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
