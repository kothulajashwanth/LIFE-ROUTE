import React from "react";
import { clsx } from "clsx";
import { ProvenanceType } from "@/types/api";

interface ProvenanceBadgeProps {
  type?: ProvenanceType | string;
  provenance?: ProvenanceType | string;
  className?: string;
  size?: "sm" | "default";
}

export function ProvenanceBadge({
  type,
  provenance,
  className,
  size = "default",
}: ProvenanceBadgeProps) {
  const styles: Record<ProvenanceType, { bg: string; text: string; border: string }> = {
    OBSERVED: {
      bg: "bg-emerald-950/40",
      text: "text-emerald-400",
      border: "border-emerald-700/40",
    },
    DERIVED: {
      bg: "bg-cyan-950/40",
      text: "text-cyan-400",
      border: "border-cyan-700/40",
    },
    SIMULATED: {
      bg: "bg-purple-950/40",
      text: "text-purple-400",
      border: "border-purple-700/40",
    },
  };

  const rawKey = ((type || provenance || "DERIVED") as string).toUpperCase();
  const validKey: ProvenanceType = rawKey in styles ? (rawKey as ProvenanceType) : "DERIVED";
  const current = styles[validKey];

  return (
    <span
      className={clsx(
        "inline-flex items-center rounded font-mono font-semibold tracking-wider uppercase border",
        size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs",
        current.bg,
        current.text,
        current.border,
        className
      )}
    >
      {validKey}
    </span>
  );
}
