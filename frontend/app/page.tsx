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
import { AlertTriangle } from "lucide-react";

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

  // Load documents on mount
  const loadDocuments = useCallback(async () => {
    try {
      setApiError(null);
      const res = await fetchDocuments();
      setDocuments(res.documents || []);

      // If BERT document exists and no document is selected, auto-select it for demo experience
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

  // Run research query through FastAPI backend
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

      // Default to citation 1 if citations exist and query is grounded
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
      {/* Top Header */}
      <Header activeDocument={activeDoc} />

      {/* Backend Connection Error Banner */}
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

      {/* PRIMARY RESEARCH WORKSPACE: 3 LARGE NOTEBOOK-STYLE BOXES */}
      <div className="flex-1 overflow-hidden p-3 pt-2 bg-[#101214]">
        <div className="h-full w-full overflow-hidden flex flex-col lg:grid lg:grid-cols-[22%_minmax(0,1fr)_24%] gap-3">
          {/* BOX 1: Sources (22% width) */}
          <div className="h-full min-w-0 overflow-hidden">
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

          {/* BOX 2: Research Workspace (54% width) */}
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

          {/* BOX 3: Evidence & Verification (24% width) */}
          <div className="h-full min-w-0 overflow-hidden">
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

      {/* Add Source Document Modal */}
      <AddSourceModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onDocumentUploaded={handleDocumentUploaded}
        initialTab={uploadTab}
      />

      {/* CRI Document Viewer Modal */}
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
