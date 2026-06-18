# Loop Engineering

**Loop engineering** is a new operating model for running autonomous AI agent loops in parallel — coordinating across dev, GTM, and revenue workstreams through a shared blackboard filesystem.

This repository is the open-source toolkit: the protocol, the founder CLI, and the harness adapters that make it work.

---

## What's in here

```
packages/
  core/          lecore — harness-agnostic blackboard protocol (Python library)
  cli/           loopctl — founder CLI dashboard
  web/           Founder web dashboard (build spec; implementation coming)
  harnesses/
    claude/      Claude Code CLI adapter — templates, hooks, per-role CLAUDE.md files
    spec/        Harness adapter specification (for future runtimes)
docs/            Concept documentation
examples/        Getting-started example project
```

---

## Quick start

**Prerequisites**: Docker Desktop (or Docker Engine + Compose plugin)

```bash
git clone https://github.com/EnduringSystems/loop-engineering
cd loop-engineering

# Build the container (first time only)
docker compose build

# Launch the founder CLI dashboard
docker compose run --rm cli loopctl --blackboard examples/getting-started/.claude/blackboard

# Or point it at your own project
docker compose run --rm cli loopctl --blackboard /path/to/your/project/.claude/blackboard
```

### Founder commands

```bash
# Live dashboard (auto-refresh every 5 seconds)
docker compose run --rm cli loopctl

# One-shot status snapshot
docker compose run --rm cli loopctl status

# Send a directive to a specific loop
docker compose run --rm cli loopctl steer cto-orchestrator "Prioritize the cert chain feature"

# Send a directive to all loops
docker compose run --rm cli loopctl broadcast "Re-read aspirational docs before next task"

# Resolve a pending escalation
docker compose run --rm cli loopctl resolve esc-abc123 "Approved. Proceed to beta."

# Promote a feature to the next lifecycle stage
docker compose run --rm cli loopctl promote feat-cert-chain

# Pause a loop
docker compose run --rm cli loopctl pause gtm

# Follow the event log live
docker compose run --rm cli loopctl logs --follow
```

---

## Using it in your project

### 1. Install the Claude harness templates

Copy `packages/harnesses/claude/templates/` into your project's `.claude/` directory:

```bash
cp -r packages/harnesses/claude/templates/.  your-project/.claude/
chmod +x your-project/.claude/hooks/*.sh
```

### 2. Initialize the blackboard

```bash
mkdir -p your-project/.claude/blackboard/{state/{tasks/{pending,claimed,completed},loop-status,directives,escalations,identity,features},artifacts,events,shared}
echo '{"version":"1","features":{}}' > your-project/.claude/blackboard/state/features.json
echo '{"version":"1","artifacts":[]}' > your-project/.claude/blackboard/artifacts/manifest.json
```

### 3. Choose your loop roles

Copy the relevant per-role CLAUDE.md from `packages/harnesses/claude/loops/` into your project as the loop's operating instructions. Each loop gets its own Claude Code session reading its role file.

### 4. Start the founder CLI

```bash
docker compose run --rm cli loopctl --blackboard your-project/.claude/blackboard
```

---

## The protocol

Loop engineering coordinates through a **blackboard** — a shared directory on the local filesystem. Every loop reads and writes to it. No loop passes state through conversation re-briefing.

```
.claude/blackboard/
  state/
    features.json          Feature lifecycle register (planned → in_dev → alpha → beta → ga)
    tasks/pending/         Tasks written by CTO orchestrator, claimed by specialists
    tasks/claimed/         Atomically moved here when a loop picks up a task
    tasks/completed/       Moved here with outcome on completion
    loop-status/           Heartbeat file per loop (status, current task, since)
    directives/            Founder-to-loop directives, acknowledged in-place
    escalations/           Loop-to-founder escalation requests
  artifacts/               Work products, registered in artifacts/manifest.json
  events/loop.log          Append-only audit trail
  shared/                  Coordination hints (TTL: 30 minutes)
```

The **feature lifecycle gate** (`planned → in_dev → alpha → beta → ga`) is enforced by a shell hook at the tool-call layer. GTM and revenue loops cannot publish external-facing content for features below `beta`.

Full protocol documentation: [`docs/blackboard-protocol.md`](docs/blackboard-protocol.md)

---

## Harness support

| Harness | Status | Notes |
|---------|--------|-------|
| Claude Code CLI | Active | Reference implementation |
| Codex | Planned | Same blackboard, different invocation |
| Gemini CLI | Planned | Same blackboard, different invocation |
| Generic | Spec | See `packages/harnesses/spec/HARNESS-SPEC.md` |

The blackboard protocol is harness-agnostic. Harness adapters are a thin compatibility layer.

---

## License

MIT. Copyright Paramdeep Singh.
