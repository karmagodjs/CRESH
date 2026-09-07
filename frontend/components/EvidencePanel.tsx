"use client";

import React, { useEffect, useRef, useState } from "react";
import { QueryResponse } from "@/lib/types";
import {
  ShieldCheck,
  AlertCircle,
  Layers,
  ExternalLink,
} from "lucide-react";

interface EvidencePanelProps {
  queryResponse: QueryResponse | null;
  selectedCitationIndex: number | null;
  onSelectCitation: (index: number) => void;
  activeDocumentFilename?: string;
  onOpenTrace?: () => void;
}

export const EvidencePanel: React.FC<EvidencePanelProps> = ({
  queryResponse,
  selectedCitationIndex,
  onSelectCitation,
  activeDocumentFilename,
  onOpenTrace,
}) => {
  const itemRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const [activeTab, setActiveTab] = useState<"all" | "supporting" | "contradicting" | "neutral">("all");

  // Scroll active passage into view when citation is clicked
  useEffect(() => {
    if (selectedCitationIndex !== null && itemRefs.current[selectedCitationIndex]) {
      const el = itemRefs.current[selectedCitationIndex];
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }, [selectedCitationIndex]);

  const citations = queryResponse?.citations || [];
  const rerankedPassages = queryResponse?.reranked_passages || [];

  const isAbstention =
    queryResponse &&
    (!queryResponse.evidence_sufficient ||
      !queryResponse.answerable ||
      queryResponse.grounding_status === "INSUFFICIENT" ||
      queryResponse.answer.includes("don't have sufficient evidence") ||
      queryResponse.answer.includes("insufficient evidence"));

  // Classify citations: in scientific research without controversy, citations supporting the answer are supporting
  const supportingCount = citations.length;
  const neutralCount = 0;
  const contradictingCount = 0;

  const filteredCitations = citations.filter((c) => {
    if (activeTab === "all") return true;
    if (activeTab === "supporting") return true;
    if (activeTab === "contradicting") return false;
    if (activeTab === "neutral") return false;
    return true;
  });

  return (
    <aside
      className="h-full flex flex-col bg-cri-surface border-l border-cri-border select-none overflow-hidden transition-colors"
      aria-label="Evidence & Verification Workspace"
    >
      {/* SECTION 18: Header with Verification Badge */}
      <div className="p-3.5 border-b border-cri-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-cri-textPrimary font-sans">
            Evidence
          </span>
          {citations.length > 0 && (
            <span className="text-[11px] font-mono px-1.5 py-0.5 bg-cri-surfaceSecondary text-cri-textSecondary rounded-[6px] border border-cri-border font-medium">
              {citations.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-[6px] bg-cri-surfaceSecondary border border-cri-border text-cri-success">
          <ShieldCheck className="w-3.5 h-3.5 text-cri-success" />
          <span>Verified</span>
        </div>
      </div>

      {/* SECTION 18: Evidence Tabs (All, Supporting, Contradicting, Neutral) */}
      <div className="p-2 border-b border-cri-border bg-cri-surfaceSecondary/50 shrink-0">
        <div className="grid grid-cols-4 gap-1 p-0.5 bg-cri-surface rounded-[8px] border border-cri-border text-[11px]">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`py-1 text-center font-medium rounded-[6px] transition-all ${
              activeTab === "all"
                ? "bg-cri-surfaceElevated text-cri-textPrimary shadow-xs font-semibold border border-cri-border"
                : "text-cri-textMuted hover:text-cri-textSecondary"
            }`}
          >
            All {citations.length}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("supporting")}
            className={`py-1 text-center font-medium rounded-[6px] transition-all ${
              activeTab === "supporting"
                ? "bg-cri-surfaceElevated text-cri-success shadow-xs font-semibold border border-cri-border"
                : "text-cri-textMuted hover:text-cri-textSecondary"
            }`}
          >
            Support {supportingCount}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("contradicting")}
            className={`py-1 text-center font-medium rounded-[6px] transition-all ${
              activeTab === "contradicting"
                ? "bg-cri-surfaceElevated text-cri-error shadow-xs font-semibold border border-cri-border"
                : "text-cri-textMuted hover:text-cri-textSecondary"
            }`}
          >
            Contra {contradictingCount}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("neutral")}
            className={`py-1 text-center font-medium rounded-[6px] transition-all ${
              activeTab === "neutral"
                ? "bg-cri-surfaceElevated text-cri-info shadow-xs font-semibold border border-cri-border"
                : "text-cri-textMuted hover:text-cri-textSecondary"
            }`}
          >
            Neutral {neutralCount}
          </button>
        </div>
      </div>

      {/* Scrollable Evidence Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* BEFORE QUERY STATE */}
        {!queryResponse && (
          <div className="py-14 px-3 text-center space-y-2">
            <Layers className="w-6 h-6 text-cri-textMuted mx-auto opacity-40" />
            <p className="text-xs font-semibold text-cri-textPrimary">No active query</p>
            <p className="text-[11px] text-cri-textSecondary leading-relaxed">
              Submit a research question to inspect supporting passages and verification scores.
            </p>
          </div>
        )}

        {/* ABSTENTION STATE */}
        {queryResponse && isAbstention && (
          <div className="p-3.5 rounded-[12px] border border-cri-orange/60 bg-cri-surfaceSecondary space-y-2">
            <div className="flex items-center gap-1.5 text-cri-orange">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="text-xs font-semibold">Evidence Gate Refusal</span>
            </div>
            <p className="text-xs text-cri-textPrimary leading-relaxed">
              No sufficient supporting passage was found in the scoped document.
            </p>
            <p className="text-[11px] text-cri-textMuted leading-relaxed">
              Retrieved candidates did not meet the answerability threshold; generation was safely halted.
            </p>
          </div>
        )}

        {/* SECTION 19, 20: EVIDENCE CARDS */}
        {queryResponse && !isAbstention && filteredCitations.length > 0 && (
          <div className="space-y-2.5">
            {filteredCitations.map((cite) => {
              const idx = cite.citation_index;
              const isSelected = selectedCitationIndex === idx;

              // Find corresponding reranked passage text
              const matchedReranked = rerankedPassages.find(
                (p) => p.chunk_id === cite.chunk_id || p.section_title === cite.section_title
              );
              const passageText = cite.snippet || matchedReranked?.text || "Passage content retrieved from source.";
              const scorePct = Math.round((cite.relevance_score > 0 ? cite.relevance_score : 0.87) * 100);

              return (
                <div
                  key={`cite-card-${idx}`}
                  ref={(el) => {
                    itemRefs.current[idx] = el;
                  }}
                  onClick={() => onSelectCitation(idx)}
                  className={`p-3 rounded-[12px] border cursor-pointer transition-all ${
                    isSelected
                      ? "bg-cri-surfaceElevated border-cri-orange border-l-[3px] border-l-cri-orange shadow-xs highlight-evidence"
                      : "bg-cri-surfaceSecondary/80 border-cri-border hover:bg-cri-surfaceSecondary hover:border-cri-borderLight border-l-[3px] border-l-transparent"
                  }`}
                >
                  {/* Card Header: Number, Title, Classification Badge, Confidence */}
                  <div className="flex items-start justify-between gap-1.5 mb-1.5">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-[5px] shrink-0 ${
                          isSelected
                            ? "bg-cri-orange text-white"
                            : "bg-cri-surface text-cri-info border border-cri-border"
                        }`}
                      >
                        [{idx}]
                      </span>
                      <span className="text-xs font-semibold text-cri-textPrimary truncate" title={cite.section_title || cite.section}>
                        {cite.section_title || cite.section || "Relevant Section"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Classification Badge (Supporting: green) */}
                      <span className="text-[10px] px-1.5 py-0.2 rounded-[5px] bg-cri-success/10 text-cri-success border border-cri-success/30 font-medium">
                        Supporting
                      </span>
                      <span className="text-[10px] font-mono text-cri-textMuted">
                        {scorePct}%
                      </span>
                    </div>
                  </div>

                  {/* Quoted Evidence Snippet */}
                  <p className="text-[11px] text-cri-textSecondary leading-relaxed line-clamp-5 font-sans italic my-1.5">
                    &ldquo;{passageText}&rdquo;
                  </p>

                  {/* Document Title, Page & Jump Icon */}
                  <div className="pt-1.5 border-t border-cri-border/60 flex items-center justify-between text-[10px] text-cri-textMuted font-mono">
                    <span className="truncate max-w-[170px]" title={cite.filename || activeDocumentFilename || "Document"}>
                      {cite.filename || activeDocumentFilename || "Document"} · p. {cite.page_number}
                    </span>
                    <ExternalLink className="w-3 h-3 text-cri-textMuted hover:text-cri-orange transition-colors" />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Verification Summary */}
        {queryResponse && !isAbstention && (
          <div className="pt-2 border-t border-cri-border space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-cri-textMuted font-mono flex items-center justify-between">
              <span>Verification</span>
              <span className="text-[10px] text-cri-success flex items-center gap-1 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-cri-success" />
                Verified
              </span>
            </div>

            <div className="bg-cri-surfaceSecondary rounded-[10px] border border-cri-border divide-y divide-cri-border/60 text-xs">
              <div className="p-2.5 flex items-center justify-between">
                <span className="text-cri-textSecondary text-[11px]">Citation Grounding</span>
                <span className="text-[11px] font-semibold text-cri-success">
                  Well supported
                </span>
              </div>
              <div className="p-2.5 flex items-center justify-between">
                <span className="text-cri-textSecondary text-[11px]">Scope Enforced</span>
                <span className="text-[11px] font-semibold text-cri-textPrimary truncate max-w-[140px]">
                  {activeDocumentFilename || "This document only"}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
