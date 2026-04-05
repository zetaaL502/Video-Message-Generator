import { Router } from "express";
import { spawn } from "child_process";
import path from "path";
import { logger } from "../../lib/logger";

const router = Router();

let cachedVoices: object[] | null = null;

router.get("/imessage/voices", async (_req, res): Promise<void> => {
  if (cachedVoices) {
    res.json({ voices: cachedVoices });
    return;
  }

  const scriptPath = path.resolve(
    import.meta.dirname,
    "../scripts/tts_list_voices.py"
  );

  const child = spawn("python3", [scriptPath]);
  let stdout = "";
  let stderr = "";

  child.stdout.on("data", (d) => (stdout += d.toString()));
  child.stderr.on("data", (d) => (stderr += d.toString()));

  child.on("close", (code) => {
    if (code !== 0) {
      logger.error({ stderr }, "Failed to list voices");
      res.status(500).json({ error: "Failed to retrieve voices", detail: stderr });
      return;
    }
    try {
      const voices = JSON.parse(stdout);
      cachedVoices = voices;
      res.json({ voices });
    } catch (e) {
      logger.error({ e }, "Failed to parse voices JSON");
      res.status(500).json({ error: "Failed to parse voices" });
    }
  });
});

export default router;
