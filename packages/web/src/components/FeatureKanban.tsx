"use client";

import { useEffect, useState } from "react";

type FeatureStatus = "planned" | "in_dev" | "alpha" | "beta" | "ga";

interface Feature {
  id: string;
  name: string;
  product: string;
  status: FeatureStatus;
  owner_loop: string;
  priority?: string;
  description?: string;
}

const COLUMNS: { key: FeatureStatus; label: string; headerClass: string }[] = [
  { key: "planned", label: "Planned", headerClass: "text-gray-400 border-gray-600" },
  { key: "in_dev", label: "In Dev", headerClass: "text-blue-400 border-blue-700" },
  { key: "alpha", label: "Alpha", headerClass: "text-yellow-400 border-yellow-700" },
  { key: "beta", label: "Beta", headerClass: "text-orange-400 border-orange-700" },
  { key: "ga", label: "GA", headerClass: "text-green-400 border-green-700" },
];

const PRODUCT_COLORS: Record<string, string> = {
  provenance: "bg-purple-900/40 text-purple-300",
  inventio: "bg-cyan-900/40 text-cyan-300",
  chimera: "bg-pink-900/40 text-pink-300",
  "loop-engineering": "bg-indigo-900/40 text-indigo-300",
};

export default function FeatureKanban() {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchFeatures = async () => {
    try {
      const res = await fetch("/api/blackboard/features");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Feature[] = await res.json();
      setFeatures(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fetch failed");
    }
  };

  useEffect(() => {
    fetchFeatures();
    const interval = setInterval(fetchFeatures, 5000);
    return () => clearInterval(interval);
  }, []);

  const byStatus = (status: FeatureStatus) =>
    features.filter((f) => f.status === status);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Feature Kanban</h2>
        {lastUpdated && (
          <span className="text-xs text-gray-500">
            {features.length} features · refreshed {new Date(lastUpdated).toLocaleTimeString()}
          </span>
        )}
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded p-3 text-red-300 text-sm">
          Error: {error}
        </div>
      )}

      <div className="grid grid-cols-5 gap-3 min-h-[200px]">
        {COLUMNS.map(({ key, label, headerClass }) => {
          const colFeatures = byStatus(key);
          return (
            <div key={key} className="flex flex-col space-y-2">
              <div
                className={`border-b pb-1 mb-1 flex items-center justify-between ${headerClass}`}
              >
                <span className="text-sm font-semibold">{label}</span>
                <span className="text-xs text-gray-500">{colFeatures.length}</span>
              </div>
              {colFeatures.length === 0 && (
                <div className="text-gray-700 text-xs italic">empty</div>
              )}
              {colFeatures.map((feature) => (
                <div
                  key={feature.id}
                  className="bg-[#111111] border border-gray-700 rounded p-2 space-y-1 hover:border-gray-500 transition-colors"
                >
                  <div className="text-xs font-semibold text-white leading-tight">
                    {feature.name || feature.id}
                  </div>
                  <div className="text-xs text-gray-500 font-mono">{feature.id}</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                        PRODUCT_COLORS[feature.product] ??
                        "bg-gray-800 text-gray-300"
                      }`}
                    >
                      {feature.product}
                    </span>
                  </div>
                  {feature.owner_loop && (
                    <div className="text-xs text-gray-500 truncate">
                      owner: {feature.owner_loop}
                    </div>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </section>
  );
}
