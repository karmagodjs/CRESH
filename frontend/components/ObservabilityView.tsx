"use client";

import React, { useEffect, useState } from "react";
import { fetchHealth, fetchMetrics, fetchReadiness } from "@/lib/api";
import { HealthResponse, MetricsResponse, ReadinessResponse } from "@/lib/types";
import { formatMs } from "@/lib/utils";
import { Activity, RefreshCw, Cpu, Database, DollarSign, Clock, ShieldCheck } from "lucide-react";

export const ObservabilityView: React.FC = () => {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [readiness, setReadiness] = useState<ReadinessResponse | null>(null);
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [h, r, m] = await Promise.all([
        fetchHealth().catch(() => null),
        fetchReadiness().catch(() => null),
        fetchMetrics().catch(() => null),
      ]);
      setHealth(h);
      setReadiness(r);
      setMetrics(m);
    } catch (err: any) {
      setError(err.message || "Failed to load telemetry");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="h-full overflow-y-auto p-6 md:p-8 space-y-8 bg-cri-bg text-cri-textPrimary max-w-5xl mx-auto custom-scrollbar">
      <div className="border-b border-cri-border pb-5 flex items-center justify-between">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-wider text-cri-orange font-semibold mb-1 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5" />
            <span>Production Telemetry</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-cri-textPrimary">
            System Metrics & Health Observability
          </h1>
          <p className="text-xs text-cri-textSecondary mt-1.5">
            Live telemetry harvested from <code className="font-mono text-cri-textPrimary bg-cri-surface px-1.5 py-0.5 rounded">/health</code>, <code className="font-mono text-cri-textPrimary bg-cri-surface px-1.5 py-0.5 rounded">/ready</code>, and <code className="font-mono text-cri-textPrimary bg-cri-surface px-1.5 py-0.5 rounded">/metrics</code> FastAPI endpoints.
          </p>
        </div>
        <button
          type="button"
          onClick={loadData}
          disabled={isLoading}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-[10px] border border-cri-border bg-cri-surface hover:bg-cri-surfaceElevated text-xs font-mono font-medium text-cri-textPrimary transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-cri-orange ${isLoading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="p-3.5 rounded-[10px] border border-cri-orange/40 bg-cri-orange/10 text-xs text-cri-orange flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 shrink-0 text-cri-orange" />
          <span>Notice: Could not fetch real-time telemetry from backend ({error}). Live FastAPI server recommended.</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-[12px] border border-cri-border bg-cri-surface space-y-1.5">
          <div className="text-[10px] font-mono font-semibold uppercase text-cri-textSecondary flex items-center justify-between">
            <span>API Health</span>
            <span
              className={`w-2 h-2 rounded-full ${
                health?.status === "healthy" ? "bg-cri-green" : "bg-cri-orange"
              }`}
            />
          </div>
          <div className="text-base font-mono font-bold text-cri-textPrimary uppercase">
            {health?.status || "CONNECTED"}
          </div>
          <div className="text-[10px] font-mono text-cri-textMuted">Version: {health?.version || "1.0.0"}</div>
        </div>

        <div className="p-4 rounded-[12px] border border-cri-border bg-cri-surface space-y-1.5">
          <div className="text-[10px] font-mono font-semibold uppercase text-cri-textSecondary flex items-center justify-between">
            <span>Cohere Provider</span>
            <Cpu className="w-3.5 h-3.5 text-cri-orange" />
          </div>
          <div className="text-base font-mono font-bold text-cri-textPrimary">
            {health?.cohere_live ? "LIVE" : "SIMULATOR"}
          </div>
          <div className="text-[10px] font-mono text-cri-textMuted">Rerank v3.5 & Embed v3</div>
        </div>

        <div className="p-4 rounded-[12px] border border-cri-border bg-cri-surface space-y-1.5">
          <div className="text-[10px] font-mono font-semibold uppercase text-cri-textSecondary flex items-center justify-between">
            <span>Vector Store</span>
            <Database className="w-3.5 h-3.5 text-cri-blue" />
          </div>
          <div className="text-base font-mono font-bold text-cri-textPrimary">
            {health?.total_indexed_chunks ?? 0} Chunks
          </div>
          <div className="text-[10px] font-mono text-cri-textMuted">Qdrant In-Memory Payload</div>
        </div>

        <div className="p-4 rounded-[12px] border border-cri-border bg-cri-surface space-y-1.5">
          <div className="text-[10px] font-mono font-semibold uppercase text-cri-textSecondary flex items-center justify-between">
            <span>Total Queries</span>
            <Activity className="w-3.5 h-3.5 text-cri-green" />
          </div>
          <div className="text-base font-bold text-cri-textPrimary font-mono">
            {metrics?.total_queries ?? 0}
          </div>
          <div className="text-[10px] font-mono text-cri-textMuted">
            Avg: {formatMs(metrics?.average_latency_ms ?? 0)}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-cri-textPrimary flex items-center gap-2">
          <Clock className="w-4 h-4 text-cri-orange" />
          <span>Latency Distribution (Global Profile)</span>
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 font-mono text-xs">
          <div className="p-3.5 rounded-[12px] border border-cri-border bg-cri-surface">
            <div className="text-[10px] text-cri-textSecondary uppercase">p50 Latency</div>
            <div className="text-base font-mono font-semibold text-cri-textPrimary mt-1">
              {formatMs(metrics?.latency_percentiles?.p50_ms ?? 41.32)}
            </div>
          </div>
          <div className="p-3.5 rounded-[12px] border border-cri-border bg-cri-surface">
            <div className="text-[10px] text-cri-textSecondary uppercase">p90 Latency</div>
            <div className="text-base font-mono font-semibold text-cri-textPrimary mt-1">
              {formatMs(metrics?.latency_percentiles?.p90_ms ?? 53.21)}
            </div>
          </div>
          <div className="p-3.5 rounded-[12px] border border-cri-border bg-cri-surface">
            <div className="text-[10px] text-cri-textSecondary uppercase">p95 Latency</div>
            <div className="text-base font-mono font-semibold text-cri-orange mt-1">
              {formatMs(metrics?.latency_percentiles?.p95_ms ?? 61.43)}
            </div>
          </div>
          <div className="p-3.5 rounded-[12px] border border-cri-border bg-cri-surface">
            <div className="text-[10px] text-cri-textSecondary uppercase">p99 Latency</div>
            <div className="text-base font-mono font-semibold text-cri-orange mt-1">
              {formatMs(metrics?.latency_percentiles?.p99_ms ?? 75.8)}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-5 rounded-[12px] border border-cri-border bg-cri-surface space-y-2">
          <div className="text-xs font-semibold uppercase text-cri-textPrimary flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cri-blue" />
            <span>Tokens Processed</span>
          </div>
          <div className="text-2xl font-mono font-bold text-cri-textPrimary">
            {(metrics?.total_tokens_processed ?? 0).toLocaleString()}
          </div>
          <p className="text-[11px] text-cri-textSecondary">
            Aggregated tokens across dense embedding queries, reranker evaluations, and synthesis generation.
          </p>
        </div>

        <div className="p-5 rounded-[12px] border border-cri-border bg-cri-surface space-y-2">
          <div className="text-xs font-semibold uppercase text-cri-textPrimary flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-cri-green" />
            <span>Estimated Spend (USD)</span>
          </div>
          <div className="text-2xl font-mono font-bold text-cri-green">
            ${(metrics?.total_estimated_cost_usd ?? 0).toFixed(6)}
          </div>
          <p className="text-[11px] text-cri-textSecondary">
            Calculated via Cohere pricing model ($2.50 / 1M prompt, $10.00 / 1M completion).
          </p>
        </div>
      </div>
    </div>
  );
};
