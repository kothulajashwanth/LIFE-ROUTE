"use client";

import React from "react";
import {
  X,
  Activity,
  AlertTriangle,
  TrendingUp,
  GitBranch,
  Lightbulb,
  Sliders,
  ShieldCheck,
  ArrowRight,
  Sparkles,
} from "lucide-react";

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartDemo?: () => void;
}

const STEPS = [
  {
    num: "01",
    question: "WHAT'S HAPPENING?",
    title: "1. Detect & Measure",
    icon: Activity,
    color: "text-emerald-400 bg-emerald-950/60 border-emerald-500/40",
    summary: "Continuous speed and flow sensors monitor 436 organizer segments across 120 nodes.",
    detail: "Identifies queue spikes and speed breakdowns in real time against free-flow baselines.",
  },
  {
    num: "02",
    question: "WHY IS IT HAPPENING?",
    title: "2. Incident Evidence & Anomaly",
    icon: AlertTriangle,
    color: "text-rose-400 bg-rose-950/60 border-rose-500/40",
    summary: "Cross-references organizer incident evidence with detected traffic anomalies.",
    detail: "Distinguishes confirmed accidents and lane closures from pure recurring bottlenecks.",
  },
  {
    num: "03",
    question: "WHAT HAPPENS NEXT?",
    title: "3. Causal Forecaster (15–60 min)",
    icon: TrendingUp,
    color: "text-purple-400 bg-purple-950/60 border-purple-500/40",
    summary: "Direct Multi-Horizon Ridge Regression predicts traffic evolution across 4 horizons.",
    detail: "Computes 15m, 30m, 45m, and 60m future corridor speeds using 41 causal features.",
  },
  {
    num: "04",
    question: "WHERE COULD IT SPREAD?",
    title: "4. Topological Propagation",
    icon: GitBranch,
    color: "text-amber-400 bg-amber-950/60 border-amber-500/40",
    summary: "Traverses static organizer road connectivity to evaluate downstream spillback.",
    detail: "Highlights at-risk corridors and buffer margins before congestion locks arterial junctions.",
  },
  {
    num: "05",
    question: "WHAT CAN WE DO?",
    title: "5. AI Advisory (MCDA Engine)",
    icon: Lightbulb,
    color: "text-cyan-400 bg-cyan-950/60 border-cyan-500/40",
    summary: "Evaluates registered organizer planning candidates using Multi-Criteria Decision Analysis.",
    detail: "Scores tactical clearance, signal timing, and strategic detour interventions.",
  },
  {
    num: "06",
    question: "WHAT HAPPENS IF WE DO IT?",
    title: "6. Counterfactual What-If Simulation",
    icon: Sliders,
    color: "text-blue-400 bg-blue-950/60 border-blue-500/40",
    summary: "Tests interventions before field deployment using BPR travel times & queue dynamics.",
    detail: "Provides side-by-side comparison of baseline delay vs simulated intervention recovery.",
  },
  {
    num: "07",
    question: "RECOVERY & MONITORING",
    title: "7. Closed-Loop TMC Verification",
    icon: ShieldCheck,
    color: "text-teal-400 bg-teal-950/60 border-teal-500/40",
    summary: "Verifies network recovery back to normal operating velocity.",
    detail: "All data maintains strict provenance: OBSERVED (sensors), DERIVED (models), SIMULATED (what-if).",
  },
];

export function HowItWorksModal({
  isOpen,
  onClose,
  onStartDemo,
}: HowItWorksModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-100 uppercase tracking-wide">
                  How LIFE ROUTE Works
                </h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                  7-STEP DECISION WORKFLOW
                </span>
              </div>
              <p className="text-xs text-slate-400">
                From real sensor detection to validated what-if counterfactual simulation.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-xs text-cyan-200 leading-relaxed">
            <strong>The Core Mental Model:</strong> A first-time jury member doesn&apos;t need to understand complex algorithms first. LIFE ROUTE asks 6 simple questions in sequence: <em>What&apos;s happening? &rarr; Why is it happening? &rarr; What happens next? &rarr; Where could it spread? &rarr; What can we do? &rarr; What happens if we do it?</em>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.num}
                  className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-lg border flex items-center justify-center ${step.color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-mono font-bold text-slate-400">
                          {step.num}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                        {step.question}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-200">
                      {step.title}
                    </h4>
                    <p className="text-xs text-slate-300 leading-snug">
                      {step.summary}
                    </p>
                  </div>

                  <p className="text-[11px] text-slate-400 mt-2.5 pt-2.5 border-t border-slate-900">
                    {step.detail}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/90 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-400 font-mono">
            Integrity: 120 Nodes &bull; 436 Segments &bull; Zero Fabricated Interventions
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              Got it
            </button>
            {onStartDemo && (
              <button
                onClick={() => {
                  onClose();
                  onStartDemo();
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-cyan-950 bg-gradient-to-r from-cyan-400 to-cyan-300 hover:from-cyan-300 hover:to-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all cursor-pointer"
              >
                <span>Start Guided Jury Demo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
