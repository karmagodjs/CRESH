"use client";

import React from "react";
import { Header } from "@/components/Header";
import { EvaluationView } from "@/components/EvaluationView";

export default function EvaluationPage() {
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-cri-bg text-cri-textPrimary font-sans">
      <Header activeView="evaluation" />
      <div className="flex-1 overflow-y-auto">
        <EvaluationView />
      </div>
    </div>
  );
}
