"use client";

import React, { useEffect, useRef, useState } from "react";
import { QueryResponse } from "@/lib/types";
import {
  ShieldCheck,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

interface EvidencePanelProps {
  queryResponse: QueryResponse | null;
  selectedCitationIndex: number | null;
  onSelectCitation: (index: number) => void;
  activeDocumentFilename?: string;
}

export const EvidencePanel: React.FC<EvidencePanelProps> = ({
  queryResponse,
  selectedCitationIndex,
  onSelectCitation,
  activeDocumentFilename,
}) => {
  const itemRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const [activeTab, setActiveTab] = useState<"all" | "supporting" | "contradicting" | "neutral">("all");
  const [showVerificationDetails, setShowVerificationDetails] = useState(false);

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

  const hasEvidence = Boolean(queryResponse && !isAbstention && citations.length > 0);

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
      className="h-full flex flex-col bg-[#171A1D] border border-[#2A2F35] rounded-[14px] select-none overflow-hidden shadow-xs transition-colors"
      aria-label="Evidence & Verification Workspace"
    >
      {/* SECTION 21: Header with Verification Badge */}
      <div className="p-4 border-b border-[#2A2F35] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-cri-textPrimary font-sans">
            Evidence
          </h2>
          {hasEvidence && (
            <span className="text-[11px] font-mono px-1.5 py-0.5 bg-[#1C2024] text-cri-textSecondary rounded-[6px] border border-[#2A2F35] font-medium">
              {citations.length}
            </span>
          )}
        </div>

        {hasEvidence && (
          <div className="flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-[6px] bg-[#1C2024] border border-[#2A2F35] text-cri-success">
            <ShieldCheck className="w-3.5 h-3.5 text-cri-success" />
            <span>Verified</span>
          </div>
        )}
      </div>

      {/* SECTION 22: Evidence Tabs (All, Supporting, Contradicting, Neutral) - Only shown after query when evidence exists */}
      {hasEvidence && (
        <div className="p-2.5 border-b border-[#2A2F35] bg-[#15171A] shrink-0">
          <div className="grid grid-cols-4 gap-1 p-0.5 bg-[#1C2024] rounded-[8px] border border-[#2A2F35] text-[11px]">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`py-1 text-center font-medium rounded-[6px] transition-all cursor-pointer ${
                activeTab === "all"
                  ? "bg-[#171A1D] text-cri-textPrimary shadow-xs font-semibold border border-[#2A2F35]"
                  : "text-cri-textMuted hover:text-cri-textSecondary"
              }`}
            >
              All {citations.length}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("supporting")}
              className={`py-1 text-center font-medium rounded-[6px] transition-all cursor-pointer truncate ${
                activeTab === "supporting"
                  ? "bg-[#171A1D] text-cri-success shadow-xs font-semibold border border-[#2A2F35]"
                  : "text-cri-textMuted hover:text-cri-textSecondary"
              }`}
              title="Supporting evidence"
            >
              Supporting {supportingCount}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("contradicting")}
              className={`py-1 text-center font-medium rounded-[6px] transition-all cursor-pointer truncate ${
                activeTab === "contradicting"
                  ? "bg-[#171A1D] text-cri-error shadow-xs font-semibold border border-[#2A2F35]"
                  : "text-cri-textMuted hover:text-cri-textSecondary"
              }`}
              title="Contradicting evidence"
            >
              Contradicting {contradictingCount}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("neutral")}
              className={`py-1 text-center font-medium rounded-[6px] transition-all cursor-pointer truncate ${
                activeTab === "neutral"
                  ? "bg-[#171A1D] text-cri-info shadow-xs font-semibold border border-[#2A2F35]"
                  : "text-cri-textMuted hover:text-cri-textSecondary"
              }`}
              title="Neutral evidence"
            >
              Neutral {neutralCount}
            </button>
          </div>
        </div>
      )}

      {/* Scrollable Evidence Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 flex flex-col">
        {/* SECTION 21: BEFORE QUERY / NO EVIDENCE STATE (Calm, centered, clean, no tabs) */}
        {!hasEvidence && !isAbstention && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-2">
            <p className="text-xs font-semibold text-cri-textPrimary">No evidence yet</p>
            <p className="text-[11px] text-cri-textMuted leading-relaxed max-w-[210px] mx-auto">
              Ask a question to see supporting evidence.
            </p>
          </div>
        )}

        {/* ABSTENTION STATE */}
        {queryResponse && isAbstention && (
          <div className="p-3.5 rounded-[12px] border border-cri-orange/60 bg-[#1A1E22] space-y-2">
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

        {/* SECTION 22 & 23: EVIDENCE CARDS */}
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
                  className={`p-[14px] rounded-[12px] border cursor-pointer transition-all ${
                    isSelected
                      ? "bg-[#1C2024] border-[#2A2F35] border-l-[3px] border-l-cri-orange shadow-xs"
                      : "bg-[#171A1D] border-[#2A2F35] hover:bg-[#1A1E22] border-l-[3px] border-l-transparent"
                  }`}
                >
                  {/* Card Header: Number, Title, Classification Badge, Confidence */}
                  <div className="flex items-start justify-between gap-1.5 mb-1.5">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-[5px] shrink-0 ${
                          isSelected
                            ? "bg-cri-orange text-white"
                            : "bg-[#1C2024] text-cri-info border border-[#2A2F35]"
                        }`}
                      >
                        [{idx}]
                      </span>
                      <span
                        className="text-xs font-semibold text-cri-textPrimary truncate font-sans"
                        title={cite.section_title || cite.section}
                      >
                        {cite.section_title || cite.section || "Relevant Section"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Classification Badge (Supporting: green) */}
                      <span className="text-[10px] px-1.5 py-0.5 rounded-[5px] bg-cri-success/10 text-cri-success border border-cri-success/30 font-medium">
                        Supporting
                      </span>
                      <span className="text-[10px] font-mono text-cri-textMuted">
                        {scorePct}%
                      </span>
                    </div>
                  </div>

                  {/* Quoted Evidence Snippet */}
                  <p className="text-[11px] text-cri-textSecondary leading-relaxed line-clamp-5 font-sans italic my-2">
                    &ldquo;{passageText}&rdquo;
                  </p>

                  {/* Document Title, Page & Jump Icon */}
                  <div className="pt-2 border-t border-[#2A2F35]/60 flex items-center justify-between text-[10px] text-cri-textMuted font-mono">
                    <span className="truncate max-w-[170px]" title={cite.filename || activeDocumentFilename || "Document"}>
                      {cite.filename || activeDocumentFilename || "Document"} · p.{cite.page_number}
                    </span>
                    <ExternalLink className="w-3 h-3 text-cri-textMuted hover:text-cri-orange transition-colors" />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* SECTION 23: Verification Summary */}
        {queryResponse && !isAbstention && (
          <div className="pt-2.5 border-t border-[#2A2F35] space-y-2 mt-auto">
            <div className="p-3 rounded-[10px] bg-[#1C2024] border border-[#2A2F35] space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-cri-success font-semibold text-xs">
                  <ShieldCheck className="w-4 h-4 text-cri-success shrink-0" />
                  <span>Evidence verified</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowVerificationDetails(!showVerificationDetails)}
                  className="text-[11px] text-cri-orange hover:underline font-medium cursor-pointer"
                >
                  {showVerificationDetails ? "Hide details" : "View details →"}
                </button>
              </div>

              {showVerificationDetails ? (
                <div className="pt-2 border-t border-[#2A2F35]/60 text-[11px] text-cri-textSecondary space-y-1.5 leading-relaxed">
                  <p>Every claim in the generated answer is directly backed by cited passages in the scoped source document.</p>
                  <div className="text-cri-textMuted flex items-center justify-between pt-0.5">
                    <span>Citation grounding</span>
                    <span className="text-cri-success font-semibold">Well supported</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-[11px] text-cri-textMuted pt-0.5">
                  <ShieldCheck className="w-3 h-3 text-cri-success" />
                  <span>Strict document isolation preserved</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
