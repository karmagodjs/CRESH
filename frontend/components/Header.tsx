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
    <header className="h-[60px] border-b border-cri-border bg-cri-surface/95 backdrop-blur-sm px-4 lg:px-6 grid grid-cols-3 items-center shrink-0 select-none z-30 transition-colors">
      {/* LEFT: Product Identity & Subtitle */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Refined Geometric Logo Mark (38px, 10px radius) */}
        <div className="w-[38px] h-[38px] rounded-[10px] bg-gradient-to-br from-cri-orange to-[#D4551E] flex items-center justify-center text-white font-bold text-base shadow-xs shrink-0">
          C
        </div>

        <div className="flex flex-col justify-center min-w-0">
          <div className="flex items-center gap-2 leading-none">
            <span className="text-lg font-bold tracking-tight text-cri-textPrimary font-sans">
              CRI
            </span>
            <span className="text-xs font-medium text-cri-textSecondary hidden sm:inline truncate">
              Cohere Research Intelligence
            </span>
          </div>
          <span className="text-[9px] uppercase tracking-widest text-cri-orange font-mono font-semibold leading-none mt-1">
            FRONTIER RESEARCH · REAL ANSWERS.
          </span>
        </div>
      </div>

      {/* CENTER: Research */}
      <div className="flex items-center justify-center">
        <span className="text-sm font-semibold tracking-wide text-cri-textPrimary font-sans">
          Research
        </span>
      </div>

      {/* RIGHT: Keep only useful controls */}
      <div className="flex items-center justify-end gap-2.5">
        {activeDocument ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-[9px] bg-cri-surfaceSecondary border border-cri-border text-xs text-cri-textSecondary max-w-[240px]">
            <FileText className="w-3.5 h-3.5 text-cri-orange shrink-0" />
            <span className="text-cri-textPrimary font-medium truncate" title={activeDocument.filename}>
              {activeDocument.filename}
            </span>
            <span className="text-[10px] font-mono text-cri-textMuted shrink-0">
              {activeDocument.page_count}p
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-cri-textMuted font-mono">
            <span className="w-2 h-2 rounded-full bg-cri-success inline-block" />
            <span>Ready</span>
          </div>
        )}
      </div>
    </header>
  );
};
