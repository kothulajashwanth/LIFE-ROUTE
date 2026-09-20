"use client";

import React, { useEffect } from "react";
import {
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  X,
  Volume2,
  CheckCircle,
  ArrowRight,
  Layers,
} from "lucide-react";
import { JuryDemoStep, JURY_DEMO_STEPS } from "@/lib/scenarios/scenarioTypes";

interface JuryDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStepIndex: number;
  onGoToStep: (index: number) => void;
  onNextStep: () => void;
  onPrevStep: () => void;
  isPlayingAuto: boolean;
  onToggleAutoPlay: () => void;
  onReset: () => void;
}

export function JuryDemoModal({
  isOpen,
  onClose,
  currentStepIndex,
  onGoToStep,
  onNextStep,
  onPrevStep,
  isPlayingAuto,
  onToggleAutoPlay,
  onReset,
}: JuryDemoModalProps) {
  if (!isOpen) return null;

  const currentStep = JURY_DEMO_STEPS[currentStepIndex] || JURY_DEMO_STEPS[0];
  const total = JURY_DEMO_STEPS.length;
  const progressPct = ((currentStepIndex + 1) / total) * 100;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-xl w-[calc(100vw-2rem)] bg-slate-950/95 border-2 border-amber-500/80 rounded-2xl shadow-2xl backdrop-blur-xl text-slate-100 overflow-hidden ring-4 ring-amber-500/20 animate-in fade-in slide-in-from-bottom-6 duration-300">
      {/* Top Banner: Progress Bar */}
      <div className="h-1.5 w-full bg-slate-800">
        <div
          className="h-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Header */}
      <div className="p-3.5 sm:p-4 border-b border-slate-800/80 flex items-center justify-between bg-gradient-to-r from-amber-950/40 via-slate-900/60 to-slate-950/40">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/50 text-amber-300">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wide">
                Jury Demo Mode
              </h3>
              <span className="px-2 py-0.2 rounded-full text-[10px] font-mono font-bold bg-amber-400/10 text-amber-300 border border-amber-400/30">
                Step {currentStep.stepNumber} of {total}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Guided end-to-end simulation flow for hackathon evaluation
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors border border-slate-800"
          title="Close demo guide"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="p-3.5 sm:p-4 space-y-3">
        {/* Step Title & Target */}
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            {currentStep.stepTitle}
          </h4>
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-500/40">
              Corridor {currentStep.targetSegmentId}
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
              {currentStep.stage}
            </span>
          </div>
        </div>

        {/* Presenter Script / Narration Box */}
        <div className="p-3 rounded-xl bg-slate-900/90 border border-amber-500/30 relative">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1.5">
            <Volume2 className="w-3.5 h-3.5" />
            <span>Presenter Narration Script</span>
          </div>
          <p className="text-xs sm:text-[13px] leading-relaxed text-slate-200 font-medium italic">
            &ldquo;{currentStep.presenterNarration}&rdquo;
          </p>
        </div>

        {/* System Action Summary */}
        <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-950/80 border border-slate-800/80 text-[11px] text-cyan-300">
          <CheckCircle className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
          <span className="font-mono">{currentStep.systemActionSummary}</span>
        </div>

        {/* Step Indicator Pills (Scrollable) */}
        <div className="flex items-center gap-1 overflow-x-auto py-1 max-w-full">
          {JURY_DEMO_STEPS.map((step, idx) => (
            <button
              key={step.stepNumber}
              onClick={() => onGoToStep(idx)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold whitespace-nowrap transition-all border ${
                idx === currentStepIndex
                  ? "bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20"
                  : idx < currentStepIndex
                  ? "bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700"
                  : "bg-slate-950 text-slate-500 border-slate-800/80 hover:bg-slate-900"
              }`}
            >
              {step.stepNumber}
            </button>
          ))}
        </div>
      </div>

      {/* Footer Controls */}
      <div className="p-3 sm:p-4 border-t border-slate-800/80 bg-slate-900/60 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors"
            title="Reset to Step 1 & Normal Network"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <button
            onClick={onClose}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
            title="Exit Jury Demo Mode"
          >
            <X className="w-3.5 h-3.5" />
            <span>Exit Demo</span>
          </button>

          <button
            onClick={onToggleAutoPlay}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              isPlayingAuto
                ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
            }`}
            title="Toggle automatic step-by-step advance"
          >
            {isPlayingAuto ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Auto-Advance</span>
              </>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onPrevStep}
            disabled={currentStepIndex === 0}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              currentStepIndex === 0
                ? "bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed"
                : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
            }`}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>

          <button
            onClick={onNextStep}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20 transition-all transform active:scale-95"
          >
            <span>{currentStepIndex === total - 1 ? "Finish Demo" : "Next Step"}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
