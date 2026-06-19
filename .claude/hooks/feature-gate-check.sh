#!/usr/bin/env bash
# Feature lifecycle gate — runs as a PreToolUse hook.
# Reads the tool's stdin JSON, extracts feature IDs, blocks if any are pre-beta.
# Exit 0 = allow. Exit 1 = block (with message to stderr).

set -euo pipefail

FEATURES_FILE="${FEATURES_FILE:-.claude/blackboard/state/features.json}"
EVENTS_LOG="${EVENTS_LOG:-.claude/blackboard/events/loop.log}"
LOOP_NAME="${LOOP_NAME:-unknown}"

# Read tool input from stdin (Claude Code passes it as JSON)
TOOL_INPUT=$(cat)

# Extract any feature IDs referenced in the tool call
FEATURE_IDS=$(echo "$TOOL_INPUT" | python3 -c "
import sys, re, json
text = sys.stdin.read()
# Search across the whole JSON blob for feat-<id> patterns
ids = set(re.findall(r'feat-[a-zA-Z0-9_-]+', text))
for i in ids:
    print(i)
" 2>/dev/null || true)

if [ -z "$FEATURE_IDS" ]; then
    exit 0  # no feature refs found — allow
fi

if [ ! -f "$FEATURES_FILE" ]; then
    exit 0  # no features file — allow (new project)
fi

# Check each feature ID
BLOCKED=""
BLOCKED_FEATURES=""
while IFS= read -r feat_id; do
    [ -z "$feat_id" ] && continue
    STATUS=$(python3 -c "
import json, sys
try:
    data = json.load(open('$FEATURES_FILE'))
    feat = data.get('features', {}).get('$feat_id', {})
    print(feat.get('status', 'unknown'))
except Exception:
    print('unknown')
" 2>/dev/null || echo "unknown")

    case "$STATUS" in
        planned|in_dev|alpha)
            BLOCKED="1"
            BLOCKED_FEATURES="$BLOCKED_FEATURES $feat_id($STATUS)"
            ;;
        beta|ga|deprecated|unknown)
            ;;  # allow
    esac
done <<< "$FEATURE_IDS"

if [ -n "$BLOCKED" ]; then
    TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u +"%Y-%m-%dT%H:%M:%SZ")
    MSG="Feature gate blocked: $BLOCKED_FEATURES — status must be beta or ga before external publishing. Write an escalation to state/escalations/ and await founder approval."

    # Log to events
    mkdir -p "$(dirname "$EVENTS_LOG")"
    echo "$TIMESTAMP | $LOOP_NAME | GATE_BLOCKED | $BLOCKED_FEATURES | none" >> "$EVENTS_LOG" 2>/dev/null || true

    echo "$MSG" >&2
    exit 1
fi

exit 0
