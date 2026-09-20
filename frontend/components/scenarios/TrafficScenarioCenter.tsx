"use client";

import React from "react";
import {
  Play,
  Pause,
  RotateCcw,
  RefreshCw,
  Sparkles,
  Layers,
  Activity,
  AlertTriangle,
  Flame,
  ShieldAlert,
  Ambulance,
  Calendar,
  Construction,
  CheckCircle2,
  Clock,
} from "lucide-react";
import {
  ScenarioId,
  PlaybackStage,
  ScenarioOverlayState,
  ScenarioDefinition,
  PLAYBACK_STAGES,
  STAGE_TICKS,
} from "@/lib/scenarios/scenarioTypes";
import { SCENARIOS } from "@/lib/scenarios/scenarioEngine";

interface TrafficScenarioCenterProps {
  activeScenarioId: ScenarioId;
  onSelectScenario: (id: ScenarioId) => void;
  overlayState: ScenarioOverlayState;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onRestart: () => void;
  onReset: () => void;
  onStepStage: (stageIndex: number) => void;
  viewMode: "CURRENT" | "AFTER_RESPONSE";
  onToggleViewMode: (mode: "CURRENT" | "AFTER_RESPONSE") => void;
  onLaunchJuryDemo: () => void;
  scenarioDef?: ScenarioDefinition;
}

const SCENARIO_BUTTONS: Array<{
  id: ScenarioId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  badge: string;
}> = [
  {
    id: "NORMAL",
    label: "Normal Network",
    icon: Activity,
    color: "text-emerald-400 hover:border-emerald-500/50",
    badge: "LIVE BASELINE",
  },
  {
    id: "ACCIDENT",
    label: "Accident",
    icon: AlertTriangle,
    color: "text-rose-400 hover:border-rose-500/50",
    badge: "INCIDENT",
  },
  {
    id: "ROAD_CLOSURE",
    label: "Road Closure",
    icon: Construction,
    color: "text-amber-400 hover:border-amber-500/50",
    badge: "DETOUR",
  },
  {
    id: "LARGE_EVENT",
    label: "Large Event",
    icon: Calendar,
    color: "text-purple-400 hover:border-purple-500/50",
    badge: "SURGE",
  },
  {
    id: "EMERGENCY",
    label: "Emergency Vehicle",
    icon: Ambulance,
    color: "text-cyan-400 hover:border-cyan-500/50",
    badge: "PRIORITY",
  },
  {
    id: "SUDDEN_CONGESTION",
    label: "Sudden Congestion",
    icon: Flame,
    color: "text-orange-400 hover:border-orange-500/50",
    badge: "SPILLOVER",
  },
  {
    id: "RECURRING_BOTTLENECK",
    label: "Recurring Bottleneck",
    icon: ShieldAlert,
    color: "text-indigo-400 hover:border-indigo-500/50",
    badge: "PLANNING",
  },
];

const STAGE_JURY_EXPLANATION: Record<
  PlaybackStage,
  {
    whatIsHappening: string;
    whatSystemIsDoing: string;
    whatOperatorCanSee: string;
  }
> = {
  NORMAL: {
    whatIsHappening: "All 436 road segments operating at baseline velocity.",
    whatSystemIsDoing: "Continuously monitoring sensor telemetry against free-flow thresholds.",
    whatOperatorCanSee: "Green network indicators across all 120 organizer nodes.",
  },
  INCIDENT: {
    whatIsHappening: "A localized event has occurred on the target corridor.",
    whatSystemIsDoing: "Correlating incident logs and anomaly flags; flagging capacity deficit.",
    whatOperatorCanSee: "Target segment highlighted in red with incident classification badge.",
  },
  ASSESS: {
    whatIsHappening: "Vehicle discharge has dropped, forming an upstream queue.",
    whatSystemIsDoing: "Computing speed reduction and localized travel delay on the approach.",
    whatOperatorCanSee: "Immediate intersection approach highlighted; queue metrics active.",
  },
  CONGESTION: {
    whatIsHappening: "Corridor capacity utilization exceeds 100% of available road space.",
    whatSystemIsDoing: "Calculating severe breakdown risk and shockwave trajectory.",
    whatOperatorCanSee: "Approach corridor marked CONGESTED in orange with speed degradation.",
  },
  PROPAGATION: {
    whatIsHappening: "Traffic impact is threatening connected adjacent road corridors.",
    whatSystemIsDoing: "Traversing real graph connectivity to model spillback without synthetic roads.",
    whatOperatorCanSee: "Connected downstream segments flagged AT RISK in amber.",
  },
  RESPONSE: {
    whatIsHappening: "Controller advisory is active, guiding vehicles onto alternative corridors.",
    whatSystemIsDoing: "MCDA engine recommends signal adjustments and dynamic detour routing.",
    whatOperatorCanSee: "Recommended alternative detour corridor highlighted in emerald green.",
  },
  MONITORING: {
    whatIsHappening: "Network queue is actively dissipating following intervention.",
    whatSystemIsDoing: "Comparing post-intervention travel time against BPR baseline projection.",
    whatOperatorCanSee: "Amber risk indicators de-escalate back toward normal levels.",
  },
  RECOVERY: {
    whatIsHappening: "Target corridor has returned to free-flow baseline speed.",
    whatSystemIsDoing: "Confirming corridor clearance and closing incident dispatch lifecycle.",
    whatOperatorCanSee: "Network status returns to normal velocity across all segments.",
  },
};

