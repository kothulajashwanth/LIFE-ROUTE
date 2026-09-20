"use client";

import React from "react";
import { HelpCircle, ShieldCheck, Sparkles, CheckCircle2, Info } from "lucide-react";

interface ExplainableAIPanelProps {
  whyExplanation: string[];
  scenarioTitle: string;
  isSimulated?: boolean;
}

export function ExplainableAIPanel({
  whyExplanation,
  scenarioTitle,
  isSimulated = true,
}: ExplainableAIPanelProps) {
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 shadow-lg backdrop-blur-sm">
      <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-emerald-400" />
          <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
            Why This Recommendation?
          </h4>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-semibold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            DECISION SUPPORT
          </span>
          <span className="text-[9px] font-semibold px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
            ADVISORY
          </span>
          {isSimulated && (
            <span className="text-[9px] font-semibold px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30">
              SIMULATION
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {whyExplanation.map((reason, idx) => (
          <div key={idx} className="flex items-start gap-2 text-xs leading-relaxed text-slate-300">
            <span className="text-emerald-400 mt-1 flex-shrink-0">•</span>
            <span>{reason}</span>
          </div>
        ))}
      </div>

      <div className="mt-3.5 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
        <span className="flex items-center gap-1">
          <Info className="w-3 h-3 text-slate-400" />
          Factual decision-support reasoning based on network topology
        </span>
        <span className="text-emerald-400 font-mono">Real Graph Grounded</span>
      </div>
    </div>
  );
}
