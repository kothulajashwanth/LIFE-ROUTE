"use client";

import React from "react";
import { Terminal, Clock, ShieldAlert, CheckCircle, Info } from "lucide-react";
import { ActionLogEntry } from "@/lib/scenarios/scenarioTypes";

interface ControllerActionLogPanelProps {
  actionLogs: ActionLogEntry[];
  currentTick: string;
}

export function ControllerActionLogPanel({
  actionLogs,
  currentTick,
}: ControllerActionLogPanelProps) {
  const currentTickVal = parseInt(currentTick.replace("T+", ""), 10) || 0;

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 shadow-lg backdrop-blur-sm">
      <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
            Controller Action Log
          </h4>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
          SCENARIO-RELATIVE [T+00]
        </span>
      </div>

      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
        {actionLogs.map((log, idx) => {
          const logTickVal = parseInt(log.tick.replace("T+", ""), 10) || 0;
          const isTriggered = currentTickVal >= logTickVal;

          return (
            <div
              key={`${log.tick}-${idx}`}
              className={`p-2 rounded-lg border transition-all ${
                isTriggered
                  ? "bg-slate-950/70 border-slate-800 text-slate-200"
                  : "bg-slate-950/20 border-slate-900/50 text-slate-600 opacity-60"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                      isTriggered
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                        : "bg-slate-800 text-slate-500"
                    }`}
                  >
                    [{log.tick}]
                  </span>
                  <span
                    className={`text-xs font-semibold ${
                      isTriggered ? "text-slate-100" : "text-slate-500"
                    }`}
                  >
                    {log.action}
                  </span>
                </div>

                {isTriggered && (
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                )}
              </div>
              <p
                className={`text-[11px] leading-snug pl-1 mt-1 ${
                  isTriggered ? "text-slate-400" : "text-slate-600"
                }`}
              >
                {log.detail}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
        <span>Decision-Support Log (TMC Operations)</span>
        <span className="text-cyan-400 font-mono">Relative Timeline</span>
      </div>
    </div>
  );
}
