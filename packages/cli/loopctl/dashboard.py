"""loopctl live TUI dashboard — founder loop-engineering interface."""
from __future__ import annotations

import time
from datetime import datetime, timezone
from pathlib import Path

from rich.console import Console
from rich.layout import Layout
from rich.live import Live
from rich.panel import Panel
from rich.table import Table
from rich.text import Text

from lecore.blackboard import Blackboard

STATUS_STYLE = {
    "active":      "bold green",
    "idle":        "dim white",
    "blocked":     "yellow",
    "escalating":  "bold red",
    "paused":      "blue",
    "unknown":     "dim red",
}
STATUS_ICON = {
    "active":      "[green]●[/]",
    "idle":        "[dim]○[/]",
    "blocked":     "[yellow]⊘[/]",
    "escalating":  "[red]⚠[/]",
    "paused":      "[blue]⏸[/]",
    "unknown":     "[dim red]?[/]",
}
PRIORITY_STYLE = {
    "critical": "bold red",
    "high":     "yellow",
    "medium":   "white",
}
STAGE_STYLE = {
    "planned":    "dim white",
    "in_dev":     "blue",
    "alpha":      "yellow",
    "beta":       "green",
    "ga":         "bold green",
    "deprecated": "dim",
}
STALE_SECONDS = 1800  # 30 minutes


def _age(iso: str) -> str:
    try:
        dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
        secs = int((datetime.now(timezone.utc) - dt).total_seconds())
        if secs < 0:    return "now"
        if secs < 60:   return f"{secs}s"
        if secs < 3600: return f"{secs // 60}m"
        return f"{secs // 3600}h"
    except Exception:
        return "?"


def _loops_table(bb: Blackboard) -> Table:
    t = Table(show_header=True, header_style="bold dim", box=None, padding=(0, 1), expand=True)
    t.add_column("STATUS", width=3, no_wrap=True)
    t.add_column("LOOP", style="bold", no_wrap=True, min_width=20)
    t.add_column("STATE", width=11)
    t.add_column("LAST SEEN", width=9)
    t.add_column("CURRENT TASK / NOTE", style="dim", max_width=50)

    heartbeats = bb.heartbeats()
    now = datetime.now(timezone.utc)

    for loop_name, hb in sorted(heartbeats.items()):
        status = hb.status.lower()
        try:
            dt = datetime.fromisoformat(hb.since.replace("Z", "+00:00"))
            stale = (now - dt).total_seconds() > STALE_SECONDS
        except Exception:
            stale = False

        if stale and status in ("active", "idle"):
            icon = "[dim red]⚠[/]"
            state_text = Text("STALE", style="bold red")
        else:
            icon = STATUS_ICON.get(status, "?")
            state_text = Text(status.upper(), style=STATUS_STYLE.get(status, "white"))

        note = hb.blocked_on or hb.current_task or ""
        t.add_row(icon, loop_name, state_text, _age(hb.since), note[:50])

    if not heartbeats:
        t.add_row("", "[dim]no loops running[/]", "", "", "[dim]start a loop to see it here[/]")
    return t


def _escalations_panel(bb: Blackboard) -> Panel:
    escs = [e for e in bb.escalations(resolved=False)]
    if not escs:
        return Panel(
            "[dim]None pending[/]",
            title="ESCALATIONS",
            border_style="dim",
        )

    t = Table(show_header=False, box=None, padding=(0, 1), expand=True)
    t.add_column("PRI", width=9, no_wrap=True)
    t.add_column("FROM", width=14, no_wrap=True, style="bold")
    t.add_column("QUESTION", max_width=42)
    t.add_column("AGE", width=5)

    for esc in escs[:6]:
        pri = esc.priority.lower()
        t.add_row(
            Text(pri.upper(), style=PRIORITY_STYLE.get(pri, "white")),
            esc.from_loop,
            esc.question[:42],
            _age(esc.created),
        )

    count = len(escs)
    title = f"ESCALATIONS ([bold red]{count}[/] pending)"
    return Panel(t, title=title, border_style="red")


