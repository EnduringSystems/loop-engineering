"use client";

import { useState } from "react";

type DirectiveType =
  | "task_assignment"
  | "priority_change"
  | "status_update"
  | "escalation_response"
  | "configuration"
  | "shutdown";

type Priority = "p0" | "p1" | "p2" | "p3";

interface DirectivePayload {
  target_loop: string;
  type: DirectiveType;
  priority: Priority;
  directive: string;
}

const DIRECTIVE_TYPES: { value: DirectiveType; label: string }[] = [
  { value: "task_assignment", label: "Task Assignment" },
  { value: "priority_change", label: "Priority Change" },
  { value: "status_update", label: "Status Update" },
  { value: "escalation_response", label: "Escalation Response" },
  { value: "configuration", label: "Configuration" },
  { value: "shutdown", label: "Shutdown" },
];

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: "p0", label: "P0 — Critical" },
  { value: "p1", label: "P1 — High" },
  { value: "p2", label: "P2 — Medium" },
  { value: "p3", label: "P3 — Low" },
];

export default function DirectiveComposer() {
  const [targetLoop, setTargetLoop] = useState("");
  const [type, setType] = useState<DirectiveType>("task_assignment");
  const [priority, setPriority] = useState<Priority>("p1");
  const [directiveText, setDirectiveText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetLoop.trim()) {
      setStatus({ ok: false, message: "Target loop is required." });
      return;
    }
    if (!directiveText.trim()) {
      setStatus({ ok: false, message: "Directive text is required." });
      return;
    }

    setSubmitting(true);
    setStatus(null);

    const payload: DirectivePayload = {
      target_loop: targetLoop.trim(),
      type,
      priority,
      directive: directiveText.trim(),
    };

    try {
      const res = await fetch("/api/blackboard/directive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`HTTP ${res.status}: ${body}`);
      }
      setStatus({ ok: true, message: "Directive sent successfully." });
      setDirectiveText("");
    } catch (err) {
      setStatus({
        ok: false,
        message: err instanceof Error ? err.message : "Failed to send directive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-white">Directive Composer</h2>

      <form onSubmit={handleSubmit} className="bg-[#111111] border border-gray-700 rounded-lg p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">
              Target Loop
            </label>
            <input
              type="text"
              value={targetLoop}
              onChange={(e) => setTargetLoop(e.target.value)}
              placeholder="e.g. cto-orchestrator"
              className="w-full bg-[#1a1a1a] border border-gray-600 rounded px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">
              Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as DirectiveType)}
              className="w-full bg-[#1a1a1a] border border-gray-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors appearance-none cursor-pointer"
            >
              {DIRECTIVE_TYPES.map((dt) => (
                <option key={dt.value} value={dt.value}>
                  {dt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className="w-full bg-[#1a1a1a] border border-gray-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors appearance-none cursor-pointer"
            >
              {PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">
            Directive
          </label>
          <textarea
            value={directiveText}
            onChange={(e) => setDirectiveText(e.target.value)}
            placeholder="Write your directive here…"
            rows={5}
            className="w-full bg-[#1a1a1a] border border-gray-600 rounded px-3 py-2 text-sm text-white placeholder-gray-600 resize-vertical focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {status && (
          <div
            className={`text-sm px-3 py-2 rounded border ${
              status.ok
                ? "bg-green-900/30 border-green-700 text-green-300"
                : "bg-red-900/30 border-red-700 text-red-300"
            }`}
          >
            {status.message}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-blue-700 hover:bg-blue-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded transition-colors text-sm"
        >
          {submitting ? "Sending…" : "Send Directive"}
        </button>
      </form>
    </section>
  );
}
