"use client";

import { useEffect, useState } from "react";

type Priority = "critical" | "high" | "medium" | "low";

interface Escalation {
  id: string;
  from_loop: string;
  priority: Priority;
  question: string;
  raised_at: string;
  resolved?: boolean;
  resolution?: string;
}

const PRIORITY_ORDER: Record<Priority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const PRIORITY_BADGE: Record<Priority, string> = {
  critical: "bg-red-600 text-white",
  high: "bg-orange-500 text-black",
  medium: "bg-yellow-400 text-black",
  low: "bg-gray-500 text-white",
};

function timeAgo(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffSeconds = Math.floor((now - then) / 1000);
  if (diffSeconds < 60) return `${diffSeconds}s ago`;
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  return `${diffHours}h ago`;
}

export default function EscalationQueue() {
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [resolving, setResolving] = useState<string | null>(null);
  const [resolutionText, setResolutionText] = useState("");
  const [submitStatus, setSubmitStatus] = useState<string | null>(null);

  const fetchEscalations = async () => {
    try {
      const res = await fetch("/api/blackboard/escalations");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Escalation[] = await res.json();
      // Sort: critical first, then by raised_at desc
      const sorted = [...data].sort((a, b) => {
        const pa = PRIORITY_ORDER[a.priority] ?? 99;
        const pb = PRIORITY_ORDER[b.priority] ?? 99;
        if (pa !== pb) return pa - pb;
        return new Date(b.raised_at).getTime() - new Date(a.raised_at).getTime();
      });
      setEscalations(sorted);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fetch failed");
    }
  };

  useEffect(() => {
    fetchEscalations();
    const interval = setInterval(fetchEscalations, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleResolve = async (id: string) => {
    if (!resolutionText.trim()) {
      setSubmitStatus("Resolution text required.");
      return;
    }
    try {
      const res = await fetch("/api/blackboard/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, resolution: resolutionText }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSubmitStatus("Resolved.");
      setResolving(null);
      setResolutionText("");
      fetchEscalations();
    } catch (err) {
      setSubmitStatus(err instanceof Error ? err.message : "Failed to resolve");
    }
  };

  const pending = escalations.filter((e) => !e.resolved);
  const resolved = escalations.filter((e) => e.resolved);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Escalation Queue</h2>
        <span className="text-xs text-gray-500">{pending.length} pending</span>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded p-2 text-red-300 text-xs">
          Error: {error}
        </div>
      )}

      {submitStatus && (
        <div className="bg-blue-900/30 border border-blue-700 rounded p-2 text-blue-300 text-xs">
          {submitStatus}
        </div>
      )}

      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
        {pending.length === 0 && !error && (
          <div className="text-gray-500 text-sm italic">No pending escalations.</div>
        )}

        {pending.map((esc) => (
          <div
            key={esc.id}
            className="bg-[#111111] border border-gray-700 rounded p-3 space-y-2"
          >
            <div className="flex items-start gap-2">
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                  PRIORITY_BADGE[esc.priority] ?? "bg-gray-600 text-white"
                }`}
              >
                {esc.priority}
              </span>
              <span className="text-xs text-gray-400">{esc.from_loop}</span>
              <span className="text-xs text-gray-600 ml-auto whitespace-nowrap">
                {timeAgo(esc.raised_at)}
              </span>
            </div>

            <p className="text-sm text-gray-200 leading-snug">
              {esc.question.length > 120
                ? esc.question.slice(0, 120) + "…"
                : esc.question}
            </p>

            {resolving === esc.id ? (
              <div className="space-y-2 pt-1">
                <textarea
                  className="w-full bg-[#1a1a1a] border border-gray-600 rounded p-2 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-blue-500"
                  rows={3}
                  placeholder="Resolution text…"
                  value={resolutionText}
                  onChange={(e) => setResolutionText(e.target.value)}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleResolve(esc.id)}
                    className="text-xs bg-green-700 hover:bg-green-600 text-white px-3 py-1 rounded transition-colors"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => {
                      setResolving(null);
                      setResolutionText("");
                      setSubmitStatus(null);
                    }}
                    className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  setResolving(esc.id);
                  setSubmitStatus(null);
                }}
                className="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-300 px-3 py-1 rounded transition-colors"
              >
                Resolve
              </button>
            )}
          </div>
        ))}

        {resolved.length > 0 && (
          <details className="mt-2">
            <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-400">
              {resolved.length} resolved
            </summary>
            <div className="space-y-1 mt-1">
              {resolved.map((esc) => (
                <div
                  key={esc.id}
                  className="bg-[#0d0d0d] border border-gray-800 rounded p-2 opacity-60"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600">{esc.from_loop}</span>
                    <span className="text-xs text-green-700 font-semibold ml-auto">resolved</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 truncate">{esc.question}</p>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </section>
  );
}