export function TrafficScenarioCenter({
  activeScenarioId,
  onSelectScenario,
  overlayState,
  isPlaying,
  onTogglePlay,
  onRestart,
  onReset,
  onStepStage,
  viewMode,
  onToggleViewMode,
  onLaunchJuryDemo,
  scenarioDef: propScenarioDef,
}: TrafficScenarioCenterProps) {
  const scenarioDef = propScenarioDef || SCENARIOS[activeScenarioId];
  const isSimulated = activeScenarioId !== "NORMAL";

  return (
    <div id="scenario-center" className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-3 md:p-4 shadow-xl backdrop-blur-md scroll-mt-20">
      {/* Top Bar: Title, Simulation Tag, Jury Demo Trigger */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/70">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                Traffic Scenario Center
              </h3>
              {isSimulated ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                  SIMULATED · DEMO MODE
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  OBSERVED · LIVE BASELINE
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              Additive simulation on the 436 organizer network segments (R0001–R0436)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Primary Action: Start Jury Demo */}
          <button
            onClick={onLaunchJuryDemo}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-400 via-cyan-300 to-teal-300 hover:from-cyan-300 hover:to-teal-200 text-cyan-950 font-bold text-xs shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all transform active:scale-95 cursor-pointer"
            title="Launch step-by-step guided presentation demo"
          >
            <Sparkles className="w-4 h-4 fill-cyan-950 text-cyan-950" />
            <span className="font-sans">START JURY DEMO</span>
          </button>

          {/* Reset Scenario Button */}
          {isSimulated && (
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition-colors cursor-pointer"
              title="Remove simulation overlays and restore original network state"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Scenario</span>
            </button>
          )}
        </div>
      </div>

      {/* Scenario Selector Pills */}
      <div className="pt-3 pb-3">
        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
          <span>Select Scenario Overlay</span>
          <span className="text-[10px] text-slate-500">Real Graph Constraints · No Synthetic Roads</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5">
          {SCENARIO_BUTTONS.map((btn) => {
            const Icon = btn.icon;
            const isSelected = activeScenarioId === btn.id;
            return (
              <button
                key={btn.id}
                onClick={() => onSelectScenario(btn.id)}
                className={`flex flex-col items-start p-2 rounded-lg border text-left transition-all relative ${
                  isSelected
                    ? "bg-slate-800/90 border-cyan-400/80 shadow-md shadow-cyan-950/50 ring-1 ring-cyan-400/40"
                    : "bg-slate-950/40 border-slate-800/60 hover:bg-slate-800/50 text-slate-400"
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <Icon className={`w-3.5 h-3.5 ${isSelected ? "text-cyan-300" : btn.color.split(" ")[0]}`} />
                  <span
                    className={`text-[8px] font-semibold px-1 py-0.2 rounded ${
                      isSelected
                        ? "bg-cyan-500/20 text-cyan-300"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {btn.badge}
                  </span>
                </div>
                <div className={`text-xs font-semibold leading-tight ${isSelected ? "text-slate-100" : "text-slate-300"}`}>
                  {btn.label}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Target & Scenario Status Strip */}
      <div className="pt-2 pb-2 px-3 rounded-lg bg-slate-950/60 border border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            TARGET:
          </span>
          <span className="text-xs font-mono font-medium text-slate-200">
            {scenarioDef?.targetDescription ||
              (activeScenarioId === "NORMAL"
                ? "Full Network · 436 Real Organizer Segments (R0001–R0436)"
                : "Targeted Corridor")}
          </span>
        </div>

        <div className="flex items-center sm:justify-end gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            SCENARIO STATUS:
          </span>
          <div className="flex items-center gap-1.5">
            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                activeScenarioId === "NORMAL"
                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                  : overlayState.stageName === "RECOVERY"
                  ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
                  : isPlaying
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse"
                  : "bg-rose-500/15 text-rose-300 border-rose-500/30"
              }`}
            >
              {activeScenarioId === "NORMAL"
                ? "NORMAL"
                : overlayState.stageName === "RECOVERY"
                ? "RECOVERY"
                : isPlaying
                ? "ACTIVE"
                : "SIMULATED"}
            </span>

            {/* Data Provenance Badge */}
            <span
              className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                activeScenarioId === "NORMAL"
                  ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                  : activeScenarioId === "RECURRING_BOTTLENECK"
                  ? "bg-indigo-950 text-indigo-300 border-indigo-800"
                  : "bg-purple-950 text-purple-300 border-purple-800"
              }`}
              title="Data Provenance tag"
            >
              {activeScenarioId === "NORMAL"
                ? "OBSERVED"
                : activeScenarioId === "RECURRING_BOTTLENECK"
                ? "HISTORICAL"
                : "SIMULATED"}
            </span>
          </div>
        </div>
      </div>

      {/* Scenario Playback Controls & Before/After Toggle (Visible when scenario active) */}
      {isSimulated && (
        <div className="mt-2 pt-3 border-t border-slate-800/70 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Left: Playback Controls */}
          <div className="md:col-span-4 flex items-center gap-2">
            <button
              onClick={onTogglePlay}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isPlaying
                  ? "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20"
                  : "bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/20"
              }`}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>PAUSE</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>PLAY SCENARIO</span>
                </>
              )}
            </button>

            <button
              onClick={onRestart}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors"
              title="Restart from T+00"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Restart</span>
            </button>

            <div className="flex items-center gap-1 px-2 py-1 rounded bg-slate-950 border border-slate-800 text-[11px] font-mono text-cyan-300">
              <Clock className="w-3 h-3 text-cyan-400" />
              <span>{overlayState.tickLabel}</span>
            </div>
          </div>

          {/* Center: Stage Progression Chips */}
          <div className="md:col-span-5 flex items-center gap-1 overflow-x-auto py-1">
            {PLAYBACK_STAGES.map((item, idx) => {
              const isCurrent = overlayState.stageIndex === idx;
              const isPassed = overlayState.stageIndex > idx;
              const stageLabel = scenarioDef?.stageAliases?.[item.stage] || item.stage;
              return (
                <button
                  key={item.stage}
                  onClick={() => onStepStage(idx)}
                  className={`px-2 py-0.5 rounded text-[9px] font-mono whitespace-nowrap transition-all border ${
                    isCurrent
                      ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold"
                      : isPassed
                      ? "bg-slate-800/60 border-slate-700 text-slate-300"
                      : "bg-slate-950/30 border-slate-800/40 text-slate-500"
                  }`}
                  title={`${item.stage} (${item.tick}): ${stageLabel}`}
                >
                  {isPassed && "✓ "}
                  {isCurrent && "● "}
                  {stageLabel}
                </button>
              );
            })}
          </div>

          {/* Right: Before / After Network View Toggle */}
          <div className="md:col-span-3 flex justify-end">
            <div className="inline-flex rounded-lg bg-slate-950 p-0.5 border border-slate-800">
              <button
                onClick={() => onToggleViewMode("CURRENT")}
                className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all ${
                  viewMode === "CURRENT"
                    ? "bg-slate-800 text-slate-100 shadow border border-slate-700"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="Current network state before controller response"
              >
                CURRENT
              </button>
              <button
                onClick={() => onToggleViewMode("AFTER_RESPONSE")}
                className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all ${
                  viewMode === "AFTER_RESPONSE"
                    ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/50 shadow"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="Simulated network state after controller response/diversion"
              >
                SIMULATED RESPONSE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* JURY STEP EXPLANATION CARD (Requirement 16) */}
      {isSimulated && (
        <div className="mt-2.5 p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="space-y-1 p-2 rounded-lg bg-slate-900/50 border border-slate-800/50">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400 block">
              01 WHAT IS HAPPENING?
            </span>
            <p className="text-slate-200 font-medium leading-snug">
              {STAGE_JURY_EXPLANATION[overlayState.stageName]?.whatIsHappening ||
                "Corridor state updated."}
            </p>
          </div>
          <div className="space-y-1 p-2 rounded-lg bg-slate-900/50 border border-slate-800/50">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-400 block">
              02 WHAT THE SYSTEM IS DOING
            </span>
            <p className="text-slate-300 leading-snug">
              {STAGE_JURY_EXPLANATION[overlayState.stageName]?.whatSystemIsDoing ||
                "Processing graph telemetry."}
            </p>
          </div>
          <div className="space-y-1 p-2 rounded-lg bg-slate-900/50 border border-slate-800/50">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 block">
              03 WHAT THE OPERATOR CAN SEE
            </span>
            <p className="text-slate-300 leading-snug">
              {STAGE_JURY_EXPLANATION[overlayState.stageName]?.whatOperatorCanSee ||
                "Visual indicators updated on map."}
            </p>
          </div>
        </div>
      )}

      {/* Scenario-Specific Result (Visible when a scenario is selected) */}
      {isSimulated && scenarioDef?.specificResultTitle && (
        <div className="mt-3 p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
              Scenario Result:
            </span>
            <span className="text-xs font-semibold text-slate-200">
              {scenarioDef.specificResultTitle}
            </span>
            <span className="text-xs text-slate-400">
              — {scenarioDef.specificResultDetail}
            </span>
          </div>
          <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/50">
            {scenarioDef.specificResultProvenance || "SIMULATED"}
          </span>
        </div>
      )}
    </div>
  );
}
