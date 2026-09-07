"use client";

import React from "react";
import { Layers, ShieldCheck, Database, Cpu, ArrowDown, GitCommit } from "lucide-react";

export const ArchitectureView: React.FC = () => {
  const pipelineSteps = [
    {
      step: "01",
      title: "Document Scope Guard",
      desc: "Strictly enforces target document boundaries. If no valid document is selected, routes immediately to Safe Abstention with 0 retrieval and 0 LLM calls.",
      type: "Guard",
      color: "border-cri-orange/30 bg-cri-orange/10 text-cri-orange",
    },
    {
      step: "02",
      title: "Leak-Free Query Analyzer & Expansion",
      desc: "Extracts question intent and technical entity cues without fabricating claims or leaking external context into the search tokens.",
      type: "Analysis",
      color: "border-cri-blue/30 bg-cri-blue/10 text-cri-blue",
    },
    {
      step: "03",
      title: "Parallel Hybrid Retrieval (Dense + BM25)",
      desc: "Dispatches simultaneous queries to Qdrant (Cohere Embed v3, 1024-dim) and Rank-BM25 lexical index, returning Top-25 candidates each.",
      type: "Retrieval",
      color: "border-cri-border bg-cri-surfaceActive text-cri-textSecondary",
    },
    {
      step: "04",
      title: "Reciprocal Rank Fusion (RRF, k=60)",
      desc: "Blends rank positions between dense semantic and sparse lexical channels without score scaling distortions into a unified candidate pool.",
      type: "Fusion",
      color: "border-cri-border bg-cri-surfaceActive text-cri-textSecondary",
    },
    {
      step: "05",
      title: "Cohere Rerank v3.5 Neural Cross-Encoder",
      desc: "Directly scores query-passage cross-attention to eliminate rank dilution and select the Top-10 most relevant evidence segments.",
      type: "Reranking",
      color: "border-cri-orange/30 bg-cri-orange/10 text-cri-orange",
    },
    {
      step: "06",
      title: "3-Tier Evidence Sufficiency Gate",
      desc: "Evaluates score thresholds, entity coverage, and answerability. Out-of-scope or unanswerable queries trigger safe refusal before generation.",
      type: "Verification",
      color: "border-cri-green/30 bg-cri-green/10 text-cri-green",
    },
    {
      step: "07",
      title: "Targeted Generation (Command R+)",
      desc: "Generates research synthesis placing the direct answer in the lead sentence, citing evidence passages strictly as [1], [2].",
      type: "Synthesis",
      color: "border-cri-blue/30 bg-cri-blue/10 text-cri-blue",
    },
    {
      step: "08",
      title: "Citation Verification & Grounding Judge",
      desc: "Extracts citation indices, verifies document provenance mapping, and computes token-level grounding confidence.",
      type: "Provenance",
      color: "border-cri-green/30 bg-cri-green/10 text-cri-green",
    },
  ];

  return (
    <div className="h-full overflow-y-auto p-6 md:p-8 space-y-8 bg-cri-bg text-cri-textPrimary max-w-5xl mx-auto custom-scrollbar">
      <div className="border-b border-cri-border pb-5">
        <div className="text-[11px] font-mono uppercase tracking-wider text-cri-orange font-semibold mb-1 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Technical Specification</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-cri-textPrimary">
          CRI System Architecture & LangGraph State Machine
        </h1>
        <p className="text-xs text-cri-textSecondary mt-1.5 leading-relaxed max-w-3xl">
          An agentic, document-isolated retrieval-augmented generation system engineered for dense scientific literature and reproducible evidence verification.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-cri-textPrimary flex items-center gap-2">
          <Layers className="w-4 h-4 text-cri-orange" />
          <span>LangGraph Execution Graph</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {pipelineSteps.map((st, idx) => (
            <div
              key={idx}
              className="p-4 rounded-[12px] border border-cri-border bg-cri-surface hover:bg-cri-surfaceElevated transition-colors relative"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs text-cri-textSecondary font-semibold tracking-wider">
                  STAGE {st.step}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-[6px] border uppercase font-mono font-medium ${st.color}`}>
                  {st.type}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-cri-textPrimary mb-1.5">{st.title}</h3>
              <p className="text-xs text-cri-textSecondary leading-relaxed">{st.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-[12px] border border-cri-border bg-cri-surface space-y-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cri-orange" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-cri-textPrimary">
              Structure-Aware Chunking
            </h3>
          </div>
          <ul className="text-xs text-cri-textSecondary space-y-2 list-disc pl-4 leading-relaxed">
            <li>Target size: 400 tokens (~1,600 chars) with 80-token overlap.</li>
            <li>Section boundary preservation prevents splitting mid-equation or table.</li>
            <li>Context Header Injection: Each chunk prepends document title, section, and page provenance.</li>
          </ul>
        </div>

        <div className="p-5 rounded-[12px] border border-cri-border bg-cri-surface space-y-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-cri-blue" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-cri-textPrimary">
              Dual Storage & Scope Isolation
            </h3>
          </div>
          <ul className="text-xs text-cri-textSecondary space-y-2 list-disc pl-4 leading-relaxed">
            <li>Qdrant Vector Database isolates vectors strictly by <code className="font-mono text-cri-orange text-[11px] bg-cri-surfaceElevated px-1.5 py-0.5 rounded">document_id</code> payload filter.</li>
            <li>In-memory BM25 inverted indices partitioned per document.</li>
            <li>Cross-document contamination is mathematically prevented at retrieval time.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
