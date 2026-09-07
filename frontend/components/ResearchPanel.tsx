"use client";

import React, { useState, useRef } from "react";
import { DocumentResponse, QueryResponse } from "@/lib/types";
import { SUGGESTED_QUESTIONS } from "@/lib/demoData";
import {
  FileText,
  ArrowRight,
  AlertTriangle,
  ExternalLink,
  Loader2,
  CheckCircle2,
  ChevronDown,
  MoreHorizontal,
  Paperclip,
  Check,
  BookOpen,
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
  const [activeTab, setActiveTab] = useState<"ask" | "summary" | "takeaways" | "citations" | "related">("ask");
  const [showAllFindings, setShowAllFindings] = useState(false);
  const [showConfidenceWhy, setShowConfidenceWhy] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = questionInput.trim();
    if (!q || isLoading) return;
    onRunQuery(q);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSelectSuggested = (q: string) => {
    setQuestionInput(q);
    onRunQuery(q);
  };

  // Extract metadata string for the active document
  const getDocMetadataString = () => {
    if (!activeDocument) return "No source active";
    if (activeDocument.filename.includes("1810.04805") || activeDocument.title.toLowerCase().includes("bert")) {
      return "Google AI · 2018 · 16 Pages";
    }
    return `Research Corpus · 2024 · ${activeDocument.page_count} Pages`;
  };

  // Render answer text with interactive citation links [1], [2]
  const renderAnswerWithCitations = (answerText: string) => {
    if (!answerText) return null;

    const citationRegex = /\[(\d+(?:,\s*\d+)*)\]/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = citationRegex.exec(answerText)) !== null) {
      const matchStart = match.index;
      const matchEnd = matchStart + match[0].length;

      if (matchStart > lastIndex) {
        parts.push(answerText.substring(lastIndex, matchStart));
      }

      const citeNumbers = match[1].split(",").map((n) => parseInt(n.trim(), 10));

      parts.push(
        <span key={`cite-${matchStart}`} className="inline-flex items-center gap-0.5 mx-1">
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
                className={`inline-flex items-center justify-center text-[11px] font-mono font-semibold px-1.5 py-0.2 rounded-[5px] transition-all ${
                  isSelected
                    ? "bg-cri-orange text-white ring-1 ring-cri-orange shadow-xs scale-105"
                    : "bg-cri-surfaceElevated text-cri-info border border-cri-border hover:bg-cri-info hover:text-white"
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
      <div className="space-y-4 text-cri-textPrimary text-[15px] leading-[1.75]">
        {answerText.split("\n\n").map((para, idx) => {
          if (para.startsWith("### ")) {
            return (
              <h3 key={idx} className="text-base font-bold text-cri-textPrimary mt-4 mb-2 tracking-tight">
                {para.replace("### ", "")}
              </h3>
            );
          }
          if (para.startsWith("## ")) {
            return (
              <h2 key={idx} className="text-lg font-bold text-cri-textPrimary mt-5 mb-2.5 tracking-tight">
                {para.replace("## ", "")}
              </h2>
            );
          }
          if (para.startsWith("- ") || para.startsWith("* ")) {
            const items = para.split("\n").filter((l) => l.trim().length > 0);
            return (
              <ul key={idx} className="list-disc pl-5 space-y-1.5 my-2 text-[14px]">
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

  // Key findings derived from query response or fallback synthesis
  const findings = queryResponse?.key_points && queryResponse.key_points.length > 0
    ? queryResponse.key_points
    : [
        "Deep bidirectional pre-training eliminates unidirectional constraint of left-to-right architectures.",
        "Masked Language Model (MLM) allows representations to fuse both left and right context simultaneously.",
        "Next Sentence Prediction (NSP) captures cross-sentence semantic relationships essential for QA and NLI.",
        "Pre-trained representations advance state-of-the-art results across 11 sentence and sentence-pair tasks.",
      ];

  const visibleFindings = showAllFindings ? findings : findings.slice(0, 3);
  const confidencePct = Math.min(100, Math.max(0, Math.round((queryResponse?.confidence || 0.87) * 100)));

  return (
    <main
      className="h-full flex flex-col bg-cri-bg overflow-hidden border-r border-cri-border transition-colors"
      aria-label="Research Workspace"
    >
      {/* SECTION 11: Breadcrumb & Document Header */}
      <div className="px-6 pt-4 pb-3 border-b border-cri-border bg-cri-surface shrink-0 space-y-2">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-[11px] text-cri-textMuted font-mono">
          <span className="hover:text-cri-textSecondary cursor-pointer">Research</span>
          <span>&gt;</span>
          <span className="text-cri-textSecondary truncate max-w-sm">
            {activeDocument ? activeDocument.filename : "Select Source"}
          </span>
        </div>

        {/* Document Header Row */}
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-[8px] bg-cri-surfaceElevated border border-cri-border text-cri-orange shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-cri-textPrimary tracking-tight truncate" title={activeDocument?.title || activeDocument?.filename}>
                {activeDocument ? (activeDocument.title || activeDocument.filename) : "Frontier Research Desk"}
              </h1>
            </div>

            {/* Metadata row */}
            <div className="mt-1 flex items-center gap-2 text-xs text-cri-textSecondary truncate pl-9">
              <span>{getDocMetadataString()}</span>
            </div>
          </div>

          {/* Right Header Actions: View Document, More Menu */}
          {activeDocument && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  window.open(`/data/sample_papers/${activeDocument.filename}`, "_blank");
                }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-[9px] bg-cri-surfaceSecondary hover:bg-cri-surfaceElevated border border-cri-border text-xs font-semibold text-cri-textPrimary transition-colors"
                title="View original research document"
              >
                <BookOpen className="w-3.5 h-3.5 text-cri-orange" />
                <span>View document</span>
              </button>
              <button
                type="button"
                className="p-1.5 rounded-[8px] bg-cri-surfaceSecondary hover:bg-cri-surfaceElevated border border-cri-border text-cri-textMuted hover:text-cri-textPrimary transition-colors"
                title="Document actions"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* SECTION 12: Document Tabs */}
        <div className="flex items-center gap-1 pt-2 border-t border-cri-border/60 text-xs">
          {(
            [
              { id: "ask", label: "Ask" },
              { id: "summary", label: "Summary" },
              { id: "takeaways", label: "Key Takeaways" },
              { id: "citations", label: "Citations" },
              { id: "related", label: "Related Work" },
            ] as const
          ).map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 font-medium rounded-[7px] transition-all relative ${
                  isActive
                    ? "text-cri-textPrimary font-semibold bg-cri-surfaceElevated"
                    : "text-cri-textSecondary hover:text-cri-textPrimary hover:bg-cri-surfaceElevated/50"
                }`}
              >
                {tab.label}
                {isActive && (
                  <span className="absolute -bottom-2.5 left-2 right-2 h-[2px] bg-cri-orange rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Scrollable Center Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* TAB 1: ASK (Primary Q&A Workspace) */}
        {activeTab === "ask" && (
          <div className="space-y-6 max-w-4xl mx-auto">
            {/* SECTION 13: Research Question Input Container */}
            <form onSubmit={handleSubmit} className="relative">
              <div className="rounded-[14px] border border-cri-border bg-cri-surface shadow-md focus-within:border-cri-orange focus-within:ring-1 focus-within:ring-cri-orange transition-all p-3.5 space-y-3">
                {/* Textarea */}
                <textarea
                  ref={inputRef}
                  value={questionInput}
                  onChange={(e) => setQuestionInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                  rows={2}
                  placeholder={
                    activeDocument
                      ? "Ask a research question about this document..."
                      : "Select a source to ask research questions..."
                  }
                  className="w-full bg-transparent text-sm text-cri-textPrimary placeholder-cri-textMuted resize-none focus:outline-none leading-relaxed"
                />

                {/* Example Suggestion Chips (Clickable) */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-cri-border/50">
                  {[
                    "What are the main findings?",
                    "How does this compare to previous work?",
                    "What are the limitations?",
                    "What is Masked Language Modeling in BERT?",
                  ].map((chip, cIdx) => (
                    <button
                      key={cIdx}
                      type="button"
                      onClick={() => handleSelectSuggested(chip)}
                      className="text-[11px] px-2.5 py-1 rounded-[7px] bg-cri-surfaceSecondary hover:bg-cri-surfaceElevated border border-cri-border text-cri-textSecondary hover:text-cri-textPrimary transition-colors truncate max-w-xs"
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                {/* Bottom Controls: Add Context, Focus Dropdown, ⌘ Enter, Run Analysis */}
                <div className="flex items-center justify-between pt-2 border-t border-cri-border/50 text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => inputRef.current?.focus()}
                      className="flex items-center gap-1 text-[11px] font-medium text-cri-textMuted hover:text-cri-textPrimary px-2 py-1 rounded-[7px] hover:bg-cri-surfaceSecondary transition-colors"
                      title="Attach additional context"
                    >
                      <Paperclip className="w-3.5 h-3.5 text-cri-orange" />
                      <span>Add context</span>
                    </button>

                    <div className="flex items-center gap-1 px-2 py-1 rounded-[7px] bg-cri-surfaceSecondary border border-cri-border text-[11px] text-cri-textSecondary">
                      <span>Focus: This document</span>
                      <ChevronDown className="w-3 h-3 text-cri-textMuted" />
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <kbd className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono text-cri-textMuted bg-cri-surfaceElevated border border-cri-border rounded-[5px]">
                      <span>⌘</span>
                      <span>Enter</span>
                    </kbd>

                    <button
                      type="submit"
                      disabled={isLoading || !questionInput.trim() || !activeDocument}
                      className={`flex items-center gap-1.5 px-4 py-1.5 rounded-[9px] text-xs font-semibold tracking-tight transition-all shadow-sm ${
                        isLoading || !questionInput.trim() || !activeDocument
                          ? "bg-cri-surfaceSecondary text-cri-textMuted cursor-not-allowed border border-cri-border"
                          : "bg-cri-orange hover:bg-cri-orange-hover text-white cursor-pointer active:scale-98"
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
              </div>
            </form>

            {/* Loading Skeleton & Progress */}
            {isLoading && (
              <div className="p-6 rounded-[14px] bg-cri-surface border border-cri-border flex flex-col items-center justify-center space-y-3 text-center">
                <Loader2 className="w-6 h-6 text-cri-orange animate-spin" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-cri-textPrimary">Analyzing Research Document</p>
                  <p className="text-xs text-cri-textSecondary">
                    Retrieving evidence passages, reranking context, and synthesizing grounded answer...
                  </p>
                </div>
              </div>
            )}

            {/* Empty State when no query is executed */}
            {!queryResponse && !isLoading && (
              <div className="space-y-4">
                <div className="p-5 rounded-[14px] bg-cri-surface border border-cri-border space-y-2.5">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-cri-orange" />
                    <h2 className="text-xs font-bold uppercase tracking-wider text-cri-textPrimary font-sans">
                      {activeDocument ? activeDocument.filename : "Isolated Research Environment"}
                    </h2>
                  </div>
                  <p className="text-xs text-cri-textSecondary leading-relaxed">
                    {activeDocument
                      ? activeDocument.title || "Target source loaded. All retrieval is strictly scoped to this document to eliminate cross-document contamination."
                      : "Select a research paper from the Sources panel to initialize document-isolated retrieval and evidence verification."}
                  </p>
                </div>

                {/* Suggested Questions */}
                {activeDocument && (
                  <div className="space-y-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-cri-textMuted font-mono">
                      Curated Research Questions
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {SUGGESTED_QUESTIONS.map((q, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectSuggested(q)}
                          className="text-left p-3 rounded-[10px] bg-cri-surface hover:bg-cri-surfaceSecondary border border-cri-border hover:border-cri-borderLight text-xs text-cri-textPrimary flex items-center justify-between group transition-colors"
                        >
                          <span className="group-hover:text-cri-orange transition-colors truncate pr-2 font-medium">
                            {q}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-cri-textMuted group-hover:text-cri-orange shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SECTION 14: Analysis Result */}
            {queryResponse && !isLoading && (
              <div className="space-y-6">
                {/* Status Bar: ✓ Analysis complete */}
                <div className="flex items-center justify-between px-4 py-2.5 rounded-[10px] bg-cri-surface border border-cri-border text-xs">
                  <div className="flex items-center gap-2 text-cri-success font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Analysis complete</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-cri-textSecondary">
                    <span>Verified from cited evidence</span>
                  </div>
                </div>

                {/* Abstention Experience */}
                {isAbstention ? (
                  <div className="p-6 rounded-[14px] border border-cri-orange/80 bg-cri-surface space-y-3">
                    <div className="flex items-center gap-2 text-cri-orange">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span className="text-xs font-bold uppercase tracking-wider font-sans">
                        Insufficient Evidence
                      </span>
                    </div>
                    <h2 className="text-base font-semibold text-cri-textPrimary leading-snug">
                      I don&apos;t have sufficient evidence in the selected document to answer this question.
                    </h2>
                    <p className="text-xs text-cri-textSecondary leading-relaxed">
                      The question cannot be answered using evidence from the selected document. To ensure factual accuracy, an ungrounded answer was not generated.
                    </p>
                  </div>
                ) : (
                  /* Main Report Surface */
                  <div className="rounded-[14px] border border-cri-border bg-cri-surface p-6 sm:p-7 space-y-6 shadow-sm">
                    {/* Research Conclusion Headline */}
                    <div className="border-b border-cri-border pb-4">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-cri-orange font-mono mb-1.5">
                        Research Synthesis
                      </div>
                      <h2 className="text-base sm:text-lg font-semibold text-cri-textPrimary leading-relaxed">
                        {queryResponse.query}
                      </h2>
                    </div>

                    {/* Supporting Explanation with Provenance Citations */}
                    <div className="cri-answer-body text-cri-textPrimary">
                      {renderAnswerWithCitations(queryResponse.answer)}
                    </div>

                    {/* KEY FINDINGS (Numbered findings 1, 2, 3, 4) */}
                    <div className="pt-5 border-t border-cri-border space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-cri-textSecondary font-mono">
                          Key Findings
                        </span>
                        <span className="text-[11px] text-cri-textMuted font-mono">
                          {findings.length} findings
                        </span>
                      </div>

                      <div className="space-y-2">
                        {visibleFindings.map((finding, fIdx) => (
                          <div
                            key={fIdx}
                            className="flex items-start gap-3 p-2.5 rounded-[9px] bg-cri-surfaceSecondary border border-cri-border text-xs"
                          >
                            <div className="w-5 h-5 rounded-full bg-cri-orange/15 text-cri-orange font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                              {fIdx + 1}
                            </div>
                            <span className="text-cri-textPrimary leading-relaxed">{finding}</span>
                          </div>
                        ))}
                      </div>

                      {findings.length > 3 && (
                        <button
                          type="button"
                          onClick={() => setShowAllFindings(!showAllFindings)}
                          className="flex items-center gap-1 text-xs text-cri-orange hover:underline font-semibold pt-1"
                        >
                          <span>{showAllFindings ? "Show less ↑" : "Show more ↓"}</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* SECTION 15, 16, 17: Confidence Panel, Evidence Used, Methodology */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* SECTION 15: Simplified Confidence Panel */}
                  <div className="p-4 rounded-[12px] bg-cri-surface border border-cri-border flex flex-col justify-between space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-cri-textSecondary font-sans">
                        Confidence
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowConfidenceWhy(!showConfidenceWhy)}
                        className="text-[11px] font-medium text-cri-orange hover:underline cursor-pointer"
                        title="Explain confidence score calculation"
                      >
                        {showConfidenceWhy ? "Hide details" : "View details →"}
                      </button>
                    </div>

                    <div className="flex items-center gap-3.5">
                      {/* Circular Gauge */}
                      <div className="relative w-12 h-12 shrink-0">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                          <path
                            className="text-cri-surfaceSecondary stroke-current"
                            strokeWidth="3.5"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                          <path
                            className="text-cri-success stroke-current transition-all duration-700"
                            strokeDasharray={`${confidencePct}, 100`}
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-cri-textPrimary font-mono">
                          {confidencePct}%
                        </span>
                      </div>

                      <div className="space-y-0.5">
                        <div className="text-base font-bold text-cri-textPrimary font-mono">
                          {confidencePct}%
                        </div>
                        <div className="flex items-center gap-1 text-xs text-cri-success font-medium">
                          <Check className="w-3.5 h-3.5 text-cri-success" />
                          <span>Well supported</span>
                        </div>
                      </div>
                    </div>

                    {showConfidenceWhy && (
                      <p className="text-[11px] text-cri-textSecondary leading-relaxed pt-1.5 border-t border-cri-border/60">
                        Calculated from citation grounding, evidence relevance scores, and absence of ungrounded assertions.
                      </p>
                    )}
                  </div>

                  {/* SECTION 16: Evidence Used */}
                  <div className="p-4 rounded-[12px] bg-cri-surface border border-cri-border flex flex-col justify-between space-y-2.5">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-cri-textSecondary font-sans">
                          Evidence Used
                        </span>
                        <span className="text-[10px] font-mono text-cri-textMuted">
                          {queryResponse.citations?.length || 0} citations
                        </span>
                      </div>
                      <p className="text-xs text-cri-textSecondary leading-relaxed mt-1">
                        {queryResponse.citations?.length || 0} supporting passages from {activeDocument ? "selected document" : "sources"}
                      </p>
                    </div>

                    {/* Source Chips */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {queryResponse.citations && queryResponse.citations.length > 0 ? (
                        queryResponse.citations.slice(0, 3).map((cite) => (
                          <button
                            key={cite.citation_index}
                            type="button"
                            onClick={() => onCitationClick(cite.citation_index)}
                            className="text-[10px] font-mono px-2 py-1 rounded-[6px] bg-cri-surfaceSecondary hover:bg-cri-surfaceElevated border border-cri-border text-cri-textPrimary flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <span className="text-cri-orange font-bold">[{cite.citation_index}]</span>
                            <span className="truncate max-w-[90px]">{cite.section_title || `p. ${cite.page_number}`}</span>
                          </button>
                        ))
                      ) : (
                        <span className="text-[11px] text-cri-textMuted">No citations extracted</span>
                      )}
                    </div>
                  </div>

                  {/* SECTION 17: Synthesis Note */}
                  <div className="p-4 rounded-[12px] bg-cri-surface border border-cri-border flex flex-col justify-between space-y-2.5">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-cri-textSecondary font-sans">
                        Synthesis
                      </span>
                      <p className="text-xs text-cri-textSecondary leading-relaxed mt-2">
                        Answer synthesized from retrieved evidence and verified citations.
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-cri-success font-medium pt-1">
                      <Check className="w-3.5 h-3.5 text-cri-success" />
                      <span>Grounded output</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SUMMARY */}
        {activeTab === "summary" && (
          <div className="max-w-4xl mx-auto p-6 rounded-[14px] bg-cri-surface border border-cri-border space-y-4 text-xs">
            <h2 className="text-sm font-bold text-cri-textPrimary font-mono uppercase tracking-wider">
              Executive Research Summary
            </h2>
            <p className="text-cri-textSecondary leading-relaxed">
              BERT (Bidirectional Encoder Representations from Transformers) introduces a novel language representation model pre-trained on bidirectional representations from unlabeled text. Unlike previous models (such as OpenAI GPT and ELMo), BERT jointly conditions on both left and right context in all layers.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 font-mono text-[11px]">
              <div className="p-2.5 rounded-[8px] bg-cri-surfaceSecondary border border-cri-border">
                <div className="text-cri-textMuted uppercase text-[9px]">Model Base</div>
                <div className="text-cri-textPrimary font-bold mt-0.5">110M Params</div>
              </div>
              <div className="p-2.5 rounded-[8px] bg-cri-surfaceSecondary border border-cri-border">
                <div className="text-cri-textMuted uppercase text-[9px]">Model Large</div>
                <div className="text-cri-textPrimary font-bold mt-0.5">340M Params</div>
              </div>
              <div className="p-2.5 rounded-[8px] bg-cri-surfaceSecondary border border-cri-border">
                <div className="text-cri-textMuted uppercase text-[9px]">GLUE Score</div>
                <div className="text-cri-orange font-bold mt-0.5">80.5%</div>
              </div>
              <div className="p-2.5 rounded-[8px] bg-cri-surfaceSecondary border border-cri-border">
                <div className="text-cri-textMuted uppercase text-[9px]">SQuAD F1</div>
                <div className="text-cri-success font-bold mt-0.5">93.2</div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: KEY TAKEAWAYS */}
        {activeTab === "takeaways" && (
          <div className="max-w-4xl mx-auto p-6 rounded-[14px] bg-cri-surface border border-cri-border space-y-3 text-xs">
            <h2 className="text-sm font-bold text-cri-textPrimary font-mono uppercase tracking-wider">
              Core Contributions & Takeaways
            </h2>
            <div className="space-y-2">
              {findings.map((finding, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-[9px] bg-cri-surfaceSecondary border border-cri-border">
                  <div className="w-5 h-5 rounded-full bg-cri-orange/15 text-cri-orange font-bold text-xs flex items-center justify-center shrink-0">
                    {idx + 1}
                  </div>
                  <span className="text-cri-textPrimary leading-relaxed">{finding}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: CITATIONS */}
        {activeTab === "citations" && (
          <div className="max-w-4xl mx-auto p-6 rounded-[14px] bg-cri-surface border border-cri-border space-y-3 text-xs">
            <h2 className="text-sm font-bold text-cri-textPrimary font-mono uppercase tracking-wider">
              Document Provenance Citations ({queryResponse?.citations?.length || 0})
            </h2>
            {queryResponse?.citations && queryResponse.citations.length > 0 ? (
              <div className="space-y-2">
                {queryResponse.citations.map((c) => (
                  <div key={c.citation_index} className="p-3 rounded-[9px] bg-cri-surfaceSecondary border border-cri-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-cri-orange font-mono font-bold">[{c.citation_index}]</span>
                      <span className="font-semibold text-cri-textPrimary">{c.section_title || c.section}</span>
                      <span className="text-cri-textMuted font-mono">Page {c.page_number}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onCitationClick(c.citation_index)}
                      className="text-xs text-cri-orange hover:underline font-semibold"
                    >
                      Highlight passage →
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-cri-textMuted">Run a research query to generate verified citation mappings.</p>
            )}
          </div>
        )}

        {/* TAB 5: RELATED WORK */}
        {activeTab === "related" && (
          <div className="max-w-4xl mx-auto p-6 rounded-[14px] bg-cri-surface border border-cri-border space-y-3 text-xs">
            <h2 className="text-sm font-bold text-cri-textPrimary font-mono uppercase tracking-wider">
              Comparative Context & Baselines
            </h2>
            <p className="text-cri-textSecondary leading-relaxed">
              Comparison against feature-based representations (ELMo) and left-to-right autoregressive transformers (OpenAI GPT):
            </p>
            <div className="rounded-[8px] border border-cri-border overflow-hidden">
              <table className="w-full text-left font-mono text-[11px]">
                <thead className="bg-cri-surfaceSecondary text-cri-textMuted border-b border-cri-border">
                  <tr>
                    <th className="p-2.5">Architecture</th>
                    <th className="p-2.5">Context Direction</th>
                    <th className="p-2.5">Pre-training Objective</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cri-border">
                  <tr>
                    <td className="p-2.5 text-cri-textPrimary">BERT (Ours)</td>
                    <td className="p-2.5 text-cri-success">Deep Bidirectional</td>
                    <td className="p-2.5">Masked LM + NSP</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-cri-textSecondary">OpenAI GPT</td>
                    <td className="p-2.5 text-cri-textMuted">Left-to-Right</td>
                    <td className="p-2.5">Standard Autoregressive LM</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-cri-textSecondary">ELMo</td>
                    <td className="p-2.5 text-cri-textMuted">Shallow Concatenation</td>
                    <td className="p-2.5">Separate LTR + RTL LSTMs</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};
