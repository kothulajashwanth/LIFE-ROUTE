import React from "react";
import { clsx } from "clsx";

export type StatusVariant =
  | "online"
  | "offline"
  | "warning"
  | "connecting"
  | "idle";

interface StatusBadgeProps {
  status: StatusVariant;
  label?: string;
  className?: string;
  pulse?: boolean;
}

export function StatusBadge({
  status,
  label,
  className,
  pulse = true,
}: StatusBadgeProps) {
  const configs: Record<
    StatusVariant,
    { dotBg: string; pingBg: string; text: string; defaultLabel: string }
  > = {
    online: {
      dotBg: "bg-emerald-500",
      pingBg: "bg-emerald-400",
      text: "text-emerald-400 border-emerald-500/30 bg-emerald-950/40",
      defaultLabel: "SYSTEM LIVE",
    },
    offline: {
      dotBg: "bg-rose-500",
      pingBg: "bg-rose-400",
      text: "text-rose-400 border-rose-500/30 bg-rose-950/40",
      defaultLabel: "OFFLINE",
    },
    warning: {
      dotBg: "bg-amber-500",
      pingBg: "bg-amber-400",
      text: "text-amber-400 border-amber-500/30 bg-amber-950/40",
      defaultLabel: "DEGRADED",
    },
    connecting: {
      dotBg: "bg-cyan-500",
      pingBg: "bg-cyan-400",
      text: "text-cyan-400 border-cyan-500/30 bg-cyan-950/40",
      defaultLabel: "CONNECTING",
    },
    idle: {
      dotBg: "bg-slate-500",
      pingBg: "bg-slate-400",
      text: "text-slate-400 border-slate-700 bg-slate-900/60",
      defaultLabel: "STANDBY",
    },
  };

  const config = configs[status];
  const displayLabel = label || config.defaultLabel;

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-mono font-medium border tracking-wider",
        config.text,
        className
      )}
    >
      <span className="relative flex h-2 w-2">
        {pulse && (
          <span
            className={clsx(
              "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
              config.pingBg
            )}
          />
        )}
        <span
          className={clsx(
            "relative inline-flex rounded-full h-2 w-2",
            config.dotBg
          )}
        />
      </span>
      <span>{displayLabel}</span>
    </span>
  );
}
