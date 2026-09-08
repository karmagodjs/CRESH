"use client";

import React from "react";
import { Header } from "@/components/Header";
import { ObservabilityView } from "@/components/ObservabilityView";

export default function ObservabilityPage() {
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-cri-bg text-cri-textPrimary font-sans">
      <Header activeView="observability" />
      <div className="flex-1 overflow-y-auto">
        <ObservabilityView />
      </div>
    </div>
  );
}
