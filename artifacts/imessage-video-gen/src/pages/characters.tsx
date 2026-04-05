import { useState } from "react";
import { useLocation } from "wouter";
import { useVideoStore } from "@/store/use-video-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useGetVoices, usePreviewVoice, useUploadMedia } from "@workspace/api-client-react";
import { ArrowRight, ArrowLeft, Play, Pause, Upload, Image as ImageIcon, Music, Video, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export default function CharactersPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { characters, genderMap, updateCharacter, settings, setSettings, setBackgroundMusicId, setBackgroundVideoId, backgroundVideoId, backgroundMusicId } = useVideoStore();
  
  const { data: voicesResponse, isLoading: isLoadingVoices } = useGetVoices();
  const previewVoiceMutation = usePreviewVoice();
  const uploadMediaMutation = useUploadMedia();

  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  const handlePlayPreview = async (voice: string) => {
    if (playingVoice === voice && audioElement) {
      audioElement.pause();
      setPlayingVoice(null);
      return;
    }

    try {
      const blob = await previewVoiceMutation.mutateAsync({
        data: { voice, text: "Hello, this is a voice preview." }
      });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      
      if (audioElement) {
        audioElement.pause();
      }
      
      setAudioElement(audio);
      setPlayingVoice(voice);
      audio.play();
      audio.onended = () => setPlayingVoice(null);
    } catch (e) {
      toast({
        title: "Preview Failed",
        description: "Could not generate voice preview.",
        variant: "destructive"
      });
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>, charName: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const res = await uploadMediaMutation.mutateAsync({
        data: { file, type: "avatar", characterName: charName }
      });
      updateCharacter(charName, { avatarFileId: res.fileId, avatarUrl: res.url });
      toast({ title: "Avatar uploaded" });
    } catch (err) {
      toast({ title: "Upload failed", variant: "destructive" });
    }
  };

  const handleBgVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await uploadMediaMutation.mutateAsync({ data: { file, type: "background_video" }});
      setBackgroundVideoId(res.fileId);
      toast({ title: "Video uploaded" });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    }
  };

  const handleBgMusicUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await uploadMediaMutation.mutateAsync({ data: { file, type: "background_music" }});
      setBackgroundMusicId(res.fileId);
      toast({ title: "Music uploaded" });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    }
  };

  const voices = voicesResponse?.voices || [];

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Characters & Settings</h2>
          <p className="text-muted-foreground">Assign voices, avatars, and configure the video layout.</p>
        </div>
        <div className="flex gap-4">
          <Button variant="outline" onClick={() => setLocation("/script")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <Button onClick={() => setLocation("/generate")} className="shadow-md shadow-primary/20">
            Generate Audio <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <h3 className="text-xl font-semibold border-b border-border pb-2">Cast Setup</h3>
          {Object.entries(genderMap).map(([name, gender]) => {
            const char = characters[name];
            const filteredVoices = voices.filter(v => v.gender.startsWith(gender));
            
            return (
              <Card key={name} className="border-border/50 bg-secondary/20">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="relative group cursor-pointer">
                    <Avatar className="h-16 w-16 border-2 border-border group-hover:border-primary transition-colors">
                      <AvatarImage src={char?.avatarUrl} className="object-cover" />
                      <AvatarFallback className="bg-primary/20 text-primary text-xl font-bold">
                        {name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Upload className="h-5 w-5 text-white" />
                    </div>
                    <Input 
                      type="file" 
                      accept="image/*" 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={(e) => handleAvatarUpload(e, name)}
                    />
                  </div>
                  
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-lg">{name}</div>
                      <div className="text-xs font-medium px-2 py-1 bg-muted rounded-md text-muted-foreground">
                        {gender === "F" ? "Female" : "Male"}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Select 
                        disabled={isLoadingVoices}
                        value={char?.voice || ""} 
                        onValueChange={(val) => updateCharacter(name, { voice: val })}
                      >
                        <SelectTrigger className="w-full bg-background">
                          <SelectValue placeholder="Select a voice" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredVoices.map(v => (
                            <SelectItem key={v.shortName} value={v.shortName}>
                              {v.name.replace("Microsoft ", "")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Button 
                        size="icon" 
                        variant="secondary"
                        disabled={!char?.voice || previewVoiceMutation.isPending}
                        onClick={() => handlePlayPreview(char.voice)}
                        className="shrink-0"
                      >
                        {playingVoice === char?.voice ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="space-y-6">
          <h3 className="text-xl font-semibold border-b border-border pb-2">Global Settings</h3>
          
          <Card className="border-border bg-card">
            <CardContent className="p-6 space-y-6">
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Dark Mode UI</Label>
                  <p className="text-sm text-muted-foreground">Use iOS dark mode colors</p>
                </div>
                <Switch 
                  checked={settings.darkMode} 
                  onCheckedChange={(c) => setSettings({ darkMode: c })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Show Phone Frame</Label>
                  <p className="text-sm text-muted-foreground">Wrap chat in iPhone bezel</p>
                </div>
                <Switch 
                  checked={settings.showFrame} 
                  onCheckedChange={(c) => setSettings({ showFrame: c })}
                />
              </div>

              <div className="space-y-3">
                <Label className="text-base">Video Format</Label>
                <RadioGroup 
                  value={settings.format} 
                  onValueChange={(val: any) => setSettings({ format: val })}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2 border border-border p-3 rounded-lg flex-1 cursor-pointer bg-secondary/20">
                    <RadioGroupItem value="9:16" id="9:16" />
                    <Label htmlFor="9:16" className="cursor-pointer w-full font-medium">9:16 Vertical (TikTok/Reels)</Label>
                  </div>
                  <div className="flex items-center space-x-2 border border-border p-3 rounded-lg flex-1 cursor-pointer bg-secondary/20">
                    <RadioGroupItem value="16:9" id="16:9" />
                    <Label htmlFor="16:9" className="cursor-pointer w-full font-medium">16:9 Landscape (YouTube)</Label>
                  </div>
                </RadioGroup>
              </div>

            </CardContent>
          </Card>

          <h3 className="text-xl font-semibold border-b border-border pb-2 pt-4">Background Media</h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="border border-dashed border-border rounded-xl p-6 flex flex-col items-center justify-center gap-3 bg-secondary/10 relative hover:bg-secondary/30 transition-colors">
              <Video className="h-8 w-8 text-muted-foreground" />
              <div className="text-center">
                <p className="font-medium text-sm">Background Video</p>
                <p className="text-xs text-muted-foreground">Gameplay/Nature (MP4)</p>
              </div>
              {backgroundVideoId && <Badge variant="secondary" className="mt-2 bg-primary/20 text-primary">Uploaded</Badge>}
              <Input type="file" accept="video/mp4" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleBgVideoUpload} />
            </div>

            <div className="border border-dashed border-border rounded-xl p-6 flex flex-col items-center justify-center gap-3 bg-secondary/10 relative hover:bg-secondary/30 transition-colors">
              <Music className="h-8 w-8 text-muted-foreground" />
              <div className="text-center">
                <p className="font-medium text-sm">Background Music</p>
                <p className="text-xs text-muted-foreground">Lo-fi/Trending (MP3)</p>
              </div>
              {backgroundMusicId && <Badge variant="secondary" className="mt-2 bg-primary/20 text-primary">Uploaded</Badge>}
              <Input type="file" accept="audio/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleBgMusicUpload} />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}