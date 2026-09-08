"use client";

import React, { useState, useRef } from "react";
import { DocumentResponse, QueryResponse } from "@/lib/types";
import {
  FileText,
  ArrowRight,
  AlertTriangle,
  Loader2,
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

  const getDocMetadataString = () => {
    if (!activeDocument) return "No source active";
    if (activeDocument.filename.includes("1810.04805") || activeDocument.title.toLowerCase().includes("bert")) {
      return "Google AI · 2018 · 16 Pages";
    }
    return `Research Corpus · 2024 · ${activeDocument.page_count} Pages`;
  };

  const isAbstention =
    queryResponse &&
    (!queryResponse.evidence_sufficient ||
      !queryResponse.answerable ||
      queryResponse.grounding_status === "INSUFFICIENT" ||
      queryResponse.answer.includes("don't have sufficient evidence") ||
      queryResponse.answer.includes("insufficient evidence"));

  // Inline markdown formatter ensuring:
  // - Body text: font-weight 400
  // - Headings: font-weight 600
  // - No raw *, **, ***
  // - No entire answer rendered bold
  // - Citations remain clickable
  const renderInlineMarkdown = (text: string, keyPrefix: string): React.ReactNode => {
    if (!text) return null;

    const INLINE_REGEX =
      /(\[(\d+(?:,\s*\d+)*)\])|(\*\*\*([^*]+)\*\*\*)|(\*\*([^*]+)\*\*)|(\*([^*\n]+)\*)|(`([^`]+)`)|(\$([^$\n]+)\$)/g;

    const parts: React.ReactNode[] = [];
    let lastIdx = 0;
    let match: RegExpExecArray | null;

    // Remove any remaining stray unparsed asterisks from plain text
    const cleanStray = (str: string) => str.replace(/\*{1,3}/g, "");

    while ((match = INLINE_REGEX.exec(text)) !== null) {
      const matchStart = match.index;
      const matchEnd = matchStart + match[0].length;

      if (matchStart > lastIdx) {
        const plain = cleanStray(text.substring(lastIdx, matchStart));
        if (plain) parts.push(plain);
      }

      // [1] or [1, 2] Citations
      if (match[1]) {
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
                  className={`inline-flex items-center justify-center text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded transition-colors cursor-pointer relative touch-manipulation ${
                    isSelected
                      ? "bg-cri-orange text-white"
                      : "bg-cri-surfaceElevated text-cri-info border border-cri-border hover:bg-cri-surfaceHover hover:border-cri-orange/40"
                  }`}
                  title={`View supporting evidence [${num}]`}
                >
                  [{num}]
                </button>
              );
            })}
          </span>
        );
      }
      // ***Bold Italic***
      else if (match[3]) {
        parts.push(
          <strong key={`${keyPrefix}-bi-${matchStart}`} className="font-semibold italic text-cri-textPrimary">
            {cleanStray(match[4])}
          </strong>
        );
      }
      // **Bold**
      else if (match[5]) {
        parts.push(
          <strong key={`${keyPrefix}-b-${matchStart}`} className="font-semibold text-cri-textPrimary">
            {cleanStray(match[6])}
          </strong>
        );
      }
      // *Italic*
      else if (match[7]) {
        parts.push(
          <em key={`${keyPrefix}-i-${matchStart}`} className="italic text-cri-textPrimary font-normal">
            {cleanStray(match[8])}
          </em>
        );
      }
      // `Code`
      else if (match[9]) {
        parts.push(
          <code
            key={`${keyPrefix}-code-${matchStart}`}
            className="px-1.5 py-0.5 rounded bg-cri-surfaceElevated border border-cri-border font-mono text-[13px] text-cri-orange"
          >
            {match[10]}
          </code>
        );
      }
      // $Math$
      else if (match[11]) {
        parts.push(
          <span key={`${keyPrefix}-math-${matchStart}`} className="font-mono text-[13.5px] italic text-cri-textPrimary">
            {match[12]}
          </span>
        );
      }

      lastIdx = matchEnd;
    }

    if (lastIdx < text.length) {
      const plain = cleanStray(text.substring(lastIdx));
      if (plain) parts.push(plain);
    }

    return parts.length > 0 ? parts : null;
  };

  // Block-level markdown parser
  const renderAnswerContent = (text: string) => {
    if (!text) return null;

    const rawBlocks = text.split(/\n\s*\n/);
    const parsedBlocks: React.ReactNode[] = [];
    let blockKey = 0;

    for (const rawBlock of rawBlocks) {
      const trimmedBlock = rawBlock.trim();
      if (!trimmedBlock) continue;

      const lines = trimmedBlock.split("\n").map((l) => l.trim()).filter(Boolean);
      if (lines.length === 0) continue;

      // Unordered list
      const isBulletList = lines.every((l) => /^[-*•+]\s+/.test(l));
      if (isBulletList) {
        parsedBlocks.push(
          <ul
            key={`list-${blockKey++}`}
            className="list-disc pl-5 space-y-2 my-3 text-[14.5px] sm:text-[15px] font-normal leading-[1.65] text-cri-textPrimary font-sans"
          >
            {lines.map((l, lIdx) => {
              const itemContent = l.replace(/^[-*•+]\s+/, "");
              return (
                <li key={`li-${lIdx}`} className="font-normal pl-1">
                  {renderInlineMarkdown(itemContent, `li-${blockKey}-${lIdx}`)}
                </li>
              );
            })}
          </ul>
        );
        continue;
      }

      // Ordered list
      const isNumberList = lines.every((l) => /^\d+[\.)]\s+/.test(l));
      if (isNumberList) {
        parsedBlocks.push(
          <ol
            key={`ol-${blockKey++}`}
            className="list-decimal pl-5 space-y-2 my-3 text-[14.5px] sm:text-[15px] font-normal leading-[1.65] text-cri-textPrimary font-sans"
          >
            {lines.map((l, lIdx) => {
              const itemContent = l.replace(/^\d+[\.)]\s+/, "");
              return (
                <li key={`oli-${lIdx}`} className="font-normal pl-1">
                  {renderInlineMarkdown(itemContent, `oli-${blockKey}-${lIdx}`)}
                </li>
              );
            })}
          </ol>
        );
        continue;
      }

      // Standalone heading check
      if (lines.length === 1) {
        const line = lines[0];
        const hashMatch = line.match(/^(#{1,6})\s+(.*)$/);
        if (hashMatch) {
          const level = hashMatch[1].length;
          const headingText = hashMatch[2].replace(/\*+/g, "").trim();
          if (level <= 2) {
            parsedBlocks.push(
              <h2
                key={`h2-${blockKey++}`}
                className="text-[17px] sm:text-[18px] font-semibold text-cri-textPrimary mt-5 mb-2 tracking-tight font-sans"
              >
                {renderInlineMarkdown(headingText, `h2-${blockKey}`)}
              </h2>
            );
          } else {
            parsedBlocks.push(
              <h3
                key={`h3-${blockKey++}`}
                className="text-[15px] sm:text-[16px] font-semibold text-cri-textPrimary mt-4 mb-2 tracking-tight font-sans"
              >
                {renderInlineMarkdown(headingText, `h3-${blockKey}`)}
              </h3>
            );
          }
          continue;
        }

        const boldHeaderMatch = line.match(/^(\*{2,3})([^*]+)(\*{2,3}):?$/);
        if (boldHeaderMatch && boldHeaderMatch[2].length <= 70) {
          parsedBlocks.push(
            <h3
              key={`h3-${blockKey++}`}
              className="text-[15px] sm:text-[16px] font-semibold text-cri-textPrimary mt-4 mb-2 tracking-tight font-sans"
            >
              {renderInlineMarkdown(boldHeaderMatch[2].trim(), `bh-${blockKey}`)}
            </h3>
          );
          continue;
        }
      }

      // Mixed paragraph / list lines
      let currentParaLines: string[] = [];

      const flushPara = () => {
        if (currentParaLines.length > 0) {
          const paraText = currentParaLines.join(" ");
          parsedBlocks.push(
            <p
              key={`p-${blockKey++}`}
              className="font-normal text-[15px] sm:text-[15.5px] leading-[1.7] text-cri-textPrimary my-3 font-sans"
            >
              {renderInlineMarkdown(paraText, `para-${blockKey}`)}
            </p>
          );
          currentParaLines = [];
        }
      };

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Heading within block
        const hashMatch = line.match(/^(#{1,6})\s+(.*)$/);
        if (hashMatch) {
          flushPara();
          const level = hashMatch[1].length;
          const headingText = hashMatch[2].replace(/\*+/g, "").trim();
          if (level <= 2) {
            parsedBlocks.push(
              <h2
                key={`h2-${blockKey++}`}
                className="text-[17px] sm:text-[18px] font-semibold text-cri-textPrimary mt-5 mb-2 tracking-tight font-sans"
              >
                {renderInlineMarkdown(headingText, `h2-${blockKey}`)}
              </h2>
            );
          } else {
            parsedBlocks.push(
              <h3
                key={`h3-${blockKey++}`}
                className="text-[15px] sm:text-[16px] font-semibold text-cri-textPrimary mt-4 mb-2 tracking-tight font-sans"
              >
                {renderInlineMarkdown(headingText, `h3-${blockKey}`)}
              </h3>
            );
          }
          continue;
        }

        // Bold heading line within block
        const boldHeaderMatch = line.match(/^(\*{2,3})([^*:]+)(\*{2,3}):?\s*$/);
        if (boldHeaderMatch && boldHeaderMatch[2].length <= 70) {
          flushPara();
          parsedBlocks.push(
            <h3
              key={`h3-${blockKey++}`}
              className="text-[15px] sm:text-[16px] font-semibold text-cri-textPrimary mt-4 mb-2 tracking-tight font-sans"
            >
              {renderInlineMarkdown(boldHeaderMatch[2].trim(), `bh-${blockKey}`)}
            </h3>
          );
          continue;
        }

        // Bullet line
        const bMatch = line.match(/^[-*•+]\s+(.*)$/);
        if (bMatch) {
          flushPara();
          parsedBlocks.push(
            <ul
              key={`inline-ul-${blockKey++}`}
              className="list-disc pl-5 my-1.5 text-[14.5px] font-normal leading-[1.65] text-cri-textPrimary font-sans"
            >
              <li className="font-normal pl-1">
                {renderInlineMarkdown(bMatch[1], `li-${blockKey}-${i}`)}
              </li>
            </ul>
          );
          continue;
        }

        // Numbered line
        const nMatch = line.match(/^\d+[\.)]\s+(.*)$/);
        if (nMatch) {
          flushPara();
          parsedBlocks.push(
            <ol
              key={`inline-ol-${blockKey++}`}
              className="list-decimal pl-5 my-1.5 text-[14.5px] font-normal leading-[1.65] text-cri-textPrimary font-sans"
            >
              <li className="font-normal pl-1">
                {renderInlineMarkdown(nMatch[1], `oli-${blockKey}-${i}`)}
              </li>
            </ol>
          );
          continue;
        }

        // If entire line is wrapped in **bold**, strip outer asterisks to prevent whole line bolding
        let cleanLine = line;
        if (
          ((cleanLine.startsWith("**") && cleanLine.endsWith("**")) ||
            (cleanLine.startsWith("***") && cleanLine.endsWith("***"))) &&
          cleanLine.length > 60
        ) {
          cleanLine = cleanLine.replace(/^\*{2,3}\s*/, "").replace(/\s*\*{2,3}$/, "");
        }

        currentParaLines.push(cleanLine);
      }

      flushPara();
    }

    return (
      <div className="cri-answer-body space-y-3 text-cri-textPrimary font-normal font-sans">
        {parsedBlocks}
      </div>
    );
  };

  return (
    <main
      className={`h-full flex flex-col bg-cri-surface border border-cri-border rounded-lg overflow-hidden transition-colors ${className || ""}`}
      aria-label="Research Workspace"
    >
      {/* Header bar */}
      <div className="px-4 sm:px-6 py-3.5 border-b border-cri-border bg-cri-surface shrink-0">
        {activeDocument ? (
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-cri-orange shrink-0" />
                <h1
                  className="text-base sm:text-lg font-semibold text-cri-textPrimary tracking-tight truncate font-sans"
                  title={activeDocument.title || activeDocument.filename}
                >
                  {activeDocument.title || activeDocument.filename}
                </h1>
              </div>

              <div className="mt-0.5 flex items-center gap-2 text-xs text-cri-textSecondary truncate pl-6 font-sans">
                <span>{getDocMetadataString()}</span>
              </div>
            </div>

            {onViewDocument && (
              <button
                type="button"
                onClick={onViewDocument}
                className="hidden sm:flex items-center gap-1.5 h-8 px-3 rounded-md bg-cri-surface hover:bg-cri-surfaceHover border border-cri-border text-xs font-medium text-cri-textPrimary transition-colors cursor-pointer shrink-0"
                title="View original research document"
              >
                <BookOpen className="w-3.5 h-3.5 text-cri-orange" />
                <span>View document</span>
              </button>
            )}
          </div>
        ) : (
          <div>
            <h1 className="text-base sm:text-lg font-semibold text-cri-textPrimary tracking-tight font-sans">
              Research Workspace
            </h1>
            <p className="text-xs text-cri-textSecondary mt-0.5">
              Select a source from the left to begin your research.
            </p>
          </div>
        )}
      </div>

      {/* Main content scroll area */}
      <div className="flex-1 overflow-y-auto p-5 sm:p-6 lg:p-8 space-y-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Question input */}
          <form onSubmit={handleSubmit} className="relative">
            <div className="min-h-[120px] sm:min-h-[135px] rounded-lg border border-cri-border bg-cri-surfaceSecondary focus-within:border-cri-orange transition-colors p-3.5 sm:p-4 flex flex-col justify-between">
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
                className="w-full bg-transparent text-sm font-normal text-cri-textPrimary placeholder:text-cri-textMuted resize-none focus:outline-none leading-relaxed"
              />

              <div className="flex items-center justify-end gap-2.5 pt-2 text-xs">
                <span className="hidden sm:inline text-[11px] font-mono text-cri-textMuted select-none">
                  ⌘ Enter
                </span>

                <button
                  type="submit"
                  disabled={isLoading || !questionInput.trim() || !activeDocument}
                  className={`h-8 px-3.5 rounded-md text-xs font-medium tracking-normal transition-colors flex items-center justify-center gap-1.5 ${
                    isLoading || !questionInput.trim() || !activeDocument
                      ? "bg-cri-surfaceElevated text-cri-textMuted cursor-not-allowed border border-cri-border"
                      : "bg-cri-orange hover:bg-cri-orange-hover text-white cursor-pointer"
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

          {/* Loading state */}
          {isLoading && (
            <div className="p-6 rounded-lg bg-cri-surface border border-cri-border flex flex-col items-center justify-center space-y-2.5 text-center">
              <Loader2 className="w-5 h-5 text-cri-orange animate-spin" />
              <div className="space-y-1">
                <p className="text-xs font-semibold text-cri-textPrimary">Analyzing Research Document</p>
                <p className="text-[11px] text-cri-textSecondary">
                  Retrieving evidence passages, reranking context, and synthesizing grounded answer...
                </p>
              </div>
            </div>
          )}

          {/* Response container */}
          {queryResponse && !isLoading && (
            <div className="space-y-5">
              {isAbstention ? (
                <div className="p-5 rounded-lg border border-cri-orange/60 bg-cri-surface space-y-2.5">
                  <div className="flex items-center gap-1.5 text-cri-orange">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span className="text-xs font-semibold uppercase tracking-wider font-sans">
                      Insufficient Evidence
                    </span>
                  </div>
                  <h2 className="text-sm font-semibold text-cri-textPrimary leading-snug">
                    I don&apos;t have sufficient evidence in the selected document to answer this question.
                  </h2>
                  <p className="text-xs text-cri-textSecondary leading-relaxed">
                    The question cannot be answered using evidence from the selected document. To ensure factual accuracy, an ungrounded answer was not generated.
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border border-cri-border bg-cri-surface p-5 sm:p-6 space-y-5">
                  <div className="border-b border-cri-border pb-3.5">
                    <h2 className="text-base sm:text-lg font-semibold text-cri-textPrimary leading-snug font-sans">
                      {queryResponse.query}
                    </h2>
                  </div>

                  {/* Rendered answer with proper Markdown */}
                  <div className="cri-answer-body text-sm leading-relaxed text-cri-textPrimary">
                    {renderAnswerContent(queryResponse.answer)}
                  </div>

                  {/* Citations section */}
                  {queryResponse.citations && queryResponse.citations.length > 0 && (
                    <div className="pt-5 border-t border-cri-border space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-cri-textSecondary font-sans">
                          Citations
                        </h3>
                        <span className="text-[11px] font-mono text-cri-textMuted">
                          {queryResponse.citations.length} sources
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {queryResponse.citations.map((cite) => {
                          const isSelected = selectedCitationIndex === cite.citation_index;
                          return (
                            <div
                              key={cite.citation_index}
                              className={`text-xs font-mono px-2.5 py-1.5 rounded-md border flex items-center gap-2 transition-colors ${
                                isSelected
                                  ? "bg-cri-orange/15 border-cri-orange text-cri-orange font-semibold"
                                  : "bg-cri-surfaceSecondary border-cri-border text-cri-textPrimary"
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => onCitationClick(cite.citation_index)}
                                className="font-bold text-cri-orange hover:underline cursor-pointer"
                                title={`Highlight citation [${cite.citation_index}] in Evidence panel`}
                              >
                                [{cite.citation_index}]
                              </button>
                              <span
                                className="font-sans text-xs truncate max-w-[200px]"
                                title={cite.section_title || cite.section || "Relevant Section"}
                              >
                                {cite.section_title || cite.section || "Relevant Section"}
                              </span>
                              {onOpenCitationDocument && (
                                <button
                                  type="button"
                                  onClick={() => onOpenCitationDocument(cite.page_number)}
                                  className="text-[10px] text-cri-textMuted hover:text-cri-orange font-mono underline ml-1 cursor-pointer"
                                  title={`View page ${cite.page_number} in document viewer`}
                                >
                                  p.{cite.page_number} ↗
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
};
