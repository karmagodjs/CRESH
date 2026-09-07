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

  const timings = queryResponse?.timings_ms || queryResponse?.latency_breakdown || {};
  const totalLatency = queryResponse?.total_latency_ms || 0;

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
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-[2px] transition-opacity select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-cri-surface border-l border-cri-border h-full flex flex-col shadow-2xl transition-transform"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-cri-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cri-orange" />
            <h2 className="text-sm font-bold tracking-tight text-cri-textPrimary font-sans">
              Research Trace & Latency Audit
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-[8px] text-cri-textMuted hover:text-cri-textPrimary hover:bg-cri-surfaceSecondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {!queryResponse ? (
            <div className="py-16 text-center text-xs text-cri-textMuted">
              No query executed yet. Submit a research question to inspect live request execution trace and latencies.
            </div>
          ) : (
            <>
              <div className="p-3.5 rounded-[12px] bg-cri-surfaceSecondary border border-cri-border space-y-2 text-xs">
                <div className="text-[10px] font-bold uppercase tracking-wider text-cri-textMuted font-mono">
                  Trace Identifiers
                </div>
                <div className="space-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-cri-textMuted">request_id:</span>
                    <span className="text-cri-textPrimary truncate max-w-[220px]" title={queryResponse.request_id}>
                      {queryResponse.request_id || "req-local"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-cri-textMuted">trace_id:</span>
                    <span className="text-cri-textPrimary truncate max-w-[220px]" title={queryResponse.trace_id}>
                      {queryResponse.trace_id || "trc-local"}
                    </span>
                  </div>
                  {queryResponse.question_id && (
                    <div className="flex justify-between">
                      <span className="text-cri-textMuted">question_id:</span>
                      <span className="text-cri-textPrimary">{queryResponse.question_id}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-cri-textMuted font-mono">
                  <span>Stage Latencies</span>
                  <span>Duration</span>
                </div>

                <div className="rounded-[12px] border border-cri-border bg-cri-surfaceSecondary divide-y divide-cri-border/60 text-xs overflow-hidden">
                  {stages.map((st) => {
                    const rawMs = timings[st.key] || 0;
                    const pct = totalLatency > 0 ? Math.min(100, (rawMs / totalLatency) * 100) : 0;

                    return (
                      <div key={st.key} className="p-2.5 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-cri-textPrimary font-medium text-[12px]">{st.label}</span>
                          <span className="font-mono text-cri-textMuted text-[11px]">
                            {formatMs(rawMs)}
                          </span>
                        </div>
                        {rawMs > 0 && (
                          <div className="w-full bg-cri-surface h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-cri-orange h-full rounded-full transition-all duration-300"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <div className="p-3 bg-cri-surfaceElevated flex items-center justify-between font-semibold">
                    <span className="text-cri-textPrimary text-xs">Total Latency</span>
                    <span className="font-mono text-cri-orange text-xs">{formatMs(totalLatency)}</span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-[12px] bg-cri-surfaceSecondary border border-cri-border space-y-2.5 text-xs">
                <div className="text-[10px] font-bold uppercase tracking-wider text-cri-textMuted font-mono">
                  Token Accounting & Cost
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="p-2.5 rounded-[8px] bg-cri-surface border border-cri-border">
                    <div className="text-cri-textMuted text-[9px] uppercase">Prompt Tokens</div>
                    <div className="font-bold text-cri-textPrimary mt-0.5">
                      {queryResponse.token_usage?.prompt_tokens ?? 0}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-[8px] bg-cri-surface border border-cri-border">
                    <div className="text-cri-textMuted text-[9px] uppercase">Completion Tokens</div>
                    <div className="font-bold text-cri-textPrimary mt-0.5">
                      {queryResponse.token_usage?.completion_tokens ?? 0}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-[8px] bg-cri-surface border border-cri-border">
                    <div className="text-cri-textMuted text-[9px] uppercase">Total Tokens</div>
                    <div className="font-bold text-cri-textPrimary mt-0.5">
                      {queryResponse.token_usage?.total_tokens ?? 0}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-[8px] bg-cri-surface border border-cri-border">
                    <div className="text-cri-textMuted text-[9px] uppercase">Estimated Cost</div>
                    <div className="font-bold text-cri-success mt-0.5">
                      ${(queryResponse.estimated_cost_usd || 0).toFixed(6)}
                    </div>
                  </div>
                </div>
              </div>

              {queryResponse.execution_trace && queryResponse.execution_trace.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-cri-textMuted font-mono">
                    Graph Execution Steps ({queryResponse.execution_trace.length})
                  </div>
                  <div className="rounded-[12px] border border-cri-border bg-cri-surfaceSecondary p-3 space-y-1 font-mono text-[10px] text-cri-textSecondary max-h-40 overflow-y-auto">
                    {queryResponse.execution_trace.map((step, sIdx) => (
                      <div key={sIdx} className="flex items-center gap-2 py-0.5 border-b border-cri-border/40 last:border-0">
                        <span className="text-cri-orange font-bold">{sIdx + 1}.</span>
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
