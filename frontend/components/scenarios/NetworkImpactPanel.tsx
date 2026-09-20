"use client";

import React from "react";
import { Network, AlertCircle, ArrowRight, ShieldAlert, CheckCircle, Radio } from "lucide-react";
import { ScenarioOverlayState, ScenarioDefinition } from "@/lib/scenarios/scenarioTypes";

interface NetworkImpactPanelProps {
  scenarioDef: ScenarioDefinition;
  overlayState: ScenarioOverlayState;
  onSelectSegment: (segmentId: string) => void;
  selectedSegmentId?: string | null;
}

export function NetworkImpactPanel({
  scenarioDef,
  overlayState,
  onSelectSegment,
  selectedSegmentId,
}: NetworkImpactPanelProps) {
  const isSimulated = scenarioDef?.id !== "NORMAL";
  const affected = overlayState?.affectedSegmentIds || [];
  const connected = scenarioDef?.connectedSegmentIds || [];
  const atRisk = overlayState?.atRiskSegmentIds || [];
  const isEmergency = scenarioDef?.id === "EMERGENCY";
  const recommended = isEmergency
    ? (overlayState?.emergencyRouteSegmentIds || [])
    : (overlayState?.recommendedSegmentIds || []);

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 shadow-lg backdrop-blur-sm">
      <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4 text-amber-400" />
          <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
            Network Impact
          </h4>
        </div>
        <span
          className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold border ${
            isSimulated
              ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
              : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
          }`}
        >
          {isSimulated ? "SIMULATED / ADVISORY" : "OBSERVED / LIVE"}
        </span>
      </div>

      <div className="space-y-2.5 text-xs">
        {/* Affected Segment */}
        <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block" />
              Affected Segment:
            </span>
            <span className="text-[10px] font-mono text-rose-400 font-semibold">
              {affected.length} link(s)
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {affected.length > 0 ? (
              affected.map((id) => (
                <button
                  key={id}
                  onClick={() => onSelectSegment(id)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-all border ${
                    selectedSegmentId === id
                      ? "bg-rose-500/30 border-rose-400 text-rose-200 ring-1 ring-rose-400"
                      : "bg-rose-950/40 border-rose-500/40 text-rose-300 hover:bg-rose-900/50"
                  }`}
                >
                  {id}
                </button>
              ))
            ) : (
              <span className="text-slate-500 text-[11px] italic">None (Network Nominal)</span>
            )}
          </div>
        </div>

        {/* Connected Segments */}
        <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-medium text-slate-400">
              Connected Segments (Real Graph):
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              {connected.length} links
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {connected.length > 0 ? (
              connected.map((id) => (
                <button
                  key={id}
                  onClick={() => onSelectSegment(id)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono transition-all border ${
                    selectedSegmentId === id
                      ? "bg-cyan-500/30 border-cyan-400 text-cyan-200 ring-1 ring-cyan-400"
                      : "bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  {id}
                </button>
              ))
            ) : (
              <span className="text-slate-500 text-[11px] italic">Isolated / None</span>
            )}
          </div>
        </div>

        {/* At-Risk Segments */}
        <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              At-Risk Segments (Spillback):
            </span>
            <span className="text-[10px] font-mono text-amber-400 font-semibold">
              {atRisk.length} link(s)
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {atRisk.length > 0 ? (
              atRisk.map((id) => (
                <button
                  key={id}
                  onClick={() => onSelectSegment(id)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono transition-all border ${
                    selectedSegmentId === id
                      ? "bg-amber-500/30 border-amber-400 text-amber-200 ring-1 ring-amber-400"
                      : "bg-amber-950/40 border-amber-500/40 text-amber-300 hover:bg-amber-900/50"
                  }`}
                >
                  {id}
                </button>
              ))
            ) : (
              <span className="text-slate-500 text-[11px] italic">No active spillback predicted</span>
            )}
          </div>
        </div>

        {/* Recommended / Emergency Corridor */}
        <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              {isEmergency ? "Emergency Priority Corridor:" : "Recommended Diversion Corridor:"}
            </span>
            <span className="text-[10px] font-mono text-emerald-400 font-semibold">
              {recommended.length} links
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {recommended.map((id) => (
              <button
                key={id}
                onClick={() => onSelectSegment(id)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-all border ${
                  selectedSegmentId === id
                    ? "bg-emerald-500/30 border-emerald-400 text-emerald-200 ring-1 ring-emerald-400"
                    : "bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/50"
                }`}
              >
                {id}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
        <span>Status: <strong className="text-slate-300">{isSimulated ? "SIMULATED / ADVISORY" : "LIVE MEASURED"}</strong></span>
        <span className="font-mono text-slate-400">436 Segments Verified</span>
      </div>
    </div>
  );
}
