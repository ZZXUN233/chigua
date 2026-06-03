# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install          # Install dependencies (requires Node.js 18+)
npm run dev          # Start Vite dev server on port 3000 (frontend only, HMR enabled)
npm run build        # Production build (Vite) → dist/
npm start            # Run Express server (must build first for full-stack: npm run dev:full)
npm run dev:full     # Build frontend + start Express server (single Node process)
npm run lint         # TypeScript type-check (tsc --noEmit)
npm run clean        # Remove dist/
```

- Dev frontend: `http://localhost:3000/chigua/`
- Health check: `GET http://localhost:3000/chigua-api/health`
- Environment: copy `.env.example` to `.env.local` for local API keys

Docker:
```bash
docker-compose up -d   # Build and start via Docker Compose
docker-compose logs -f # Follow logs
./deploy_update.sh     # Build, tag, and push to private registry (zzxun.cn:5000)
```

## Architecture

This is a **single-process full-stack app** — one Express server (`server.js`) serves both the REST API and the built Vite SPA. There is no separate frontend dev server in production.

### Path routing (critical)

- **`/chigua-api/*`** — REST API endpoints (see README for full list)
- **`/chigua/*`** — Static frontend files from `dist/`; SPA fallback serves `index.html` for any path under `/chigua` that doesn't match a file extension
- Vite `base` is set to `/chigua/` — all asset paths in the built HTML use this prefix

### Stack

- **Frontend**: React 19, TypeScript 5.8, Tailwind CSS 4 (via `@tailwindcss/vite` plugin), Vite 6
- **Backend**: Express 4 on Node.js, no router library — routes defined directly on `app`
- **Database**: SQLite via `better-sqlite3` (synchronous API). DB file path defaults to `./data/chigua.db`, overridable via `DATABASE_PATH` env var
- **Animation**: `motion` (formerly framer-motion), `lucide-react` for icons

### Backend (`server.js`)

A flat Express server with five route groups: health, list records (paginated), popular records, get/delete by ID, and like. No controllers/services layer — all logic is inline. JSON body limit is 10MB to accommodate base64 photo uploads. Reads `.env.local` for `GEMINI_API_KEY` (used by `@google/genai` on the client side).

### Database layer (`src/services/dbService.js`)

SQLite via better-sqlite3 with WAL mode. The `watermelon_records` table uses **snake_case** columns (`sound_score`, `look_score`, `ripeness_status`, etc.) but all JS functions map rows to **camelCase** (`soundScore`, `lookScore`, `ripenessStatus`). Lazy-initializes the DB on first call. DB directory is created automatically if missing.

### Frontend (`src/App.tsx`)

A single monolithic component (~1600 lines) with two segments toggled via `activeSegment` state:
- **`scan`** — The watermelon testing flow: microphone frequency detection, camera color analysis, score calculation, and share form
- **`community`** — Renders `SquareFeed` with records and a leaderboard tab

**Important design decisions in App.tsx:**
- The app works **with or without real hardware** — simulated tap buttons and preset watermelon appearances act as fallbacks
- Audio analysis runs in a `requestAnimationFrame` loop using the Web Audio API; tap detection uses RMS thresholding with adaptive ambient noise tracking
- Camera analysis does real pixel sampling on captured frames (green channel variance for stripe contrast, mean green for greenness)
- Score formula: `soundScore * 0.6 + lookScore * 0.4`, where sound peaks at 125Hz (ripe) and degrades toward higher (unripe) or lower (overripe) frequencies
- All computation is **client-side** — no AI/LLM calls are actually made for scoring despite the README claiming "AI黑科技"

### Client-side persistence (localStorage keys)

| Key | Purpose |
|-----|---------|
| `melon_passport_id` | Anonymous user identity badge |
| `melon_cooldown_ends_at` | Timestamp for 60s post cooldown |
| `melon_masters_records` | JSON array of community records |
| `melon_cycle_end_time` | Timestamp for ~7-day data reset cycle |

Records are stored in both localStorage (client) and SQLite (server) — the client-side store is the primary one for the community feed; server persistence is available via API.

### Key utility modules

- **`src/utils/audioSynth.ts`** — Exports `gameAudio` singleton. Web Audio API synthesizer for four sound types: success chime, failure boing, pop click, and watermelon tap (three variants based on ripeness, each with distinct frequency/envelope/filter settings)
- **`src/utils/watermelonDrawer.ts`** — Procedural canvas-drawn cartoon watermelons with status-driven appearance (color, stripes, eyes/mouth, name tag). Exports `drawWatermelonToCanvas`, `getWatermelonImageURL`, `getSlicedWatermelonImageURL`
- **`src/utils/filter.ts`** — Sensitive word filter with three rule categories (abuse, extreme negativity, commercial complaints). Longer patterns matched first. Returns `{ cleanText, hasSensitive, detectedWords }`
- **`src/types.ts`** — `WatermelonStatus` (`'unripe' | 'ripe' | 'overripe'`) and `WatermelonRecord` interface

### Components

- **`WaveformVisualizer`** — Canvas-based audio visualizer: draws real-time time-domain waveform when mic is active, idle sine wave animation when not
- **`SquareFeed`** — Renders records in a responsive card grid, with "latest" and "leaderboard" tabs. Includes an expandable FAQ section about data persistence and anti-spam

### Nginx (`nginx/nginx-chigua.conf`)

Reverse proxy config for production behind nginx: proxies `/chigua/` and `/chigua-api/` to the Node process on port 3000, with CORS headers, WebSocket upgrade support, 10MB client body size, and immutable cache for static assets.
