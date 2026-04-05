# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Artifacts

### iMessage Video Generator (`artifacts/imessage-video-gen`)
- React + Vite + Tailwind frontend
- 5-step wizard: Script Input → Character Setup → Audio Generation → iMessage Preview → MP4 Export
- Zustand for global state across wizard steps
- **TTS**: EdgeTTS via Python 3.11 child_process (`artifacts/api-server/scripts/tts_generate.py`)
- **Video Export**: FFmpeg via fluent-ffmpeg (server-side rendering)
- **File uploads**: Multer (avatar, background video, background music)
- **Audio jobs**: In-memory job queue with progress polling
- **Export jobs**: In-memory export queue with FFmpeg progress tracking

### API Server (`artifacts/api-server`)
- Express 5 backend serving all routes under `/api`
- iMessage routes under `/api/imessage/`:
  - `GET /voices` — list all EdgeTTS English voices
  - `POST /preview-voice` — generate 3-second voice sample
  - `POST /generate-audio` — start batch TTS job for script lines
  - `GET /audio-progress/:jobId` — poll job progress + durations
  - `GET /audio-file/:jobId/:lineIndex` — stream individual MP3
  - `POST /upload` — upload background video, music, or avatar
  - `GET /media/:fileId` — serve uploaded files
  - `POST /export` — start FFmpeg export
  - `GET /export-progress/:exportId` — poll export progress
  - `GET /download/:exportId` — download finished MP4

## Python Dependencies
- Python 3.11 (installed via Replit module)
- `edge-tts` — Microsoft Edge TTS via Python

## System Dependencies
- `ffmpeg` — pre-installed in Nix environment (confirmed)
- `ffprobe` — part of ffmpeg, used to measure audio duration
