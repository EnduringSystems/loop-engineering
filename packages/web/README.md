# Founder Web Dashboard — Build Spec

The web dashboard is the browser-native founder interface. It reads the same blackboard the CLI reads. The CLI is the production tool today; this is the next build target for the dev loops.

## What to build

A real-time browser UI with:

1. **Loop Grid** — Cards for each loop, showing status chip, last heartbeat age, current task, blocked-on. Click → loop detail.
2. **Feature Kanban** — Columns: planned / in_dev / alpha / beta / ga. Cards show feature ID, product, owner loop. Drag-to-promote triggers `loopctl promote` via the API shim.
3. **Escalation Queue** — Priority-sorted list of unresolved escalations. Click → detail with options. Resolve button calls the API shim.
4. **Directive Composer** — Form: Target (loop or "all"), Type, Priority, Directive text. Send writes to blackboard.
5. **Event Stream** — Live append-only tail of `events/loop.log` with loop-name filter.
6. **Strategic Session** — Multi-loop directive broadcast with effect tracking (which loops acknowledged).

## Schema contract

All data shapes are defined in `packages/core/schemas/`. The web dashboard reads:
- `state/loop-status/*.json` → Heartbeat schema
- `state/escalations/*.json` → Escalation schema
- `state/features.json` → Feature schema
- `state/directives/<loop>/*.json` → Directive schema
- `events/loop.log` → newline-delimited pipe-separated events

## Data access approach

Two options — choose one:

**Option A (simpler): File server + polling**
Run a tiny HTTP server that serves the blackboard directory as static JSON. The frontend polls every N seconds. `python3 -m http.server 4000 --directory .claude/blackboard` is enough for a dev build.

**Option B: WebSocket file watcher**
A thin Node.js server watches the blackboard with `chokidar` and pushes events via WebSocket. Lower latency, better for the event stream.

Recommendation: start with Option A. Migrate to B when the team needs sub-second event latency.

## Write operations

Writes (directives, resolve escalation, promote feature) go through a thin API shim that calls `loopctl` under the hood. The blackboard is the source of truth; the web dashboard never writes directly.

Shim: `GET /api/blackboard/**` (read-through) + `POST /api/directive`, `POST /api/resolve`, `POST /api/promote`

## Tech stack (recommended, not required)

- Next.js 14+ (App Router)
- Tailwind CSS
- shadcn/ui components
- `ws` or `socket.io` for WebSocket (if Option B)
- `chokidar` for file watching (if Option B)

## Acceptance criteria

- [ ] Live loop grid with status chips, last-seen age, stale detection (> 30 min = amber border)
- [ ] Feature Kanban: all 5 lifecycle stages, card count per stage
- [ ] Escalation queue: priority sort, resolve flow, timestamp
- [ ] Directive composer: target selector (individual loop or broadcast), all 6 directive types
- [ ] Event stream: live tail, filter by loop name
- [ ] Responsive (desktop-first, usable on tablet)
- [ ] High-contrast text ≥ 7:1 contrast ratio on all backgrounds
- [ ] No external dependencies that require an API key
