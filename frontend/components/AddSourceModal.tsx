"use client";

import React, { useState, useRef, useEffect } from "react";
import { uploadDocument } from "@/lib/api";
import { DocumentResponse } from "@/lib/types";
import {
  X,
  UploadCloud,
  FileText,
  AlertCircle,
  Loader2,
  Globe,
  ArrowRight,
} from "lucide-react";

interface AddSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDocumentUploaded: (doc: DocumentResponse, file?: File) => void;
  initialTab?: "file" | "url";
}

export const AddSourceModal: React.FC<AddSourceModalProps> = ({
  isOpen,
  onClose,
  onDocumentUploaded,
  initialTab = "file",
}) => {
  const [activeTab, setActiveTab] = useState<"file" | "url">(initialTab);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Web tab states
  const [webUrl, setWebUrl] = useState("");
  const [webUrlError, setWebUrlError] = useState<string | null>(null);
  const [isAddingWeb, setIsAddingWeb] = useState(false);
  const [webBackendMessage, setWebBackendMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setError(null);
      setWebUrlError(null);
      setWebBackendMessage(null);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      validateAndSetFile(selected);
    }
  };

  const validateAndSetFile = (f: File) => {
    const ext = f.name.substring(f.name.lastIndexOf(".")).toLowerCase();
    if (![".pdf", ".txt", ".md"].includes(ext)) {
      setError("Unsupported file format. Please upload .pdf, .txt, or .md files.");
      setFile(null);
      return;
    }
    setError(null);
    setFile(f);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setError(null);
    try {
      const uploadedDoc = await uploadDocument(file);
      onDocumentUploaded(uploadedDoc, file);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to upload and index document.");
    } finally {
      setIsUploading(false);
    }
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

    // As audited: FastAPI backend does not have a web scraper/URL ingestion route.
    // Per Section 7: show clear, honest message:
    setTimeout(() => {
      setIsAddingWeb(false);
      setWebBackendMessage(
        "Could not add this source. Web ingestion requires a backend URL connector (FastAPI endpoint not yet configured). Try another source or upload a paper."
      );
    }, 600);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-[2px] p-4 select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#171A1D] border border-[#2A2F35] rounded-[14px] shadow-2xl p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2A2F35] pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-[8px] bg-[#1C2024] border border-[#2A2F35] text-cri-orange">
              <UploadCloud className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-cri-textPrimary font-sans">
                Add Research Source
              </h2>
              <p className="text-[11px] text-cri-textMuted">
                Ground answers in research papers or web documents
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-cri-textMuted hover:text-cri-textPrimary p-1.5 rounded-[8px] hover:bg-[#1C2024] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher: [ Upload file | Add web URL ] */}
        <div className="grid grid-cols-2 gap-1 p-0.5 bg-[#1C2024] rounded-[8px] border border-[#2A2F35] text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("file")}
            className={`py-1.5 text-center font-semibold rounded-[6px] transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "file"
                ? "bg-[#171A1D] text-cri-textPrimary shadow-xs border border-[#2A2F35]"
                : "text-cri-textMuted hover:text-cri-textSecondary"
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-cri-orange" />
            <span>Upload file</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("url")}
            className={`py-1.5 text-center font-semibold rounded-[6px] transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "url"
                ? "bg-[#171A1D] text-cri-textPrimary shadow-xs border border-[#2A2F35]"
                : "text-cri-textMuted hover:text-cri-textSecondary"
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-[#58A6FF]" />
            <span>Add web URL</span>
          </button>
        </div>

        {/* Tab 1: File Upload */}
        {activeTab === "file" ? (
          <>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-[12px] p-7 text-center cursor-pointer transition-colors ${
                isDragOver
                  ? "border-cri-orange bg-[#1C2024]"
                  : "border-[#2A2F35] hover:border-[#3A4048] bg-[#15181C]"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.md"
                onChange={handleFileChange}
                className="hidden"
              />

              <FileText className="w-8 h-8 text-cri-textMuted mx-auto mb-2.5 opacity-60" />
              {file ? (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-cri-textPrimary">{file.name}</p>
                  <p className="text-[11px] text-cri-textMuted font-mono">
                    {(file.size / 1024).toFixed(1)} KB · Click or drag to change
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-cri-textPrimary">
                    Drop your research paper here, or{" "}
                    <span className="text-cri-orange font-semibold">browse</span>
                  </p>
                  <p className="text-[11px] text-cri-textMuted">
                    Supported formats: PDF, Plain Text (.txt), Markdown (.md)
                  </p>
                </div>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 text-xs text-cri-error bg-[#1C2024] p-3 rounded-[10px] border border-cri-error/40">
                <AlertCircle className="w-4 h-4 shrink-0 text-cri-error" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2A2F35]">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-[9px] text-xs font-medium text-cri-textSecondary hover:text-cri-textPrimary hover:bg-[#1C2024] border border-[#2A2F35] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!file || isUploading}
                onClick={handleUpload}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-[9px] text-xs font-semibold transition-all ${
                  !file || isUploading
                    ? "bg-[#1C2024] text-cri-textMuted cursor-not-allowed border border-[#2A2F35]"
                    : "bg-cri-orange hover:bg-cri-orange-hover text-white shadow-xs cursor-pointer"
                }`}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Indexing document...</span>
                  </>
                ) : (
                  <span>Add source</span>
                )}
              </button>
            </div>
          </>
        ) : (
          /* Tab 2: Web URL */
          <form onSubmit={handleAddWebUrl} className="space-y-4">
            <div className="p-4 rounded-[12px] bg-[#15181C] border border-[#2A2F35] space-y-3">
              <div className="space-y-1">
                <h3 className="text-xs font-semibold text-cri-textPrimary">
                  Add a web source
                </h3>
                <p className="text-[11px] text-cri-textSecondary leading-relaxed">
                  Index documentation, blog posts, or research pages for grounding.
                </p>
              </div>

              <div className="space-y-1.5">
                <input
                  type="url"
                  value={webUrl}
                  onChange={(e) => {
                    setWebUrl(e.target.value);
                    if (webUrlError) setWebUrlError(null);
                    if (webBackendMessage) setWebBackendMessage(null);
                  }}
                  placeholder="https://example.com/article"
                  className={`w-full h-[38px] bg-[#171A1D] border text-xs text-cri-textPrimary placeholder-cri-textMuted px-3 rounded-[8px] focus:outline-none transition-colors ${
                    webUrlError
                      ? "border-cri-error focus:border-cri-error"
                      : "border-[#2A2F35] focus:border-cri-orange"
                  }`}
                />

                {webUrlError && (
                  <p className="text-[11px] text-cri-error flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{webUrlError}</span>
                  </p>
                )}
              </div>

              {webBackendMessage && (
                <div className="p-3 rounded-[8px] bg-[#221815] border border-cri-orange/40 text-[11px] text-cri-textSecondary leading-relaxed flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-cri-orange shrink-0 mt-0.5" />
                  <span>{webBackendMessage}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2A2F35]">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-[9px] text-xs font-medium text-cri-textSecondary hover:text-cri-textPrimary hover:bg-[#1C2024] border border-[#2A2F35] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isAddingWeb || !webUrl.trim()}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-[9px] text-xs font-semibold transition-all ${
                  isAddingWeb || !webUrl.trim()
                    ? "bg-[#1C2024] text-cri-textMuted cursor-not-allowed border border-[#2A2F35]"
                    : "bg-cri-orange hover:bg-cri-orange-hover text-white shadow-xs cursor-pointer"
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
        )}
      </div>
    </div>
  );
};

