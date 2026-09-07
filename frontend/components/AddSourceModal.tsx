"use client";

import React, { useState, useRef } from "react";
import { uploadDocument } from "@/lib/api";
import { DocumentResponse } from "@/lib/types";
import { X, UploadCloud, FileText, AlertCircle, Loader2 } from "lucide-react";

interface AddSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDocumentUploaded: (doc: DocumentResponse) => void;
}

export const AddSourceModal: React.FC<AddSourceModalProps> = ({
  isOpen,
  onClose,
  onDocumentUploaded,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      onDocumentUploaded(uploadedDoc);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to upload and index document.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-[2px] p-4 select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-cri-surface border border-cri-border rounded-[14px] shadow-2xl p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-cri-border pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-[8px] bg-cri-surfaceSecondary border border-cri-border text-cri-orange">
              <UploadCloud className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-cri-textPrimary font-sans">Add Source Document</h2>
              <p className="text-[11px] text-cri-textMuted">PDF, TXT, or Markdown for isolated research indexing</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-cri-textMuted hover:text-cri-textPrimary p-1.5 rounded-[8px] hover:bg-cri-surfaceSecondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Upload Dropzone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-[12px] p-7 text-center cursor-pointer transition-colors ${
            isDragOver
              ? "border-cri-orange bg-cri-surfaceSecondary"
              : "border-cri-border hover:border-cri-borderLight bg-cri-surfaceSecondary/60"
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
                Drop your research paper here, or <span className="text-cri-orange font-semibold">browse</span>
              </p>
              <p className="text-[11px] text-cri-textMuted">
                Supported formats: PDF, Plain Text (.txt), Markdown (.md)
              </p>
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 text-xs text-cri-error bg-cri-surfaceSecondary p-3 rounded-[10px] border border-cri-error/40">
            <AlertCircle className="w-4 h-4 shrink-0 text-cri-error" />
            <span>{error}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-cri-border">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-[9px] text-xs font-medium text-cri-textSecondary hover:text-cri-textPrimary hover:bg-cri-surfaceSecondary border border-cri-border transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!file || isUploading}
            onClick={handleUpload}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-[9px] text-xs font-semibold transition-all ${
              !file || isUploading
                ? "bg-cri-surfaceSecondary text-cri-textMuted cursor-not-allowed border border-cri-border"
                : "bg-cri-orange hover:bg-cri-orange-hover text-white shadow-xs cursor-pointer"
            }`}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Indexing chunks...</span>
              </>
            ) : (
              <span>Add source</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
