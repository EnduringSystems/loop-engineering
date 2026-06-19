"use client";

import { useEffect, useState } from "react";

interface LoopStatus {
  loop: string;
  status: "active" | "idle" | "blocked" | "escalating" | "paused";
  current_task: string | null;
  since: string;
  artifact_ids: string[];
  next_action: string | null;
  blocked_on: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500 text-black",
  idle: "bg-gray-400 text-black",
  blocked: "bg-yellow-400 text-black",
  escalating: "bg-red-500 text-white",
  paused: "bg-blue-400 text-black",
};

const STATUS_BORDER: Record<string, string> = {
  active: "border-green-500",
  idle: "border-gray-600",
  blocked: "border-yellow-400",
  escalating: "border-red-500",
  paused: "border-blue-400",
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

function isStale(isoString: string): boolean {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  return now - then > 30 * 60 * 1000;
}

export default function LoopGrid() {
  const [loops, setLoops] = useState<LoopStatus[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchLoops = async () => {
    try {
      const res = await fetch("/api/blackboard/loops");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: LoopStatus[] = await res.json();
      setLoops(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fetch failed");
    }
  };

  useEffect(() => {
    fetchLoops();
    const interval = setInterval(fetchLoops, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Loop Grid</h2>
        {lastUpdated && (
          <span className="text-xs text-gray-500">
            Updated {timeAgo(lastUpdated.toISOString())}
          </span>
        )}
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded p-3 text-red-300 text-sm">
          Error: {error}
        </div>
      )}

      {loops.length === 0 && !error && (
        <div className="text-gray-500 text-sm italic">No loop data available.</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {loops.map((loop) => {
          const stale = isStale(loop.since);
          const borderClass = stale
            ? "border-amber-500"
            : STATUS_BORDER[loop.status] ?? "border-gray-600";

          return (
            <div
              key={loop.loop}
              className={`border rounded-lg p-4 bg-[#111111] space-y-2 ${borderClass}`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-bold text-white text-sm leading-tight break-all">{loop.loop}</span>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${
                    STATUS_COLORS[loop.status] ?? "bg-gray-600 text-white"
                  }`}
                >
                  {loop.status}
                </span>
              </div>

              <div className="text-xs text-gray-400 flex items-center gap-1">
                <span className="text-gray-500">last seen:</span>
                <span className={stale ? "text-amber-400 font-semibold" : "text-gray-300"}>
                  {timeAgo(loop.since)}
                  {stale && " ⚠ stale"}
                </span>
              </div>

              {loop.current_task && (
                <div className="text-xs">
                  <span className="text-gray-500">task: </span>
                  <span className="text-gray-200 truncate block max-w-full">
                    {loop.current_task.length > 60
                      ? loop.current_task.slice(0, 60) + "…"
                      : loop.current_task}
                  </span>
                </div>
              )}

              {loop.blocked_on && (
                <div className="text-xs bg-yellow-900/30 border border-yellow-700 rounded px-2 py-1">
                  <span className="text-yellow-400 font-semibold">blocked: </span>
                  <span className="text-yellow-200">{loop.blocked_on}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
