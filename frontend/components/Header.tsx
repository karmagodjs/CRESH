"use client";

import React from "react";
import { DocumentResponse } from "@/lib/types";
import {
  Sliders,
  Search,
  Bell,
  ChevronDown,
  FileText,
} from "lucide-react";

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
    <header className="h-[60px] border-b border-cri-border bg-cri-surface/95 backdrop-blur-sm px-4 lg:px-6 flex items-center justify-between shrink-0 select-none z-30 transition-colors">
      {/* LEFT: Product Identity & Subtitle */}
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="flex items-center gap-3">
          {/* Hexagonal / Geometric Logo Mark */}
          <div className="w-8 h-8 rounded-[8px] bg-gradient-to-br from-cri-orange to-[#D4551E] flex items-center justify-center text-white font-bold text-sm shadow-sm ring-1 ring-white/10 shrink-0">
            C
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-bold tracking-tight text-cri-textPrimary font-sans">
                CRI
              </span>
              <span className="text-xs font-semibold text-cri-textSecondary hidden sm:inline">
                Cohere Research Intelligence
              </span>
            </div>
            <span className="text-[9px] uppercase tracking-widest text-cri-orange font-mono font-medium leading-none mt-0.5">
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

      {/* CENTER: Navigation Tabs */}
      <nav className="hidden md:flex items-center gap-1 bg-cri-surfaceSecondary/70 p-1 rounded-[10px] border border-cri-border/80" aria-label="Main Navigation">
        <button
          type="button"
          onClick={() => onSelectView("research")}
          className={`px-3 py-1.5 text-[13px] font-medium rounded-[8px] transition-all relative ${
            activeView === "research"
              ? "text-cri-textPrimary bg-cri-surfaceElevated border border-cri-border shadow-xs font-semibold"
              : "text-cri-textSecondary hover:text-cri-textPrimary hover:bg-cri-surfaceElevated/50"
          }`}
        >
          Research
          {activeView === "research" && (
            <span className="absolute -bottom-1 left-3 right-3 h-[2px] bg-cri-orange rounded-full" />
          )}
        </button>

        <button
          type="button"
          onClick={() => onSelectView("evaluation")}
          className={`px-3 py-1.5 text-[13px] font-medium rounded-[8px] transition-all relative ${
            activeView === "evaluation"
              ? "text-cri-textPrimary bg-cri-surfaceElevated border border-cri-border shadow-xs font-semibold"
              : "text-cri-textSecondary hover:text-cri-textPrimary hover:bg-cri-surfaceElevated/50"
          }`}
        >
          Evaluation
          {activeView === "evaluation" && (
            <span className="absolute -bottom-1 left-3 right-3 h-[2px] bg-cri-orange rounded-full" />
          )}
        </button>

        <button
          type="button"
          onClick={() => onSelectView("architecture")}
          className={`px-3 py-1.5 text-[13px] font-medium rounded-[8px] transition-all relative ${
            activeView === "architecture"
              ? "text-cri-textPrimary bg-cri-surfaceElevated border border-cri-border shadow-xs font-semibold"
              : "text-cri-textSecondary hover:text-cri-textPrimary hover:bg-cri-surfaceElevated/50"
          }`}
        >
          Architecture
          {activeView === "architecture" && (
            <span className="absolute -bottom-1 left-3 right-3 h-[2px] bg-cri-orange rounded-full" />
          )}
        </button>

        <button
          type="button"
          onClick={() => onSelectView("observability")}
          className={`px-3 py-1.5 text-[13px] font-medium rounded-[8px] transition-all relative ${
            activeView === "observability"
              ? "text-cri-textPrimary bg-cri-surfaceElevated border border-cri-border shadow-xs font-semibold"
              : "text-cri-textSecondary hover:text-cri-textPrimary hover:bg-cri-surfaceElevated/50"
          }`}
        >
          Observability
          {activeView === "observability" && (
            <span className="absolute -bottom-1 left-3 right-3 h-[2px] bg-cri-orange rounded-full" />
          )}
        </button>

        <button
          type="button"
          onClick={onOpenTrace}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-[8px] transition-all ${
            hasTrace
              ? "text-cri-textPrimary hover:bg-cri-surfaceElevated text-cri-orange"
              : "text-cri-textSecondary hover:text-cri-textPrimary hover:bg-cri-surfaceElevated/50"
          }`}
          title="Open Engineering Trace & Latency Breakdown"
        >
          <Sliders className="w-3.5 h-3.5 text-cri-orange" />
          <span>Trace</span>
          {hasTrace && (
            <span className="w-1.5 h-1.5 rounded-full bg-cri-orange inline-block animate-pulse" />
          )}
        </button>
      </nav>

      {/* RIGHT: Global Search, Notifications, User Profile */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Global Search with ⌘ K */}
        <button
          type="button"
          onClick={() => {
            const input = document.querySelector<HTMLInputElement>("input[placeholder*='Search']");
            input?.focus();
          }}
          className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-[9px] bg-cri-surfaceSecondary hover:bg-cri-surfaceElevated border border-cri-border text-xs text-cri-textSecondary transition-colors"
          title="Global Search (⌘ K)"
        >
          <Search className="w-3.5 h-3.5 text-cri-textMuted" />
          <span className="text-[12px] text-cri-textMuted">Search workspace...</span>
          <kbd className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-cri-textSecondary bg-cri-surfaceElevated border border-cri-border rounded-[6px]">
            <span>⌘</span>
            <span>K</span>
          </kbd>
        </button>

        {/* Notifications */}
        <button
          type="button"
          className="relative p-2 rounded-[8px] bg-cri-surfaceSecondary hover:bg-cri-surfaceElevated border border-cri-border text-cri-textSecondary hover:text-cri-textPrimary transition-colors"
          title="Notifications & System Events"
        >
          <Bell className="w-4 h-4 text-cri-textSecondary" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-cri-orange ring-2 ring-cri-surface" />
        </button>

        {/* User Profile Avatar with Chevron */}
        <div className="flex items-center gap-1.5 pl-1.5 py-1 pr-2 rounded-[9px] bg-cri-surfaceSecondary hover:bg-cri-surfaceElevated border border-cri-border cursor-pointer transition-colors group">
          <div className="w-6 h-6 rounded-[7px] bg-cri-orange/15 border border-cri-orange/40 flex items-center justify-center text-[11px] font-bold text-cri-orange">
            CR
          </div>
          <span className="text-xs font-medium text-cri-textPrimary hidden lg:inline">
            Researcher
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-cri-textMuted group-hover:text-cri-textPrimary transition-colors" />
        </div>
      </div>
    </header>
  );
};
