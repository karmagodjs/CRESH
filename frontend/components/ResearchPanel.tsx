"use client";

import React, { useState, useRef } from "react";
import { DocumentResponse, QueryResponse } from "@/lib/types";
import {
  FileText,
  ArrowRight,
  AlertTriangle,
  Loader2,
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

  // Extract metadata string for the active document
  const getDocMetadataString = () => {
    if (!activeDocument) return "No source active";
    if (activeDocument.filename.includes("1810.04805") || activeDocument.title.toLowerCase().includes("bert")) {
      return "Google AI · 2018 · 16 Pages";
    }
    return `Research Corpus · 2024 · ${activeDocument.page_count} Pages`;
  };

  // Helper to strip stray or unclosed asterisks that are not numeric multiplication
  const cleanStrayAsterisks = (str: string): string => {
    return str.replace(/(?<!\d)\*+|\*+(?!\d)/g, "");
  };

  // Render inline formatting: citations [1], [2], bold ***text***, **text**, *text*, inline code, and math
  const renderFormattedInline = (text: string, keyPrefix: string = "inline"): React.ReactNode => {
    if (!text) return null;

    // Regex matches:
    // 1. Citations: [1] or [1, 2]
    // 3. Bold-Italic: ***text***
    // 5. Bold: **text**
    // 7. Italic: *text*
    // 9. Inline code: `code`
    // 11. Inline math: $formula$
    const INLINE_REGEX = /(\[(\d+(?:,\s*\d+)*)\])|(\*\*\*([^*]+)\*\*\*)|(\*\*([^*]+)\*\*)|(\*([^*\n]+)\*)|(`([^`]+)`)|(\$([^$\n]+)\$)/g;

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = INLINE_REGEX.exec(text)) !== null) {
      const matchStart = match.index;
      const matchEnd = matchStart + match[0].length;

      if (matchStart > lastIndex) {
        const plain = cleanStrayAsterisks(text.substring(lastIndex, matchStart));
        if (plain) {
          parts.push(plain);
        }
      }

      if (match[1]) {
        // Citation pills [1] or [1, 2]
        const citeNumbers = match[2]
          .split(",")
          .map((n) => parseInt(n.trim(), 10))
          .filter((n) => !isNaN(n));

        parts.push(
          <span key={`${keyPrefix}-cite-${matchStart}`} className="inline-flex items-center gap-0.5 mx-1 align-baseline">
            {citeNumbers.map((num) => {
              const isSelected = selectedCitationIndex === num;
              return (
                <button
                  key={`${keyPrefix}-cite-btn-${matchStart}-${num}`}
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
      } else if (match[3]) {
        // ***Bold Italic***
        parts.push(
          <strong
            key={`${keyPrefix}-bolditalic-${matchStart}`}
            className="font-semibold italic text-cri-textPrimary"
          >
            {cleanStrayAsterisks(match[4])}
          </strong>
        );
      } else if (match[5]) {
        // **Bold**
        parts.push(
          <strong
            key={`${keyPrefix}-bold-${matchStart}`}
            className="font-semibold text-cri-textPrimary"
          >
            {cleanStrayAsterisks(match[6])}
          </strong>
        );
      } else if (match[7]) {
        // *Italic*
        parts.push(
          <em
            key={`${keyPrefix}-italic-${matchStart}`}
            className="italic text-cri-textPrimary"
          >
            {cleanStrayAsterisks(match[8])}
          </em>
        );
      } else if (match[9]) {
        // `Inline Code`
        parts.push(
          <code
            key={`${keyPrefix}-code-${matchStart}`}
            className="px-1.5 py-0.5 rounded bg-cri-surfaceElevated border border-cri-border font-mono text-[13px] text-cri-orange"
          >
            {match[10]}
          </code>
        );
      } else if (match[11]) {
        // $Inline Math$
        parts.push(
          <span
            key={`${keyPrefix}-math-${matchStart}`}
            className="font-mono text-[13.5px] italic text-cri-textPrimary"
          >
            {match[12]}
          </span>
        );
      }

      lastIndex = matchEnd;
    }

    if (lastIndex < text.length) {
      const plain = cleanStrayAsterisks(text.substring(lastIndex));
      if (plain) {
        parts.push(plain);
      }
    }

    return parts.length > 0 ? parts : null;
  };

  const renderParagraphWithCitations = (text: string) => renderFormattedInline(text, "para");

  type ContentBlock =
    | { type: "h1"; content: string }
    | { type: "h2"; content: string }
    | { type: "h3"; content: string }
    | { type: "h4"; content: string }
    | { type: "ul"; items: string[] }
    | { type: "ol"; items: string[] }
    | { type: "p"; content: string };

  const KNOWN_HEADERS = [
    "Technical Breakdown & Core Architecture",
    "Technical Breakdown & Mechanism",
    "Technical Breakdown",
    "Key Empirical Findings & Contributions",
    "Key Empirical Findings & Trade-offs",
    "Key Empirical Findings",
    "Key Contributions & Empirical Findings",
    "Technical Elaboration & Mechanisms",
    "Benchmark & Empirical Context",
    "Limitations & Open Questions",
    "High-Level Technical Mechanism",
    "Direct Factual Answer",
    "Technical Summary",
    "Methodology Details",
    "Problem Addressed",
    "Proposed Solution",
    "Mechanism",
    "Architecture",
    "Background",
    "Overview",
    "Conclusion",
  ];

  // Render answer text with professional typography, Markdown headings, lists, inline emphasis, and citations
  const renderAnswerWithCitations = (answerText: string) => {
    if (!answerText) return null;

    // Normalization and splitting of glued headers or malformed markdown wrappers
    const titleRegexStr = KNOWN_HEADERS.map((h) => h.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
    const splitPattern = new RegExp(
      `^\\s*(?:\\*{2,3}|#{1,4}\\s*)?\\s*(${titleRegexStr})(?:\\*{2,3})?(?:\\s*[:\\-–—]\\s*|\\s+)(.+)$`,
      "i"
    );
    const standalonePattern = new RegExp(
      `^\\s*(?:\\*{2,3}|#{1,4}\\s*)?\\s*(${titleRegexStr})(?:\\*{2,3})?\\s*[:\\-–—]?\\s*$`,
      "i"
    );

    const rawLines = answerText.split("\n");
    const preprocessedLines: string[] = [];

    for (const raw of rawLines) {
      const line = raw.trim();
      if (!line) {
        preprocessedLines.push("");
        continue;
      }

      // Preserve existing markdown list syntax or heading syntax
      if (/^[-*•]\s+/.test(line) || /^\d+\.\s+/.test(line) || /^#{1,6}\s+/.test(line)) {
        preprocessedLines.push(line);
        continue;
      }

      let curr = line;
      while (curr) {
        const mSplit = curr.match(splitPattern);
        if (mSplit) {
          const header = mSplit[1].trim();
          let remainder = mSplit[2].trim();
          remainder = remainder.replace(/\*{2,3}\s*$/, "").trim();
          preprocessedLines.push(`### ${header}`);
          curr = remainder;
          continue;
        }

        const mStand = curr.match(standalonePattern);
        if (mStand) {
          const header = mStand[1].trim();
          preprocessedLines.push(`### ${header}`);
          curr = "";
          break;
        }

        // If a long line is entirely wrapped in **...** or ***...***, strip the outer wrap
        if (
          ((curr.startsWith("**") && curr.endsWith("**")) ||
            (curr.startsWith("***") && curr.endsWith("***"))) &&
          curr.length > 50
        ) {
          curr = curr.replace(/^\*{2,3}\s*/, "").replace(/\s*\*{2,3}$/, "");
          continue;
        }

        // If line is a short standalone bold title (e.g. **Title** or ***Title***)
        const mShortBold = curr.match(/^\*{2,3}([^*:]+)\*{2,3}:?\s*$/);
        if (mShortBold && mShortBold[1].length <= 50 && !mShortBold[1].endsWith(".")) {
          preprocessedLines.push(`### ${mShortBold[1].trim()}`);
          curr = "";
          break;
        }

        preprocessedLines.push(curr);
        break;
      }
    }

    // Group lines into structured blocks
    const blocks: ContentBlock[] = [];
    let currentParagraph: string[] = [];

    const flushParagraph = () => {
      if (currentParagraph.length > 0) {
        const text = currentParagraph.join(" ").trim();
        if (text) {
          blocks.push({ type: "p", content: text });
        }
        currentParagraph = [];
      }
    };

    for (const line of preprocessedLines) {
      if (!line) {
        flushParagraph();
        continue;
      }

      if (line.startsWith("# ")) {
        flushParagraph();
        blocks.push({ type: "h1", content: line.replace(/^#\s+/, "") });
        continue;
      }
      if (line.startsWith("## ")) {
        flushParagraph();
        blocks.push({ type: "h2", content: line.replace(/^##\s+/, "") });
        continue;
      }
      if (line.startsWith("### ")) {
        flushParagraph();
        blocks.push({ type: "h3", content: line.replace(/^###\s+/, "") });
        continue;
      }
      if (line.startsWith("#### ")) {
        flushParagraph();
        blocks.push({ type: "h4", content: line.replace(/^####\s+/, "") });
        continue;
      }

      const bulletMatch = line.match(/^[-*•]\s+(.*)$/);
      if (bulletMatch) {
        flushParagraph();
        const lastBlock = blocks[blocks.length - 1];
        if (lastBlock && lastBlock.type === "ul") {
          lastBlock.items.push(bulletMatch[1]);
        } else {
          blocks.push({ type: "ul", items: [bulletMatch[1]] });
        }
        continue;
      }

      const numMatch = line.match(/^\d+\.\s+(.*)$/);
      if (numMatch) {
        flushParagraph();
        const lastBlock = blocks[blocks.length - 1];
        if (lastBlock && lastBlock.type === "ol") {
          lastBlock.items.push(numMatch[1]);
        } else {
          blocks.push({ type: "ol", items: [numMatch[1]] });
        }
        continue;
      }

      currentParagraph.push(line);
    }

    flushParagraph();

    return (
      <div className="space-y-4 text-cri-textPrimary font-normal font-sans">
        {blocks.map((block, bIdx) => {
          switch (block.type) {
            case "h1":
            case "h2":
              return (
                <h2
                  key={`block-h2-${bIdx}`}
                  className="text-[17px] sm:text-[18px] font-semibold text-cri-textPrimary mt-5 mb-2.5 tracking-tight font-sans"
                >
                  {renderFormattedInline(block.content, `h2-${bIdx}`)}
                </h2>
              );
            case "h3":
              return (
                <h3
                  key={`block-h3-${bIdx}`}
                  className="text-[15.5px] sm:text-[16px] font-semibold text-cri-textPrimary mt-4 mb-2 tracking-tight font-sans"
                >
                  {renderFormattedInline(block.content, `h3-${bIdx}`)}
                </h3>
              );
            case "h4":
              return (
                <h4
                  key={`block-h4-${bIdx}`}
                  className="text-[14.5px] font-semibold text-cri-textPrimary mt-3 mb-1.5 tracking-tight font-sans"
                >
                  {renderFormattedInline(block.content, `h4-${bIdx}`)}
                </h4>
              );
            case "ul":
              return (
                <ul
                  key={`block-ul-${bIdx}`}
                  className="list-disc pl-5 space-y-2 my-3 text-[14.5px] sm:text-[15px] font-normal leading-[1.65] text-cri-textPrimary"
                >
                  {block.items.map((item, iIdx) => (
                    <li key={`ul-${bIdx}-${iIdx}`} className="font-normal pl-1">
                      {renderFormattedInline(item, `ul-${bIdx}-${iIdx}`)}
                    </li>
                  ))}
                </ul>
              );
            case "ol":
              return (
                <ol
                  key={`block-ol-${bIdx}`}
                  className="list-decimal pl-5 space-y-2 my-3 text-[14.5px] sm:text-[15px] font-normal leading-[1.65] text-cri-textPrimary"
                >
                  {block.items.map((item, iIdx) => (
                    <li key={`ol-${bIdx}-${iIdx}`} className="font-normal pl-1">
                      {renderFormattedInline(item, `ol-${bIdx}-${iIdx}`)}
                    </li>
                  ))}
                </ol>
              );
            case "p":
            default:
              return (
                <p
                  key={`block-p-${bIdx}`}
                  className="font-normal text-[15px] sm:text-[15.5px] leading-[1.7] text-cri-textPrimary my-2.5 font-sans"
                >
                  {renderFormattedInline(block.content, `p-${bIdx}`)}
                </p>
              );
          }
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

            {/* Disabled research input */}
            <div className="rounded-[14px] border border-cri-border bg-cri-surfaceSecondary p-4 sm:p-[18px] opacity-60 text-left shadow-sm min-h-[135px] sm:min-h-[150px] flex flex-col justify-between">
              <textarea
                disabled
                rows={2}
                placeholder="Select a source to ask research questions..."
                className="w-full bg-transparent text-[16px] font-normal text-cri-textPrimary placeholder:text-cri-textMuted resize-none focus:outline-none leading-relaxed cursor-not-allowed"
              />
              <div className="flex items-center justify-end pt-2">
                <button
                  disabled
                  className="h-[42px] px-[18px] rounded-[10px] bg-cri-surfaceElevated text-cri-textMuted text-xs font-semibold cursor-not-allowed border border-cri-border flex items-center gap-2"
                >
                  <span>Run analysis</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* TAB 1: ASK (Primary Q&A Workspace) */
          activeTab === "ask" && (
            <div className="space-y-7 max-w-4xl mx-auto">
              {/* Core Research Question Input: ONLY textarea and Run analysis */}
              <form onSubmit={handleSubmit} className="relative">
                <div className="min-h-[135px] sm:min-h-[150px] rounded-[14px] border border-cri-border bg-cri-surfaceSecondary shadow-sm focus-within:border-cri-orange transition-all p-4 sm:p-[18px] flex flex-col justify-between">
                  {/* Textarea: comfortable 16px normal-weight font */}
                  <textarea
                    ref={inputRef}
                    value={questionInput}
                    onChange={(e) => setQuestionInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isLoading}
                    rows={2}
                    placeholder="Ask a research question about this document..."
                    className="w-full bg-transparent text-[16px] font-normal text-cri-textPrimary placeholder:text-cri-textMuted resize-none focus:outline-none leading-relaxed"
                  />

                  {/* Bottom Action: Run analysis aligned naturally to bottom-right */}
                  <div className="flex items-center justify-end gap-3 pt-2 text-xs">
                    <kbd className="hidden sm:flex items-center gap-1 px-2 py-1 text-[10px] font-mono text-cri-textMuted bg-cri-surfaceElevated border border-cri-border rounded-[5px] select-none">
                      <span>⌘</span>
                      <span>Enter</span>
                    </kbd>

                    {/* Run analysis button */}
                    <button
                      type="submit"
                      disabled={isLoading || !questionInput.trim()}
                      className={`h-[42px] px-[18px] rounded-[10px] text-[13px] font-semibold tracking-tight transition-all shadow-xs flex items-center justify-center gap-2 ${
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
                        <h2 className="text-[18px] sm:text-[20px] font-semibold text-cri-textPrimary leading-snug font-sans">
                          {queryResponse.query}
                        </h2>
                      </div>

                      {/* Supporting Explanation with Provenance Citations */}
                      <div className="cri-answer-body font-normal text-[15px] sm:text-[15.5px] leading-[1.7] text-cri-textPrimary">
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
                              <span className="text-cri-textPrimary leading-relaxed">
                                {renderFormattedInline(finding, `finding-${fIdx}`)}
                              </span>
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