def _features_bar(bb: Blackboard) -> Text:
    features = bb.features()
    stages = ["planned", "in_dev", "alpha", "beta", "ga"]
    counts = {s: 0 for s in stages}
    for f in features:
        if f.status in counts:
            counts[f.status] += 1

    t = Text()
    for i, s in enumerate(stages):
        label = s.replace("_", "_")
        style = STAGE_STYLE.get(s, "white")
        t.append(f"{label}({counts[s]})", style=style)
        if i < len(stages) - 1:
            t.append("  →  ", style="dim")
    return t


def _events_table(bb: Blackboard, n: int = 8) -> Table:
    t = Table(show_header=False, box=None, padding=(0, 1), expand=True)
    t.add_column("TIME", style="dim", width=6, no_wrap=True)
    t.add_column("LOOP", style="bold", width=20, no_wrap=True)
    t.add_column("EVENT", style="cyan", width=24, no_wrap=True)
    t.add_column("SUMMARY")

    events = bb.events(n=n)
    for line in reversed(events):
        parts = [p.strip() for p in line.split("|")]
        if len(parts) >= 4:
            ts = parts[0][11:16] if len(parts[0]) >= 16 else parts[0][:5]
            t.add_row(ts, parts[1][:20], parts[2][:24], parts[3][:60])

    if not events:
        t.add_row("—", "—", "—", "[dim]no events yet — loops write here as they run[/]")
    return t


def build_layout(bb: Blackboard, refresh: int) -> Layout:
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    layout = Layout()
    layout.split_column(
        Layout(name="header", size=3),
        Layout(name="body"),
        Layout(name="features", size=3),
        Layout(name="events", size=12),
        Layout(name="footer", size=4),
    )
    layout["body"].split_row(
        Layout(name="loops", ratio=3),
        Layout(name="escalations", ratio=2),
    )

    layout["header"].update(Panel(
        Text(
            f"Loop Engineering — Founder CLI     {now_str}     refresh: {refresh}s",
            justify="center",
            style="bold",
        ),
        border_style="bright_black",
    ))
    layout["loops"].update(
        Panel(_loops_table(bb), title="LOOPS", border_style="bright_black")
    )
    layout["escalations"].update(_escalations_panel(bb))
    layout["features"].update(
        Panel(_features_bar(bb), title="FEATURE LIFECYCLE", border_style="bright_black")
    )
    layout["events"].update(
        Panel(_events_table(bb), title="EVENTS  (live, newest first)", border_style="bright_black")
    )
    layout["footer"].update(Panel(
        Text.from_markup(
            "[bold]Commands (run in another terminal):[/]\n"
            "  [cyan]loopctl steer[/] [dim]<loop> \"<directive>\"[/]  "
            "  [cyan]loopctl resolve[/] [dim]<id> \"<resolution>\"[/]  "
            "  [cyan]loopctl promote[/] [dim]<feature-id>[/]  "
            "  [cyan]loopctl broadcast[/] [dim]\"<directive>\"[/]  "
            "  [cyan]loopctl pause[/] / [cyan]resume[/] [dim]<loop>[/]  "
            "  [cyan]loopctl status[/]  "
            "  [dim]Ctrl+C to exit dash[/]"
        ),
        border_style="bright_black",
    ))

    return layout


def run_dashboard(blackboard_root: Path, refresh: int = 5) -> None:
    """Run the live founder TUI dashboard. Ctrl+C to exit."""
    bb = Blackboard(blackboard_root)
    console = Console()

    with Live(
        build_layout(bb, refresh),
        console=console,
        refresh_per_second=1,
        screen=True,
    ) as live:
        try:
            while True:
                time.sleep(refresh)
                live.update(build_layout(bb, refresh))
        except KeyboardInterrupt:
            pass
