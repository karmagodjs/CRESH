"use client";

import React, { useState } from "react";
import { DocumentResponse } from "@/lib/types";
import { formatBytes } from "@/lib/utils";
import {
  FileText,
  Plus,
  Search,
  Check,
  X,
  Layers,
  Database,
  Trash2,
  UploadCloud,
  CheckCircle2,
  Sparkles,
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
      className="h-full flex flex-col bg-cri-surface border-r border-cri-border select-none overflow-hidden transition-colors"
      aria-label="Sources Library"
    >
      {/* Panel Header */}
      <div className="p-3.5 border-b border-cri-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-cri-textPrimary font-sans">
            Sources
          </span>
          <span className="text-[11px] font-mono px-1.5 py-0.5 bg-cri-surfaceSecondary text-cri-textSecondary rounded-[6px] border border-cri-border font-medium">
            {documents.length}
          </span>
        </div>

        <button
          type="button"
          onClick={onOpenUpload}
          className="flex items-center gap-1 text-xs font-semibold text-white bg-cri-orange hover:bg-cri-orange-hover px-2.5 py-1.2 rounded-[9px] shadow-xs transition-colors"
          title="Add new source (PDF, TXT, MD)"
        >
          <Plus className="w-3.5 h-3.5 text-white" />
          <span>Add source</span>
        </button>
      </div>

      {/* Search Bar with ⌘ F */}
      <div className="p-2.5 border-b border-cri-border space-y-2 shrink-0">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-cri-textMuted absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search sources or documents..."
            className="w-full bg-cri-surfaceSecondary border border-cri-border text-xs text-cri-textPrimary placeholder-cri-textMuted pl-8 pr-12 py-1.5 rounded-[9px] focus:outline-none focus:border-cri-orange transition-colors"
          />
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-cri-textMuted hover:text-cri-textPrimary"
            >
              <X className="w-3 h-3" />
            </button>
          ) : (
            <kbd className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 px-1 py-0.2 text-[9px] font-mono text-cri-textMuted bg-cri-surfaceElevated border border-cri-border rounded-[4px] pointer-events-none">
              <span>⌘</span>
              <span>F</span>
            </kbd>
          )}
        </div>

        {/* Filter Tabs: All, Papers, Web, Others */}
        <div className="grid grid-cols-4 gap-1 p-0.5 bg-cri-surfaceSecondary/80 rounded-[8px] border border-cri-border/60 text-[11px]">
          {(["all", "papers", "web", "others"] as const).map((filter) => {
            const isActive = activeFilter === filter;
            return (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={`py-1 text-center font-medium capitalize rounded-[6px] transition-all ${
                  isActive
                    ? "bg-cri-surfaceElevated text-cri-textPrimary shadow-xs font-semibold border border-cri-border"
                    : "text-cri-textMuted hover:text-cri-textSecondary"
                }`}
              >
                {filter}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sources List (Scrollable Area) */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
        {filteredDocs.length === 0 ? (
          <div className="py-10 px-3 text-center space-y-2">
            <FileText className="w-6 h-6 text-cri-textMuted mx-auto opacity-40" />
            <p className="text-xs font-medium text-cri-textSecondary">
              {searchQuery ? "No matching sources" : "No documents indexed"}
            </p>
            {!searchQuery && (
              <button
                type="button"
                onClick={onOpenUpload}
                className="text-xs text-cri-orange hover:underline font-semibold"
              >
                + Ingest your first document
              </button>
            )}
          </div>
        ) : (
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
                className={`group relative text-left p-3 rounded-[12px] border cursor-pointer transition-all ${
                  isActive
                    ? "bg-cri-surfaceElevated border-cri-borderLight border-l-[3px] border-l-cri-orange shadow-xs"
                    : "bg-cri-surfaceSecondary/70 border-cri-border hover:bg-cri-surfaceSecondary hover:border-cri-borderLight border-l-[3px] border-l-transparent"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    {/* Title with Document Icon */}
                    <div className="flex items-center gap-2 mb-1">
                      <FileText
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? "text-cri-orange" : "text-cri-textMuted"
                        }`}
                      />
                      <span
                        className={`text-xs font-semibold truncate ${
                          isActive ? "text-cri-textPrimary" : "text-cri-textPrimary"
                        }`}
                        title={doc.filename}
                      >
                        {doc.filename}
                      </span>
                    </div>

                    {/* Author / Org · Year */}
                    <div className="text-[11px] text-cri-textSecondary truncate">
                      {authorYear}
                    </div>

                    {/* Metadata line: Page count & Status indicator */}
                    <div className="mt-2 flex items-center gap-2 text-[10px] text-cri-textMuted font-mono">
                      <span>{doc.page_count} {doc.page_count === 1 ? "page" : "pages"}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1 text-cri-success font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-cri-success inline-block" />
                        Indexed
                      </span>
                    </div>
                  </div>

                  {/* Selected Pill Indicator */}
                  {isActive && (
                    <div className="shrink-0 pt-0.5">
                      <div className="w-2 h-2 rounded-full bg-cri-orange" title="Active scoped source" />
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* INGESTION AREA (Section 9) */}
      {showIngestionItem && (
        <div className="px-3 pt-2.5 pb-2 border-t border-cri-border bg-cri-surfaceSecondary/50 shrink-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-cri-textMuted font-mono">
              INGESTION ({activeUpload ? "1" : "0"})
            </span>
            <button
              type="button"
              onClick={() => setShowIngestionItem(false)}
              className="text-cri-textMuted hover:text-cri-textPrimary p-0.5"
              title="Dismiss ingestion banner"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          <div className="p-2.5 rounded-[10px] bg-cri-surfaceElevated border border-cri-border space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-cri-textPrimary truncate text-[11px]" title={activeUpload?.filename || "The Future of AI Compute.pdf"}>
                {activeUpload?.filename || "The Future of AI Compute.pdf"}
              </span>
              <span className="text-[10px] font-mono text-cri-orange shrink-0">
                {activeUpload ? `${activeUpload.progress}%` : "Ready"}
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-cri-surface h-1.5 rounded-full overflow-hidden border border-cri-border/60">
              <div
                className="bg-cri-orange h-full rounded-full transition-all duration-300"
                style={{ width: `${activeUpload ? activeUpload.progress : 100}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] text-cri-textMuted">
              <span>{activeUpload?.status || "Structure-aware chunking complete"}</span>
              <span className="text-cri-success font-medium">Synced</span>
            </div>
          </div>
        </div>
      )}

      {/* SCOPE INDICATOR & SYSTEM STATUS (Section 10) */}
      <div className="p-3 border-t border-cri-border bg-cri-surface shrink-0 text-xs">
        <div className="p-2.5 rounded-[12px] bg-cri-surfaceSecondary border border-cri-border space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cri-orange inline-block" />
              <span className="text-xs font-bold text-cri-textPrimary">Scope: Isolated</span>
            </div>
            {activeDoc && (
              <button
                type="button"
                onClick={() => onSelectDocument(null)}
                className="text-[11px] text-cri-orange hover:text-cri-orange-hover font-semibold flex items-center gap-0.5 transition-colors"
                title="Deselect active source to test document isolation"
              >
                <span>Clear scope</span>
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <p className="text-[11px] text-cri-textSecondary leading-relaxed">
            {activeDoc ? (
              <span>
                Routing queries strictly to <strong className="text-cri-textPrimary font-semibold">{activeDoc.filename}</strong> ({activeDoc.chunk_count} chunks).
              </span>
            ) : (
              <span>
                Select a source to route research questions. Without a scope, queries safely abstain.
              </span>
            )}
          </p>

          {isDemoMode && activeDoc && (
            <div className="pt-1.5 border-t border-cri-border/60 flex items-center justify-between text-[10px] text-cri-textMuted font-mono">
              <span>Demo Mode</span>
              <span className="text-cri-info font-medium">BERT loaded</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
