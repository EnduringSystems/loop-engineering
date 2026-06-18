"""loopctl — Loop Engineering founder CLI entry point."""
from __future__ import annotations

import uuid
from pathlib import Path
from typing import Optional

import typer
from rich.console import Console
from rich.table import Table
from rich.text import Text

from lecore.blackboard import Blackboard
from lecore.schema import Directive, DIRECTIVE_TYPES, FEATURE_STATUSES

from .config import resolve_blackboard
from .dashboard import run_dashboard

app = typer.Typer(
    name="loopctl",
    help="Loop Engineering — founder control interface.",
    no_args_is_help=False,
    add_completion=False,
)

# Global state passed via typer context object
class _State:
    blackboard: Optional[Path] = None

state = _State()

_BLACKBOARD_OPT = typer.Option(
    None, "--blackboard", "-b",
    help="Path to blackboard root (host-side or container /bb). "
         "Falls back to LOOPCTL_BLACKBOARD env or auto-discovery.",
    show_default=False,
)
_REFRESH_OPT = typer.Option(5, "--refresh", "-r", help="Dashboard refresh interval in seconds.")


@app.callback(invoke_without_command=True)
def _default(
    ctx: typer.Context,
    blackboard: Optional[Path] = _BLACKBOARD_OPT,
    refresh: int = _REFRESH_OPT,
) -> None:
    """Show the live founder dashboard (default). Same as `loopctl dash`."""
    # Store resolved blackboard in context for subcommands
    state.blackboard = resolve_blackboard(blackboard)
    if ctx.invoked_subcommand is None:
        run_dashboard(state.blackboard, refresh)


def _bb() -> Path:
    """Return the resolved blackboard — available to all subcommands after callback."""
    return state.blackboard  # type: ignore[return-value]


@app.command("dash")
def cmd_dash(refresh: int = _REFRESH_OPT) -> None:
    """Live TUI dashboard — loop status, escalations, features, event stream."""
    run_dashboard(_bb(), refresh)


@app.command("status")
def cmd_status() -> None:
    """One-shot loop status snapshot (non-interactive)."""
    bb = Blackboard(_bb())
    console = Console()

    heartbeats = bb.heartbeats()
    t = Table(title="Loop Status", show_header=True, header_style="bold dim")
    t.add_column("LOOP", style="bold")
    t.add_column("STATUS")
    t.add_column("SINCE", style="dim")
    t.add_column("CURRENT TASK")
    t.add_column("NEXT ACTION")
    t.add_column("BLOCKED ON")

    for name, hb in sorted(heartbeats.items()):
        t.add_row(name, hb.status, hb.since[:16], hb.current_task, hb.next_action, hb.blocked_on or "")

    if not heartbeats:
        console.print("[dim]No loops running — start a loop to see heartbeats here.[/]")
    else:
        console.print(t)

    escs = bb.escalations(resolved=False)
    if escs:
        console.print(f"\n[bold red]{len(escs)} pending escalation(s):[/]")
        for e in escs:
            console.print(f"  [{e.priority.upper()}] {e.from_loop}: {e.question}")

    features = bb.features()
    if features:
        from collections import Counter
        counts = Counter(f.status for f in features)
        console.print(f"\nFeatures: " + "  ".join(f"{s}({counts[s]})" for s in FEATURE_STATUSES if s in counts))


@app.command("steer")
def cmd_steer(
    loop: str = typer.Argument(..., help="Loop name to direct."),
    directive: str = typer.Argument(..., help="The directive text."),
    type_: str = typer.Option("course-correct", "--type", "-t",
                               help=f"Directive type: {', '.join(DIRECTIVE_TYPES)}"),
    priority: str = typer.Option("high", "--priority", "-p", help="critical | high | medium"),
    context: str = typer.Option("", "--context", "-c", help="Additional context for the loop."),
) -> None:
    """Send a directive to a specific loop."""
    if type_ not in DIRECTIVE_TYPES:
        typer.echo(f"[error] Invalid type '{type_}'. Choose: {', '.join(DIRECTIVE_TYPES)}", err=True)
        raise typer.Exit(1)
    bb = Blackboard(_bb())
    d = Directive(
        id=f"dir-{uuid.uuid4().hex[:8]}",
        from_="founder",
        to=loop,
        priority=priority,
        type=type_,
        directive=directive,
        context=context,
    )
    bb.write_directive(loop, d)
    typer.echo(f"✓ Directive {d.id} written → {loop}")


