"use client";

import { useEffect, useRef, useState } from "react";

interface EventLine {
  raw: string;
  timestamp: string;
  loop: string;
  eventType: string;
  summary: string;
  artifactId: string;
}

function parseEventLine(line: string): EventLine {
  // Format: <ISO-8601> | <loop-name> | <EVENT_TYPE> | <summary> | <artifact-id or "none">
  const parts = line.split(" | ");
  if (parts.length >= 5) {
    return {
      raw: line,
      timestamp: parts[0].trim(),
      loop: parts[1].trim(),
      eventType: parts[2].trim(),
      summary: parts[3].trim(),
      artifactId: parts[4].trim(),
    };
  }
  // Fallback for malformed lines
  return {
    raw: line,
    timestamp: "",
    loop: "",
    eventType: "",
    summary: line,
    artifactId: "",
  };
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  LOOP_STARTED: "text-green-400",
  TASK_CLAIMED: "text-blue-400",
  TASK_COMPLETE: "text-cyan-400",
  FEATURE_STATUS_CHANGE: "text-purple-400",
  ESCALATION_RAISED: "text-red-400",
  ESCALATION_RESOLVED: "text-green-300",
  GATE_BLOCKED: "text-yellow-400",
  GATE_BYPASS_APPROVED: "text-orange-400",
  LOOP_IDLE: "text-gray-500",
};

function formatTimestamp(iso: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-US", { hour12: false });
  } catch {
    return iso;
  }
}

export default function EventStream() {
  const [events, setEvents] = useState<EventLine[]>([]);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchEvents = async () => {
    try {
      const res = await fetch("/api/blackboard/events");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: string[] = await res.json();
      // data is last 50 lines, newest first already (handled by API)
      const parsed = data.map(parseEventLine);
      setEvents(parsed);
      setCount((c) => c + 1);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fetch failed");
    }
  };

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 5000);
    return () => clearInterval(interval);
  }, []);

  const filtered = filter.trim()
    ? events.filter(
        (e) =>
          e.loop.toLowerCase().includes(filter.toLowerCase()) ||
          e.eventType.toLowerCase().includes(filter.toLowerCase()) ||
          e.summary.toLowerCase().includes(filter.toLowerCase())
      )
    : events;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-white">Event Stream</h2>
        <span className="text-xs text-gray-500">{events.length} events · poll #{count}</span>
      </div>

      <input
        type="text"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter by loop, event type, or text…"
        className="w-full bg-[#1a1a1a] border border-gray-600 rounded px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
      />

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded p-2 text-red-300 text-xs">
          Error: {error}
        </div>
      )}

      <div
        ref={containerRef}
        className="bg-[#080808] border border-gray-800 rounded-lg overflow-y-auto font-mono text-xs"
        style={{ maxHeight: "420px" }}
      >
        {filtered.length === 0 && !error && (
          <div className="p-4 text-gray-600 italic">No events.</div>
        )}
        {filtered.map((event, i) => (
          <div
            key={i}
            className="flex gap-2 px-3 py-1 border-b border-gray-900/80 hover:bg-gray-900/30 transition-colors"
          >
            <span className="text-gray-600 whitespace-nowrap shrink-0 w-20">
              {formatTimestamp(event.timestamp)}
            </span>
            <span className="text-gray-500 whitespace-nowrap shrink-0 w-28 truncate">
              {event.loop}
            </span>
            <span
              className={`whitespace-nowrap shrink-0 w-36 truncate font-semibold ${
                EVENT_TYPE_COLORS[event.eventType] ?? "text-gray-400"
              }`}
            >
              {event.eventType}
            </span>
            <span className="text-gray-300 truncate flex-1">{event.summary}</span>
            {event.artifactId && event.artifactId !== "none" && (
              <span className="text-gray-600 shrink-0 truncate max-w-[80px]">
                {event.artifactId}
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
