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
      className={`h-full flex flex-col bg-cri-surface border border-cri-border rounded-[14px] select-none overflow-hidden shadow-xs ${className || ""}`}
      aria-label="Sources Library"
    >
      <div className="p-4 border-b border-cri-border flex items-center justify-between shrink-0 relative">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-cri-textPrimary font-sans">
            Sources
          </h2>
          <span className="text-[11px] font-mono px-1.5 py-0.5 bg-cri-surfaceElevated text-cri-textSecondary rounded-[6px] border border-cri-border font-medium">
            {documents.length}
          </span>
        </div>

        {filteredDocs.length > 0 && (
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="h-[36px] px-[14px] flex items-center gap-1.5 text-[14px] font-semibold text-white bg-cri-orange hover:bg-cri-orange-hover rounded-[9px] transition-colors shadow-xs cursor-pointer"
              title="Add research source"
            >
              <Plus className="w-4 h-4 text-white stroke-[2.5]" />
              <span>Add source</span>
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-[#1A1E22] border border-[#2A2F35] rounded-[10px] shadow-2xl p-1.5 z-40 space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenUpload("file");
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-cri-textPrimary hover:bg-[#252A30] rounded-[7px] transition-colors text-left cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-[6px] bg-[#1C2024] border border-[#2A2F35] flex items-center justify-center text-cri-orange shrink-0">
                    <FileUp className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-cri-textPrimary">Upload file</span>
                    <span className="text-[10px] text-cri-textMuted truncate">PDF, TXT, MD files</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setActiveFilter("web");
                    setTimeout(() => urlInputRef.current?.focus(), 100);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-cri-textPrimary hover:bg-[#252A30] rounded-[7px] transition-colors text-left cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-[6px] bg-[#1C2024] border border-[#2A2F35] flex items-center justify-center text-[#58A6FF] shrink-0">
                    <Globe className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-cri-textPrimary">Add web URL</span>
                    <span className="text-[10px] text-cri-textMuted truncate">Articles, docs & pages</span>
                  </div>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

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
              className="absolute right-3 top-1/2 -translate-y-1/2 text-cri-textMuted hover:text-cri-textPrimary cursor-pointer"
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

        <div className="grid grid-cols-3 gap-1 p-0.5 bg-[#1C2024] rounded-[8px] border border-[#2A2F35] text-[11px]">
          {(["all", "papers", "web"] as const).map((filter) => {
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

      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 flex flex-col">
        {activeFilter === "web" ? (
          <div className="space-y-3 flex-1 flex flex-col">
            <div className="bg-[#1C2024] border border-[#2A2F35] rounded-[12px] p-3.5 space-y-3 shrink-0">
              <div className="flex items-center justify-between border-b border-[#2A2F35] pb-2">
                <div className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-[#58A6FF]" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cri-textMuted font-sans">
                    WEB SOURCES
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="text-xs font-semibold text-cri-textPrimary">
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
                    className={`w-full h-[36px] bg-[#171A1D] border text-xs text-cri-textPrimary placeholder-cri-textMuted px-3 rounded-[8px] focus:outline-none transition-colors ${
                      webUrlError
                        ? "border-cri-error focus:border-cri-error"
                        : "border-[#2A2F35] focus:border-cri-orange"
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
                  <div className="p-2.5 rounded-[8px] bg-[#221815] border border-cri-orange/40 text-[11px] text-cri-textSecondary leading-relaxed flex items-start gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-cri-orange shrink-0 mt-0.5" />
                    <span>{webBackendMessage}</span>
                  </div>
                )}

                <div className="flex items-center justify-end pt-0.5">
                  <button
                    type="submit"
                    disabled={isAddingWeb || !webUrl.trim()}
                    className={`h-[32px] px-3 rounded-[8px] text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      isAddingWeb || !webUrl.trim()
                        ? "bg-[#252A30] text-cri-textMuted cursor-not-allowed border border-[#2A2F35]"
                        : "bg-cri-orange hover:bg-cri-orange-hover text-white cursor-pointer shadow-xs"
                    }`}
                  >
                    {isAddingWeb ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Adding source...</span>
                      </>
                    ) : (
                      <>
                        <span>Add URL</span>
                        <ArrowRight className="w-3.5 h-3.5" />
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
                      className={`group relative text-left min-h-[84px] p-3 rounded-[12px] border cursor-pointer transition-all flex flex-col justify-between ${
                        isActive
                          ? "bg-[#1A1E22] border-[#2A2F35] border-l-[3px] border-l-cri-orange shadow-xs"
                          : "bg-[#171A1D] border-[#2A2F35] hover:bg-[#1A1E22] border-l-[3px] border-l-transparent"
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="w-[30px] h-[30px] rounded-[8px] bg-[#1C2024] border border-[#2A2F35] flex items-center justify-center text-[#58A6FF] shrink-0 mt-0.5">
                          <Globe className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] font-semibold text-cri-textPrimary leading-snug line-clamp-1">
                            {doc.title || doc.filename}
                          </div>
                          <div className="text-[11px] text-cri-textSecondary truncate mt-0.5">
                            {doc.filename}
                          </div>
                        </div>
                      </div>

                      <div className="mt-2 pt-1.5 border-t border-[#2A2F35]/50 flex items-center justify-between text-[11px] text-cri-textMuted">
                        <span>Web page</span>
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
                  <Globe className="w-5 h-5 opacity-40 text-[#58A6FF]" />
                  <p className="text-xs font-medium text-cri-textSecondary">
                    No web sources added yet.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 select-none">
            <div className="w-12 h-12 rounded-[12px] bg-[#1C2024] border border-[#2A2F35] flex items-center justify-center mx-auto text-cri-orange mb-4 shadow-xs">
              <FileText className="w-6 h-6 text-cri-orange stroke-[1.75]" />
            </div>

            <h3 className="text-sm font-semibold text-cri-textPrimary leading-tight mb-2">
              {searchQuery
                ? "No matching sources"
                : activeFilter === "papers"
                ? "No papers yet"
                : "No sources yet"}
            </h3>

            <p className="text-xs text-cri-textSecondary leading-relaxed max-w-[220px] mx-auto mb-[18px]">
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
                className="h-[40px] px-[18px] inline-flex items-center justify-center gap-2 text-[14px] font-semibold text-white bg-cri-orange hover:bg-cri-orange-hover rounded-[10px] transition-colors shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4 text-white stroke-[2.5]" />
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
                className={`group relative text-left min-h-[92px] p-[14px] rounded-[12px] border cursor-pointer transition-all flex flex-col justify-between ${
                  isActive
                    ? "bg-[#1A1E22] border-[#2A2F35] border-l-[3px] border-l-cri-orange shadow-xs"
                    : "bg-[#171A1D] border-[#2A2F35] hover:bg-[#1A1E22] border-l-[3px] border-l-transparent"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="w-[32px] h-[32px] rounded-[8px] bg-[#1C2024] border border-[#2A2F35] flex items-center justify-center text-cri-orange shrink-0 mt-0.5">
                    <FileText className="w-4 h-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div
                      className="text-[14px] font-semibold text-cri-textPrimary leading-snug line-clamp-2"
                      title={doc.title || doc.filename}
                    >
                      {doc.title || doc.filename}
                    </div>

                    <div className="text-[12px] text-cri-textSecondary truncate mt-1">
                      {authorYear}
                    </div>
                  </div>
                </div>

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
    </aside>
  );
};
