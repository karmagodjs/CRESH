"use client";

import React, { useState, useEffect } from "react";
import { DocumentResponse } from "@/lib/types";
import { Moon, Sun } from "lucide-react";

interface HeaderProps {
  activeDocument?: DocumentResponse | null;
  theme?: "dark" | "light";
  onToggleTheme?: () => void;
  activeView?: "research" | "evaluation" | "architecture" | "observability";
  onSelectView?: (view: "research" | "evaluation" | "architecture" | "observability") => void;
}

export const Header: React.FC<HeaderProps> = ({
  theme: propTheme,
  onToggleTheme: propToggleTheme,
  activeView = "research",
  onSelectView,
}) => {
  const [currentTheme, setCurrentTheme] = useState<"dark" | "light">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("cri-theme") as "dark" | "light" | null;
    const initialTheme = saved || "dark";
    setCurrentTheme(initialTheme);
    document.documentElement.setAttribute("data-theme", initialTheme);
  }, []);

  const handleToggle = () => {
    if (propToggleTheme) {
      propToggleTheme();
      return;
    }
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    setCurrentTheme(nextTheme);
    localStorage.setItem("cri-theme", nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
  };

  const activeTheme = propTheme || currentTheme;

  const handleGoToResearch = (e: React.MouseEvent) => {
    if (onSelectView) {
      e.preventDefault();
      onSelectView("research");
    }
  };

  return (
    <header
      className="h-12 px-4 sm:px-6 bg-cri-headerBg border-b border-cri-border flex items-center justify-between shrink-0 select-none z-30 transition-colors duration-200"
      aria-label="Workspace Header"
    >
      <div className="flex items-center gap-6 min-w-0">
        <button
          type="button"
          onClick={handleGoToResearch}
          className="text-[15px] font-semibold tracking-tight text-cri-textPrimary font-sans hover:opacity-90 transition-opacity cursor-pointer bg-transparent border-none p-0"
        >
          CRI Research
        </button>

        <nav aria-label="Main Navigation">
          <button
            type="button"
            onClick={handleGoToResearch}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              activeView === "research"
                ? "text-cri-textPrimary bg-cri-surfaceElevated"
                : "text-cri-textMuted hover:text-cri-textPrimary hover:bg-cri-surfaceHover"
            }`}
          >
            Research
          </button>
        </nav>
      </div>

      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={handleToggle}
          aria-label="Toggle theme"
          className="h-8 w-8 rounded-md flex items-center justify-center text-cri-textSecondary hover:text-cri-textPrimary hover:bg-cri-surfaceHover transition-colors cursor-pointer"
          title={mounted && activeTheme === "dark" ? "Switch to Light theme" : "Switch to Dark theme"}
        >
          {mounted && activeTheme === "light" ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </button>
      </div>
    </header>
  );
};

