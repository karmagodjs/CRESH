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
  ChevronRight,
  Database,
  Trash2,
} from "lucide-react";

interface SourcesPanelProps {
  documents: DocumentResponse[];
  activeDocumentId: string | null;
  onSelectDocument: (documentId: string | null) => void;
  onOpenUpload: () => void;
  onDeleteDocument?: (documentId: string) => void;
  isDemoMode: boolean;
}

export const SourcesPanel: React.FC<SourcesPanelProps> = ({
  documents,
  activeDocumentId,
  onSelectDocument,
  onOpenUpload,
  onDeleteDocument,
  isDemoMode,
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredDocs = documents.filter((doc) => {
    const q = searchQuery.toLowerCase();
    return (
      doc.filename.toLowerCase().includes(q) ||
      doc.title.toLowerCase().includes(q)
    );
  });

  const activeDoc = documents.find((d) => d.document_id === activeDocumentId);

  return (
    <aside
      className="h-full flex flex-col bg-cri-ink border-r border-cri-border select-none"
      aria-label="Sources Library"
    >
      {/* Panel Header */}
      <div className="p-3 border-b border-cri-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-cri-paper font-sans">
            Sources
          </span>
          <span className="text-[11px] px-1.5 py-0.2 bg-cri-surface text-cri-textMuted rounded border border-cri-border">
            {documents.length}
          </span>
        </div>
        <button
          type="button"
          onClick={onOpenUpload}
          className="flex items-center gap-1 text-xs font-medium text-cri-paper bg-cri-surface hover:bg-cri-surfaceActive border border-cri-borderLight hover:border-cri-orange px-2 py-1 rounded transition-colors"
          title="Add new document (PDF, TXT, MD)"
        >
          <Plus className="w-3.5 h-3.5 text-cri-orange" />
          <span>Add source</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="p-2 border-b border-cri-border">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-cri-textMuted absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search sources..."
            className="w-full bg-cri-surface border border-cri-border text-xs text-cri-paper placeholder-cri-textMuted pl-8 pr-2.5 py-1.5 rounded focus:outline-none focus:border-cri-orange transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-cri-textMuted hover:text-cri-paper"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Sources List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {filteredDocs.length === 0 ? (
          <div className="py-8 px-3 text-center">
            <p className="text-xs text-cri-textMuted">
              {searchQuery ? "No matching sources" : "No documents indexed"}
            </p>
            {!searchQuery && (
              <button
                type="button"
                onClick={onOpenUpload}
                className="mt-3 text-xs text-cri-orange hover:underline font-medium"
              >
                + Ingest your first document
              </button>
            )}
          </div>
        ) : (
          filteredDocs.map((doc) => {
            const isActive = doc.document_id === activeDocumentId;
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
                className={`group relative text-left p-2.5 rounded-sm border cursor-pointer transition-all ${
                  isActive
                    ? "bg-cri-surfaceActive border-cri-borderLight border-l-[3px] border-l-cri-orange shadow-sm"
                    : "bg-cri-ink border-cri-border hover:bg-cri-surface hover:border-cri-borderLight border-l-[3px] border-l-transparent"
                }`}
              >
                <div className="flex items-start justify-between gap-1.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-1">
                      <FileText
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isActive ? "text-cri-orange" : "text-cri-textMuted"
                        }`}
                      />
                      <span
                        className={`text-xs font-semibold truncate ${
                          isActive ? "text-cri-paper" : "text-cri-paper"
                        }`}
                        title={doc.filename}
                      >
                        {doc.filename}
                      </span>
                    </div>

                    <div className="text-[11px] text-cri-textMuted line-clamp-1 leading-snug">
                      {doc.title || "Research Paper"}
                    </div>

                    <div className="mt-1.5 flex items-center gap-2 text-[10px] text-cri-textMuted">
                      <span>
                        {doc.page_count} {doc.page_count === 1 ? "page" : "pages"}
                      </span>
                      <span>·</span>
                      <span>{doc.chunk_count} chunks</span>
                      <span>·</span>
                      <span className="text-cri-blue font-medium">Indexed</span>
                    </div>
                  </div>

                  {isActive && (
                    <div className="shrink-0 pt-0.5">
                      <div className="w-2 h-2 rounded-full bg-cri-orange" title="Active document" />
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Selected Source Details & Document Scope Guard */}
      <div className="p-3 border-t border-cri-border bg-cri-surface text-xs">
        {activeDoc ? (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-cri-textMuted">
                Active Scope
              </span>
              <button
                type="button"
                onClick={() => onSelectDocument(null)}
                className="text-[11px] text-cri-orange hover:text-cri-orange-hover font-medium flex items-center gap-0.5"
                title="Deselect active document to verify strict document isolation"
              >
                <span>Clear scope</span>
                <X className="w-3 h-3" />
              </button>
            </div>
            <p className="font-semibold text-cri-paper truncate mb-1" title={activeDoc.title}>
              {activeDoc.filename}
            </p>
            <div className="grid grid-cols-2 gap-1 text-[11px] text-cri-textMuted">
              <div>Pages: <span className="text-cri-paper font-medium">{activeDoc.page_count}</span></div>
              <div>Chunks: <span className="text-cri-paper font-medium">{activeDoc.chunk_count}</span></div>
              <div>Size: <span className="text-cri-paper font-medium">{formatBytes(activeDoc.file_size_bytes)}</span></div>
              <div>Sections: <span className="text-cri-paper font-medium">{activeDoc.section_titles?.length || 0}</span></div>
            </div>
          </div>
        ) : (
          <div className="text-[11px] text-cri-textMuted leading-normal">
            <span className="text-cri-orange font-semibold block mb-0.5">Scope: Isolated</span>
            Select a source to route research questions. Without a scope, queries safely abstain.
          </div>
        )}

        {/* Demo Mode Indicator */}
        {isDemoMode && (
          <div className="mt-2.5 pt-2 border-t border-cri-border/60 flex items-center justify-between text-[10px] text-cri-textMuted">
            <span className="font-medium text-cri-paper">Demo Mode</span>
            <span className="text-cri-blue font-medium">BERT loaded</span>
          </div>
        )}
      </div>
    </aside>
  );
};
