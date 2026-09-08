"use client";

import React from "react";
import { Header } from "@/components/Header";
import { ArchitectureView } from "@/components/ArchitectureView";

export default function ArchitecturePage() {
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-cri-bg text-cri-textPrimary font-sans">
      <Header activeView="architecture" />
      <div className="flex-1 overflow-y-auto">
        <ArchitectureView />
      </div>
    </div>
  );
}
