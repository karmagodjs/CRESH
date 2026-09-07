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
    <header className="h-[64px] border-b border-[#292D32] bg-[#15171A] px-4 lg:px-6 grid grid-cols-3 items-center shrink-0 select-none z-30">
      {/* LEFT: Product Identity & Subtitle */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Logo: 40x40px, 10px radius, orange */}
        <div className="w-[40px] h-[40px] rounded-[10px] bg-cri-orange flex items-center justify-center text-white font-bold text-lg shadow-xs shrink-0">
          C
        </div>

        <div className="flex flex-col justify-center min-w-0">
          <div className="flex items-baseline gap-2 leading-none">
            <span className="text-[20px] font-bold tracking-tight text-cri-textPrimary font-sans">
              CRI
            </span>
            <span className="text-[13px] font-medium text-cri-textSecondary hidden sm:inline truncate">
              Cohere Research Intelligence
            </span>
          </div>
          <span className="text-[9.5px] uppercase tracking-[0.14em] text-cri-orange font-mono font-semibold leading-none mt-1.5">
            FRONTIER RESEARCH · REAL ANSWERS.
          </span>
        </div>
      </div>

      {/* CENTER: Research (Primary navigation item, dark elevated surface, subtle orange indicator, 10px radius) */}
      <div className="flex items-center justify-center">
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-[10px] bg-[#1C2024] border border-[#2A2F35] text-[13px] font-semibold text-cri-textPrimary shadow-xs">
          <span className="w-2 h-2 rounded-full bg-cri-orange shrink-0" />
          <span>Research</span>
        </div>
      </div>

      {/* RIGHT: Ends cleanly without clutter */}
      <div className="flex items-center justify-end">
        {activeDocument ? (
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-[9px] bg-[#1C2024] border border-[#2A2F35] text-xs text-cri-textSecondary max-w-[240px]">
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
