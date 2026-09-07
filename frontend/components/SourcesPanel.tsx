"use client";

import React, { useState } from "react";
import { DocumentResponse } from "@/lib/types";
import {
  FileText,
  Plus,
  Search,
  X,
} from "lucide-react";

interface SourcesPanelProps {
  documents: DocumentResponse[];
  activeDocumentId: string | null;
  onSelectDocument: (documentId: string | null) => void;
  onOpenUpload: () => void;
  onDeleteDocument?: (documentId: string) => void;
  isDemoMode: boolean;
  activeUpload?: {
    filename: string;
    progress: number;
    status: string;
  } | null;
}

export const SourcesPanel: React.FC<SourcesPanelProps> = ({
  documents,
  activeDocumentId,
  onSelectDocument,
  onOpenUpload,
  onDeleteDocument,
  isDemoMode,
  activeUpload,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "papers" | "web" | "others">("all");
  const [showIngestionItem, setShowIngestionItem] = useState(true);

  const filteredDocs = documents.filter((doc) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      doc.filename.toLowerCase().includes(q) ||
      doc.title.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (activeFilter === "papers") {
      return doc.filename.endsWith(".pdf") || doc.filename.includes("1810.04805");
    }
    if (activeFilter === "web") {
      return doc.filename.includes(".html") || doc.filename.includes("web");
    }
    if (activeFilter === "others") {
      return !doc.filename.endsWith(".pdf");
    }
    return true;
  });

  const activeDoc = documents.find((d) => d.document_id === activeDocumentId);

  // Helper to extract clean author/year metadata for display
  const getDocAuthorYear = (doc: DocumentResponse) => {
    if (doc.filename.includes("1810.04805") || doc.title.toLowerCase().includes("bert")) {
      return "Google AI · 2018";
    }
    if (doc.section_titles && doc.section_titles.length > 0) {
      return `${doc.section_titles[0].slice(0, 18)} · 2024`;
    }
    return "Research Corpus · 2024";
  };

  return (
    <aside
      className="h-full flex flex-col bg-[#171A1D] border border-[#2A2F35] rounded-[14px] select-none overflow-hidden shadow-xs"
      aria-label="Sources Library"
    >
      {/* SECTION 5: Panel Header */}
      <div className="p-4 border-b border-[#2A2F35] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-cri-textPrimary font-sans">
            Sources
          </h2>
          <span className="text-[11px] font-mono px-1.5 py-0.5 bg-[#1C2024] text-cri-textSecondary rounded-[6px] border border-[#2A2F35] font-medium">
            {documents.length}
          </span>
        </div>

        {/* Add Source button: 36px height, 14px padding, 9px radius, orange */}
        <button
          type="button"
          onClick={onOpenUpload}
          className="h-[36px] px-[14px] flex items-center gap-1.5 text-xs font-semibold text-white bg-cri-orange hover:bg-cri-orange-hover rounded-[9px] transition-colors shadow-xs cursor-pointer"
          title="Add new research source (PDF, TXT, MD)"
        >
          <Plus className="w-3.5 h-3.5 text-white stroke-[2.5]" />
          <span>+ Add sources</span>
        </button>
      </div>

      {/* SECTION 6: Source Search & Filters */}
      <div className="p-3 border-b border-[#2A2F35] space-y-2.5 shrink-0">
        <div className="relative">
          <Search className="w-4 h-4 text-cri-textMuted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search sources or documents..."
            className="w-full h-[42px] bg-[#171A1D] border border-[#2A2E33] text-xs text-cri-textPrimary placeholder-cri-textMuted pl-9 pr-12 rounded-[10px] focus:outline-none focus:border-cri-orange transition-colors"
          />
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-cri-textMuted hover:text-cri-textPrimary"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-mono text-cri-textMuted bg-[#1C2024] border border-[#2A2F35] rounded-[4px] pointer-events-none">
              <span>⌘</span>
              <span>F</span>
            </kbd>
          )}
        </div>

        {/* Small rounded segmented controls (8px radius) */}
        <div className="grid grid-cols-4 gap-1 p-0.5 bg-[#1C2024] rounded-[8px] border border-[#2A2F35] text-[11px]">
          {(["all", "papers", "web", "others"] as const).map((filter) => {
            const isActive = activeFilter === filter;
            return (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={`py-1 text-center font-medium capitalize rounded-[6px] transition-all cursor-pointer ${
                  isActive
                    ? "bg-[#171A1D] text-cri-textPrimary shadow-xs font-semibold border border-[#2A2F35]"
                    : "text-cri-textMuted hover:text-cri-textSecondary"
                }`}
              >
                {filter}
              </button>
            );
          })}
        </div>
      </div>

      {/* SECTION 7 & 8: Sources List / Empty State */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 flex flex-col">
        {filteredDocs.length === 0 ? (
          /* SECTION 8: Vertically Centered Empty State */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-3.5">
            <div className="w-9 h-9 rounded-[10px] bg-[#1C2024] border border-[#2A2F35] flex items-center justify-center mx-auto text-cri-textMuted">
              <FileText className="w-4 h-4 opacity-50 text-cri-orange" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-cri-textPrimary">
                {searchQuery ? "No matching sources" : "No sources yet"}
              </p>
              <p className="text-xs text-cri-textSecondary leading-relaxed max-w-[210px] mx-auto">
                {searchQuery ? "Try refining your search query." : "Add your first research document to begin."}
              </p>
            </div>
            {!searchQuery && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={onOpenUpload}
                  className="h-[36px] px-[14px] inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-cri-orange hover:bg-cri-orange-hover rounded-[10px] transition-colors cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5 text-white" />
                  <span>+ Add source</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          /* SECTION 7: Source items styled like notebook entries (90-100px approx, 14px padding, 12px radius) */
          filteredDocs.map((doc) => {
            const isActive = doc.document_id === activeDocumentId;
            const authorYear = getDocAuthorYear(doc);

            return (
              <div
                key={doc.document_id}
                onClick={() => onSelectDocument(isActive ? null : doc.document_id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectDocument(isActive ? null : doc.document_id);
                  }
                }}
                className={`group relative text-left min-h-[92px] p-[14px] rounded-[12px] border cursor-pointer transition-all flex flex-col justify-between ${
                  isActive
                    ? "bg-[#1A1E22] border-[#2A2F35] border-l-[3px] border-l-cri-orange shadow-xs"
                    : "bg-[#171A1D] border-[#2A2F35] hover:bg-[#1A1E22] border-l-[3px] border-l-transparent"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {/* 32px Document Icon */}
                  <div className="w-[32px] h-[32px] rounded-[8px] bg-[#1C2024] border border-[#2A2F35] flex items-center justify-center text-cri-orange shrink-0 mt-0.5">
                    <FileText className="w-4 h-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    {/* Title: 14px semibold */}
                    <div
                      className="text-[14px] font-semibold text-cri-textPrimary leading-snug line-clamp-2"
                      title={doc.title || doc.filename}
                    >
                      {doc.title || doc.filename}
                    </div>

                    {/* Metadata: 12px */}
                    <div className="text-[12px] text-cri-textSecondary truncate mt-1">
                      {authorYear}
                    </div>
                  </div>
                </div>

                {/* Status: 11px & page count */}
                <div className="mt-2.5 pt-2 border-t border-[#2A2F35]/50 flex items-center justify-between text-[11px] text-cri-textMuted">
                  <span>{doc.page_count} {doc.page_count === 1 ? "page" : "pages"}</span>
                  <span className="flex items-center gap-1.5 text-cri-success font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-cri-success inline-block" />
                    Indexed
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* SECTION 9: INGESTION (Near bottom, compact small rounded container) */}
      {showIngestionItem && (
        <div className="px-3 pt-2.5 pb-2 border-t border-[#2A2F35] bg-[#171A1D] shrink-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-cri-textMuted font-sans">
              INGESTION
            </span>
            <button
              type="button"
              onClick={() => setShowIngestionItem(false)}
              className="text-cri-textMuted hover:text-cri-textPrimary p-0.5 cursor-pointer"
              title="Dismiss ingestion banner"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          <div className="p-3 rounded-[10px] bg-[#1C2024] border border-[#2A2F35] space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-cri-textPrimary truncate text-[12px]" title={activeUpload?.filename || "The Future of AI Compute.pdf"}>
                {activeUpload?.filename || "The Future of AI Compute.pdf"}
              </span>
              <span className="text-[11px] font-mono text-cri-orange shrink-0">
                {activeUpload ? `${activeUpload.progress}%` : "Ready"}
              </span>
            </div>

            {/* Progress bar if uploading */}
            {activeUpload && activeUpload.progress < 100 && (
              <div className="w-full bg-[#171A1D] h-1.5 rounded-full overflow-hidden border border-[#2A2F35]">
                <div
                  className="bg-cri-orange h-full rounded-full transition-all duration-300"
                  style={{ width: `${activeUpload.progress}%` }}
                />
              </div>
            )}

            <div className="flex items-center justify-between text-[11px] text-cri-textMuted pt-0.5">
              <span>{activeUpload ? "Processing document" : "Ready"}</span>
              <span className="text-cri-success font-medium">Synced</span>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 10: RESEARCH SCOPE (Only displayed when a document is selected) */}
      {activeDoc && (
        <div className="p-3 border-t border-[#2A2F35] bg-[#171A1D] shrink-0 text-xs">
          <div className="p-3 rounded-[10px] bg-[#1A1E22] border border-[#2A2F35] space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cri-orange inline-block" />
                <span className="text-xs font-bold uppercase tracking-wider text-cri-textPrimary font-sans">
                  RESEARCH SCOPE
                </span>
              </div>
              <button
                type="button"
                onClick={() => onSelectDocument(null)}
                className="text-[11px] text-cri-orange hover:text-cri-orange-hover font-semibold flex items-center gap-0.5 transition-colors cursor-pointer"
                title="Clear scope"
              >
                <span>Clear scope</span>
                <X className="w-3 h-3" />
              </button>
            </div>

            <div className="text-xs font-semibold text-cri-textPrimary">
              This document only
            </div>

            <p className="text-[11px] text-cri-textSecondary leading-relaxed">
              Answers use evidence from the selected document.
            </p>
          </div>
        </div>
      )}
    </aside>
  );
};
