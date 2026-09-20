import React from "react";
import { clsx } from "clsx";
import { LucideIcon } from "lucide-react";
import { ProvenanceType } from "@/types/api";
import { ProvenanceBadge } from "./ProvenanceBadge";

interface MetricCardProps {
  title: string;
  icon: LucideIcon;
  value?: string | number | null;
  placeholder?: string;
  unit?: string;
  subtitle?: string;
  provenance?: ProvenanceType;
  accentColor?: "cyan" | "emerald" | "amber" | "rose" | "purple";
  className?: string;
  children?: React.ReactNode;
}

export function MetricCard({
  title,
  icon: Icon,
  value,
  placeholder = "Awaiting live data",
  unit,
  subtitle,
  provenance,
  accentColor = "cyan",
  className,
  children,
}: MetricCardProps) {
  const accentBorderColors = {
    cyan: "group-hover:border-cyan-500/40",
    emerald: "group-hover:border-emerald-500/40",
    amber: "group-hover:border-amber-500/40",
    rose: "group-hover:border-rose-500/40",
    purple: "group-hover:border-purple-500/40",
  };

  const accentIconColors = {
    cyan: "text-cyan-400 bg-cyan-950/40 border-cyan-500/20",
    emerald: "text-emerald-400 bg-emerald-950/40 border-emerald-500/20",
    amber: "text-amber-400 bg-amber-950/40 border-amber-500/20",
    rose: "text-rose-400 bg-rose-950/40 border-rose-500/20",
    purple: "text-purple-400 bg-purple-950/40 border-purple-500/20",
  };

  const hasRealData = value !== undefined && value !== null;

  return (
    <div
      className={clsx(
        "group relative rounded-xl bg-surface/70 backdrop-blur-md border border-surface-border p-4 transition-all duration-200 shadow-md",
        accentBorderColors[accentColor],
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <span className="text-xs font-sans font-medium uppercase tracking-wider text-text-secondary">
            {title}
          </span>
          {provenance && (
            <div className="pt-0.5">
              <ProvenanceBadge type={provenance} size="sm" />
            </div>
          )}
        </div>
        <div
          className={clsx(
            "p-2 rounded-lg border",
            accentIconColors[accentColor]
          )}
        >
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="mt-3">
        {hasRealData ? (
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-text-primary tracking-tight">
              {value}
            </span>
            {unit && <span className="text-xs font-sans text-text-secondary">{unit}</span>}
          </div>
        ) : (
          <div className="flex items-center gap-2 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-pulse" />
            <span className="text-xs font-sans text-text-muted italic">
              {placeholder}
            </span>
          </div>
        )}

        {subtitle && (
          <p className="text-xs font-sans text-text-muted mt-1 font-normal">{subtitle}</p>
        )}

        {children && <div className="mt-2">{children}</div>}
      </div>
    </div>
  );
}
