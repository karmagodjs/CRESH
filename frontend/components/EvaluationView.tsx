"use client";

import React from "react";
import { PHASE_6_BENCHMARKS, RETRIEVAL_ABLATION } from "@/lib/demoData";
import { Award, CheckCircle2, FileText, TrendingUp, ShieldCheck } from "lucide-react";

export const EvaluationView: React.FC = () => {
  return (
    <div className="h-full overflow-y-auto p-6 space-y-8 bg-cri-ink text-cri-paper max-w-6xl mx-auto">
      {/* View Header */}
      <div className="border-b border-cri-border pb-4">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-cri-textMuted mb-1">
          Empirical Methodology & Gold Benchmark
        </div>
        <h1 className="text-xl font-bold tracking-tight text-cri-paper flex items-center gap-2">
          <span>Phase 6 & 7 Empirical Evaluation Results</span>
        </h1>
        <p className="text-xs text-cri-textMuted mt-1 leading-relaxed max-w-3xl">
          Deterministic gold-standard evaluation across 44 queries (30 in-scope supported + 14 out-of-scope adversarial) on the canonical BERT paper (Devlin et al., 2018).
        </p>
      </div>

      {/* Primary Benchmark Scorecard */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-cri-paper flex items-center gap-1.5">
            <Award className="w-4 h-4 text-cri-orange" />
            <span>Phase 6 Hardened Verification Scorecard</span>
          </h2>
          <span className="text-[11px] text-cri-blue font-medium">44 / 44 Invariant Assertions Passed</span>
        </div>

        <div className="rounded border border-cri-border bg-cri-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-cri-border bg-cri-surfaceActive text-cri-textMuted">
                  <th className="p-3 font-semibold uppercase tracking-wider text-[11px]">Quality Metric</th>
                  <th className="p-3 font-semibold uppercase tracking-wider text-[11px]">Baseline (Phase 5)</th>
                  <th className="p-3 font-semibold uppercase tracking-wider text-[11px] text-cri-paper">Hardened (Phase 6)</th>
                  <th className="p-3 font-semibold uppercase tracking-wider text-[11px]">Empirical Delta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cri-border">
                {PHASE_6_BENCHMARKS.map((row, idx) => (
                  <tr key={idx} className="hover:bg-cri-surfaceActive/50 transition-colors">
                    <td className="p-3 font-medium text-cri-paper">{row.metric}</td>
                    <td className="p-3 text-cri-textMuted font-mono">{row.baseline}</td>
                    <td className="p-3 font-semibold text-emerald-400 font-mono">{row.hardened}</td>
                    <td className="p-3 text-xs text-cri-orange font-medium">{row.delta}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Controlled Retrieval Ablation Study */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-cri-paper flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-cri-blue" />
            <span>Controlled 5-Configuration Retrieval Ablation Study</span>
          </h2>
          <span className="text-[11px] text-cri-textMuted">30 In-Scope Queries</span>
        </div>

        <div className="rounded border border-cri-border bg-cri-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-cri-border bg-cri-surfaceActive text-cri-textMuted">
                  <th className="p-3 font-semibold uppercase tracking-wider text-[11px]">Configuration</th>
                  <th className="p-3 font-semibold uppercase tracking-wider text-[11px] text-right">Recall@5</th>
                  <th className="p-3 font-semibold uppercase tracking-wider text-[11px] text-right">Recall@10</th>
                  <th className="p-3 font-semibold uppercase tracking-wider text-[11px] text-right">MRR@10</th>
                  <th className="p-3 font-semibold uppercase tracking-wider text-[11px] text-right">Precision@5</th>
                  <th className="p-3 font-semibold uppercase tracking-wider text-[11px] text-right">nDCG@10</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cri-border font-mono text-[11px]">
                {RETRIEVAL_ABLATION.map((row, idx) => {
                  const isTop = idx === RETRIEVAL_ABLATION.length - 1;
                  return (
                    <tr
                      key={idx}
                      className={isTop ? "bg-cri-surfaceActive font-semibold" : "hover:bg-cri-surfaceActive/50"}
                    >
                      <td className="p-3 font-sans font-medium text-cri-paper">{row.config}</td>
                      <td className="p-3 text-right">{row.recall5}</td>
                      <td className="p-3 text-right text-emerald-400">{row.recall10}</td>
                      <td className="p-3 text-right text-cri-orange">{row.mrr10}</td>
                      <td className="p-3 text-right">{row.p5}</td>
                      <td className="p-3 text-right">{row.ndcg10}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Key Evaluation Conclusions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded border border-cri-border bg-cri-surface space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-cri-orange">
            Zero Hallucination Guarantee
          </h3>
          <p className="text-xs text-cri-paper/90 leading-relaxed">
            By implementing the 3-Tier Evidence Sufficiency Gate before generation, CRI completely eliminated false answers on unsupported queries (False Answer Rate dropped from 92.9% to 0.0%).
          </p>
        </div>
        <div className="p-4 rounded border border-cri-border bg-cri-surface space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-cri-blue">
            Cohere Rerank v3.5 Neural Precision
          </h3>
          <p className="text-xs text-cri-paper/90 leading-relaxed">
            Cohere Rerank v3.5 boosted MRR@10 from 0.6694 to 0.7464 and Recall@5 from 0.8333 to 0.9333 over RRF alone, and leak-free query expansion promoted specific technical queries to 100.0% Recall@10.
          </p>
        </div>
      </div>
    </div>
  );
};
