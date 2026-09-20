"use client";

import React, { useEffect, useState } from "react";
import {
  Activity,
  Clock,
  Server,
  RefreshCw,
  Menu,
  Play,
  HelpCircle,
  Eye,
  Sliders,
  Database,
} from "lucide-react";
import { StatusBadge } from "../ui/StatusBadge";

interface HeaderProps {
  backendConnected: boolean;
  backendHealthStatus?: string;
  loading?: boolean;
  onRetry?: () => void;
  onMenuToggle?: () => void;
  onLaunchJuryDemo?: () => void;
  onOpenHelp?: () => void;
  juryMode?: boolean;
  onToggleJuryMode?: () => void;
}

export function Header({
  backendConnected,
  backendHealthStatus,
  loading = false,
  onRetry,
  onMenuToggle,
  onLaunchJuryDemo,
  onOpenHelp,
  juryMode = true,
  onToggleJuryMode,
}: HeaderProps) {
  const [timeString, setTimeString] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeString(
        now.toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-30 w-full h-16 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-3 sm:px-4 lg:px-6 flex items-center justify-between gap-2">
      {/* LEFT: Branding & Descriptor */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="w-9 h-9 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 lg:hidden transition-colors flex items-center justify-center shrink-0"
            aria-label="Toggle Navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-cyan-950/70 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.25)]">
            <Activity className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-bold font-sans tracking-wide text-slate-100">
                LIFE ROUTE
              </span>
              <span className="hidden sm:inline-block px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-cyan-950/70 border border-cyan-700/40 text-cyan-400">
                COMMAND CENTER
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans hidden md:block leading-tight">
              AI Urban Traffic Flow &amp; Incident Intelligence
            </p>
          </div>
        </div>
      </div>

      {/* CENTER: Jury Demo & Help Actions */}
      <div className="flex items-center gap-2">
        {/* START JURY DEMO button */}
        {onLaunchJuryDemo && (
          <button
            onClick={onLaunchJuryDemo}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-cyan-950 bg-gradient-to-r from-cyan-400 via-cyan-300 to-teal-300 hover:from-cyan-300 hover:to-teal-200 shadow-[0_0_14px_rgba(6,182,212,0.35)] transition-all cursor-pointer shrink-0"
            title="Launch step-by-step guided presentation demo"
          >
            <Play className="w-3.5 h-3.5 fill-cyan-950 text-cyan-950" />
            <span className="font-sans">START JURY DEMO</span>
          </button>
        )}

        {/* HOW IT WORKS button */}
        {onOpenHelp && (
          <button
            onClick={onOpenHelp}
            className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700/80 transition-colors cursor-pointer"
            title="View the 7-step decision-making workflow"
          >
            <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">How It Works</span>
          </button>
        )}

        {/* JURY MODE / OPERATOR MODE TOGGLE */}
        {onToggleJuryMode && (
          <button
            onClick={onToggleJuryMode}
            className={`hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border transition-all cursor-pointer ${
              juryMode
                ? "bg-cyan-950/60 text-cyan-300 border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.15)]"
                : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200"
            }`}
            title="Toggle between simplified Jury presentation and detailed Operator telemetry"
          >
            <Eye className="w-3 h-3" />
            <span>{juryMode ? "MODE: JURY (SIMPLIFIED)" : "MODE: OPERATOR (DETAILED)"}</span>
          </button>
        )}
      </div>

      {/* RIGHT: Backend status, data source & Clock */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Data Source Badge */}
        <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-[11px] font-mono text-slate-400">
          <Database className="w-3 h-3 text-emerald-400" />
          <span>ORGANIZER DATASET &bull; 120 NODES / 436 SEGS</span>
        </div>

        {/* Backend health status badge */}
        {loading ? (
          <StatusBadge status="connecting" label="PROBING API..." />
        ) : backendConnected ? (
          <StatusBadge status="online" label="SYSTEM ONLINE" />
        ) : (
          <div className="flex items-center gap-1.5">
            <StatusBadge status="offline" label="DISCONNECTED" />
            {onRetry && (
              <button
                onClick={onRetry}
                className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-mono text-rose-200 bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/60 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Retry
              </button>
            )}
          </div>
        )}

        {/* Local Clock */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-xs font-mono text-slate-300">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{timeString || "--:--:--"}</span>
        </div>
      </div>
    </header>
  );
}
