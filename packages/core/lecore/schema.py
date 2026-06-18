"""Blackboard entity schemas — harness-agnostic dataclasses."""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional, List


@dataclass
class Heartbeat:
    loop: str
    status: str          # active | idle | blocked | escalating | paused
    current_task: str
    since: str           # ISO-8601
    artifact_ids: List[str] = field(default_factory=list)
    next_action: str = ""
    blocked_on: Optional[str] = None


@dataclass
class Escalation:
    id: str
    from_loop: str
    priority: str        # critical | high | medium
    question: str
    context: str
    options: List[str] = field(default_factory=list)
    timeout_hours: int = 24
    created: str = ""
    resolved: Optional[str] = None
    resolution: Optional[str] = None


@dataclass
class Feature:
    id: str
    name: str
    product: str
    status: str          # planned | in_dev | alpha | beta | ga | deprecated
    owner_loop: str
    updated: str
    notes: str = ""


@dataclass
class Directive:
    id: str
    from_: str
    to: str              # loop name or "all"
    priority: str        # critical | high | medium
    type: str            # course-correct | priority-shift | scope-change | pause | resume | interrogate
    directive: str
    context: str = ""
    created: str = ""
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[str] = None
    response: Optional[str] = None


@dataclass
class Task:
    id: str
    title: str
    description: str
    product: str
    feature_id: str
    assigned_loop: str
    priority: str        # p0 | p1 | p2
    dependencies: List[str] = field(default_factory=list)
    acceptance_criteria: List[str] = field(default_factory=list)
    aspirational_doc_ref: str = ""
    created: str = ""
    # set when claimed/completed
    claimed_at: Optional[str] = None
    completed_at: Optional[str] = None
    outcome: Optional[str] = None
    artifact_ids: List[str] = field(default_factory=list)


FEATURE_STATUSES = ["planned", "in_dev", "alpha", "beta", "ga", "deprecated"]
LOOP_STATUSES    = ["active", "idle", "blocked", "escalating", "paused"]
PRIORITIES       = ["critical", "high", "medium"]
TASK_PRIORITIES  = ["p0", "p1", "p2"]
DIRECTIVE_TYPES  = ["course-correct", "priority-shift", "scope-change", "pause", "resume", "interrogate"]
