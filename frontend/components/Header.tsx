"use client";

import React from "react";
import { DocumentResponse } from "@/lib/types";
import { Activity, Cpu, FileText, Layers, ShieldCheck, Sliders } from "lucide-react";

interface HeaderProps {
  activeView: "research" | "evaluation" | "architecture" | "observability";
  onSelectView: (view: "research" | "evaluation" | "architecture" | "observability") => void;
  activeDocument: DocumentResponse | null;
  onOpenTrace: () => void;
  hasTrace: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  onSelectView,
  activeDocument,
  onOpenTrace,
  hasTrace,
}) => {
  return (
    <header className="h-14 border-b border-cri-border bg-cri-ink px-4 flex items-center justify-between shrink-0 select-none z-20">
      {/* LEFT: Product Identity */}
      <div className="flex items-center gap-3">
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold tracking-tight text-cri-paper font-sans">
            CRI
          </span>
          <span className="hidden sm:inline-block text-xs font-normal text-cri-textMuted tracking-normal border-l border-cri-border pl-2">
            Cohere Research Intelligence
          </span>
        </div>
      </div>

      {/* CENTER: Active Document / Notebook Identity */}
      <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded bg-cri-surface border border-cri-border max-w-md truncate">
        <FileText className="w-3.5 h-3.5 text-cri-orange shrink-0" />
        {activeDocument ? (
          <div className="flex items-center gap-2 text-xs truncate">
            <span className="font-medium text-cri-paper truncate">
              {activeDocument.filename}
            </span>
            <span className="text-cri-textMuted shrink-0">·</span>
            <span className="text-cri-textMuted shrink-0">
              {activeDocument.page_count} {activeDocument.page_count === 1 ? "page" : "pages"}
            </span>
            <span className="text-cri-textMuted shrink-0">·</span>
            <span className="text-cri-blue font-medium shrink-0 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cri-blue inline-block"></span>
              Indexed
            </span>
          </div>
        ) : (
          <span className="text-xs text-cri-textMuted italic">
            No document selected — Retrieval isolated
          </span>
        )}
      </div>

      {/* RIGHT: Secondary Actions & Trace */}
      <div className="flex items-center gap-1 sm:gap-2">
        <nav className="flex items-center gap-0.5 sm:gap-1" aria-label="Main Navigation">
          <button
            type="button"
            onClick={() => onSelectView("research")}
            className={`px-2.5 py-1.5 text-xs font-medium rounded transition-colors ${
              activeView === "research"
                ? "text-cri-paper bg-cri-surfaceActive border border-cri-borderLight font-semibold"
                : "text-cri-textMuted hover:text-cri-paper hover:bg-cri-surface"
            }`}
          >
            Research
          </button>
          <button
            type="button"
            onClick={() => onSelectView("evaluation")}
            className={`px-2.5 py-1.5 text-xs font-medium rounded transition-colors ${
              activeView === "evaluation"
                ? "text-cri-paper bg-cri-surfaceActive border border-cri-borderLight font-semibold"
                : "text-cri-textMuted hover:text-cri-paper hover:bg-cri-surface"
            }`}
          >
            Evaluation
          </button>
          <button
            type="button"
            onClick={() => onSelectView("architecture")}
            className={`px-2.5 py-1.5 text-xs font-medium rounded transition-colors ${
              activeView === "architecture"
                ? "text-cri-paper bg-cri-surfaceActive border border-cri-borderLight font-semibold"
                : "text-cri-textMuted hover:text-cri-paper hover:bg-cri-surface"
            }`}
          >
            Architecture
          </button>
          <button
            type="button"
            onClick={() => onSelectView("observability")}
            className={`px-2.5 py-1.5 text-xs font-medium rounded transition-colors ${
              activeView === "observability"
                ? "text-cri-paper bg-cri-surfaceActive border border-cri-borderLight font-semibold"
                : "text-cri-textMuted hover:text-cri-paper hover:bg-cri-surface"
            }`}
          >
            Observability
          </button>
        </nav>

        <div className="h-4 w-px bg-cri-border mx-1" />

        {/* Trace Button */}
        <button
          type="button"
          onClick={onOpenTrace}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded border transition-colors ${
            hasTrace
              ? "border-cri-borderLight text-cri-paper bg-cri-surface hover:bg-cri-surfaceActive hover:border-cri-orange"
              : "border-cri-border text-cri-textMuted hover:text-cri-paper hover:bg-cri-surface"
          }`}
          title="Open Engineering Trace & Latency Breakdown"
        >
          <Sliders className="w-3.5 h-3.5 text-cri-orange" />
          <span className="font-medium">Trace</span>
          {hasTrace && (
            <span className="w-1.5 h-1.5 rounded-full bg-cri-orange inline-block" />
          )}
        </button>
      </div>
    </header>
  );
};
