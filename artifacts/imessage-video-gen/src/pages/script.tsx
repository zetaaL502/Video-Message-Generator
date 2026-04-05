import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useVideoStore, Gender, ScriptLine } from "@/store/use-video-store";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, ArrowRight, User } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function ScriptPage() {
  const [, setLocation] = useLocation();
  const { scriptText, setScriptText, setGenderMap, setParsedLines, characters, updateCharacter } = useVideoStore();
  const [error, setError] = useState<string | null>(null);

  const [localScript, setLocalScript] = useState(scriptText || "Sarah=F, Michael=M\nSarah: Hey! Are we still on for tonight?\nMichael: Yeah definitely. 7pm at the usual spot?");
  
  const [detectedGenders, setDetectedGenders] = useState<Record<string, Gender>>({});
  const [detectedLines, setDetectedLines] = useState<ScriptLine[]>([]);

  useEffect(() => {
    // Parse script live
    try {
      if (!localScript.trim()) {
        setDetectedGenders({});
        setDetectedLines([]);
        setError(null);
        return;
      }

      const lines = localScript.split("\n").filter((l) => l.trim().length > 0);
      if (lines.length === 0) {
        throw new Error("Script is empty");
      }

      const firstLine = lines[0];
      const genderMap: Record<string, Gender> = {};
      
      if (!firstLine.includes("=")) {
        throw new Error("First line must be a gender map, e.g., 'Sarah=F, Michael=M'");
      }

      const parts = firstLine.split(",");
      for (const part of parts) {
        const [name, gender] = part.split("=").map((s) => s.trim());
        if (!name || (gender !== "M" && gender !== "F")) {
          throw new Error("Invalid gender map format. Use 'Name=M' or 'Name=F'.");
        }
        genderMap[name] = gender as Gender;
      }

      setDetectedGenders(genderMap);

      const parsed: ScriptLine[] = [];
      let index = 0;
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const colonIdx = line.indexOf(":");
        if (colonIdx === -1) {
          throw new Error(`Line ${i + 1} is missing a colon (:). Format: "Name: message"`);
        }
        
        const character = line.substring(0, colonIdx).trim();
        let text = line.substring(colonIdx + 1).trim();
        
        if (!genderMap[character]) {
          throw new Error(`Character "${character}" not found in gender map.`);
        }

        let isImage = false;
        let imagePath = undefined;

        if (text.startsWith("[img:") && text.endsWith("]")) {
          isImage = true;
          imagePath = text.substring(5, text.length - 1).trim();
        }

        parsed.push({
          index,
          character,
          text,
          isImage,
          imagePath,
        });
        index++;
      }

      setDetectedLines(parsed);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  }, [localScript]);

  const handleNext = () => {
    if (error || detectedLines.length === 0) return;
    
    setScriptText(localScript);
    setGenderMap(detectedGenders);
    setParsedLines(detectedLines);

    // Initialize characters if not present
    Object.entries(detectedGenders).forEach(([name, gender]) => {
      if (!characters[name]) {
        updateCharacter(name, { gender, voice: gender === "F" ? "en-US-AriaNeural" : "en-US-GuyNeural" });
      }
    });

    setLocation("/characters");
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Script Input</h2>
        <p className="text-muted-foreground">Write your iMessage conversation script. First line must define character genders.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-primary/20 shadow-lg shadow-primary/5">
          <CardHeader>
            <CardTitle>Conversation Editor</CardTitle>
            <CardDescription>Format: Character: message or Character: [img: url]</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea 
              className="font-mono min-h-[400px] bg-secondary/30 resize-y border-muted focus-visible:ring-primary" 
              value={localScript}
              onChange={(e) => setLocalScript(e.target.value)}
              placeholder={"Sarah=F, Michael=M\nSarah: Hey!\nMichael: Hello!"}
            />
            
            {error && (
              <Alert variant="destructive" className="bg-destructive/10 border-destructive/20">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error parsing script</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button 
              size="lg" 
              className="w-full text-lg shadow-md shadow-primary/20 hover:shadow-primary/40 transition-all"
              onClick={handleNext}
              disabled={!!error || detectedLines.length === 0}
            >
              Setup Characters <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-border bg-card/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Detected Characters</CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(detectedGenders).length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-8">
                  No characters detected yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(detectedGenders).map(([name, gender]) => (
                    <div key={name} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border/50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                          <User className="h-4 w-4" />
                        </div>
                        <span className="font-medium">{name}</span>
                      </div>
                      <Badge variant="outline" className={gender === "F" ? "border-pink-500/30 text-pink-400" : "border-blue-500/30 text-blue-400"}>
                        {gender === "F" ? "Female" : "Male"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-card/50">
             <CardHeader className="pb-4">
              <CardTitle className="text-lg">Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-secondary/50">
                  <span className="text-3xl font-bold text-primary">{detectedLines.length}</span>
                  <span className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">Lines</span>
                </div>
                <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-secondary/50">
                  <span className="text-3xl font-bold text-primary">{Object.keys(detectedGenders).length}</span>
                  <span className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">Cast</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}