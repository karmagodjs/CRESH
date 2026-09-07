"use client";

import React, { useState, useEffect, useCallback } from "react";
import { DocumentResponse } from "@/lib/types";
import {
  X,
  FileText,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

interface DocumentViewerProps {
  isOpen: boolean;
  onClose: () => void;
  document: DocumentResponse | null;
  initialPage?: number;
  fileUrl?: string | null;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  isOpen,
  onClose,
  document,
  initialPage = 1,
  fileUrl,
}) => {
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  const [retryKey, setRetryKey] = useState<number>(0);
  const [textContent, setTextContent] = useState<string | null>(null);

  // Sync initialPage when changed
  useEffect(() => {
    if (initialPage && initialPage >= 1) {
      setCurrentPage(initialPage);
    }
  }, [initialPage]);

  // Reset loading and error when document or modal changes
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setHasError(false);
      setTextContent(null);
    }
  }, [isOpen, document?.document_id, retryKey]);

  // Resolve PDF / file URL from document or local uploads
  const getDocumentSourceUrl = useCallback((): string | null => {
    if (fileUrl) return fileUrl;
    if (!document) return null;

    const fn = document.filename.toLowerCase();

    // Map known papers to local static assets
    if (fn.includes("1810.04805") || document.title.toLowerCase().includes("bert")) {
      return "/data/sample_papers/1810.04805v2.pdf";
    }
    if (fn.includes("flash") && fn.endsWith(".pdf")) {
      return "/data/sample_papers/flash_attention.pdf";
    }
    if (fn.includes("kv_cache") && fn.endsWith(".pdf")) {
      return "/data/sample_papers/kv_cache_compression.pdf";
    }
    if (fn.includes("medusa") && fn.endsWith(".pdf")) {
      return "/data/sample_papers/medusa_decoding.pdf";
    }
    if (fn.includes("speculative") && fn.endsWith(".pdf")) {
      return "/data/sample_papers/speculative_decoding.pdf";
    }

    // Default static path for sample papers
    if (document.filename) {
      return `/data/sample_papers/${document.filename}`;
    }

    return null;
  }, [document, fileUrl]);

  const resolvedUrl = getDocumentSourceUrl();
  const isTextFile = Boolean(
    document?.filename.endsWith(".txt") || document?.filename.endsWith(".md")
  );

  // If text file, fetch and display text directly
  useEffect(() => {
    if (isOpen && isTextFile && resolvedUrl) {
      setIsLoading(true);
      setHasError(false);
      fetch(resolvedUrl)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.text();
        })
        .then((txt) => {
          setTextContent(txt);
          setIsLoading(false);
        })
        .catch(() => {
          setIsLoading(false);
          setHasError(true);
        });
    }
  }, [isOpen, isTextFile, resolvedUrl, retryKey]);

  // Keyboard navigation: Escape to close, arrows for pages
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowLeft") {
        setCurrentPage((prev) => Math.max(1, prev - 1));
      } else if (e.key === "ArrowRight") {
        if (document?.page_count) {
          setCurrentPage((prev) => Math.min(document.page_count, prev + 1));
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, document?.page_count]);

  if (!isOpen) return null;

  const totalPages = document?.page_count || 1;
  const pdfFrameUrl = resolvedUrl ? `${resolvedUrl}#page=${currentPage}` : null;

  const handleRetry = () => {
    setHasError(false);
    setIsLoading(true);
    setRetryKey((prev) => prev + 1);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-[2px] p-3 sm:p-4 select-none animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="doc-viewer-title"
    >
      <div
        className="relative flex flex-col bg-[#15181C] border border-[#2A2F35] rounded-[14px] shadow-2xl overflow-hidden w-full max-w-[1100px] h-[90vh] max-h-[850px]"
        style={{ width: "min(1100px, 92vw)", height: "min(850px, 90vh)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* SECTION 7: VIEWER HEADER */}
        <div className="h-[60px] px-5 border-b border-[#2A2F35] bg-[#171A1D] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-[8px] bg-[#1C2024] border border-[#2A2F35] flex items-center justify-center text-cri-orange shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2
                id="doc-viewer-title"
                className="text-sm sm:text-base font-bold text-cri-textPrimary font-sans truncate max-w-md sm:max-w-xl"
                title={document?.title || document?.filename || "Document Viewer"}
              >
                {document?.title || document?.filename || "Document Viewer"}
              </h2>
              <div className="flex items-center gap-2 text-[11px] text-cri-textSecondary">
                <span>
                  {totalPages} {totalPages === 1 ? "page" : "pages"} · {isTextFile ? "Text" : "PDF"}
                </span>
                {document?.created_at && (
                  <>
                    <span>·</span>
                    <span>{new Date(document.created_at).toLocaleDateString()}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {resolvedUrl && (
              <a
                href={resolvedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="h-8 px-2.5 rounded-[8px] bg-[#1C2024] hover:bg-[#22272D] border border-[#2A2F35] text-xs text-cri-textSecondary hover:text-cri-textPrimary flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Open original document in new window"
              >
                <ExternalLink className="w-3.5 h-3.5 text-cri-orange" />
                <span className="hidden sm:inline">Open</span>
              </a>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-[8px] bg-[#1C2024] hover:bg-[#22272D] border border-[#2A2F35] flex items-center justify-center text-cri-textMuted hover:text-cri-textPrimary transition-colors cursor-pointer"
              title="Close viewer (Esc)"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* SECTION 14: NO DOCUMENT STATE */}
        {!document ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3 bg-[#15181C]">
            <div className="w-10 h-10 rounded-[10px] bg-[#1C2024] border border-[#2A2F35] flex items-center justify-center text-cri-textMuted">
              <FileText className="w-5 h-5 text-cri-orange opacity-60" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-cri-textPrimary">No document selected</h3>
              <p className="text-xs text-cri-textSecondary max-w-xs mx-auto">
                Please select a source from the library first to inspect its contents.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="h-8 px-4 rounded-[8px] bg-[#1C2024] hover:bg-[#22272D] border border-[#2A2F35] text-xs font-semibold text-cri-textPrimary cursor-pointer transition-colors"
            >
              Close
            </button>
          </div>
        ) : hasError ? (
          /* SECTION 12: ERROR STATE (Graceful in-app error, no 404!) */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3 bg-[#15181C]">
            <div className="w-10 h-10 rounded-[10px] bg-[#1C2024] border border-[#2A2F35] flex items-center justify-center text-cri-orange">
              <AlertCircle className="w-5 h-5 text-cri-orange" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-cri-textPrimary">
                Unable to open this document
              </h3>
              <p className="text-xs text-cri-textSecondary max-w-sm mx-auto leading-relaxed">
                The document could not be loaded from the current source.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleRetry}
                className="h-8 px-3.5 rounded-[8px] bg-cri-orange hover:bg-cri-orange-hover text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Try again</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="h-8 px-3.5 rounded-[8px] bg-[#1C2024] hover:bg-[#22272D] border border-[#2A2F35] text-xs text-cri-textSecondary hover:text-cri-textPrimary cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          /* VIEWER BODY: PDF or TEXT */
          <div className="relative flex-1 w-full h-full overflow-hidden bg-[#101214]">
            {/* SECTION 13: LOADING STATE */}
            {isLoading && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#15181C] space-y-2">
                <Loader2 className="w-6 h-6 animate-spin text-cri-orange" />
                <p className="text-xs text-cri-textSecondary font-medium">Opening document...</p>
              </div>
            )}

            {isTextFile ? (
              <div className="w-full h-full overflow-y-auto p-6 text-xs font-mono text-cri-textPrimary leading-relaxed whitespace-pre-wrap selection:bg-cri-orange/30">
                {textContent}
              </div>
            ) : pdfFrameUrl ? (
              <iframe
                key={`${pdfFrameUrl}-${retryKey}`}
                src={pdfFrameUrl}
                className="w-full h-full border-none"
                title={document.title || document.filename}
                onLoad={() => setIsLoading(false)}
                onError={() => {
                  setIsLoading(false);
                  setHasError(true);
                }}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-2">
                <AlertCircle className="w-6 h-6 text-cri-orange" />
                <p className="text-xs text-cri-textSecondary">No file source available.</p>
              </div>
            )}
          </div>
        )}

        {/* SECTION 8: PAGE CONTROLS */}
        {document && !hasError && totalPages > 1 && (
          <div className="h-[48px] px-5 border-t border-[#2A2F35] bg-[#171A1D] flex items-center justify-between shrink-0 text-xs">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-[#1C2024] hover:bg-[#22272D] disabled:opacity-40 disabled:cursor-not-allowed border border-[#2A2F35] text-cri-textPrimary font-medium transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-cri-orange" />
              <span>Previous</span>
            </button>

            <div className="text-cri-textSecondary font-mono text-xs">
              Page <span className="text-cri-textPrimary font-semibold">{currentPage}</span> / {totalPages}
            </div>

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-[#1C2024] hover:bg-[#22272D] disabled:opacity-40 disabled:cursor-not-allowed border border-[#2A2F35] text-cri-textPrimary font-medium transition-colors cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5 text-cri-orange" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
