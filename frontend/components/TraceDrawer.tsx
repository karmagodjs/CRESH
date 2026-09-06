"use client";

import React from "react";
import { QueryResponse } from "@/lib/types";
import { formatMs } from "@/lib/utils";
import { X, Sliders, Clock, Cpu, DollarSign, Layers } from "lucide-react";

interface TraceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  queryResponse: QueryResponse | null;
}

export const TraceDrawer: React.FC<TraceDrawerProps> = ({
  isOpen,
  onClose,
  queryResponse,
}) => {
  if (!isOpen) return null;

  // Actual runtime latencies
  const timings = queryResponse?.timings_ms || queryResponse?.latency_breakdown || {};
  const totalLatency = queryResponse?.total_latency_ms || 0;

  // Stage sequence
  const stages: { label: string; key: string }[] = [
    { label: "Query expansion", key: "query_expansion" },
    { label: "Dense retrieval", key: "dense_retrieval" },
    { label: "BM25 retrieval", key: "bm25_retrieval" },
    { label: "RRF candidate fusion", key: "rrf_fusion" },
    { label: "Cohere Rerank v3.5", key: "cohere_rerank" },
    { label: "Evidence gate", key: "evidence_gate" },
    { label: "Targeted generation", key: "generation" },
    { label: "Grounding evaluation", key: "grounding" },
    { label: "Citation verification", key: "citation_verification" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-[1px] transition-opacity select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-cri-ink border-l border-cri-border h-full flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-cri-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cri-orange" />
            <h2 className="text-sm font-bold tracking-tight text-cri-paper">
              Research Trace & Latency Audit
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-cri-textMuted hover:text-cri-paper hover:bg-cri-surface transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {!queryResponse ? (
            <div className="py-12 text-center text-xs text-cri-textMuted">
              No query executed yet. Submit a research question to inspect live request execution trace and latencies.
            </div>
          ) : (
            <>
              {/* Correlation Identifiers */}
              <div className="p-3 rounded bg-cri-surface border border-cri-border space-y-2 text-xs">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-cri-textMuted">
                  Trace Identifiers
                </div>
                <div className="space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-cri-textMuted">request_id:</span>
                    <span className="text-cri-paper truncate max-w-[220px]" title={queryResponse.request_id}>
                      {queryResponse.request_id || "req-local"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-cri-textMuted">trace_id:</span>
                    <span className="text-cri-paper truncate max-w-[220px]" title={queryResponse.trace_id}>
                      {queryResponse.trace_id || "trc-local"}
                    </span>
                  </div>
                  {queryResponse.question_id && (
                    <div className="flex justify-between">
                      <span className="text-cri-textMuted">question_id:</span>
                      <span className="text-cri-paper">{queryResponse.question_id}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Stage Latencies */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-cri-textMuted">
                  <span>Stage Latencies</span>
                  <span>Duration</span>
                </div>

                <div className="rounded border border-cri-border bg-cri-surface divide-y divide-cri-border text-xs">
                  {stages.map((st) => {
                    const rawMs = timings[st.key] || 0;
                    const pct = totalLatency > 0 ? Math.min(100, (rawMs / totalLatency) * 100) : 0;

                    return (
                      <div key={st.key} className="p-2.5 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-cri-paper font-medium">{st.label}</span>
                          <span className="font-mono text-cri-textMuted text-[11px]">
                            {formatMs(rawMs)}
                          </span>
                        </div>
                        {rawMs > 0 && (
                          <div className="w-full bg-cri-ink h-1 rounded overflow-hidden">
                            <div
                              className="bg-cri-orange h-full rounded transition-all duration-300"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Total row */}
                  <div className="p-2.5 bg-cri-surfaceActive flex items-center justify-between font-semibold">
                    <span className="text-cri-paper">Total Latency</span>
                    <span className="font-mono text-cri-orange">{formatMs(totalLatency)}</span>
                  </div>
                </div>
              </div>

              {/* Resource & Cost Accounting */}
              <div className="p-3 rounded bg-cri-surface border border-cri-border space-y-2.5 text-xs">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-cri-textMuted">
                  Token Accounting & Cost
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded bg-cri-ink border border-cri-border">
                    <div className="text-cri-textMuted text-[10px] uppercase">Prompt Tokens</div>
                    <div className="font-mono font-semibold text-cri-paper mt-0.5">
                      {queryResponse.token_usage?.prompt_tokens ?? 0}
                    </div>
                  </div>
                  <div className="p-2 rounded bg-cri-ink border border-cri-border">
                    <div className="text-cri-textMuted text-[10px] uppercase">Completion Tokens</div>
                    <div className="font-mono font-semibold text-cri-paper mt-0.5">
                      {queryResponse.token_usage?.completion_tokens ?? 0}
                    </div>
                  </div>
                  <div className="p-2 rounded bg-cri-ink border border-cri-border">
                    <div className="text-cri-textMuted text-[10px] uppercase">Total Tokens</div>
                    <div className="font-mono font-semibold text-cri-paper mt-0.5">
                      {queryResponse.token_usage?.total_tokens ?? 0}
                    </div>
                  </div>
                  <div className="p-2 rounded bg-cri-ink border border-cri-border">
                    <div className="text-cri-textMuted text-[10px] uppercase">Estimated Cost</div>
                    <div className="font-mono font-semibold text-emerald-400 mt-0.5">
                      ${(queryResponse.estimated_cost_usd || 0).toFixed(6)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Execution Trace Steps */}
              {queryResponse.execution_trace && queryResponse.execution_trace.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-cri-textMuted">
                    Graph Execution Steps ({queryResponse.execution_trace.length})
                  </div>
                  <div className="rounded border border-cri-border bg-cri-surface p-2 space-y-1 font-mono text-[10px] text-cri-paper/80 max-h-40 overflow-y-auto">
                    {queryResponse.execution_trace.map((step, sIdx) => (
                      <div key={sIdx} className="flex items-center gap-1.5 py-0.5 border-b border-cri-border/40 last:border-0">
                        <span className="text-cri-orange">{sIdx + 1}.</span>
                        <span className="truncate">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
