import { Router } from "express";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../../lib/logger";

const router = Router();

interface ScriptLine {
  index: number;
  character: string;
  text: string;
  voice: string;
}

interface AudioJob {
  jobId: string;
  status: "pending" | "running" | "done" | "error";
  completed: number;
  total: number;
  failedLines: number[];
  durations: Record<number, number>;
  lines: ScriptLine[];
  dir: string;
}

const jobs = new Map<string, AudioJob>();

function getAudioDir(jobId: string): string {
  const dir = path.join("/tmp", "audio_jobs", jobId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

async function getAudioDuration(filePath: string): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      filePath,
    ]);
    let output = "";
    child.stdout.on("data", (d) => (output += d.toString()));
    child.on("close", () => {
      const dur = parseFloat(output.trim());
      resolve(isNaN(dur) ? 3.0 : dur);
    });
  });
}

async function generateLine(
  job: AudioJob,
  line: ScriptLine,
  scriptPath: string
): Promise<void> {
  const outputFile = path.join(
    job.dir,
    `line_${String(line.index).padStart(3, "0")}.mp3`
  );

  await new Promise<void>((resolve) => {
    const child = spawn("python3", [
      scriptPath,
      line.voice,
      outputFile,
      line.text,
    ]);
    let stderr = "";
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("close", (code) => {
      if (code !== 0 || !fs.existsSync(outputFile)) {
        logger.warn({ line: line.index, stderr }, "TTS failed for line");
        job.failedLines.push(line.index);
      } else {
        getAudioDuration(outputFile).then((dur) => {
          job.durations[line.index] = dur;
        });
      }
      job.completed++;
      if (job.completed >= job.total) {
        job.status = "done";
      }
      resolve();
    });
  });
}

async function processJob(job: AudioJob, scriptPath: string): Promise<void> {
  job.status = "running";
  const batchSize = 5;
  for (let i = 0; i < job.lines.length; i += batchSize) {
    const batch = job.lines.slice(i, i + batchSize);
    await Promise.all(batch.map((line) => generateLine(job, line, scriptPath)));
  }
  job.status = "done";
}

router.post("/imessage/generate-audio", async (req, res): Promise<void> => {
  const { lines } = req.body as { lines?: ScriptLine[] };

  if (!lines || !Array.isArray(lines) || lines.length === 0) {
    res.status(400).json({ error: "lines array is required" });
    return;
  }

  const jobId = uuidv4();
  const dir = getAudioDir(jobId);
  const scriptPath = path.resolve(
    import.meta.dirname,
    "../scripts/tts_generate.py"
  );

  const job: AudioJob = {
    jobId,
    status: "pending",
    completed: 0,
    total: lines.length,
    failedLines: [],
    durations: {},
    lines,
    dir,
  };

  jobs.set(jobId, job);

  processJob(job, scriptPath).catch((err) => {
    logger.error({ err, jobId }, "Audio generation job failed");
    job.status = "error";
  });

  res.json({ jobId, totalLines: lines.length });
});

router.get(
  "/imessage/audio-progress/:jobId",
  async (req, res): Promise<void> => {
    const jobId = Array.isArray(req.params.jobId)
      ? req.params.jobId[0]
      : req.params.jobId;
    const job = jobs.get(jobId);

    if (!job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }

    res.json({
      jobId: job.jobId,
      status: job.status,
      completed: job.completed,
      total: job.total,
      failedLines: job.failedLines,
      durations: job.durations,
    });
  }
);

router.get(
  "/imessage/audio-file/:jobId/:lineIndex",
  async (req, res): Promise<void> => {
    const jobId = Array.isArray(req.params.jobId)
      ? req.params.jobId[0]
      : req.params.jobId;
    const lineIndex = parseInt(
      Array.isArray(req.params.lineIndex)
        ? req.params.lineIndex[0]
        : req.params.lineIndex,
      10
    );

    const job = jobs.get(jobId);
    if (!job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }

    const filePath = path.join(
      job.dir,
      `line_${String(lineIndex).padStart(3, "0")}.mp3`
    );

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: "Audio file not found" });
      return;
    }

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Disposition", `inline; filename="line_${lineIndex}.mp3"`);
    fs.createReadStream(filePath).pipe(res);
  }
);

export { jobs };
export default router;
