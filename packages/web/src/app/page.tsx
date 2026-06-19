"use client";

import { useEffect, useState } from "react";
import LoopGrid from "@/components/LoopGrid";
import FeatureKanban from "@/components/FeatureKanban";
import EscalationQueue from "@/components/EscalationQueue";
import DirectiveComposer from "@/components/DirectiveComposer";
import EventStream from "@/components/EventStream";

const NAV_ITEMS = [
  { id: "loops",      icon: "⬡", label: "Loops" },
  { id: "features",   icon: "◈", label: "Features" },
  { id: "escalation", icon: "⚑", label: "Escalation" },
  { id: "directives", icon: "⇢", label: "Directives" },
  { id: "events",     icon: "≡", label: "Events" },
];

function StatsBar() {
  const [loops, setLoops] = useState<{ status: string }[]>([]);
  useEffect(() => {
    const fetch_ = () =>
      fetch("/api/blackboard/loops")
        .then(r => r.ok ? r.json() : [])
        .then(setLoops)
        .catch(() => {});
    fetch_();
    const id = setInterval(fetch_, 5000);
    return () => clearInterval(id);
  }, []);

  const active     = loops.filter(l => l.status === "active").length;
  const blocked    = loops.filter(l => l.status === "blocked").length;
  const escalating = loops.filter(l => l.status === "escalating").length;
  const healthy    = blocked === 0 && escalating === 0;

  return (
    <div className="flex items-center gap-5 text-xs font-mono">
      <div className="flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full ${healthy ? "bg-green-400" : "bg-red-500"}`} />
        <span className="text-gray-300 font-semibold">System Health</span>
        <span className={healthy ? "text-green-400" : "text-red-400"}>
          {healthy ? "● Healthy" : "● Degraded"}
        </span>
      </div>
      <span className="text-gray-600">|</span>
      <span className="text-gray-300"><span className="text-white font-bold">{loops.length}</span> Loops</span>
      <span className="text-gray-300"><span className="text-green-400 font-bold">{active}</span> Active</span>
      {blocked    > 0 && <span className="text-yellow-400 font-bold">{blocked} Blocked</span>}
      {escalating > 0 && <span className="text-red-400 font-bold">{escalating} Escalating</span>}
    </div>
  );
}

export default function Home() {
  const [activeNav, setActiveNav] = useState("loops");

  return (
    <div className="flex h-screen bg-[#080c14] text-[#e8eaf0] overflow-hidden">

      {/* ── Left Sidebar ── */}
      <aside className="w-14 flex flex-col items-center py-4 gap-1 bg-[#0d1117] border-r border-[#1e2533] shrink-0">
        <div className="text-indigo-400 text-lg font-black mb-4 select-none">L</div>
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveNav(item.id)}
            title={item.label}
            className={`w-10 h-10 flex items-center justify-center rounded-lg text-base transition-colors
              ${activeNav === item.id
                ? "bg-indigo-600 text-white"
                : "text-gray-500 hover:text-gray-300 hover:bg-[#1a2030]"}`}
          >
            {item.icon}
          </button>
        ))}
      </aside>

      {/* ── Main Area ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* Top Header Bar */}
        <header className="flex items-center justify-between px-5 py-2.5 border-b border-[#1e2533] bg-[#0d1117] shrink-0">
          <h1 className="text-sm font-bold text-white tracking-wide">
            Loop Engineering <span className="text-indigo-400">— Founder Dashboard</span>
          </h1>
          <StatsBar />
        </header>

        {/* ── Dashboard Body — view switches on nav ── */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* ── OVERVIEW (Loops) — 3-column default ── */}
          {activeNav === "loops" && (
            <>
              <div className="w-[400px] shrink-0 border-r border-[#1e2533] p-4 overflow-y-auto">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">
                  Autonomous Loops
                </p>
                <LoopGrid />
              </div>
              <div className="flex-1 min-w-0 border-r border-[#1e2533] p-4 overflow-y-auto space-y-6">
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">
                    Feature Lifecycle Board
                  </p>
                  <FeatureKanban />
                </div>
                <div className="border-t border-[#1e2533] pt-5">
                  <EventStream />
                </div>
              </div>
              <div className="w-[320px] shrink-0 p-4 overflow-y-auto space-y-5">
                <EscalationQueue />
                <div className="border-t border-[#1e2533] pt-4">
                  <DirectiveComposer />
                </div>
              </div>
            </>
          )}

          {/* ── FEATURES — full-width kanban ── */}
          {activeNav === "features" && (
            <div className="flex-1 min-w-0 p-6 overflow-y-auto">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">
                Feature Lifecycle Board
              </p>
              <FeatureKanban />
            </div>
          )}

          {/* ── ESCALATION — full-width queue ── */}
          {activeNav === "escalation" && (
            <div className="flex-1 min-w-0 p-6 overflow-y-auto">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">
                Escalation Queue
              </p>
              <EscalationQueue />
            </div>
          )}

          {/* ── DIRECTIVES — full-width composer ── */}
          {activeNav === "directives" && (
            <div className="flex-1 min-w-0 p-6 overflow-y-auto max-w-2xl mx-auto">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">
                Directive Composer
              </p>
              <DirectiveComposer />
            </div>
          )}

          {/* ── EVENTS — full-width event stream ── */}
          {activeNav === "events" && (
            <div className="flex-1 min-w-0 p-6 overflow-y-auto">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">
                Event Stream
              </p>
              <EventStream />
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
