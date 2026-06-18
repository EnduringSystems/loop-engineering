"""loopctl configuration — blackboard discovery and settings."""
from __future__ import annotations
import os
from pathlib import Path
from typing import Optional

import typer

from lecore.blackboard import discover


def resolve_blackboard(blackboard: Optional[Path]) -> Path:
    """Return a validated blackboard root.

    Priority: --blackboard flag > LOOPCTL_BLACKBOARD env > auto-discover (walk up from cwd).
    """
    if blackboard:
        root = Path(blackboard)
        if not root.is_dir():
            typer.echo(f"[error] Blackboard not found: {root}", err=True)
            raise typer.Exit(1)
        return root

    env = os.environ.get("LOOPCTL_BLACKBOARD")
    if env:
        root = Path(env)
        if not root.is_dir():
            typer.echo(f"[error] LOOPCTL_BLACKBOARD not found: {root}", err=True)
            raise typer.Exit(1)
        return root

    found = discover()
    if found:
        return found

    typer.echo(
        "[error] Could not find a blackboard. Provide --blackboard PATH, "
        "set LOOPCTL_BLACKBOARD, or run from inside a loop-engineering project.",
        err=True,
    )
    raise typer.Exit(1)
