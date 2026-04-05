import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useVideoStore } from "@/store/use-video-store";
import { useGetExportProgress } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Download, Loader2, AlertCircle, Home } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function ExportPage() {
  const [, setLocation] = useLocation();
  const { exportId } = useVideoStore();

  const { data: progressData } = useGetExportProgress(exportId || "", {
    query: {
      enabled: !!exportId,
      refetchInterval: (query) => {
        const state = query.state.data;
        if (!state) return 1000;
        return (state.status === "done" || state.status === "error") ? false : 1000;
      }
    }
  });

  const isDone = progressData?.status === "done";
  const isError = progressData?.status === "error" || (!exportId);
  const percent = progressData?.progress || 0;

  const handleDownload = () => {
    if (!exportId) return;
    window.open(`/api/imessage/download/${exportId}`, "_blank");
  };

  return (
    <div className="p-8 max-w-2xl mx-auto h-full flex flex-col justify-center animate-in fade-in duration-500">
      
      <div className="text-center space-y-4 mb-12">
        <h2 className="text-4xl font-bold tracking-tight">Rendering Video</h2>
        <p className="text-lg text-muted-foreground">Combining audio, frames, and background media in the cloud.</p>
      </div>

      <Card className="border-border shadow-2xl shadow-primary/10 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-primary" />
        <CardContent className="p-10 space-y-10">
          
          <div className="space-y-4">
            <div className="flex justify-between items-end font-medium">
              <div className="flex items-center gap-2">
                {isDone ? <CheckCircle2 className="text-green-500 h-5 w-5" /> : 
                 isError ? <AlertCircle className="text-destructive h-5 w-5" /> :
                 <Loader2 className="text-primary h-5 w-5 animate-spin" />}
                <span className="text-lg">
                  {isDone ? "Render Complete!" : 
                   isError ? "Render Failed" : 
                   "Processing FFmpeg timeline..."}
                </span>
              </div>
              <span className="text-3xl font-bold text-primary tabular-nums">{Math.round(percent)}%</span>
            </div>
            
            <Progress value={percent} className="h-4 bg-secondary/50" />
          </div>

          {isError && (
            <Alert variant="destructive" className="bg-destructive/10 border-destructive/20">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Export Failed</AlertTitle>
              <AlertDescription>
                {progressData?.errorMessage || "There was a problem rendering your video."}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Button 
              size="lg" 
              className="flex-1 h-14 text-lg font-semibold shadow-lg shadow-primary/20"
              onClick={handleDownload}
              disabled={!isDone}
            >
              Download MP4 <Download className="ml-2 h-5 w-5" />
            </Button>

            {isDone && (
              <Button 
                variant="outline" 
                size="lg"
                className="h-14 px-8"
                onClick={() => {
                  window.location.href = "/";
                }}
              >
                Create Another <Home className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>

        </CardContent>
      </Card>
      
    </div>
  );
}