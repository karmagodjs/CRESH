"use client";

import React from "react";
import { PHASE_6_BENCHMARKS, RETRIEVAL_ABLATION } from "@/lib/demoData";
import { Award, TrendingUp, ShieldCheck, CheckCircle2 } from "lucide-react";

export const EvaluationView: React.FC = () => {
  return (
    <div className="h-full overflow-y-auto p-6 sm:p-8 space-y-8 bg-cri-bg text-cri-textPrimary max-w-6xl mx-auto">
      <div className="border-b border-cri-border pb-4">
        <div className="text-[10px] font-bold uppercase tracking-wider text-cri-orange font-mono mb-1">
          Empirical Methodology & Gold Benchmark
        </div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-cri-textPrimary flex items-center gap-2">
          <span>Phase 6 & 7 Empirical Evaluation Results</span>
        </h1>
        <p className="text-xs text-cri-textSecondary mt-1 leading-relaxed max-w-3xl">
          Deterministic gold-standard evaluation across 44 queries (30 in-scope supported + 14 out-of-scope adversarial) on the canonical BERT paper (Devlin et al., 2018).
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-cri-textPrimary flex items-center gap-2 font-mono">
            <Award className="w-4 h-4 text-cri-orange" />
            <span>Phase 6 Hardened Verification Scorecard</span>
          </h2>
          <span className="text-[11px] font-mono text-cri-info font-medium px-2 py-0.5 rounded-[6px] bg-cri-surfaceSecondary border border-cri-border">
            44 / 44 Invariant Assertions Passed
          </span>
        </div>

        <div className="rounded-[12px] border border-cri-border bg-cri-surface overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-cri-border bg-cri-surfaceSecondary text-cri-textMuted font-mono">
                  <th className="p-3.5 font-bold uppercase tracking-wider text-[10px]">Quality Metric</th>
                  <th className="p-3.5 font-bold uppercase tracking-wider text-[10px]">Baseline (Phase 5)</th>
                  <th className="p-3.5 font-bold uppercase tracking-wider text-[10px] text-cri-textPrimary">Hardened (Phase 6)</th>
                  <th className="p-3.5 font-bold uppercase tracking-wider text-[10px]">Empirical Delta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cri-border">
                {PHASE_6_BENCHMARKS.map((row, idx) => (
                  <tr key={idx} className="hover:bg-cri-surfaceSecondary/50 transition-colors">
                    <td className="p-3.5 font-medium text-cri-textPrimary">{row.metric}</td>
                    <td className="p-3.5 text-cri-textMuted font-mono">{row.baseline}</td>
                    <td className="p-3.5 font-semibold text-cri-success font-mono">{row.hardened}</td>
                    <td className="p-3.5 text-xs text-cri-orange font-medium">{row.delta}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-cri-textPrimary flex items-center gap-2 font-mono">
            <TrendingUp className="w-4 h-4 text-cri-info" />
            <span>Controlled 5-Configuration Retrieval Ablation Study</span>
          </h2>
          <span className="text-[11px] font-mono text-cri-textMuted">30 In-Scope Queries</span>
        </div>

        <div className="rounded-[12px] border border-cri-border bg-cri-surface overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-cri-border bg-cri-surfaceSecondary text-cri-textMuted font-mono">
                  <th className="p-3.5 font-bold uppercase tracking-wider text-[10px]">Configuration</th>
                  <th className="p-3.5 font-bold uppercase tracking-wider text-[10px] text-right">Recall@5</th>
                  <th className="p-3.5 font-bold uppercase tracking-wider text-[10px] text-right">Recall@10</th>
                  <th className="p-3.5 font-bold uppercase tracking-wider text-[10px] text-right">MRR@10</th>
                  <th className="p-3.5 font-bold uppercase tracking-wider text-[10px] text-right">Precision@5</th>
                  <th className="p-3.5 font-bold uppercase tracking-wider text-[10px] text-right">nDCG@10</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cri-border font-mono text-[11px]">
                {RETRIEVAL_ABLATION.map((row, idx) => {
                  const isTop = idx === RETRIEVAL_ABLATION.length - 1;
                  return (
                    <tr
                      key={idx}
                      className={isTop ? "bg-cri-surfaceSecondary font-semibold" : "hover:bg-cri-surfaceSecondary/50 transition-colors"}
                    >
                      <td className="p-3.5 font-sans font-medium text-cri-textPrimary">{row.config}</td>
                      <td className="p-3.5 text-right">{row.recall5}</td>
                      <td className="p-3.5 text-right text-cri-success">{row.recall10}</td>
                      <td className="p-3.5 text-right text-cri-orange">{row.mrr10}</td>
                      <td className="p-3.5 text-right">{row.p5}</td>
                      <td className="p-3.5 text-right">{row.ndcg10}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-[12px] border border-cri-border bg-cri-surface space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-cri-orange font-mono">
            Zero Hallucination Guarantee
          </h3>
          <p className="text-xs text-cri-textSecondary leading-relaxed">
            By implementing the 3-Tier Evidence Sufficiency Gate before generation, CRI completely eliminated false answers on unsupported queries (False Answer Rate dropped from 92.9% to 0.0%).
          </p>
        </div>
        <div className="p-5 rounded-[12px] border border-cri-border bg-cri-surface space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-cri-info font-mono">
            Cohere Rerank v3.5 Neural Precision
          </h3>
          <p className="text-xs text-cri-textSecondary leading-relaxed">
            Cohere Rerank v3.5 boosted MRR@10 from 0.6694 to 0.7464 and Recall@5 from 0.8333 to 0.9333 over RRF alone, and leak-free query expansion promoted specific technical queries to 100.0% Recall@10.
          </p>
        </div>
      </div>
    </div>
  );
};
