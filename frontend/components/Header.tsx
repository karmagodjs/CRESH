"use client";

import React from "react";
import { DocumentResponse } from "@/lib/types";

interface HeaderProps {
  activeDocument: DocumentResponse | null;
}

export const Header: React.FC<HeaderProps> = () => {
  return (
    <header className="h-[60px] border-b border-[#292D32] bg-[#15171A] px-4 lg:px-6 grid grid-cols-3 items-center shrink-0 select-none z-30">
      {/* LEFT: Product Identity */}
      <div className="flex items-center min-w-0">
        <span className="text-[19px] font-bold tracking-tight text-cri-textPrimary font-sans">
          CRI Research
        </span>
      </div>

      {/* CENTER: Research (Primary navigation item) */}
      <div className="flex items-center justify-center">
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-[10px] bg-[#1C2024] border border-[#2A2F35] text-[13px] font-semibold text-cri-textPrimary shadow-xs">
          <span className="w-2 h-2 rounded-full bg-cri-orange shrink-0" />
          <span>Research</span>
        </div>
      </div>

      {/* RIGHT: Minimal clean termination */}
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-1.5 text-xs text-cri-textMuted font-mono">
          <span className="w-2 h-2 rounded-full bg-cri-success inline-block" />
          <span>Ready</span>
        </div>
      </div>
    </header>
  );
};

