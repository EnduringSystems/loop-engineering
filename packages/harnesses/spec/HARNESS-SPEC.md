# Loop Engineering — Harness Adapter Specification

A harness adapter connects the loop-engineering blackboard protocol to a specific AI runtime (Claude Code, Codex, Gemini CLI, etc.).

## What a harness provides

Any harness adapter must implement the following conceptual interface (language of your choice):

```
invoke_loop(loop_name, task_id)   → starts or resumes a loop session with the task
pause_loop(loop_name)             → sends a pause signal readable by the loop
resume_loop(loop_name)            → sends a resume signal
get_loop_invocation_cmd(loop_name) → returns the shell command to start this loop
get_loop_config_path(loop_name)   → returns the path to this loop's operating instructions
get_hook_config()                 → returns hook configuration for the harness
```

## What a harness owns

A harness adapter owns:
- How to invoke a loop session (e.g., `claude --bg --continue <session-id>`)
- How the loop reads its operating instructions (e.g., CLAUDE.md)
- Hook configuration (e.g., `.claude/settings.json` PreToolUse hooks)
- Per-loop instruction files (e.g., `loops/cto-orchestrator.md`)
- Session lifecycle: start, resume, pause, terminate

## What a harness does NOT own

- The blackboard schema (owned by `lecore` / `packages/core/`)
- Feature lifecycle rules (enforced by hooks and `lecore/gate.py`)
- Directive protocol (the blackboard is the medium; harness delivers via `loopctl`)
- Task format (JSON schema in `packages/core/schemas/task.json`)

## Claude Code CLI adapter (reference implementation)

| Function | Implementation |
|---|---|
| `invoke_loop` | `claude --bg --continue <session-id>` or `/goal "<criteria>"` |
| `pause_loop` | Write a `pause` directive to `state/directives/<loop>/` |
| `resume_loop` | Write a `resume` directive to `state/directives/<loop>/` |
| `get_loop_invocation_cmd` | Per-loop: `claude --bg` for specialists, `/loop 2h` for GTM |
| `get_loop_config_path` | `packages/harnesses/claude/loops/<loop-name>.md` merged into `CLAUDE.md` |
| `get_hook_config` | `packages/harnesses/claude/templates/settings.json` |

## Adding a new harness

1. Create `packages/harnesses/<harness-name>/`
2. Implement the interface above for your runtime
3. Provide loop instruction templates analogous to `claude/loops/*.md`
4. Ensure hooks (or equivalent) enforce the feature lifecycle gate
5. Test with the getting-started example: `examples/getting-started/`

The blackboard directory structure never changes. Harnesses are a compatibility layer, not a fork of the protocol.
