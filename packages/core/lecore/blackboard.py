"""Harness-agnostic blackboard read/write for loop engineering.

The blackboard is a directory tree on the local filesystem.
All loops — regardless of harness (Claude, Codex, etc.) — coordinate
through this shared directory. No loop passes state via re-briefing.
"""
from __future__ import annotations

import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional

from .schema import Directive, Escalation, Feature, Heartbeat, Task

_BLACKBOARD_MARKER = ".claude"   # walk-up discovery: look for this dir


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _load_json(path: Path) -> Optional[dict]:
    try:
        return json.loads(path.read_text())
    except Exception:
        return None


def _write_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2))


def discover(start: Optional[Path] = None) -> Optional[Path]:
    """Walk up from `start` (default: cwd) to find a blackboard root."""
    cwd = Path(start or os.getcwd())
    for parent in [cwd, *cwd.parents]:
        candidate = parent / _BLACKBOARD_MARKER / "blackboard"
        if candidate.is_dir():
            return candidate
    return None


class Blackboard:
    """Read/write interface to a loop-engineering blackboard directory."""

    def __init__(self, root: Path) -> None:
        self.root = Path(root)
        if not self.root.is_dir():
            raise FileNotFoundError(f"Blackboard not found at {self.root}")

    # ── directories ───────────────────────────────────────────────────────────

    @property
    def _state(self) -> Path:       return self.root / "state"
    @property
    def _shared(self) -> Path:      return self.root / "shared"
    @property
    def _artifacts(self) -> Path:   return self.root / "artifacts"
    @property
    def _events_log(self) -> Path:  return self.root / "events" / "loop.log"

    # ── heartbeats ────────────────────────────────────────────────────────────

    def heartbeats(self) -> Dict[str, Heartbeat]:
        results: Dict[str, Heartbeat] = {}
        status_dir = self._state / "loop-status"
        if not status_dir.is_dir():
            return results
        for f in sorted(status_dir.glob("*.json")):
            d = _load_json(f)
            if not d:
                continue
            loop = d.get("loop", f.stem)
            results[loop] = Heartbeat(
                loop=loop,
                status=d.get("status", "unknown"),
                current_task=d.get("current_task", ""),
                since=d.get("since", ""),
                artifact_ids=d.get("artifact_ids", []),
                next_action=d.get("next_action", ""),
                blocked_on=d.get("blocked_on"),
            )
        return results

    def write_heartbeat(
        self,
        loop: str,
        status: str,
        current_task: str = "",
        next_action: str = "",
        blocked_on: Optional[str] = None,
        artifact_ids: Optional[List[str]] = None,
    ) -> None:
        path = self._state / "loop-status" / f"{loop}.json"
        _write_json(path, {
            "loop": loop,
            "status": status,
            "current_task": current_task,
            "since": _now_iso(),
            "artifact_ids": artifact_ids or [],
            "next_action": next_action,
            "blocked_on": blocked_on,
        })

    # ── escalations ───────────────────────────────────────────────────────────

    def escalations(self, resolved: bool = False) -> List[Escalation]:
        results: List[Escalation] = []
        esc_dir = self._state / "escalations"
        if not esc_dir.is_dir():
            return results
        for f in sorted(esc_dir.glob("*.json"), reverse=True):
            d = _load_json(f)
            if not d:
                continue
            is_resolved = bool(d.get("resolved"))
            if is_resolved != resolved:
                continue
            results.append(Escalation(
                id=d.get("id", f.stem),
                from_loop=d.get("from_loop", ""),
                priority=d.get("priority", "medium"),
                question=d.get("question", ""),
                context=d.get("context", ""),
                options=d.get("options", []),
                timeout_hours=d.get("timeout_hours", 24),
                created=d.get("created", ""),
                resolved=d.get("resolved"),
                resolution=d.get("resolution"),
            ))
        return results

    def resolve_escalation(self, esc_id: str, resolution: str) -> bool:
        esc_dir = self._state / "escalations"
        path = esc_dir / f"{esc_id}.json"
        if not path.exists():
            # search by partial ID
            matches = list(esc_dir.glob(f"*{esc_id}*.json"))
            if not matches:
                return False
            path = matches[0]
        d = _load_json(path)
        if not d:
            return False
        d["resolved"] = _now_iso()
        d["resolution"] = resolution
        _write_json(path, d)
        self.append_event("founder", "ESCALATION_RESOLVED", f"{esc_id}: {resolution[:60]}")
        return True

    def write_escalation(self, esc: Escalation) -> None:
        path = self._state / "escalations" / f"{esc.id}.json"
        _write_json(path, {
            "id": esc.id,
            "from_loop": esc.from_loop,
            "priority": esc.priority,
            "question": esc.question,
            "context": esc.context,
            "options": esc.options,
            "timeout_hours": esc.timeout_hours,
            "created": esc.created or _now_iso(),
        })
        self.append_event(esc.from_loop, "ESCALATION_RAISED", esc.question[:80])

    # ── features ──────────────────────────────────────────────────────────────

    def features(self) -> List[Feature]:
        path = self._state / "features.json"
        d = _load_json(path)
        if not d:
            return []
        return [
            Feature(
                id=fid,
                name=fdata.get("name", fid),
                product=fdata.get("product", ""),
                status=fdata.get("status", "planned"),
                owner_loop=fdata.get("owner_loop", ""),
                updated=fdata.get("updated", ""),
                notes=fdata.get("notes", ""),
            )
            for fid, fdata in d.get("features", {}).items()
        ]

    def update_feature_status(self, feature_id: str, new_status: str, actor: str = "founder") -> bool:
        path = self._state / "features.json"
        d = _load_json(path) or {"version": "1", "features": {}}
        features = d.get("features", {})
        if feature_id not in features:
            return False
        old = features[feature_id].get("status", "?")
        features[feature_id]["status"] = new_status
        features[feature_id]["updated"] = _now_iso()
        _write_json(path, d)
        self.append_event(actor, "FEATURE_STATUS_CHANGE", f"{feature_id}: {old}→{new_status}")
        return True

    # ── directives ────────────────────────────────────────────────────────────

    def write_directive(self, loop: str, directive: Directive) -> None:
        dir_path = self._state / "directives" / loop
        dir_path.mkdir(parents=True, exist_ok=True)
        path = dir_path / f"{directive.id}.json"
        _write_json(path, {
            "id": directive.id,
            "from": directive.from_,
            "to": directive.to,
            "priority": directive.priority,
            "type": directive.type,
            "directive": directive.directive,
            "context": directive.context,
            "created": directive.created or _now_iso(),
            "acknowledged_by": None,
            "acknowledged_at": None,
            "response": None,
        })
        self.append_event("founder", "DIRECTIVE_SENT", f"→{loop} [{directive.type}]: {directive.directive[:60]}")

    def unacknowledged_directives(self, loop: str) -> List[Directive]:
        dir_path = self._state / "directives" / loop
        if not dir_path.is_dir():
            return []
        results = []
        for f in sorted(dir_path.glob("*.json")):
            d = _load_json(f)
            if not d or d.get("acknowledged_at"):
                continue
            results.append(Directive(
                id=d.get("id", f.stem),
                from_=d.get("from", ""),
                to=d.get("to", loop),
                priority=d.get("priority", "medium"),
                type=d.get("type", "course-correct"),
                directive=d.get("directive", ""),
                context=d.get("context", ""),
                created=d.get("created", ""),
                acknowledged_by=None,
                acknowledged_at=None,
                response=None,
            ))
        return results

    # ── tasks ─────────────────────────────────────────────────────────────────

    def pending_tasks(self, assigned_loop: Optional[str] = None) -> List[Task]:
        tasks_dir = self._state / "tasks" / "pending"
        return self._load_tasks(tasks_dir, assigned_loop)

    def _load_tasks(self, directory: Path, assigned_loop: Optional[str]) -> List[Task]:
        if not directory.is_dir():
            return []
        results = []
        for f in sorted(directory.glob("*.json")):
            d = _load_json(f)
            if not d:
                continue
            if assigned_loop and d.get("assigned_loop") != assigned_loop:
                continue
            results.append(Task(
                id=d.get("id", f.stem),
                title=d.get("title", ""),
                description=d.get("description", ""),
                product=d.get("product", ""),
                feature_id=d.get("feature_id", ""),
                assigned_loop=d.get("assigned_loop", ""),
                priority=d.get("priority", "p2"),
                dependencies=d.get("dependencies", []),
                acceptance_criteria=d.get("acceptance_criteria", []),
                aspirational_doc_ref=d.get("aspirational_doc_ref", ""),
                created=d.get("created", ""),
            ))
        return results

    # ── events ────────────────────────────────────────────────────────────────

    def events(self, n: int = 50) -> List[str]:
        if not self._events_log.exists():
            return []
        lines = self._events_log.read_text().splitlines()
        return [l for l in lines if l.strip()][-n:]

    def append_event(self, loop: str, event_type: str, summary: str, artifact_id: str = "none") -> None:
        self._events_log.parent.mkdir(parents=True, exist_ok=True)
        line = f"{_now_iso()} | {loop} | {event_type} | {summary} | {artifact_id}\n"
        with self._events_log.open("a") as f:
            f.write(line)

    # ── shared/ sweep ─────────────────────────────────────────────────────────

    def sweep_stale_shared(self, max_age_minutes: int = 30) -> int:
        """Delete shared/ coordination hints older than max_age_minutes. Returns count deleted."""
        deleted = 0
        if not self._shared.is_dir():
            return 0
        threshold = time.time() - (max_age_minutes * 60)
        for f in self._shared.glob("*.json"):
            if f.stat().st_mtime < threshold:
                f.unlink()
                deleted += 1
        return deleted
