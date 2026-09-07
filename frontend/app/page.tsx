"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/Header";
import { SourcesPanel } from "@/components/SourcesPanel";
import { ResearchPanel } from "@/components/ResearchPanel";
import { EvidencePanel } from "@/components/EvidencePanel";
import { AddSourceModal } from "@/components/AddSourceModal";
import { fetchDocuments, executeQuery, getApiBaseUrl } from "@/lib/api";
import { DocumentResponse, QueryResponse } from "@/lib/types";
import { FileText, ShieldCheck, AlertTriangle } from "lucide-react";

export default function WorkspacePage() {
  const [documents, setDocuments] = useState<DocumentResponse[]>([]);
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);
  const [queryResponse, setQueryResponse] = useState<QueryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCitationIndex, setSelectedCitationIndex] = useState<number | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<"sources" | "research" | "evidence">("research");
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
    // On mobile screens, switch to evidence tab
    if (window.innerWidth < 1024) {
      setMobileTab("evidence");
    }
  };

  const handleDocumentUploaded = (newDoc: DocumentResponse) => {
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

      {/* Mobile Tab Switcher (Visible only on small screens) */}
      <div className="lg:hidden flex items-center border-b border-cri-border bg-cri-surface text-xs shrink-0">
        <button
          type="button"
          onClick={() => setMobileTab("sources")}
          className={`flex-1 py-2.5 text-center font-medium flex items-center justify-center gap-1.5 transition-colors ${
            mobileTab === "sources"
              ? "text-cri-textPrimary border-b-2 border-cri-orange bg-cri-surfaceElevated"
              : "text-cri-textSecondary hover:text-cri-textPrimary"
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Sources ({documents.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("research")}
          className={`flex-1 py-2.5 text-center font-medium flex items-center justify-center gap-1.5 transition-colors ${
            mobileTab === "research"
              ? "text-cri-textPrimary border-b-2 border-cri-orange bg-cri-surfaceElevated"
              : "text-cri-textSecondary hover:text-cri-textPrimary"
          }`}
        >
          <span>Research</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("evidence")}
          className={`flex-1 py-2.5 text-center font-medium flex items-center justify-center gap-1.5 transition-colors ${
            mobileTab === "evidence"
              ? "text-cri-textPrimary border-b-2 border-cri-orange bg-cri-surfaceElevated"
              : "text-cri-textSecondary hover:text-cri-textPrimary"
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Evidence</span>
          {queryResponse?.citations && queryResponse.citations.length > 0 && (
            <span className="w-1.5 h-1.5 rounded-full bg-cri-blue inline-block" />
          )}
        </button>
      </div>

      {/* PRIMARY RESEARCH WORKSPACE (3-COLUMN NOTEBOOKLM-STYLE) */}
      <div className="flex-1 overflow-hidden relative">
        <div className="h-full w-full overflow-hidden flex flex-col lg:grid lg:grid-cols-[minmax(280px,22%)_minmax(600px,1fr)_minmax(320px,24%)]">
          {/* LEFT COLUMN: Sources (22% width) */}
          <div
            className={`h-full min-w-0 overflow-hidden ${
              mobileTab === "sources" ? "block" : "hidden lg:block"
            }`}
          >
            <SourcesPanel
              documents={documents}
              activeDocumentId={activeDocumentId}
              onSelectDocument={(id) => {
                setActiveDocumentId(id);
                setQueryResponse(null);
                setSelectedCitationIndex(null);
                if (window.innerWidth < 1024) setMobileTab("research");
              }}
              onOpenUpload={() => setIsUploadOpen(true)}
              isDemoMode={Boolean(activeDoc?.filename.includes("1810.04805"))}
            />
          </div>

          {/* CENTER COLUMN: Research Workspace (54% width) */}
          <div
            className={`h-full min-w-0 overflow-hidden ${
              mobileTab === "research" ? "block" : "hidden lg:block"
            }`}
          >
            <ResearchPanel
              activeDocument={activeDoc}
              queryResponse={queryResponse}
              isLoading={isLoading}
              onRunQuery={handleRunQuery}
              onCitationClick={handleCitationClick}
              selectedCitationIndex={selectedCitationIndex}
            />
          </div>

          {/* RIGHT COLUMN: Evidence & Verification (24% width) */}
          <div
            className={`h-full min-w-0 overflow-hidden ${
              mobileTab === "evidence" ? "block" : "hidden lg:block"
            }`}
          >
            <EvidencePanel
              queryResponse={queryResponse}
              selectedCitationIndex={selectedCitationIndex}
              onSelectCitation={setSelectedCitationIndex}
              activeDocumentFilename={activeDoc?.filename}
            />
          </div>
        </div>
      </div>

      {/* Add Source Document Modal */}
      <AddSourceModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onDocumentUploaded={handleDocumentUploaded}
      />
    </div>
  );
}
