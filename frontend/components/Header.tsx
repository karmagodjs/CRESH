"use client";

import React from "react";
import { DocumentResponse } from "@/lib/types";
import { FileText } from "lucide-react";

interface HeaderProps {
  activeDocument: DocumentResponse | null;
}

export const Header: React.FC<HeaderProps> = ({
  activeDocument,
}) => {
  return (
    <header className="h-[60px] border-b border-cri-border bg-cri-surface/95 backdrop-blur-sm px-4 lg:px-6 flex items-center justify-between shrink-0 select-none z-30 transition-colors">
      {/* LEFT: Product Identity & Subtitle */}
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="flex items-center gap-3">
          {/* Refined Geometric Logo Mark (38px, 10px radius) */}
          <div className="w-[38px] h-[38px] rounded-[10px] bg-gradient-to-br from-cri-orange to-[#D4551E] flex items-center justify-center text-white font-bold text-base shadow-xs shrink-0">
            C
          </div>

          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-2 leading-none">
              <span className="text-lg font-bold tracking-tight text-cri-textPrimary font-sans">
                CRI
              </span>
              <span className="text-xs font-medium text-cri-textSecondary hidden sm:inline">
                Cohere Research Intelligence
              </span>
            </div>
            <span className="text-[9px] uppercase tracking-widest text-cri-orange font-mono font-medium leading-none mt-1">
              FRONTIER RESEARCH · REAL ANSWERS.
            </span>
          </div>
        </div>

        {/* Scoped Document Indicator */}
        {activeDocument && (
          <div className="hidden xl:flex items-center gap-2 pl-3 ml-2 border-l border-cri-border text-xs text-cri-textSecondary truncate max-w-xs">
            <FileText className="w-3.5 h-3.5 text-cri-orange shrink-0" />
            <span className="text-cri-textPrimary font-medium truncate" title={activeDocument.filename}>
              {activeDocument.filename}
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-[6px] bg-cri-surfaceSecondary text-cri-textMuted border border-cri-border">
              {activeDocument.page_count}p
            </span>
          </div>
        )}
      </div>

      {/* RIGHT: Focused Research Workspace Badge */}
      <nav className="flex items-center" aria-label="Main Navigation">
        <div className="flex items-center gap-2 px-3.5 py-1.5 bg-cri-surfaceElevated border border-cri-border rounded-[9px] text-[13px] font-semibold text-cri-textPrimary shadow-xs">
          <span className="w-2 h-2 rounded-full bg-cri-orange" />
          <span>Research</span>
        </div>
      </nav>
    </header>
  );
};
