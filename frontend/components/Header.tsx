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

  const navItems: { id: "research" | "evaluation" | "architecture" | "observability"; label: string }[] = [
    { id: "research", label: "Research" },
    { id: "evaluation", label: "Evaluation" },
    { id: "architecture", label: "Architecture" },
    { id: "observability", label: "Observability" },
  ];

  return (
    <header
      className="h-12 px-3 sm:px-5 bg-cri-headerBg border-b border-cri-border flex items-center justify-between shrink-0 select-none z-30 transition-colors duration-200"
      aria-label="Workspace Header"
    >
      <div className="flex items-center gap-5 min-w-0">
        <span className="text-[15px] font-semibold tracking-tight text-cri-textPrimary font-sans">
          CRI Research
        </span>

        {onSelectView && (
          <nav className="hidden md:flex items-center gap-1 text-xs" aria-label="Main Navigation">
            {navItems.map((item) => {
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectView(item.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    isActive
                      ? "text-cri-textPrimary bg-cri-surfaceElevated"
                      : "text-cri-textMuted hover:text-cri-textPrimary hover:bg-cri-surfaceHover"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        )}
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

