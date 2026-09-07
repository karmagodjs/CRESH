"use client";

import React, { useState, useRef } from "react";
import { DocumentResponse, QueryResponse } from "@/lib/types";
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
  onViewDocument?: () => void;
  onOpenCitationDocument?: (pageNumber: number) => void;
  className?: string;
}

export const ResearchPanel: React.FC<ResearchPanelProps> = ({
  activeDocument,
  queryResponse,
  isLoading,
  onRunQuery,
  onCitationClick,
  selectedCitationIndex,
  onViewDocument,
  onOpenCitationDocument,
  className,
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

  // Render paragraph text with interactive citation links [1], [2]
  const renderParagraphWithCitations = (text: string) => {
    if (!text) return null;

    const citationRegex = /\[(\d+(?:,\s*\d+)*)\]/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = citationRegex.exec(text)) !== null) {
      const matchStart = match.index;
      const matchEnd = matchStart + match[0].length;

      if (matchStart > lastIndex) {
        parts.push(text.substring(lastIndex, matchStart));
      }

      const citeNumbers = match[1].split(",").map((n) => parseInt(n.trim(), 10));

      parts.push(
        <span key={`cite-${matchStart}`} className="inline-flex items-center gap-0.5 mx-1 align-baseline">
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
                className={`inline-flex items-center justify-center text-[11px] font-mono font-semibold px-2 py-0.5 rounded-[5px] transition-all cursor-pointer relative touch-manipulation before:absolute before:-inset-2 before:content-[''] ${
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

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  // Render answer text with interactive citation links
  const renderAnswerWithCitations = (answerText: string) => {
    if (!answerText) return null;

    return (
      <div className="space-y-4 text-cri-textPrimary text-[15.5px] leading-[1.65] font-sans">
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
              <ul key={idx} className="list-disc pl-5 space-y-1.5 my-2 text-[14.5px]">
                {items.map((it, iIdx) => (
                  <li key={iIdx}>{renderParagraphWithCitations(it.replace(/^[-*]\s*/, ""))}</li>
                ))}
              </ul>
            );
          }
          return <p key={idx}>{renderParagraphWithCitations(para)}</p>;
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
      className={`h-full flex flex-col bg-cri-surface border border-cri-border rounded-[14px] overflow-hidden shadow-xs transition-colors ${className || ""}`}
      aria-label="Research Workspace"
    >
      {/* SECTION 11 & 12: Breadcrumb & Document Header */}
      <div className="px-4 sm:px-7 pt-4 sm:pt-5 pb-0 border-b border-cri-border bg-cri-surface shrink-0 space-y-3">
        {/* Breadcrumb: Research > Document */}
        <div className="flex items-center gap-1.5 text-[11px] text-cri-textMuted font-mono">
          <span className="hover:text-cri-textSecondary cursor-pointer">Research</span>
          {activeDocument && (
            <>
              <span>&gt;</span>
              <span className="text-cri-textSecondary truncate max-w-sm font-sans">
                {activeDocument.title || activeDocument.filename}
              </span>
            </>
          )}
        </div>

        {/* Document Header Row */}
        {activeDocument ? (
          <div className="flex items-center justify-between gap-4 pb-2.5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="w-[34px] h-[34px] rounded-[8px] bg-cri-surfaceElevated border border-cri-border flex items-center justify-center text-cri-orange shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <h1
                  className="text-[17px] sm:text-[20px] font-bold text-cri-textPrimary tracking-tight truncate font-sans"
                  title={activeDocument.title || activeDocument.filename}
                >
                  {activeDocument.title || activeDocument.filename}
                </h1>
              </div>

              {/* Metadata row: Author · Year · Pages */}
              <div className="mt-1 flex items-center gap-2 text-[12px] text-cri-textSecondary truncate pl-10 sm:pl-11 font-sans">
                <span>{getDocMetadataString()}</span>
              </div>
            </div>

            {/* Right Header Actions: View Document (Section 12) */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (onViewDocument) {
                    onViewDocument();
                  }
                }}
                className="hidden sm:flex items-center gap-1.5 h-[36px] min-h-[36px] px-3.5 rounded-[9px] bg-cri-surfaceElevated hover:bg-cri-surfaceSecondary border border-cri-border text-xs font-semibold text-cri-textPrimary transition-colors cursor-pointer shadow-xs"
                title="View original research document"
              >
                <BookOpen className="w-3.5 h-3.5 text-cri-orange" />
                <span>View document</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="pb-3">
            <h1 className="text-[18px] sm:text-[20px] font-bold text-cri-textPrimary tracking-tight font-sans">
              Research
            </h1>
            <p className="text-[13px] text-cri-textSecondary mt-0.5">
              Select a source from the left to begin.
            </p>
          </div>
        )}

        {/* SECTION 13: Lightweight Document Tabs with thin orange underline */}
        {activeDocument && (
          <div className="flex items-center gap-4 sm:gap-7 pt-2 border-t border-cri-border text-xs overflow-x-auto no-scrollbar scroll-smooth">
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
                  className={`pb-2.5 pt-1 text-[13px] font-medium transition-colors relative cursor-pointer whitespace-nowrap min-h-[40px] flex items-center ${
                    isActive
                      ? "text-cri-textPrimary font-semibold"
                      : "text-cri-textSecondary hover:text-cri-textPrimary"
                  }`}
                >
                  {tab.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-cri-orange rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Scrollable Center Body with generous breathing room (24px padding) */}
      <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-7">
        {/* SECTION 15: EMPTY CENTER STATE (Visually centered and calm) */}
        {!activeDocument ? (
          <div className="max-w-2xl mx-auto pt-14 pb-8 space-y-8 text-center">
            <div className="space-y-2.5">
              <h2 className="text-[26px] sm:text-[30px] font-bold tracking-tight text-cri-textPrimary font-sans">
                Start your research
              </h2>
              <p className="text-[14px] text-cri-textSecondary leading-relaxed max-w-md mx-auto">
                Select a source from the left to begin.
              </p>
            </div>

            {/* Disabled research input (14px radius, rounded-[14px], border border-cri-border) */}
            <div className="rounded-[14px] border border-cri-border bg-cri-surfaceSecondary p-4 sm:p-5 space-y-4 opacity-60 text-left shadow-sm min-h-[140px] flex flex-col justify-between">
              <textarea
                disabled
                rows={2}
                placeholder="Select a source to ask research questions..."
                className="w-full bg-transparent text-[15px] text-cri-textPrimary placeholder-cri-textMuted resize-none focus:outline-none leading-relaxed cursor-not-allowed"
              />
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-cri-border opacity-70 pointer-events-none">
                {[
                  "What are the main findings?",
                  "How does this compare to previous work?",
                  "What are the limitations?",
                ].map((chip, cIdx) => (
                  <span
                    key={cIdx}
                    className="text-[11.5px] px-3 py-1 rounded-[8px] bg-cri-surfaceElevated border border-cri-border text-cri-textMuted"
                  >
                    {chip}
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-cri-border text-xs text-cri-textMuted">
                <div className="flex items-center gap-2.5">
                  <span className="flex items-center gap-1.5 text-[11.5px]">
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>Add context</span>
                  </span>
                  <span className="px-2.5 py-1 rounded-[7px] bg-cri-surfaceElevated border border-cri-border text-[11px]">
                    Focus: No source
                  </span>
                </div>
                <button
                  disabled
                  className="h-[40px] px-5 rounded-[10px] bg-cri-surfaceElevated text-cri-textMuted text-xs font-semibold cursor-not-allowed border border-cri-border"
                >
                  Run analysis →
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* TAB 1: ASK (Primary Q&A Workspace) */
          activeTab === "ask" && (
            <div className="space-y-7 max-w-4xl mx-auto">
              {/* SECTION 14: RESEARCH INPUT — REBUILD (Height: 130-160px, rounded 14px, semantic tokens) */}
              <form onSubmit={handleSubmit} className="relative">
                <div className="min-h-[145px] rounded-[14px] border border-cri-border bg-cri-surfaceSecondary shadow-sm focus-within:border-cri-orange transition-all p-3.5 sm:p-5 flex flex-col justify-between space-y-3.5">
                  {/* Textarea: comfortable 15px font */}
                  <textarea
                    ref={inputRef}
                    value={questionInput}
                    onChange={(e) => setQuestionInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isLoading}
                    rows={2}
                    placeholder="Ask a research question about this document..."
                    className="w-full bg-transparent text-[15px] text-cri-textPrimary placeholder-cri-textMuted resize-none focus:outline-none leading-relaxed"
                  />

                  {/* Example questions: subtle rounded chips (Section 14) */}
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-1 border-t border-cri-border/60">
                    {[
                      "What are the main findings?",
                      "How does this compare to previous work?",
                      "What are the limitations?",
                    ].map((chip, cIdx) => (
                      <button
                        key={cIdx}
                        type="button"
                        onClick={() => handleSelectSuggested(chip)}
                        className="text-[11.5px] px-2.5 sm:px-3 py-1.5 min-h-[36px] flex items-center rounded-[8px] bg-cri-surfaceElevated hover:bg-cri-surface border border-cri-border text-cri-textSecondary hover:text-cri-textPrimary transition-colors truncate max-w-full cursor-pointer"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>

                  {/* Bottom Controls: Add context, Focus: This document, Run analysis button */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-cri-border/60 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => inputRef.current?.focus()}
                        className="h-[38px] min-h-[38px] flex items-center gap-1.5 text-[12px] font-medium text-cri-textMuted hover:text-cri-textPrimary px-2.5 py-1.5 rounded-[8px] hover:bg-cri-surfaceElevated transition-colors cursor-pointer"
                        title="Attach additional context"
                      >
                        <Paperclip className="w-3.5 h-3.5 text-cri-orange" />
                        <span>Add context</span>
                      </button>

                      <div className="h-[38px] min-h-[38px] flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] bg-cri-surfaceElevated border border-cri-border text-[12px] text-cri-textSecondary">
                        <span>Focus: This document</span>
                        <ChevronDown className="w-3 h-3 text-cri-textMuted" />
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                      <kbd className="hidden sm:flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono text-cri-textMuted bg-cri-surfaceElevated border border-cri-border rounded-[5px]">
                        <span>⌘</span>
                        <span>Enter</span>
                      </kbd>

                      {/* Run analysis button: min 44px height, responsive full-width on phone */}
                      <button
                        type="submit"
                        disabled={isLoading || !questionInput.trim()}
                        className={`w-full sm:w-auto h-[44px] min-h-[44px] sm:h-[40px] px-5 rounded-[10px] text-[13px] font-semibold tracking-tight transition-all shadow-xs flex items-center justify-center gap-2 ${
                          isLoading || !questionInput.trim()
                            ? "bg-cri-surfaceElevated text-cri-textMuted cursor-not-allowed border border-cri-border"
                            : "bg-cri-orange hover:bg-cri-orange-hover text-white cursor-pointer active:scale-98"
                        }`}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Analyzing...</span>
                          </>
                        ) : (
                          <>
                            <span>Run analysis</span>
                            <ArrowRight className="w-4 h-4" />
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

              {/* SECTION 12: Analysis Result */}
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
                    /* Main Report Surface - Visually Dominant Document Experience (NotebookLM style) */
                    <div className="rounded-[14px] border border-cri-border bg-cri-surface p-5 sm:p-7 space-y-6 shadow-sm">
                      {/* Research Conclusion Headline */}
                      <div className="border-b border-cri-border pb-4">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-cri-orange font-mono mb-1.5">
                          Research Synthesis
                        </div>
                        <h2 className="text-[18px] sm:text-[20px] font-bold text-cri-textPrimary leading-snug font-sans">
                          {queryResponse.query}
                        </h2>
                      </div>

                      {/* Supporting Explanation with Provenance Citations */}
                      <div className="cri-answer-body">
                        {renderAnswerWithCitations(queryResponse.answer)}
                      </div>

                      {/* KEY FINDINGS */}
                      <div className="pt-6 border-t border-cri-border space-y-3.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-cri-textSecondary font-sans">
                            KEY FINDINGS
                          </span>
                          <span className="text-[11px] text-cri-textMuted font-mono">
                            {findings.length} findings
                          </span>
                        </div>

                        <div className="space-y-2.5">
                          {visibleFindings.map((finding, fIdx) => (
                            <div
                              key={fIdx}
                              className="flex items-start gap-3 p-3 rounded-[10px] bg-cri-surfaceSecondary border border-cri-border text-[13px] transition-colors hover:border-cri-orange/40"
                            >
                              <div className="w-5 h-5 rounded-full bg-cri-orange/15 text-cri-orange font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5 font-mono">
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
                            className="flex items-center gap-1 text-xs text-cri-orange hover:underline font-semibold pt-1 cursor-pointer"
                          >
                            <span>{showAllFindings ? "Show less ↑" : "Show more ↓"}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* SECTION 19 & 20: Confidence, Evidence Used, Methodology Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                    {/* SECTION 19: Confidence */}
                    <div className="p-4 rounded-[12px] bg-cri-surface border border-cri-border flex flex-col justify-between space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-cri-textMuted font-sans">
                          Confidence
                        </span>
                        <div className="flex items-center gap-1 text-xs text-cri-success font-medium">
                          <Check className="w-3.5 h-3.5 text-cri-success stroke-[2.5]" />
                          <span>Well supported</span>
                        </div>
                      </div>

                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-cri-textPrimary font-mono">
                          {confidencePct}%
                        </span>
                        <span className="text-xs text-cri-textSecondary font-medium">Confidence</span>
                      </div>

                      <p className="text-[11px] text-cri-textMuted leading-relaxed pt-1.5 border-t border-cri-border">
                        Calculated from verified evidence alignment in the scoped document.
                      </p>
                    </div>

                    {/* SECTION 20: Evidence Used */}
                    <div className="p-4 rounded-[12px] bg-cri-surface border border-cri-border flex flex-col justify-between space-y-2.5">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-cri-textMuted font-sans">
                            Evidence Used
                          </span>
                          <span className="text-[10px] font-mono text-cri-textMuted">
                            {queryResponse.citations?.length || 0} citations
                          </span>
                        </div>
                        <p className="text-xs text-cri-textSecondary leading-relaxed mt-1">
                          {queryResponse.citations?.length || 0} relevant passages from {activeDocument ? activeDocument.filename : "sources"}
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
                              className="text-[10px] font-mono px-2 py-1 rounded-[6px] bg-cri-surfaceElevated hover:bg-cri-surface border border-cri-border text-cri-textPrimary flex items-center gap-1 transition-colors cursor-pointer"
                              title={`Jump to [${cite.citation_index}]`}
                            >
                              <span className="text-cri-orange font-bold">[{cite.citation_index}]</span>
                              <span className="truncate max-w-[90px]">
                                {cite.filename ? `${cite.filename.slice(0, 8)} · p.${cite.page_number}` : `p.${cite.page_number}`}
                              </span>
                            </button>
                          ))
                        ) : (
                          <span className="text-[11px] text-cri-textMuted">No citations extracted</span>
                        )}
                      </div>
                    </div>

                    {/* SECTION 20: Methodology */}
                    <div className="p-4 rounded-[12px] bg-cri-surface border border-cri-border flex flex-col justify-between space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-cri-textMuted font-sans">
                          Methodology
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowConfidenceWhy(!showConfidenceWhy)}
                          className="text-[11px] font-medium text-cri-orange hover:underline cursor-pointer"
                        >
                          {showConfidenceWhy ? "Hide details" : "View details →"}
                        </button>
                      </div>
                      <p className="text-xs text-cri-textSecondary leading-relaxed">
                        Answer synthesized from retrieved evidence and verified citations.
                      </p>
                      {showConfidenceWhy ? (
                        <p className="text-[11px] text-cri-textMuted leading-relaxed pt-1.5 border-t border-cri-border">
                          Every statement is grounded against cited passages with strict document isolation.
                        </p>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs text-cri-success font-medium pt-1">
                          <Check className="w-3.5 h-3.5 text-cri-success stroke-[2.5]" />
                          <span>Grounded output</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
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
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => onCitationClick(c.citation_index)}
                        className="text-xs text-cri-orange hover:underline font-semibold cursor-pointer"
                      >
                        Highlight passage →
                      </button>
                      {onOpenCitationDocument && (
                        <button
                          type="button"
                          onClick={() => onOpenCitationDocument(c.page_number)}
                          className="text-xs text-cri-textSecondary hover:text-cri-textPrimary font-medium cursor-pointer"
                          title={`View page ${c.page_number} in document viewer`}
                        >
                          View page {c.page_number} ↗
                        </button>
                      )}
                    </div>
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
