import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useVideoStore, TimelineEntry } from "@/store/use-video-store";
import { useGenerateAudio, useGetAudioProgress, AudioProgressResponseStatus } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Loader2, AlertCircle, ArrowLeft, ArrowRight } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function GeneratePage() {
  const [, setLocation] = useLocation();
  const { parsedLines, characters, jobId, setJobId, setTimeline } = useVideoStore();
  const generateMutation = useGenerateAudio();
  const hasStarted = useRef(false);

  const { data: progressData } = useGetAudioProgress(jobId || "", {
    query: {
      enabled: !!jobId,
      refetchInterval: (query) => {
        const state = query.state.data;
        if (!state) return 1000;
        return (state.status === "done" || state.status === "error") ? false : 1000;
      }
    }
  });

  useEffect(() => {
    const startGeneration = async () => {
      if (hasStarted.current || jobId || parsedLines.length === 0) return;
      hasStarted.current = true;
      
      try {
        const linesPayload = parsedLines.filter(l => !l.isImage).map((line) => ({
          index: line.index,
          character: line.character,
          text: line.text,
          voice: characters[line.character]?.voice || "en-US-AriaNeural"
        }));

        if (linesPayload.length === 0) {
          // All images? Just skip to preview
          buildTimeline({}, true);
          setLocation("/preview");
          return;
        }

        const res = await generateMutation.mutateAsync({ data: { lines: linesPayload } });
        setJobId(res.jobId);
      } catch (e) {
        console.error(e);
      }
    };

    startGeneration();
  }, [parsedLines, characters, jobId, generateMutation, setJobId, setLocation]);

  useEffect(() => {
    if (progressData?.status === "done") {
      buildTimeline(progressData.durations);
    }
  }, [progressData?.status]);

  const buildTimeline = (durations: Record<string, number>, skipAudio = false) => {
    const timeline: TimelineEntry[] = [];
    let currentTime = 0;

    for (const line of parsedLines) {
      if (line.isImage) {
        timeline.push({
          lineIndex: line.index,
          startTime: currentTime,
          duration: 3000, // 3 seconds for images
          type: "image"
        });
        currentTime += 3000;
      } else {
        const duration = skipAudio ? 2000 : (durations[line.index.toString()] || 2000);
        timeline.push({
          lineIndex: line.index,
          startTime: currentTime,
          duration,
          type: "text"
        });
        currentTime += duration;
      }
      
      // Add pause between messages
      currentTime += 800; // 0.8s gap
    }
    setTimeline(timeline);
  };

  const isDone = progressData?.status === "done";
  const isError = progressData?.status === "error" || generateMutation.isError;
  
  const completed = progressData?.completed || 0;
  const totalTextLines = parsedLines.filter(l => !l.isImage).length;
  const total = progressData?.total || totalTextLines || 1;
  const progressPercent = Math.min(100, Math.round((completed / total) * 100));

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="text-center space-y-4 py-8">
        <h2 className="text-3xl font-bold tracking-tight">Generating Audio</h2>
        <p className="text-muted-foreground">Synthesizing realistic voices for your conversation...</p>
      </div>

      <Card className="border-border shadow-xl shadow-primary/5">
        <CardContent className="p-8 space-y-8">
          
          <div className="space-y-3">
            <div className="flex justify-between text-sm font-medium">
              <span>{isDone ? "Complete" : "Processing lines..."}</span>
              <span className="text-primary">{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-3" />
            <p className="text-xs text-muted-foreground text-center">
              {completed} of {total} lines generated
            </p>
          </div>

          {isError && (
            <Alert variant="destructive" className="bg-destructive/10 border-destructive/20">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Generation Failed</AlertTitle>
              <AlertDescription>
                There was an error synthesizing the audio. Please go back and try again.
              </AlertDescription>
            </Alert>
          )}

          <ScrollArea className="h-[300px] border border-border rounded-md bg-secondary/20 p-4">
            <div className="space-y-3">
              {parsedLines.map((line) => {
                if (line.isImage) {
                  return (
                    <div key={line.index} className="flex items-center gap-3 text-sm p-2 rounded bg-background/50">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="font-medium w-24 truncate">{line.character}</span>
                      <span className="text-muted-foreground truncate flex-1">[Image attached]</span>
                    </div>
                  );
                }

                const lineStatus = progressData?.durations[line.index] ? "done" 
                                 : progressData?.failedLines?.includes(line.index) ? "error"
                                 : "pending";

                return (
                  <div key={line.index} className="flex items-center gap-3 text-sm p-2 rounded bg-background/50">
                    {lineStatus === "done" ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                     : lineStatus === "error" ? <AlertCircle className="h-4 w-4 text-destructive" />
                     : <Loader2 className="h-4 w-4 text-primary animate-spin" />}
                    
                    <span className="font-medium w-24 truncate">{line.character}</span>
                    <span className="text-muted-foreground truncate flex-1">"{line.text}"</span>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <div className="flex justify-between pt-4">
            <Button variant="ghost" onClick={() => setLocation("/characters")}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Cancel
            </Button>
            
            <Button 
              size="lg" 
              onClick={() => setLocation("/preview")}
              disabled={!isDone}
              className="shadow-primary/20 shadow-md"
            >
              Continue to Preview <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}