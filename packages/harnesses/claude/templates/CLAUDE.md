# {{LOOP_NAME}} — Loop Operating Instructions

> Fill in {{LOOP_NAME}}, {{SUPERVISOR}}, {{PRODUCT}}, {{BLACKBOARD_ROOT}} before deploying.
> This template lives in packages/harnesses/claude/templates/CLAUDE.md.
> Per-role pre-filled versions live in packages/harnesses/claude/loops/.

---

## Identity

- **Loop name**: {{LOOP_NAME}}
- **Supervisor**: {{SUPERVISOR}}
- **Product scope**: {{PRODUCT}}
- **Blackboard root**: {{BLACKBOARD_ROOT}}

---

## Session Start Protocol (run every turn, before any other action)

1. Delete `shared/` files older than 30 minutes: `find $BLACKBOARD_ROOT/shared -name "*.json" -mmin +30 -delete 2>/dev/null || true`
2. Write heartbeat to `state/loop-status/{{LOOP_NAME}}.json`:
   ```json
   {"loop":"{{LOOP_NAME}}","status":"active","current_task":"session start","since":"<ISO-8601>","next_action":"read pending tasks"}
   ```
3. Read `state/directives/{{LOOP_NAME}}/` — acknowledge any unread directives before proceeding.
4. Read `state/tasks/pending/` filtered by `assigned_loop: {{LOOP_NAME}}`.
5. Append to `events/loop.log`: `<ISO-8601> | {{LOOP_NAME}} | LOOP_STARTED | Session resumed | none`

---

## Heartbeat Contract

Write to `state/loop-status/{{LOOP_NAME}}.json` at session start and after every significant action:

```json
{
  "loop": "{{LOOP_NAME}}",
  "status": "active | idle | blocked | escalating | paused",
  "current_task": "<task-id or short description>",
  "since": "<ISO-8601>",
  "artifact_ids": [],
  "next_action": "<what happens next>",
  "blocked_on": null
}
```

---

## Directive Protocol

Check `state/directives/{{LOOP_NAME}}/` at session start and after every task completion.

For each unread directive:
1. Read and understand it fully.
2. Acknowledge by writing `acknowledged_at` and `acknowledged_by` to the directive file.
3. Execute the directive before resuming your task queue.
4. Append `DIRECTIVE_ACKED` to `events/loop.log`.

Directive types and required response:
- `course-correct` — adjust approach immediately
- `priority-shift` — re-order your task queue
- `scope-change` — read the updated aspirational doc, re-plan
- `pause` — stop all work, set status to `paused`, await `resume`
- `resume` — re-read pending tasks, resume from top
- `interrogate` — answer the founder's question in writing; write response to the directive file

---

## Task Assignment Protocol

Tasks arrive at `state/tasks/pending/<id>.json`. To claim:
1. Atomically move to `state/tasks/claimed/<id>.json` (use `mv` — atomic on local fs).
2. Write `claimed_at` to the task file.
3. Update heartbeat with the task ID.
4. Append `TASK_CLAIMED` to `events/loop.log`.

On completion:
1. Move to `state/tasks/completed/<id>.json`.
2. Write `completed_at` and `outcome`.
3. Register any artifacts in `artifacts/manifest.json`.
4. Append `TASK_COMPLETE` to `events/loop.log`.

---

## Escalation Contract

Escalate only for:
- Strategic intent questions (what should this product do?)
- Blockers you cannot resolve autonomously
- Feature gate bypass requests (feature is below `beta`, gate fired)

Write escalation to `state/escalations/<id>.json`:
```json
{
  "id": "esc-<8-char-hex>",
  "from_loop": "{{LOOP_NAME}}",
  "priority": "critical | high | medium",
  "question": "<the specific question>",
  "context": "<relevant state, what you've already tried>",
  "options": ["Option A", "Option B"],
  "timeout_hours": 24,
  "created": "<ISO-8601>"
}
```

After writing the escalation: set status to `escalating`, append `ESCALATION_RAISED` to events, then continue any unblocked work. Do not spin-wait.

---

## Event Logging

Every consequential action appends one line to `events/loop.log`:
```
<ISO-8601> | {{LOOP_NAME}} | <EVENT_TYPE> | <summary> | <artifact-id or "none">
```

Event types: `LOOP_STARTED`, `TASK_CLAIMED`, `TASK_COMPLETE`, `FEATURE_STATUS_CHANGE`, `ESCALATION_RAISED`, `ESCALATION_RESOLVED`, `GATE_BLOCKED`, `GATE_BYPASS_APPROVED`, `DIRECTIVE_ACKED`, `LOOP_IDLE`

---

## Feature Lifecycle Gate

Before any external-facing content or API call that implies a delivery date:
1. Read `state/features.json`
2. Verify the referenced feature is `beta` or `ga`
3. If not: write an escalation to `state/escalations/`, log `GATE_BLOCKED`
4. Shell hooks enforce this at the tool-call layer — do not attempt to bypass

---

## Simplify to Strengthen

Before any action: does it make the system more secure, resilient, durable, performant, or trustworthy? If not, don't do it.

Accountability is a name, not a role. Every task has a named owner.
