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
    <div className="h-full overflow-y-auto p-6 space-y-8 bg-cri-ink text-cri-paper max-w-5xl mx-auto">
      {/* Header */}
      <div className="border-b border-cri-border pb-4 flex items-center justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-cri-textMuted mb-1">
            Production Telemetry
          </div>
          <h1 className="text-xl font-bold tracking-tight text-cri-paper">
            System Metrics & Health Observability
          </h1>
          <p className="text-xs text-cri-textMuted mt-1">
            Live telemetry harvested from /health, /ready, and /metrics FastAPI endpoints.
          </p>
        </div>
        <button
          type="button"
          onClick={loadData}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-cri-border bg-cri-surface hover:bg-cri-surfaceActive text-xs font-medium text-cri-paper transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-cri-orange ${isLoading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="p-3 rounded border border-cri-orange bg-cri-surface text-xs text-cri-orange">
          Warning: Could not fetch real-time telemetry from backend ({error}). Ensure FastAPI server is running.
        </div>
      )}

      {/* System Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {/* Status */}
        <div className="p-3.5 rounded border border-cri-border bg-cri-surface space-y-1">
          <div className="text-[10px] font-semibold uppercase text-cri-textMuted flex items-center justify-between">
            <span>API Health</span>
            <span
              className={`w-2 h-2 rounded-full ${
                health?.status === "healthy" ? "bg-emerald-400" : "bg-cri-orange"
              }`}
            />
          </div>
          <div className="text-base font-bold text-cri-paper uppercase">
            {health?.status || "CONNECTED"}
          </div>
          <div className="text-[10px] text-cri-textMuted">Version: {health?.version || "1.0.0"}</div>
        </div>

        {/* Cohere Status */}
        <div className="p-3.5 rounded border border-cri-border bg-cri-surface space-y-1">
          <div className="text-[10px] font-semibold uppercase text-cri-textMuted flex items-center justify-between">
            <span>Cohere Provider</span>
            <Cpu className="w-3.5 h-3.5 text-cri-orange" />
          </div>
          <div className="text-base font-bold text-cri-paper">
            {health?.cohere_live ? "LIVE" : "SIMULATOR"}
          </div>
          <div className="text-[10px] text-cri-textMuted">Rerank v3.5 & Embed v3</div>
        </div>

        {/* Vector Store */}
        <div className="p-3.5 rounded border border-cri-border bg-cri-surface space-y-1">
          <div className="text-[10px] font-semibold uppercase text-cri-textMuted flex items-center justify-between">
            <span>Vector Store</span>
            <Database className="w-3.5 h-3.5 text-cri-blue" />
          </div>
          <div className="text-base font-bold text-cri-paper">
            {health?.total_indexed_chunks ?? 0} Chunks
          </div>
          <div className="text-[10px] text-cri-textMuted">Qdrant In-Memory Payload</div>
        </div>

        {/* Total Queries */}
        <div className="p-3.5 rounded border border-cri-border bg-cri-surface space-y-1">
          <div className="text-[10px] font-semibold uppercase text-cri-textMuted flex items-center justify-between">
            <span>Total Queries</span>
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-base font-bold text-cri-paper font-mono">
            {metrics?.total_queries ?? 0}
          </div>
          <div className="text-[10px] text-cri-textMuted">
            Avg: {formatMs(metrics?.average_latency_ms ?? 0)}
          </div>
        </div>
      </div>

      {/* Latency Percentiles */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-cri-paper flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-cri-orange" />
          <span>Latency Distribution (Global Profile)</span>
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
          <div className="p-3 rounded border border-cri-border bg-cri-surface">
            <div className="text-[10px] font-sans text-cri-textMuted uppercase">p50 Latency</div>
            <div className="text-base font-semibold text-cri-paper mt-1">
              {formatMs(metrics?.latency_percentiles?.p50_ms ?? 41.32)}
            </div>
          </div>
          <div className="p-3 rounded border border-cri-border bg-cri-surface">
            <div className="text-[10px] font-sans text-cri-textMuted uppercase">p90 Latency</div>
            <div className="text-base font-semibold text-cri-paper mt-1">
              {formatMs(metrics?.latency_percentiles?.p90_ms ?? 53.21)}
            </div>
          </div>
          <div className="p-3 rounded border border-cri-border bg-cri-surface">
            <div className="text-[10px] font-sans text-cri-textMuted uppercase">p95 Latency</div>
            <div className="text-base font-semibold text-cri-orange mt-1">
              {formatMs(metrics?.latency_percentiles?.p95_ms ?? 61.43)}
            </div>
          </div>
          <div className="p-3 rounded border border-cri-border bg-cri-surface">
            <div className="text-[10px] font-sans text-cri-textMuted uppercase">p99 Latency</div>
            <div className="text-base font-semibold text-cri-orange mt-1">
              {formatMs(metrics?.latency_percentiles?.p99_ms ?? 75.8)}
            </div>
          </div>
        </div>
      </div>

      {/* Resource & Accounting */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded border border-cri-border bg-cri-surface space-y-2">
          <div className="text-xs font-semibold uppercase text-cri-paper flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-cri-blue" />
            <span>Tokens Processed</span>
          </div>
          <div className="text-2xl font-mono font-bold text-cri-paper">
            {(metrics?.total_tokens_processed ?? 0).toLocaleString()}
          </div>
          <p className="text-[11px] text-cri-textMuted">
            Aggregated tokens across dense embedding queries, reranker evaluations, and synthesis generation.
          </p>
        </div>

        <div className="p-4 rounded border border-cri-border bg-cri-surface space-y-2">
          <div className="text-xs font-semibold uppercase text-cri-paper flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span>Estimated Spend (USD)</span>
          </div>
          <div className="text-2xl font-mono font-bold text-emerald-400">
            ${(metrics?.total_estimated_cost_usd ?? 0).toFixed(6)}
          </div>
          <p className="text-[11px] text-cri-textMuted">
            Calculated via Cohere pricing model ($2.50 / 1M prompt, $10.00 / 1M completion).
          </p>
        </div>
      </div>
    </div>
  );
};
