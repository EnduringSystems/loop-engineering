#!/usr/bin/env bash
# Session start hook — sweeps stale shared/ coordination hints.
# Runs automatically at the start of every Claude Code session.

set -euo pipefail

SHARED_DIR="${BLACKBOARD_ROOT:-.claude/blackboard}/shared"

if [ -d "$SHARED_DIR" ]; then
    DELETED=$(find "$SHARED_DIR" -name "*.json" -mmin +30 -delete -print 2>/dev/null | wc -l | tr -d ' ')
    if [ "$DELETED" -gt 0 ]; then
        echo "[session-start] Swept $DELETED stale shared/ hint(s)." >&2
    fi
fi

exit 0
