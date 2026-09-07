"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/Header";
import { SourcesPanel } from "@/components/SourcesPanel";
import { ResearchPanel } from "@/components/ResearchPanel";
import { EvidencePanel } from "@/components/EvidencePanel";
import { AddSourceModal } from "@/components/AddSourceModal";
import { DocumentViewer } from "@/components/DocumentViewer";
import { fetchDocuments, executeQuery, getApiBaseUrl } from "@/lib/api";
import { DocumentResponse, QueryResponse } from "@/lib/types";
import { AlertTriangle, FolderOpen, ShieldCheck, X, BookOpen } from "lucide-react";

export default function WorkspacePage() {
  const [documents, setDocuments] = useState<DocumentResponse[]>([]);
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);
  const [queryResponse, setQueryResponse] = useState<QueryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCitationIndex, setSelectedCitationIndex] = useState<number | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadTab, setUploadTab] = useState<"file" | "url">("file");
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewerPage, setViewerPage] = useState<number>(1);
  const [uploadedFileUrls, setUploadedFileUrls] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);

  const [isMobileSourcesOpen, setIsMobileSourcesOpen] = useState(false);
  const [isMobileEvidenceOpen, setIsMobileEvidenceOpen] = useState(false);

  const loadDocuments = useCallback(async () => {
    try {
      setApiError(null);
      const res = await fetchDocuments();
      setDocuments(res.documents || []);

      if (res.documents && res.documents.length > 0) {
        const bert = res.documents.find(
          (d) => d.filename.includes("1810.04805") || d.title.toLowerCase().includes("bert")
        );
        if (bert) {
          setActiveDocumentId(bert.document_id);
        } else {
          setActiveDocumentId(res.documents[0].document_id);
        }
      }
    } catch (err: any) {
      setApiError(
        `Backend connection failed. Could not reach backend at ${getApiBaseUrl()}. Please verify server status and CORS configuration.`
      );
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const activeDoc = documents.find((d) => d.document_id === activeDocumentId) || null;

  const handleRunQuery = async (question: string) => {
    if (!question.trim()) return;

    setIsLoading(true);
    setSelectedCitationIndex(null);
    setApiError(null);

    try {
      const response = await executeQuery({
        query: question,
        selected_document_ids: activeDocumentId ? [activeDocumentId] : [],
        top_k: 20,
        rerank_top_k: 5,
        enable_decomposition: true,
        enable_iterative: true,
      });

      setQueryResponse(response);

      if (response.citations && response.citations.length > 0) {
        setSelectedCitationIndex(1);
      }
    } catch (err: any) {
      setApiError(err.message || "Failed to execute research query.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCitationClick = (idx: number) => {
    setSelectedCitationIndex(idx);
    if (typeof window !== "undefined" && window.innerWidth < 1100) {
      setIsMobileEvidenceOpen(true);
    }
  };

  const handleViewDocument = () => {
    setViewerPage(1);
    setIsViewerOpen(true);
  };

  const handleOpenCitationDocument = (pageNumber: number) => {
    setViewerPage(pageNumber || 1);
    setIsViewerOpen(true);
  };

  const handleDocumentUploaded = (newDoc: DocumentResponse, file?: File) => {
    if (file) {
      const url = URL.createObjectURL(file);
      setUploadedFileUrls((prev) => ({
        ...prev,
        [newDoc.document_id]: url,
        [newDoc.filename]: url,
      }));
    }
    setDocuments((prev) => [newDoc, ...prev.filter((d) => d.document_id !== newDoc.document_id)]);
    setActiveDocumentId(newDoc.document_id);
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-cri-bg text-cri-textPrimary font-sans">
      <Header activeDocument={activeDoc} />

      {apiError && (
        <div className="px-4 py-2 bg-cri-surface border-b border-cri-orange/30 flex items-center justify-between text-xs text-cri-orange">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{apiError}</span>
          </div>
          <button
            type="button"
            onClick={() => loadDocuments()}
            className="underline font-semibold hover:text-white cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      )}

      <div className="flex-1 overflow-hidden p-2 sm:p-2.5 pt-2 bg-cri-bg flex flex-col">
        <div className="min-[1100px]:hidden flex items-center justify-between gap-2 pb-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsMobileSourcesOpen(true)}
            aria-label="Open Sources drawer"
            className="h-[44px] min-h-[44px] px-3.5 rounded-[10px] bg-cri-surface border border-cri-border hover:border-cri-orange flex items-center gap-2 text-xs font-semibold text-cri-textPrimary shadow-xs transition-colors cursor-pointer"
          >
            <FolderOpen className="w-4 h-4 text-cri-orange shrink-0" />
            <span>Sources</span>
            {documents.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-[6px] bg-cri-surfaceElevated text-[11px] font-mono text-cri-textSecondary border border-cri-border">
                {documents.length}
              </span>
            )}
          </button>

          <div className="flex items-center gap-2">
            {activeDoc && (
              <button
                type="button"
                onClick={handleViewDocument}
                className="h-[44px] min-h-[44px] px-3 rounded-[10px] bg-cri-surface border border-cri-border hover:border-cri-orange flex items-center gap-1.5 text-xs font-semibold text-cri-textPrimary transition-colors cursor-pointer"
                title="View document"
              >
                <BookOpen className="w-3.5 h-3.5 text-cri-orange shrink-0" />
                <span className="max-w-[110px] xs:max-w-[150px] truncate text-[11px]">
                  {activeDoc.title || activeDoc.filename}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsMobileEvidenceOpen(true)}
              aria-label="Open Evidence drawer"
              className="h-[44px] min-h-[44px] px-3.5 rounded-[10px] bg-cri-surface border border-cri-border hover:border-cri-orange flex items-center gap-2 text-xs font-semibold text-cri-textPrimary shadow-xs transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-cri-success shrink-0" />
              <span>Evidence</span>
              {queryResponse?.citations && queryResponse.citations.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-[6px] bg-cri-orange/15 text-cri-orange text-[11px] font-mono font-bold">
                  {queryResponse.citations.length}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="h-full w-full overflow-hidden flex flex-col min-[1100px]:grid min-[1100px]:grid-cols-[22%_minmax(0,1fr)_24%] gap-3">
          <div className="hidden min-[1100px]:block h-full min-w-0 overflow-hidden">
            <SourcesPanel
              documents={documents}
              activeDocumentId={activeDocumentId}
              onSelectDocument={(id) => {
                setActiveDocumentId(id);
                setQueryResponse(null);
                setSelectedCitationIndex(null);
              }}
              onOpenUpload={(tab = "file") => {
                setUploadTab(tab);
                setIsUploadOpen(true);
              }}
              isDemoMode={Boolean(activeDoc?.filename.includes("1810.04805"))}
            />
          </div>

          <div className="h-full min-w-0 overflow-hidden">
            <ResearchPanel
              activeDocument={activeDoc}
              queryResponse={queryResponse}
              isLoading={isLoading}
              onRunQuery={handleRunQuery}
              onCitationClick={handleCitationClick}
              selectedCitationIndex={selectedCitationIndex}
              onViewDocument={handleViewDocument}
              onOpenCitationDocument={handleOpenCitationDocument}
            />
          </div>

          <div className="hidden min-[1100px]:block h-full min-w-0 overflow-hidden">
            <EvidencePanel
              queryResponse={queryResponse}
              selectedCitationIndex={selectedCitationIndex}
              onSelectCitation={setSelectedCitationIndex}
              activeDocumentFilename={activeDoc?.filename}
              onOpenCitationDocument={handleOpenCitationDocument}
            />
          </div>
        </div>
      </div>

      {isMobileSourcesOpen && (
        <div
          className="fixed inset-0 z-50 flex bg-black/65 backdrop-blur-[2px] animate-in fade-in duration-200 min-[1100px]:hidden"
          onClick={() => setIsMobileSourcesOpen(false)}
        >
          <div
            className="w-[min(88vw,380px)] h-full bg-cri-surface border-r border-cri-border flex flex-col shadow-2xl animate-in slide-in-from-left duration-250"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-[56px] px-4 border-b border-cri-border flex items-center justify-between shrink-0 bg-cri-surface">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-cri-orange" />
                <span className="text-sm font-bold text-cri-textPrimary font-sans">Research Sources</span>
                <span className="text-[11px] font-mono px-1.5 py-0.5 rounded-[6px] bg-cri-surfaceElevated border border-cri-border text-cri-textSecondary">
                  {documents.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileSourcesOpen(false)}
                aria-label="Close"
                className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-[8px] bg-cri-surfaceElevated hover:bg-cri-surfaceSecondary border border-cri-border flex items-center justify-center text-cri-textMuted hover:text-cri-textPrimary transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <SourcesPanel
                documents={documents}
                activeDocumentId={activeDocumentId}
                onSelectDocument={(id) => {
                  setActiveDocumentId(id);
                  setQueryResponse(null);
                  setSelectedCitationIndex(null);
                  setIsMobileSourcesOpen(false);
                }}
                onOpenUpload={(tab = "file") => {
                  setUploadTab(tab);
                  setIsUploadOpen(true);
                  setIsMobileSourcesOpen(false);
                }}
                isDemoMode={Boolean(activeDoc?.filename.includes("1810.04805"))}
                className="border-0 rounded-none shadow-none"
              />
            </div>
          </div>
        </div>
      )}

      {isMobileEvidenceOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/65 backdrop-blur-[2px] animate-in fade-in duration-200 min-[1100px]:hidden"
          onClick={() => setIsMobileEvidenceOpen(false)}
        >
          <div
            className="w-[min(88vw,420px)] h-full bg-cri-surface border-l border-cri-border flex flex-col shadow-2xl animate-in slide-in-from-right duration-250"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-[56px] px-4 border-b border-cri-border flex items-center justify-between shrink-0 bg-cri-surface">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cri-success" />
                <span className="text-sm font-bold text-cri-textPrimary font-sans">Evidence & Citations</span>
                {queryResponse?.citations && queryResponse.citations.length > 0 && (
                  <span className="text-[11px] font-mono px-1.5 py-0.5 rounded-[6px] bg-cri-orange/15 text-cri-orange font-bold">
                    {queryResponse.citations.length}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsMobileEvidenceOpen(false)}
                aria-label="Close"
                className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-[8px] bg-cri-surfaceElevated hover:bg-cri-surfaceSecondary border border-cri-border flex items-center justify-center text-cri-textMuted hover:text-cri-textPrimary transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <EvidencePanel
                queryResponse={queryResponse}
                selectedCitationIndex={selectedCitationIndex}
                onSelectCitation={setSelectedCitationIndex}
                activeDocumentFilename={activeDoc?.filename}
                onOpenCitationDocument={(p) => {
                  handleOpenCitationDocument(p);
                  setIsMobileEvidenceOpen(false);
                }}
                className="border-0 rounded-none shadow-none"
              />
            </div>
          </div>
        </div>
      )}

      <AddSourceModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onDocumentUploaded={handleDocumentUploaded}
        initialTab={uploadTab}
      />

      <DocumentViewer
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        document={activeDoc}
        initialPage={viewerPage}
        fileUrl={
          activeDoc
            ? uploadedFileUrls[activeDoc.document_id] || uploadedFileUrls[activeDoc.filename]
            : null
        }
      />
    </div>
  );
}
