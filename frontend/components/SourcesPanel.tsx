"use client";

import React, { useState, useRef, useEffect } from "react";
import { DocumentResponse } from "@/lib/types";
import {
  FileText,
  Plus,
  Search,
  X,
  Globe,
  ArrowRight,
  Loader2,
  AlertCircle,
  FileUp,
} from "lucide-react";

interface SourcesPanelProps {
  documents: DocumentResponse[];
  activeDocumentId: string | null;
  onSelectDocument: (documentId: string | null) => void;
  onOpenUpload: (tab?: "file" | "url") => void;
  onDeleteDocument?: (documentId: string) => void;
  isDemoMode: boolean;
  activeUpload?: {
    filename: string;
    progress: number;
    status: string;
  } | null;
  className?: string;
}

export const SourcesPanel: React.FC<SourcesPanelProps> = ({
  documents,
  activeDocumentId,
  onSelectDocument,
  onOpenUpload,
  onDeleteDocument,
  isDemoMode,
  activeUpload,
  className,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "papers" | "web">("all");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [webUrl, setWebUrl] = useState("");
  const [webUrlError, setWebUrlError] = useState<string | null>(null);
  const [isAddingWeb, setIsAddingWeb] = useState(false);
  const [webBackendMessage, setWebBackendMessage] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  const isWebDoc = (doc: DocumentResponse) =>
    doc.filename.startsWith("http://") ||
    doc.filename.startsWith("https://") ||
    doc.filename.endsWith(".html") ||
    doc.filename.includes("web") ||
    doc.title.startsWith("http://") ||
    doc.title.startsWith("https://");

  const filteredDocs = documents.filter((doc) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      doc.filename.toLowerCase().includes(q) ||
      doc.title.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (activeFilter === "papers") {
      return (
        (doc.filename.endsWith(".pdf") || doc.filename.includes("1810.04805")) &&
        !isWebDoc(doc)
      );
    }
    if (activeFilter === "web") {
      return isWebDoc(doc);
    }
    return true;
  });

  const webDocs = documents.filter(isWebDoc);
  const activeDoc = documents.find((d) => d.document_id === activeDocumentId);

  const getDocAuthorYear = (doc: DocumentResponse) => {
    if (doc.filename.includes("1810.04805") || doc.title.toLowerCase().includes("bert")) {
      return "Google AI · 2018";
    }
    if (doc.section_titles && doc.section_titles.length > 0) {
      return `${doc.section_titles[0].slice(0, 18)} · 2024`;
    }
    return "Research Corpus · 2024";
  };

  const handleAddWebUrl = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = webUrl.trim();
    setWebUrlError(null);
    setWebBackendMessage(null);

    if (!trimmed) {
      setWebUrlError("Please enter a valid URL (e.g. https://...)");
      return;
    }

    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
      setWebUrlError("Please enter a valid URL (e.g. https://...)");
      return;
    }

    try {
      new URL(trimmed);
    } catch {
      setWebUrlError("Please enter a valid URL (e.g. https://...)");
      return;
    }

    setIsAddingWeb(true);

    setTimeout(() => {
      setIsAddingWeb(false);
      setWebBackendMessage(
        "Could not add this source. Web ingestion requires a backend URL connector (FastAPI endpoint not yet configured). Try another source or upload a paper."
      );
    }, 600);
  };

  return (
    <aside
      className={`h-full flex flex-col bg-cri-surface border border-cri-border rounded-lg select-none overflow-hidden ${className || ""}`}
      aria-label="Sources Library"
    >
      <div className="p-3.5 border-b border-cri-border flex items-center justify-between shrink-0 relative">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-cri-textPrimary font-sans">
            Sources
          </h2>
          <span className="text-xs font-mono text-cri-textMuted font-medium">
            ({documents.length})
          </span>
        </div>

        {filteredDocs.length > 0 && (
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="h-8 px-3 flex items-center gap-1.5 text-xs font-medium text-white bg-cri-orange hover:bg-cri-orange-hover rounded-md transition-colors cursor-pointer"
              title="Add research source"
            >
              <Plus className="w-3.5 h-3.5 text-white" />
              <span>Add source</span>
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-48 bg-cri-surface border border-cri-border rounded-lg shadow-lg p-1 z-40 space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenUpload("file");
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-cri-textPrimary hover:bg-cri-surfaceHover rounded-md transition-colors text-left cursor-pointer"
                >
                  <FileUp className="w-4 h-4 text-cri-orange shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium text-cri-textPrimary">Upload file</span>
                    <span className="text-[10px] text-cri-textMuted truncate">PDF, TXT, MD</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setActiveFilter("web");
                    setTimeout(() => urlInputRef.current?.focus(), 100);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-cri-textPrimary hover:bg-cri-surfaceHover rounded-md transition-colors text-left cursor-pointer"
                >
                  <Globe className="w-4 h-4 text-cri-info shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium text-cri-textPrimary">Add web URL</span>
                    <span className="text-[10px] text-cri-textMuted truncate">Articles & pages</span>
                  </div>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-3 border-b border-cri-border space-y-2 shrink-0">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-cri-textMuted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search sources..."
            className="w-full h-8 bg-cri-surfaceSecondary border border-cri-border text-xs text-cri-textPrimary placeholder-cri-textMuted pl-8 pr-8 rounded-md focus:outline-none focus:border-cri-orange transition-colors"
          />
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-cri-textMuted hover:text-cri-textPrimary cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-cri-textMuted pointer-events-none">
              ⌘F
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-1 p-0.5 bg-cri-surfaceSecondary rounded-md border border-cri-border text-xs">
          {(["all", "papers", "web"] as const).map((filter) => {
            const isActive = activeFilter === filter;
            return (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={`py-1 text-center capitalize rounded text-xs transition-colors cursor-pointer ${
                  isActive
                    ? "bg-cri-surface text-cri-textPrimary font-medium border border-cri-border"
                    : "text-cri-textMuted hover:text-cri-textSecondary"
                }`}
              >
                {filter}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 flex flex-col">
        {activeFilter === "web" ? (
          <div className="space-y-3 flex-1 flex flex-col">
            <div className="bg-cri-surfaceSecondary border border-cri-border rounded-lg p-3 space-y-2.5 shrink-0">
              <div className="flex items-center justify-between border-b border-cri-border pb-2">
                <div className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-cri-info" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-cri-textMuted font-sans">
                    WEB SOURCES
                  </span>
                </div>
              </div>

              <div className="space-y-0.5">
                <h3 className="text-xs font-medium text-cri-textPrimary">
                  Add a web source
                </h3>
                <p className="text-[11px] text-cri-textSecondary leading-relaxed">
                  Index documentation, blog posts, or research pages for grounding.
                </p>
              </div>

              <form onSubmit={handleAddWebUrl} className="space-y-2">
                <div className="relative">
                  <input
                    ref={urlInputRef}
                    type="url"
                    value={webUrl}
                    onChange={(e) => {
                      setWebUrl(e.target.value);
                      if (webUrlError) setWebUrlError(null);
                      if (webBackendMessage) setWebBackendMessage(null);
                    }}
                    placeholder="https://example.com/article"
                    className={`w-full h-8 bg-cri-surface border text-xs text-cri-textPrimary placeholder-cri-textMuted px-2.5 rounded-md focus:outline-none transition-colors ${
                      webUrlError
                        ? "border-cri-error focus:border-cri-error"
                        : "border-cri-border focus:border-cri-orange"
                    }`}
                  />
                </div>

                {webUrlError && (
                  <p className="text-[11px] text-cri-error flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{webUrlError}</span>
                  </p>
                )}

                {webBackendMessage && (
                  <div className="p-2 rounded-md bg-cri-surfaceElevated border border-cri-orange/40 text-[11px] text-cri-textSecondary leading-relaxed flex items-start gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-cri-orange shrink-0 mt-0.5" />
                    <span>{webBackendMessage}</span>
                  </div>
                )}

                <div className="flex items-center justify-end pt-0.5">
                  <button
                    type="submit"
                    disabled={isAddingWeb || !webUrl.trim()}
                    className={`h-7 px-3 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
                      isAddingWeb || !webUrl.trim()
                        ? "bg-cri-surfaceElevated text-cri-textMuted cursor-not-allowed border border-cri-border"
                        : "bg-cri-orange hover:bg-cri-orange-hover text-white cursor-pointer"
                    }`}
                  >
                    {isAddingWeb ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Adding...</span>
                      </>
                    ) : (
                      <>
                        <span>Add URL</span>
                        <ArrowRight className="w-3 h-3" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              {webDocs.length > 0 ? (
                webDocs.map((doc) => {
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
                      className={`group relative text-left p-3 rounded-lg border cursor-pointer transition-colors flex flex-col justify-between ${
                        isActive
                          ? "bg-cri-surfaceElevated border-cri-border border-l-[3px] border-l-cri-orange"
                          : "bg-cri-surface border-cri-border hover:bg-cri-surfaceHover border-l-[3px] border-l-transparent"
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <Globe className="w-4 h-4 text-cri-info shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-cri-textPrimary leading-snug line-clamp-1">
                            {doc.title || doc.filename}
                          </div>
                          <div className="text-[11px] text-cri-textSecondary truncate mt-0.5">
                            {doc.filename}
                          </div>
                        </div>
                      </div>

                      <div className="mt-2 pt-1.5 border-t border-cri-border flex items-center justify-between text-[11px] text-cri-textMuted">
                        <span>Web source</span>
                        <span className="flex items-center gap-1.5 text-cri-success font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-cri-success inline-block" />
                          Indexed
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-2 text-cri-textMuted">
                  <Globe className="w-5 h-5 opacity-40 text-cri-info" />
                  <p className="text-xs font-medium text-cri-textSecondary">
                    No web sources added yet.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 select-none">
            <FileText className="w-8 h-8 text-cri-textMuted mx-auto mb-3 opacity-60" />

            <h3 className="text-xs font-semibold text-cri-textPrimary leading-tight mb-1.5">
              {searchQuery
                ? "No matching sources"
                : activeFilter === "papers"
                ? "No papers yet"
                : "No sources yet"}
            </h3>

            <p className="text-xs text-cri-textSecondary leading-relaxed max-w-[200px] mx-auto mb-4">
              {searchQuery
                ? "Try refining your search query."
                : activeFilter === "papers"
                ? "Add a research paper to begin."
                : "Add your first research source to begin."}
            </p>

            {!searchQuery && (
              <button
                type="button"
                onClick={() => onOpenUpload("file")}
                className="h-8 px-3.5 inline-flex items-center justify-center gap-1.5 text-xs font-medium text-white bg-cri-orange hover:bg-cri-orange-hover rounded-md transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-white" />
                <span>Add source</span>
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
                className={`group relative text-left p-3 rounded-lg border cursor-pointer transition-colors flex flex-col justify-between ${
                  isActive
                    ? "bg-cri-surfaceElevated border-cri-border border-l-[3px] border-l-cri-orange"
                    : "bg-cri-surface border-cri-border hover:bg-cri-surfaceHover border-l-[3px] border-l-transparent"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <FileText className={`w-4 h-4 shrink-0 mt-0.5 ${isActive ? "text-cri-orange" : "text-cri-textSecondary"}`} />

                  <div className="min-w-0 flex-1">
                    <div
                      className="text-xs font-semibold text-cri-textPrimary leading-snug line-clamp-2"
                      title={doc.title || doc.filename}
                    >
                      {doc.title || doc.filename}
                    </div>

                    <div className="text-[11px] text-cri-textSecondary truncate mt-0.5">
                      {authorYear}
                    </div>
                  </div>
                </div>

                <div className="mt-2 pt-1.5 border-t border-cri-border flex items-center justify-between text-[11px] text-cri-textMuted">
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
    </aside>
  );
};
