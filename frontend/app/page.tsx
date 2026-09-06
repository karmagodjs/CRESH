"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/Header";
import { SourcesPanel } from "@/components/SourcesPanel";
import { ResearchPanel } from "@/components/ResearchPanel";
import { EvidencePanel } from "@/components/EvidencePanel";
import { TraceDrawer } from "@/components/TraceDrawer";
import { AddSourceModal } from "@/components/AddSourceModal";
import { EvaluationView } from "@/components/EvaluationView";
import { ArchitectureView } from "@/components/ArchitectureView";
import { ObservabilityView } from "@/components/ObservabilityView";
import { fetchDocuments, executeQuery, getApiBaseUrl } from "@/lib/api";
import { DocumentResponse, QueryResponse } from "@/lib/types";
import { FileText, Layers, ShieldCheck, AlertTriangle } from "lucide-react";

export default function WorkspacePage() {
  const [activeView, setActiveView] = useState<"research" | "evaluation" | "architecture" | "observability">("research");
  const [documents, setDocuments] = useState<DocumentResponse[]>([]);
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);
  const [queryResponse, setQueryResponse] = useState<QueryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCitationIndex, setSelectedCitationIndex] = useState<number | null>(null);
  const [isTraceOpen, setIsTraceOpen] = useState(false);
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
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-cri-ink text-cri-paper">
      {/* Top Header */}
      <Header
        activeView={activeView}
        onSelectView={setActiveView}
        activeDocument={activeDoc}
        onOpenTrace={() => setIsTraceOpen(true)}
        hasTrace={Boolean(queryResponse?.total_latency_ms)}
      />

      {/* Backend Connection Error Banner */}
      {apiError && (
        <div className="px-4 py-2 bg-cri-surface border-b border-cri-orange flex items-center justify-between text-xs text-cri-orange">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{apiError}</span>
          </div>
          <button
            type="button"
            onClick={() => loadDocuments()}
            className="underline font-semibold hover:text-white"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Mobile Tab Switcher (Visible only on small screens) */}
      {activeView === "research" && (
        <div className="lg:hidden flex items-center border-b border-cri-border bg-cri-surface text-xs shrink-0">
          <button
            type="button"
            onClick={() => setMobileTab("sources")}
            className={`flex-1 py-2 text-center font-medium flex items-center justify-center gap-1.5 ${
              mobileTab === "sources"
                ? "text-cri-paper border-b-2 border-cri-orange bg-cri-surfaceActive"
                : "text-cri-textMuted hover:text-cri-paper"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Sources ({documents.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab("research")}
            className={`flex-1 py-2 text-center font-medium flex items-center justify-center gap-1.5 ${
              mobileTab === "research"
                ? "text-cri-paper border-b-2 border-cri-orange bg-cri-surfaceActive"
                : "text-cri-textMuted hover:text-cri-paper"
            }`}
          >
            <span>Research</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab("evidence")}
            className={`flex-1 py-2 text-center font-medium flex items-center justify-center gap-1.5 ${
              mobileTab === "evidence"
                ? "text-cri-paper border-b-2 border-cri-orange bg-cri-surfaceActive"
                : "text-cri-textMuted hover:text-cri-paper"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Evidence</span>
            {queryResponse?.citations && queryResponse.citations.length > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-cri-blue inline-block" />
            )}
          </button>
        </div>
      )}

      {/* Secondary Views or Main Workspace */}
      <div className="flex-1 overflow-hidden relative">
        {activeView === "evaluation" && <EvaluationView />}
        {activeView === "architecture" && <ArchitectureView />}
        {activeView === "observability" && <ObservabilityView />}

        {/* PRIMARY RESEARCH WORKSPACE (3-COLUMN NOTEBOOKLM-STYLE) */}
        {activeView === "research" && (
          <div className="h-full w-full flex overflow-hidden">
            {/* LEFT COLUMN: Sources (~20% width) */}
            <div
              className={`h-full w-full lg:w-[20%] min-w-[240px] max-w-[340px] shrink-0 ${
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

            {/* CENTER COLUMN: Research Workspace (~55% width) */}
            <div
              className={`h-full flex-1 min-w-0 ${
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

            {/* RIGHT COLUMN: Evidence & Verification (~25% width) */}
            <div
              className={`h-full w-full lg:w-[25%] min-w-[280px] max-w-[420px] shrink-0 ${
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
        )}
      </div>

      {/* Trace Side Drawer */}
      <TraceDrawer
        isOpen={isTraceOpen}
        onClose={() => setIsTraceOpen(false)}
        queryResponse={queryResponse}
      />

      {/* Add Source Document Modal */}
      <AddSourceModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onDocumentUploaded={handleDocumentUploaded}
      />
    </div>
  );
}