@app.command("broadcast")
def cmd_broadcast(
    directive: str = typer.Argument(..., help="Directive to send to all loops."),
    type_: str = typer.Option("course-correct", "--type", "-t",
                               help=f"Directive type: {', '.join(DIRECTIVE_TYPES)}"),
    priority: str = typer.Option("high", "--priority", "-p"),
) -> None:
    """Send a directive to all running loops."""
    bb = Blackboard(_bb())
    heartbeats = bb.heartbeats()
    if not heartbeats:
        typer.echo("[warn] No loops found in heartbeat directory.", err=True)
        raise typer.Exit(1)
    batch_id = uuid.uuid4().hex[:8]
    for loop_name in heartbeats:
        d = Directive(
            id=f"dir-{batch_id}-{loop_name}",
            from_="founder",
            to=loop_name,
            priority=priority,
            type=type_,
            directive=directive,
        )
        bb.write_directive(loop_name, d)
        typer.echo(f"  → {loop_name}")
    typer.echo(f"✓ Broadcast {batch_id} sent to {len(heartbeats)} loops.")


@app.command("resolve")
def cmd_resolve(
    escalation_id: str = typer.Argument(..., help="Escalation ID (or prefix)."),
    resolution: str = typer.Argument(..., help="Resolution text to write back."),
) -> None:
    """Resolve a pending escalation."""
    bb = Blackboard(_bb())
    ok = bb.resolve_escalation(escalation_id, resolution)
    if ok:
        typer.echo(f"✓ Escalation {escalation_id} resolved.")
    else:
        typer.echo(f"[error] Escalation '{escalation_id}' not found.", err=True)
        raise typer.Exit(1)


@app.command("promote")
def cmd_promote(
    feature_id: str = typer.Argument(..., help="Feature ID to promote."),
    to: Optional[str] = typer.Option(None, "--to", help="Target status. Default: next in lifecycle."),
) -> None:
    """Promote a feature to the next lifecycle stage (or --to <status>)."""
    bb = Blackboard(_bb())
    features = {f.id: f for f in bb.features()}
    if feature_id not in features:
        typer.echo(f"[error] Feature '{feature_id}' not found.", err=True)
        raise typer.Exit(1)
    feat = features[feature_id]
    if to:
        new_status = to
    else:
        try:
            idx = FEATURE_STATUSES.index(feat.status)
            new_status = FEATURE_STATUSES[idx + 1]
        except (ValueError, IndexError):
            typer.echo(f"[error] Cannot promote from '{feat.status}'.", err=True)
            raise typer.Exit(1)
    if new_status not in FEATURE_STATUSES:
        typer.echo(f"[error] Invalid status '{new_status}'. Valid: {', '.join(FEATURE_STATUSES)}", err=True)
        raise typer.Exit(1)
    ok = bb.update_feature_status(feature_id, new_status, actor="founder")
    if ok:
        typer.echo(f"✓ {feature_id}: {feat.status} → {new_status}")
    else:
        typer.echo(f"[error] Update failed.", err=True)
        raise typer.Exit(1)


@app.command("pause")
def cmd_pause(loop: str = typer.Argument(..., help="Loop name to pause.")) -> None:
    """Send a pause directive to a loop."""
    bb = Blackboard(_bb())
    d = Directive(
        id=f"dir-{uuid.uuid4().hex[:8]}",
        from_="founder", to=loop, priority="critical", type="pause",
        directive="Pause all work. Await resume directive before continuing.",
    )
    bb.write_directive(loop, d)
    typer.echo(f"✓ Pause directive sent → {loop}")


@app.command("resume")
def cmd_resume(loop: str = typer.Argument(..., help="Loop name to resume.")) -> None:
    """Send a resume directive to a paused loop."""
    bb = Blackboard(_bb())
    d = Directive(
        id=f"dir-{uuid.uuid4().hex[:8]}",
        from_="founder", to=loop, priority="high", type="resume",
        directive="Resume work from where you paused. Re-read your pending tasks.",
    )
    bb.write_directive(loop, d)
    typer.echo(f"✓ Resume directive sent → {loop}")


@app.command("logs")
def cmd_logs(
    n: int = typer.Option(20, "--lines", "-n", help="Number of lines to show."),
    loop: Optional[str] = typer.Option(None, "--loop", "-l", help="Filter by loop name."),
    follow: bool = typer.Option(False, "--follow", "-f", help="Tail the event log."),
) -> None:
    """Show the event log."""
    import time as _time
    bb = Blackboard(_bb())
    console = Console()

    def _print(events):
        for line in events:
            if loop and f"| {loop} |" not in line:
                continue
            console.print(line)

    _print(bb.events(n=n))
    if follow:
        seen_set = set(bb.events(n=n))
        while True:
            _time.sleep(2)
            current = bb.events(n=200)
            new = [l for l in current if l not in seen_set]
            if new:
                _print(new)
                seen_set.update(new)


if __name__ == "__main__":
    app()
