"use client";

import React from "react";
import { CheckCircle2, CircleDot, Clock, ShieldCheck } from "lucide-react";
import {
  TimelinePhase,
  PlaybackStage,
  STAGE_TO_TIMELINE_PHASE,
  PHASE_ORDER,
} from "@/lib/scenarios/scenarioTypes";

interface IncidentTimelinePanelProps {
  currentStage: PlaybackStage;
  targetSegmentId: string;
}

interface PhaseInfo {
  phase: TimelinePhase;
  title: string;
  description: string;
}

const PHASES: PhaseInfo[] = [
  {
    phase: "DETECT",
    title: "DETECT",
    description: "Incident detected on selected network segment via flow/occupancy sensors",
  },
  {
    phase: "ASSESS",
    title: "ASSESS",
    description: "Current network impact assessed; upstream queue length and capacity deficit measured",
  },
  {
    phase: "PREDICT",
    title: "PREDICT",
    description: "Potential downstream spillover evaluated via connected graph topology",
  },
  {
    phase: "RESPOND",
    title: "RESPOND",
    description: "Alternative connected corridor advisory generated avoiding congested link",
  },
  {
    phase: "MONITOR",
    title: "MONITOR",
    description: "Network response and corridor recovery continuously monitored by TMC",
  },
];

export function IncidentTimelinePanel({
  currentStage,
  targetSegmentId,
}: IncidentTimelinePanelProps) {
  const activePhase: TimelinePhase = STAGE_TO_TIMELINE_PHASE[currentStage] || "DETECT";
  const activeIndex: number = PHASE_ORDER[activePhase] ?? 0;

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 shadow-lg backdrop-blur-sm">
      <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" />
          <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
            Incident Timeline
          </h4>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-500/30">
          STAGE: {currentStage}
        </span>
      </div>

      <div className="space-y-3 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
        {PHASES.map((p, idx) => {
          const isPassed = activeIndex > idx;
          const isCurrent = activeIndex === idx;
          const isUpcoming = activeIndex < idx;

          return (
            <div key={p.phase} className="relative flex items-start gap-3 pl-1">
              <div className="relative z-10 flex items-center justify-center">
                {isPassed ? (
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                ) : isCurrent ? (
                  <div className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-cyan-300 animate-pulse">
                    <CircleDot className="w-3.5 h-3.5" />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-500 text-[10px] font-mono">
                    {idx + 1}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-bold tracking-wide ${
                      isCurrent
                        ? "text-cyan-300"
                        : isPassed
                        ? "text-emerald-300"
                        : "text-slate-500"
                    }`}
                  >
                    {isPassed ? `✓ ${p.title}` : isCurrent ? `● ${p.title}` : p.title}
                  </span>
                  {isCurrent && (
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                      ACTIVE
                    </span>
                  )}
                </div>
                <p
                  className={`text-[11px] leading-relaxed mt-0.5 ${
                    isCurrent
                      ? "text-slate-200"
                      : isPassed
                      ? "text-slate-400"
                      : "text-slate-600"
                  }`}
                >
                  {p.description.replace("selected network segment", targetSegmentId)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
        <span>LIFEROUTE Workflow: Detect → Assess → Predict → Respond → Monitor</span>
        <span className="text-cyan-400 font-mono">Real Graph Traversal</span>
      </div>
    </div>
  );
}
