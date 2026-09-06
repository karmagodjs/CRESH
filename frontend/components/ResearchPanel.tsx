"use client";

import React, { useState, useRef, useEffect } from "react";
import { DocumentResponse, QueryResponse } from "@/lib/types";
import { SUGGESTED_QUESTIONS } from "@/lib/demoData";
import {
  Search,
  ArrowRight,
  AlertTriangle,
  FileText,
  CheckCircle,
  ExternalLink,
  Loader2,
  Sparkles,
  Info,
} from "lucide-react";

interface ResearchPanelProps {
  activeDocument: DocumentResponse | null;
  queryResponse: QueryResponse | null;
  isLoading: boolean;
  onRunQuery: (question: string) => void;
  onCitationClick: (citationIndex: number) => void;
  selectedCitationIndex: number | null;
}

export const ResearchPanel: React.FC<ResearchPanelProps> = ({
  activeDocument,
  queryResponse,
  isLoading,
  onRunQuery,
  onCitationClick,
  selectedCitationIndex,
}) => {
  const [questionInput, setQuestionInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = questionInput.trim();
    if (!q || isLoading) return;
    onRunQuery(q);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSelectSuggested = (q: string) => {
    setQuestionInput(q);
    onRunQuery(q);
  };

  // Render answer text with interactive citation links [1], [2], etc.
  const renderAnswerWithCitations = (answerText: string) => {
    if (!answerText) return null;

    // Split text by markdown citation pattern like [1], [2], [1, 2]
    const citationRegex = /\[(\d+(?:,\s*\d+)*)\]/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = citationRegex.exec(answerText)) !== null) {
      const matchStart = match.index;
      const matchEnd = matchStart + match[0].length;

      // Text before citation
      if (matchStart > lastIndex) {
        parts.push(answerText.substring(lastIndex, matchStart));
      }

      // Parse citation numbers
      const citeNumbers = match[1].split(",").map((n) => parseInt(n.trim(), 10));

      // Citation pill/link
      parts.push(
        <span key={`cite-${matchStart}`} className="inline-flex items-center gap-0.5 mx-0.5">
          {citeNumbers.map((num) => {
            const isSelected = selectedCitationIndex === num;
            return (
              <button
                key={`cite-btn-${matchStart}-${num}`}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onCitationClick(num);
                }}
                className={`inline-flex items-center justify-center text-xs font-semibold px-1 py-0.2 rounded transition-colors ${
                  isSelected
                    ? "bg-cri-orange text-white ring-1 ring-cri-orange"
                    : "bg-cri-rule/60 text-cri-blue hover:bg-cri-blue hover:text-white"
                }`}
                title={`Jump to supporting passage [${num}] in Evidence panel`}
              >
                [{num}]
              </button>
            );
          })}
        </span>
      );

      lastIndex = matchEnd;
    }

    if (lastIndex < answerText.length) {
      parts.push(answerText.substring(lastIndex));
    }

    // Split paragraphs
    return (
      <div className="space-y-4 text-cri-ink text-[15px] leading-[1.7] max-w-[72ch]">
        {answerText.split("\n\n").map((para, idx) => {
          // If paragraph matches a markdown heading
          if (para.startsWith("### ")) {
            return (
              <h3 key={idx} className="text-base font-bold text-cri-ink mt-4 mb-2 tracking-tight">
                {para.replace("### ", "")}
              </h3>
            );
          }
          if (para.startsWith("## ")) {
            return (
              <h2 key={idx} className="text-lg font-bold text-cri-ink mt-5 mb-2.5 tracking-tight">
                {para.replace("## ", "")}
              </h2>
            );
          }
          if (para.startsWith("- ") || para.startsWith("* ")) {
            const items = para.split("\n").filter((l) => l.trim().length > 0);
            return (
              <ul key={idx} className="list-disc pl-5 space-y-1.5 my-2">
                {items.map((it, iIdx) => (
                  <li key={iIdx}>{it.replace(/^[-*]\s*/, "")}</li>
                ))}
              </ul>
            );
          }
          return <p key={idx}>{parts.length > 0 ? parts : para}</p>;
        })}
      </div>
    );
  };

  const isAbstention =
    queryResponse &&
    (!queryResponse.evidence_sufficient ||
      !queryResponse.answerable ||
      queryResponse.grounding_status === "INSUFFICIENT" ||
      queryResponse.answer.includes("don't have sufficient evidence") ||
      queryResponse.answer.includes("insufficient evidence"));

  return (
    <main
      className="h-full flex flex-col bg-cri-ink overflow-hidden border-r border-cri-border"
      aria-label="Research Workspace"
    >
      {/* Top Document Header */}
      <div className="px-6 py-3.5 border-b border-cri-border bg-cri-ink shrink-0 flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-cri-textMuted mb-0.5">
            Research Workspace
          </div>
          {activeDocument ? (
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-semibold text-cri-paper truncate">
                {activeDocument.title || activeDocument.filename}
              </h1>
              <span className="text-xs text-cri-textMuted shrink-0">
                ({activeDocument.page_count} {activeDocument.page_count === 1 ? "page" : "pages"} · Indexed)
              </span>
            </div>
          ) : (
            <div className="text-sm text-cri-textMuted italic">
              No source selected. Ingest or pick a source from the left panel.
            </div>
          )}
        </div>
      </div>

      {/* Center Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* Research Input Box */}
        <form onSubmit={handleSubmit} className="relative">
          <div className="relative rounded border border-cri-borderLight bg-cri-surface focus-within:border-cri-orange focus-within:ring-1 focus-within:ring-cri-orange transition-all">
            <textarea
              ref={inputRef}
              value={questionInput}
              onChange={(e) => setQuestionInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              rows={2}
              placeholder={
                activeDocument
                  ? "Ask a precise question about this document..."
                  : "Select a document to ask research questions..."
              }
              className="w-full bg-transparent text-sm text-cri-paper placeholder-cri-textMuted px-3.5 py-3 resize-none focus:outline-none leading-relaxed"
            />
            <div className="flex items-center justify-between px-3 py-2 border-t border-cri-border/60 bg-cri-surface">
              <div className="text-[11px] text-cri-textMuted hidden sm:block">
                Press <kbd className="px-1 py-0.5 rounded bg-cri-ink border border-cri-border text-[10px]">Enter</kbd> to analyze
              </div>
              <button
                type="submit"
                disabled={isLoading || !questionInput.trim() || !activeDocument}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-semibold tracking-tight transition-all ${
                  isLoading || !questionInput.trim() || !activeDocument
                    ? "bg-cri-surfaceActive text-cri-textMuted cursor-not-allowed border border-cri-border"
                    : "bg-cri-orange hover:bg-cri-orange-hover text-white shadow-sm"
                }`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <span>Run analysis</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Loading Indicator */}
        {isLoading && (
          <div className="p-6 rounded bg-cri-surface border border-cri-border flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-6 h-6 text-cri-orange animate-spin" />
            <div className="text-center space-y-1">
              <p className="text-xs font-semibold text-cri-paper">Executing Reasoning Graph</p>
              <p className="text-[11px] text-cri-textMuted">
                Dense + BM25 Retrieval → RRF Fusion → Cohere Rerank v3.5 → Evidence Gate
              </p>
            </div>
          </div>
        )}

        {/* State A: EMPTY STATE (Document selected, no query executed yet) */}
        {!queryResponse && !isLoading && (
          <div className="py-4 space-y-6">
            <div className="border border-cri-border rounded p-5 bg-cri-surface">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-cri-orange" />
                <h2 className="text-sm font-bold text-cri-paper uppercase tracking-wider">
                  {activeDocument ? activeDocument.filename : "Research Corpus"}
                </h2>
              </div>
              <p className="text-xs text-cri-paper/90 leading-relaxed font-normal">
                {activeDocument
                  ? activeDocument.title
                  : "Select a research paper from the Sources panel to initialize document-isolated retrieval and evidence verification."}
              </p>
              {activeDocument && (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-cri-textMuted">
                  <span className="px-2 py-0.5 rounded bg-cri-ink border border-cri-border">
                    {activeDocument.page_count} pages
                  </span>
                  <span className="px-2 py-0.5 rounded bg-cri-ink border border-cri-border">
                    {activeDocument.chunk_count} structured chunks
                  </span>
                  <span className="px-2 py-0.5 rounded bg-cri-ink border border-cri-border text-cri-blue font-medium">
                    Strict Document Isolation Active
                  </span>
                </div>
              )}
            </div>

            {/* Suggested Research Questions */}
            {activeDocument && (
              <div className="space-y-2.5">
                <div className="text-xs font-semibold uppercase tracking-wider text-cri-textMuted">
                  Suggested research questions
                </div>
                <div className="space-y-2">
                  {SUGGESTED_QUESTIONS.map((q, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectSuggested(q)}
                      className="w-full text-left p-3 rounded border border-cri-border bg-cri-surface hover:bg-cri-surfaceActive hover:border-cri-borderLight text-xs text-cri-paper flex items-center justify-between group transition-colors"
                    >
                      <span className="group-hover:text-cri-orange transition-colors font-medium">
                        {q}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-cri-textMuted group-hover:text-cri-orange group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* State B: QUERY ANSWER EXPERIENCE */}
        {queryResponse && !isLoading && (
          <div className="space-y-5">
            {/* Question Header */}
            <div className="border-b border-cri-border pb-3">
              <div className="text-[10px] font-bold uppercase tracking-widest text-cri-textMuted mb-1">
                Research Question
              </div>
              <h2 className="text-base sm:text-lg font-semibold text-cri-paper leading-snug">
                {queryResponse.query}
              </h2>
            </div>

            {/* ABSTENTION EXPERIENCE */}
            {isAbstention ? (
              <div className="p-5 rounded border border-cri-orange/80 bg-cri-surface space-y-3">
                <div className="flex items-center gap-2 text-cri-orange">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Insufficient Evidence — Safe Abstention
                  </span>
                </div>
                <p className="text-sm text-cri-paper leading-relaxed">
                  I don&apos;t have sufficient evidence in the selected document to answer this question.
                </p>
                <div className="p-3 rounded bg-cri-ink border border-cri-border text-xs text-cri-textMuted space-y-1">
                  <p className="font-medium text-cri-paper">Evidence Gate Audit:</p>
                  <p>
                    The 3-tier evidence sufficiency gate rejected generation to protect against parametric hallucinations and out-of-scope speculation.
                  </p>
                </div>
              </div>
            ) : (
              /* ANSWER READING DESK (Paper Surface, Ink typography, 65-75 chars/line) */
              <div className="bg-cri-paper text-cri-ink rounded-sm border border-cri-rule p-6 sm:p-8 shadow-sm">
                <div className="flex items-center justify-between border-b border-cri-rule pb-3 mb-5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-cri-textSecondary">
                      CRI Answer
                    </span>
                    <span className="text-xs text-cri-textSecondary">·</span>
                    <span className="text-xs text-cri-textSecondary">
                      Grounded Synthesis
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-cri-blue bg-cri-blue/10 px-2 py-0.5 rounded">
                      Confidence: {(queryResponse.confidence * 100).toFixed(0)}%
                    </span>
                    <span className="text-[11px] text-cri-textSecondary">
                      {queryResponse.total_latency_ms.toFixed(1)} ms
                    </span>
                  </div>
                </div>

                {/* Main Answer Text with Provenance Citations */}
                <div className="cri-answer-body">
                  {renderAnswerWithCitations(queryResponse.answer)}
                </div>

                {/* Key Points (if present) */}
                {queryResponse.key_points && queryResponse.key_points.length > 0 && (
                  <div className="mt-6 pt-5 border-t border-cri-rule">
                    <div className="text-xs font-bold uppercase tracking-wider text-cri-textSecondary mb-2.5">
                      Key Findings
                    </div>
                    <ul className="list-disc pl-5 space-y-1 text-xs text-cri-ink leading-relaxed">
                      {queryResponse.key_points.map((pt, pIdx) => (
                        <li key={pIdx}>{pt}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
};
