"use client";

import React, { useEffect, useRef } from "react";
import { QueryResponse } from "@/lib/types";
import {
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  FileCheck,
  Layers,
  ChevronRight,
  HelpCircle,
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

  // Scroll active passage into view when citation is clicked
  useEffect(() => {
    if (selectedCitationIndex !== null && itemRefs.current[selectedCitationIndex]) {
      const el = itemRefs.current[selectedCitationIndex];
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }, [selectedCitationIndex]);

  // Derive passages to display:
  // Citations from backend QueryResponse (each citation maps to an evidence passage)
  const citations = queryResponse?.citations || [];
  const rerankedPassages = queryResponse?.reranked_passages || [];

  const isAbstention =
    queryResponse &&
    (!queryResponse.evidence_sufficient ||
      !queryResponse.answerable ||
      queryResponse.grounding_status === "INSUFFICIENT" ||
      queryResponse.answer.includes("don't have sufficient evidence") ||
      queryResponse.answer.includes("insufficient evidence"));

  return (
    <aside
      className="h-full flex flex-col bg-cri-ink select-none overflow-hidden"
      aria-label="Evidence & Verification Workspace"
    >
      {/* Header */}
      <div className="p-3 border-b border-cri-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-cri-paper font-sans">
            Evidence
          </span>
          {citations.length > 0 && (
            <span className="text-[11px] px-1.5 py-0.2 bg-cri-surface text-cri-textMuted rounded border border-cri-border">
              {citations.length} {citations.length === 1 ? "passage" : "passages"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-[11px] text-cri-textMuted">
          <ShieldCheck className="w-3.5 h-3.5 text-cri-blue" />
          <span>Verification</span>
        </div>
      </div>

      {/* Main Evidence Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* BEFORE QUERY STATE */}
        {!queryResponse && (
          <div className="py-12 px-3 text-center space-y-2">
            <Layers className="w-6 h-6 text-cri-textMuted mx-auto opacity-50" />
            <p className="text-xs font-medium text-cri-paper">No active query</p>
            <p className="text-[11px] text-cri-textMuted leading-relaxed">
              Run a research question to inspect the passages supporting the answer and audit grounding verification.
            </p>
          </div>
        )}

        {/* ABSTENTION STATE IN EVIDENCE PANEL */}
        {queryResponse && isAbstention && (
          <div className="p-3.5 rounded border border-cri-orange/60 bg-cri-surface space-y-2.5">
            <div className="flex items-center gap-1.5 text-cri-orange">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="text-xs font-semibold">Evidence Gate Refusal</span>
            </div>
            <p className="text-xs text-cri-paper/90 leading-relaxed">
              No sufficient supporting passage was found.
            </p>
            <p className="text-[11px] text-cri-textMuted leading-relaxed">
              The retrieved candidates did not satisfy the minimum relevance and answerability thresholds. Parametric synthesis was blocked.
            </p>
          </div>
        )}

        {/* SUPPORTED PASSAGES LIST */}
        {queryResponse && !isAbstention && citations.length > 0 && (
          <div className="space-y-2.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-cri-textMuted">
              Supporting Passages ({citations.length})
            </div>

            {citations.map((cite) => {
              const idx = cite.citation_index;
              const isSelected = selectedCitationIndex === idx;

              // Find corresponding reranked passage text or snippet
              const matchedReranked = rerankedPassages.find(
                (p) => p.chunk_id === cite.chunk_id || p.section_title === cite.section_title
              );
              const passageText = cite.snippet || matchedReranked?.text || "Passage content retrieved from source.";

              return (
                <div
                  key={`cite-card-${idx}`}
                  ref={(el) => {
                    itemRefs.current[idx] = el;
                  }}
                  onClick={() => onSelectCitation(idx)}
                  className={`p-3 rounded-sm border cursor-pointer transition-all ${
                    isSelected
                      ? "bg-cri-surfaceActive border-cri-blue border-l-[3px] border-l-cri-blue shadow-sm highlight-evidence"
                      : "bg-cri-surface border-cri-border hover:border-cri-borderLight border-l-[3px] border-l-transparent"
                  }`}
                >
                  <div className="flex items-start justify-between gap-1 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[11px] font-bold px-1.5 py-0.2 rounded ${
                          isSelected
                            ? "bg-cri-blue text-white"
                            : "bg-cri-ink text-cri-blue border border-cri-border"
                        }`}
                      >
                        [{idx}]
                      </span>
                      <span className="text-xs font-semibold text-cri-paper truncate">
                        {cite.section_title || cite.section || "Relevant Section"}
                      </span>
                    </div>
                    {cite.relevance_score > 0 && (
                      <span className="text-[10px] font-mono text-cri-textMuted shrink-0">
                        {(cite.relevance_score * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>

                  <div className="text-[10px] text-cri-textMuted mb-2 flex items-center gap-1.5">
                    <span>Page {cite.page_number}</span>
                    <span>·</span>
                    <span className="truncate">{cite.filename || activeDocumentFilename || "Document"}</span>
                  </div>

                  <p className="text-[11px] text-cri-paper/90 leading-relaxed line-clamp-6 font-sans">
                    {passageText}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* Fallback if query completed but citations array empty */}
        {queryResponse && !isAbstention && citations.length === 0 && (
          <div className="py-6 px-3 text-center text-xs text-cri-textMuted">
            No specific passage citations were extracted for this query.
          </div>
        )}

        {/* VERIFICATION SECTION */}
        {queryResponse && (
          <div className="pt-3 border-t border-cri-border space-y-2">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-cri-textMuted flex items-center justify-between">
              <span>Verification</span>
              <span className="text-[10px] text-cri-textMuted">Backend Audit</span>
            </div>

            <div className="bg-cri-surface rounded border border-cri-border divide-y divide-cri-border text-xs">
              {/* Evidence gate */}
              <div className="p-2.5 flex items-center justify-between">
                <span className="text-cri-textMuted">Evidence gate</span>
                <span
                  className={`font-semibold text-xs flex items-center gap-1 ${
                    queryResponse.evidence_sufficient
                      ? "text-emerald-400"
                      : "text-cri-orange"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      queryResponse.evidence_sufficient ? "bg-emerald-400" : "bg-cri-orange"
                    }`}
                  />
                  {queryResponse.evidence_sufficient ? "PASS" : "INSUFFICIENT"}
                </span>
              </div>

              {/* Grounding */}
              <div className="p-2.5 flex items-center justify-between">
                <span className="text-cri-textMuted">Grounding</span>
                <span
                  className={`font-semibold text-xs flex items-center gap-1 ${
                    queryResponse.grounded
                      ? "text-emerald-400"
                      : "text-cri-orange"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      queryResponse.grounded ? "bg-emerald-400" : "bg-cri-orange"
                    }`}
                  />
                  {queryResponse.grounding_status || (queryResponse.grounded ? "PASS" : "FAIL")}
                </span>
              </div>

              {/* Citation verification */}
              <div className="p-2.5 flex items-center justify-between">
                <span className="text-cri-textMuted">Citation verification</span>
                <span
                  className={`font-semibold text-xs flex items-center gap-1 ${
                    citations.length > 0 && queryResponse.grounded
                      ? "text-emerald-400"
                      : isAbstention
                      ? "text-cri-textMuted"
                      : "text-cri-orange"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      citations.length > 0 && queryResponse.grounded
                        ? "bg-emerald-400"
                        : isAbstention
                        ? "bg-cri-textMuted"
                        : "bg-cri-orange"
                    }`}
                  />
                  {citations.length > 0 && queryResponse.grounded
                    ? "PASS"
                    : isAbstention
                    ? "N/A"
                    : "CHECK"}
                </span>
              </div>

              {/* Document scope */}
              <div className="p-2.5 flex items-center justify-between">
                <span className="text-cri-textMuted">Document scope</span>
                <span className="font-medium text-cri-paper text-xs truncate max-w-[130px]" title={activeDocumentFilename || "Unknown"}>
                  {activeDocumentFilename || (queryResponse.document_scope_valid ? "Scoped" : "Empty")}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
