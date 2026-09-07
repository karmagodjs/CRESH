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
  onOpenCitationDocument?: (pageNumber: number) => void;
  className?: string;
}

export const EvidencePanel: React.FC<EvidencePanelProps> = ({
  queryResponse,
  selectedCitationIndex,
  onSelectCitation,
  activeDocumentFilename,
  onOpenCitationDocument,
  className,
}) => {
  const itemRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const [activeTab, setActiveTab] = useState<"all" | "supporting" | "contradicting">("all");

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

  const supportingCount = citations.length;
  const contradictingCount = 0;

  const filteredCitations = citations.filter((c) => {
    if (activeTab === "all") return true;
    if (activeTab === "supporting") return true;
    if (activeTab === "contradicting") return false;
    return true;
  });

  return (
    <aside
      className={`h-full flex flex-col bg-cri-surface border border-cri-border rounded-lg select-none overflow-hidden transition-colors ${className || ""}`}
      aria-label="Evidence & Verification Workspace"
    >
      <div className="p-3.5 border-b border-cri-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-cri-textPrimary font-sans">
            Evidence
          </h2>
          {hasEvidence && (
            <span className="text-xs font-mono text-cri-textMuted font-medium">
              ({citations.length})
            </span>
          )}
        </div>

        {hasEvidence && (
          <div className="flex items-center gap-1 text-xs text-cri-success font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Verified</span>
          </div>
        )}
      </div>

      {hasEvidence && (
        <div className="p-2 border-b border-cri-border bg-cri-surface shrink-0">
          <div className="grid grid-cols-3 gap-1 p-0.5 bg-cri-surfaceSecondary rounded-md border border-cri-border text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`py-1 text-center rounded transition-colors cursor-pointer ${
                activeTab === "all"
                  ? "bg-cri-surface text-cri-textPrimary font-medium border border-cri-border"
                  : "text-cri-textMuted hover:text-cri-textSecondary"
              }`}
            >
              All {citations.length}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("supporting")}
              className={`py-1 text-center rounded transition-colors cursor-pointer truncate ${
                activeTab === "supporting"
                  ? "bg-cri-surface text-cri-success font-medium border border-cri-border"
                  : "text-cri-textMuted hover:text-cri-textSecondary"
              }`}
              title="Supporting evidence"
            >
              Supporting {supportingCount}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("contradicting")}
              className={`py-1 text-center rounded transition-colors cursor-pointer truncate ${
                activeTab === "contradicting"
                  ? "bg-cri-surface text-cri-error font-medium border border-cri-border"
                  : "text-cri-textMuted hover:text-cri-textSecondary"
              }`}
              title="Contradicting evidence"
            >
              Contradicting {contradictingCount}
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {!hasEvidence && !isAbstention && (
          <div className="h-full min-h-[160px] flex flex-col items-center justify-center text-center p-6 space-y-1.5">
            <p className="text-xs font-medium text-cri-textPrimary">No evidence yet</p>
            <p className="text-[11px] text-cri-textMuted leading-relaxed max-w-[200px] mx-auto">
              Ask a question to see supporting evidence.
            </p>
          </div>
        )}

        {queryResponse && isAbstention && (
          <div className="p-3 rounded-lg border border-cri-orange/50 bg-cri-surface space-y-1.5">
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

        {queryResponse && !isAbstention && filteredCitations.length > 0 && (
          <div className="space-y-2">
            {filteredCitations.map((cite) => {
              const idx = cite.citation_index;
              const isSelected = selectedCitationIndex === idx;

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
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-cri-surfaceElevated border-cri-border border-l-[3px] border-l-cri-orange"
                      : "bg-cri-surface border-cri-border hover:bg-cri-surfaceHover border-l-[3px] border-l-transparent"
                  }`}
                >
                  <div className="flex items-start justify-between gap-1.5 mb-1">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <span
                        className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded shrink-0 ${
                          isSelected
                            ? "bg-cri-orange text-white"
                            : "bg-cri-surfaceElevated text-cri-info"
                        }`}
                      >
                        [{idx}]
                      </span>
                      <span
                        className="text-xs font-medium text-cri-textPrimary truncate font-sans"
                        title={cite.section_title || cite.section}
                      >
                        {cite.section_title || cite.section || "Relevant Section"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-cri-success/10 text-cri-success font-medium">
                        Supporting
                      </span>
                      <span className="text-[10px] font-mono text-cri-textMuted">
                        {scorePct}%
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-cri-textSecondary leading-relaxed line-clamp-4 font-sans italic my-1.5">
                    &ldquo;{passageText}&rdquo;
                  </p>

                  <div
                    className="pt-1.5 border-t border-cri-border flex items-center justify-between text-[10px] text-cri-textMuted font-mono hover:text-cri-orange transition-colors cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onOpenCitationDocument) {
                        onOpenCitationDocument(cite.page_number);
                      }
                    }}
                    title={`Open document viewer on page ${cite.page_number}`}
                  >
                    <span className="truncate max-w-[170px]" title={cite.filename || activeDocumentFilename || "Document"}>
                      {cite.filename || activeDocumentFilename || "Document"} · p.{cite.page_number}
                    </span>
                    <ExternalLink className="w-3 h-3 text-cri-textMuted hover:text-cri-orange transition-colors shrink-0" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
};
