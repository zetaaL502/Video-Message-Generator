import { Router } from "express";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import os from "os";
import { logger } from "../../lib/logger";

const router = Router();

router.post("/imessage/preview-voice", async (req, res): Promise<void> => {
  const { voice, text } = req.body as { voice?: string; text?: string };

  if (!voice) {
    res.status(400).json({ error: "voice is required" });
    return;
  }

  const previewText = text || "Hey how are you doing today";
  const tmpFile = path.join(os.tmpdir(), `preview_${Date.now()}.mp3`);
  const scriptPath = path.resolve(
    import.meta.dirname,
    "../scripts/tts_generate.py"
  );

  const child = spawn("python3", [scriptPath, voice, tmpFile, previewText]);
  let stderr = "";
  child.stderr.on("data", (d) => (stderr += d.toString()));

  child.on("close", (code) => {
    if (code !== 0) {
      logger.warn({ stderr, voice }, "Voice preview generation failed");
      res.status(500).json({ error: "TTS generation failed", detail: stderr });
      return;
    }

    if (!fs.existsSync(tmpFile)) {
      res.status(500).json({ error: "Audio file was not created" });
      return;
    }

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Disposition", 'inline; filename="preview.mp3"');
    const stream = fs.createReadStream(tmpFile);
    stream.pipe(res);
    stream.on("end", () => {
      try {
        fs.unlinkSync(tmpFile);
      } catch (_) {}
    });
  });
});

export default router;
