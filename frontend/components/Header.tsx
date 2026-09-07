"use client";

import React, { useState, useEffect } from "react";
import { DocumentResponse } from "@/lib/types";
import { Moon, Sun } from "lucide-react";

interface HeaderProps {
  activeDocument?: DocumentResponse | null;
  theme?: "dark" | "light";
  onToggleTheme?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  theme: propTheme,
  onToggleTheme: propToggleTheme,
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

  return (
    <header
      className="h-[64px] mx-[10px] mt-2 mb-0 px-5 rounded-[16px] bg-cri-headerBg border border-cri-border flex items-center justify-between shrink-0 select-none z-30 shadow-xs transition-colors duration-200"
      aria-label="Workspace Header"
    >
      {/* LEFT: Product Identity */}
      <div className="flex items-center min-w-0">
        <span className="text-[18px] sm:text-[19px] font-bold tracking-tight text-cri-textPrimary font-sans">
          CRI Research
        </span>
      </div>

      {/* CENTER: Research (Hidden on mobile <= 768px, visible on desktop) */}
      <div className="hidden md:flex items-center justify-center">
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-[10px] bg-cri-surfaceElevated border border-cri-border text-[13px] font-semibold text-cri-textPrimary shadow-xs">
          <span className="w-2 h-2 rounded-full bg-cri-orange shrink-0" />
          <span>Research</span>
        </div>
      </div>

      {/* RIGHT: Theme toggle only (44px touch target) */}
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={handleToggle}
          aria-label="Toggle theme"
          className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-[10px] bg-cri-surfaceElevated hover:bg-cri-surface border border-cri-border hover:border-cri-orange flex items-center justify-center text-cri-textPrimary transition-colors cursor-pointer shadow-xs"
          title={mounted && activeTheme === "dark" ? "Switch to Light theme" : "Switch to Dark theme"}
        >
          {mounted && activeTheme === "light" ? (
            <Sun className="w-4 h-4 text-cri-orange" />
          ) : (
            <Moon className="w-4 h-4 text-cri-orange" />
          )}
        </button>
      </div>
    </header>
  );
};

