# loop-engineering — Operating Playbook

> This repository is itself run as a loop-engineering project.
> The dev loops build the web dashboard. The CTO orchestrator reads this file as its aspirational doc.

---

## Products

| Package | Status | Built by |
|---------|--------|---------|
| `packages/core` (lecore) | active | contributors |
| `packages/cli` (loopctl) | active | contributors |
| `packages/web` | pending | frontend-specialist loop |
| `packages/harnesses/claude` | active | contributors |

---

## Blackboard

Shared state lives in `.claude/blackboard/`. The same protocol as every other loop-engineering project — we eat our own dogfood.

---

## Loop Identities

| Loop | Role |
|------|------|
| `cto-orchestrator` | Reads packages/web/README.md → task graph → delegates |
| `frontend-specialist` | Builds the web dashboard (packages/web/) |
| `backend-specialist` | Builds the API shim for web writes |
| `qa-specialist` | Tests, validates, merges PRs |

GTM and Revenue loops are not active for this repo — it's an OSS tool, not a commercial product.

---

## Feature Lifecycle Gate

Active for this repo. Any external-facing release commit requires the feature to be `beta` or `ga` in `state/features.json`.

---

## Running the CLI (development)

```bash
# Build the container once
docker compose build

# Run the live dashboard
docker compose run --rm cli loopctl

# One-shot status
docker compose run --rm cli loopctl status

# Send a directive
docker compose run --rm cli loopctl steer frontend-specialist "Start the web dashboard build"

# Follow event log
docker compose run --rm cli loopctl logs -f
```

---

## Simplify to Strengthen

Before any action: does it make the system more secure, resilient, durable, performant, or trustworthy? If not, don't do it.

Copyright Paramdeep Singh. MIT License.
