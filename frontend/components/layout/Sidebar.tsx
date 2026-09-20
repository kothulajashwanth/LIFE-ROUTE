"use client";

import React from "react";
import { clsx } from "clsx";
import {
  LayoutDashboard,
  AlertTriangle,
  TrendingUp,
  GitBranch,
  Lightbulb,
  Sliders,
  Play,
  ShieldCheck,
  X,
  Compass,
} from "lucide-react";

export interface NavItem {
  id: string;
  step: string;
  label: string;
  question: string;
  icon: React.ElementType;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: "overview",
    step: "01",
    label: "OVERVIEW",
    question: "What's happening?",
    icon: LayoutDashboard,
  },
  {
    id: "incidents",
    step: "02",
    label: "INVESTIGATE",
    question: "Why is it happening?",
    icon: AlertTriangle,
  },
  {
    id: "forecast",
    step: "03",
    label: "FORECAST",
    question: "What happens next?",
    icon: TrendingUp,
  },
  {
    id: "propagation",
    step: "04",
    label: "IMPACT",
    question: "Where could it spread?",
    icon: GitBranch,
  },
  {
    id: "recommendations",
    step: "05",
    label: "RESPONSE",
    question: "What can we do?",
    icon: Lightbulb,
  },
  {
    id: "simulation",
    step: "06",
    label: "SIMULATE",
    question: "What happens if we do it?",
    icon: Sliders,
  },
  {
    id: "scenario-center",
    step: "07",
    label: "DEMO",
    question: "Run a complete scenario",
    icon: Play,
    badge: "GUIDED",
  },
];

interface SidebarProps {
  activeId?: string;
  onSelect?: (id: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({
  activeId = "overview",
  onSelect,
  isOpen = false,
  onClose,
}: SidebarProps) {
  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          aria-hidden="true"
        />
      )}

      <aside
        className={clsx(
          "fixed top-16 bottom-0 left-0 z-40 w-64 bg-slate-950/95 backdrop-blur-md border-r border-slate-800/90 flex flex-col justify-between transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:top-0 lg:bottom-auto lg:h-[calc(100vh-4rem)]",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Navigation list */}
        <div className="p-3 space-y-1.5 overflow-y-auto">
          <div className="px-3 py-2 flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800/80 mb-1">
            <div className="flex items-center gap-1.5 text-cyan-400">
              <Compass className="w-3.5 h-3.5" />
              <span>DECISION WORKFLOW</span>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 text-slate-400 hover:text-slate-100 lg:hidden"
                aria-label="Close Sidebar"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <nav className="space-y-1" aria-label="Command Center Navigation">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              // If activeId is "network", map it to "overview"
              const isItemActive =
                activeId === item.id ||
                (item.id === "overview" && activeId === "network") ||
                (item.id === "scenario-center" && activeId === "demo");

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelect?.(item.id);
                    onClose?.();
                  }}
                  className={clsx(
                    "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all group relative text-left cursor-pointer",
                    isItemActive
                      ? "bg-cyan-950/70 text-cyan-300 border border-cyan-500/40 shadow-[0_0_15px_rgba(0,217,255,0.18)]"
                      : "text-slate-400 hover:text-slate-100 hover:bg-slate-900/80 border border-transparent"
                  )}
                >
                  <span
                    className={clsx(
                      "font-mono text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0",
                      isItemActive
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                        : "bg-slate-900 text-slate-500 group-hover:text-slate-300 border border-slate-800"
                    )}
                  >
                    {item.step}
                  </span>

                  <Icon
                    className={clsx(
                      "w-4 h-4 transition-colors shrink-0",
                      isItemActive
                        ? "text-cyan-400"
                        : "text-slate-500 group-hover:text-slate-300"
                    )}
                  />

                  <div className="flex-1 flex flex-col min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="tracking-wide font-sans font-bold text-[11px] leading-tight text-slate-100">
                        {item.label}
                      </span>
                      {item.badge && (
                        <span className="text-[8px] font-mono font-semibold px-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-sans leading-tight truncate">
                      {item.question}
                    </span>
                  </div>

                  {isItemActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer: System intelligence badge */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/60">
          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>ORGANIZER GRAPH LOCKED</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">
              120 Nodes &bull; 436 Segments &bull; Real Telemetry
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
