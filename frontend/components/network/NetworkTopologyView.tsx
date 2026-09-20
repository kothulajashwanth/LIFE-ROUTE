"use client";

import React, { useState, useMemo } from "react";
import {
  Activity,
  AlertTriangle,
  Clock,
  Layers,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  X,
  Radio,
  SlidersHorizontal,
  Info,
} from "lucide-react";
import { TrafficRecord, CongestionState } from "@/types/traffic";
import { ProvenanceBadge } from "../ui/ProvenanceBadge";

interface NetworkTopologyViewProps {
  records: TrafficRecord[];
  totalRecords: number;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  offset: number;
  limit: number;
  onPageChange: (newOffset: number) => void;
  congestionFilter?: string;
  onFilterChange: (state?: string) => void;
  selectedSegmentId?: string | null;
  onSelectSegment: (segmentId: string | null) => void;
}

// 12x10 Organizer Topology Node Coordinate Calculator
function getNodeCoordinates(nodeId?: string | null): { x: number; y: number } {
  if (!nodeId) return { x: 0, y: 0 };
  const num = parseInt(nodeId.replace(/\D/g, ""), 10);
  if (isNaN(num) || num < 1 || num > 120) return { x: 0, y: 0 };

  const col = (num - 1) % 12; // 0..11
  const row = Math.floor((num - 1) / 12); // 0..9

  // ViewBox: 0 0 960 520
  // Margins: x: 50..910, y: 40..480
  const x = 50 + col * (860 / 11);
  const y = 40 + row * (440 / 9);
  return { x, y };
}

// Congestion state color map
const STATE_COLORS: Record<string, { stroke: string; bg: string; text: string }> = {
  NORMAL: {
    stroke: "#10B981",
    bg: "bg-emerald-950/50 border-emerald-500/30 text-emerald-400",
    text: "text-emerald-400",
  },
  WATCH: {
    stroke: "#F59E0B",
    bg: "bg-amber-950/50 border-amber-500/30 text-amber-400",
    text: "text-amber-400",
  },
  CONGESTED: {
    stroke: "#F97316",
    bg: "bg-orange-950/50 border-orange-500/30 text-orange-400",
    text: "text-orange-400",
  },
  SEVERE: {
    stroke: "#EF4444",
    bg: "bg-rose-950/50 border-rose-500/30 text-rose-400",
    text: "text-rose-400",
  },
};

export function NetworkTopologyView({
  records,
  totalRecords,
  loading = false,
  error,
  onRetry,
  offset,
  limit,
  onPageChange,
  congestionFilter,
  onFilterChange,
  selectedSegmentId,
  onSelectSegment,
}: NetworkTopologyViewProps) {
  const [hoveredSegment, setHoveredSegment] = useState<TrafficRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Selected traffic record
  const activeRecord = useMemo(() => {
    return (
      records.find((r) => r.segment_id === selectedSegmentId) ||
      (hoveredSegment ? hoveredSegment : null)
    );
  }, [records, selectedSegmentId, hoveredSegment]);

  // All 120 static topology nodes
  const allNodes = useMemo(() => {
    const nodes = [];
    for (let i = 1; i <= 120; i++) {
      const id = `N${String(i).padStart(3, "0")}`;
      nodes.push({ id, ...getNodeCoordinates(id) });
    }
    return nodes;
  }, []);

  // Filter records by search
  const displayedRecords = useMemo(() => {
    if (!searchTerm.trim()) return records;
    const term = searchTerm.trim().toUpperCase();
    return records.filter(
      (r) =>
        r.segment_id.toUpperCase().includes(term) ||
        r.source_node?.toUpperCase().includes(term) ||
        r.target_node?.toUpperCase().includes(term)
    );
  }, [records, searchTerm]);

  // Pagination bounds
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(totalRecords / limit) || 1;

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* ================================================== */}
      {/* 1. TOPOLOGY SUBHEADER & CONTROLS                   */}
      {/* ================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-surface-border/80">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase bg-cyan-950/60 border border-cyan-500/30 text-cyan-300">
            <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
            NETWORK TOPOLOGY
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-700/40">
            LIVE TRAFFIC DATA
          </span>
          <ProvenanceBadge type="DERIVED" size="sm" />
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 text-[10px] font-mono font-medium text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            NORMAL
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            WATCH
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-orange-400" />
            CONGESTED
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            SEVERE
          </span>
        </div>
      </div>

      {/* ================================================== */}
      {/* 2. FILTER & PAGINATION BAR                         */}
      {/* ================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        {/* Congestion State Filter Chips */}
        <div className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-lg border border-slate-800">
          <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500 ml-1.5 mr-1" />
          {(["ALL", "NORMAL", "WATCH", "CONGESTED", "SEVERE"] as const).map(
            (state) => {
              const active =
                (!congestionFilter && state === "ALL") ||
                congestionFilter === state;
              return (
                <button
                  key={state}
                  onClick={() =>
                    onFilterChange(state === "ALL" ? undefined : state)
                  }
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                    active
                      ? "bg-cyan-950 text-cyan-300 border border-cyan-500/40 shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                  }`}
                >
                  {state}
                </button>
              );
            }
          )}
        </div>

        {/* Search Input & Pagination */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search segment..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 w-36 sm:w-44"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Record Count Badge */}
          <span className="text-[11px] text-slate-400 hidden md:inline-block">
            Showing {records.length} of {totalRecords} records (Network: 436 seg • 120 nodes)
          </span>

          {/* Pagination Controls */}
          <div className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => onPageChange(Math.max(0, offset - limit))}
              disabled={offset <= 0 || loading}
              className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
              title="Previous Page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-1 text-[11px] text-slate-300">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => onPageChange(offset + limit)}
              disabled={offset + limit >= totalRecords || loading}
              className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
              title="Next Page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ================================================== */}
      {/* 3. MAIN TOPOLOGY VIEWPORT                          */}
      {/* ================================================== */}
      <div className="relative w-full rounded-xl border border-surface-border bg-slate-950/90 overflow-hidden flex-1 min-h-[360px] flex flex-col items-center justify-center shadow-inner">
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 bg-grid opacity-75 pointer-events-none" />

        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 z-30 bg-slate-950/75 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin" />
            <span className="text-xs font-mono font-semibold text-cyan-300">
              Loading network intelligence...
            </span>
          </div>
        )}

        {/* Error Overlay */}
        {error && !loading && (
          <div className="absolute inset-0 z-30 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 p-6 text-center">
            <AlertTriangle className="w-7 h-7 text-rose-400" />
            <div className="space-y-1">
              <div className="text-sm font-mono font-bold text-rose-300">
                Network intelligence unavailable
              </div>
              <p className="text-xs text-rose-400/80 max-w-sm">{error}</p>
            </div>
            {onRetry && (
              <button
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium text-rose-200 bg-rose-900/60 hover:bg-rose-800/70 border border-rose-700"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry
              </button>
            )}
          </div>
        )}

        {/* Coordinate HUD Labels */}
        <div className="absolute top-2.5 left-3 text-[10px] font-mono text-slate-500 pointer-events-none select-none">
          TOPOLOGY::120_NODES [12x10 GRID]
        </div>
        <div className="absolute top-2.5 right-3 text-[10px] font-mono text-slate-500 pointer-events-none select-none">
          SEGMENTS_RENDERED::{displayedRecords.length}
        </div>
        <div className="absolute bottom-2.5 left-3 text-[10px] font-mono text-slate-500 pointer-events-none select-none">
          SOURCE::GET /api/traffic/current
        </div>
        <div className="absolute bottom-2.5 right-3 text-[10px] font-mono text-slate-500 pointer-events-none select-none">
          PROVENANCE::DERIVED
        </div>

        {/* SVG Network Topology Canvas */}
        <svg
          viewBox="0 0 960 520"
          className="w-full h-full max-h-[440px] select-none p-2"
          style={{ overflow: "visible" }}
        >
          <defs>
            {/* Glow Filter for Selected Segment */}
            <filter id="segment-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            {/* Directional markers */}
            <marker
              id="arrowhead-normal"
              markerWidth="6"
              markerHeight="6"
              refX="6"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 6 3, 0 6" fill="#10B981" opacity="0.8" />
            </marker>
            <marker
              id="arrowhead-watch"
              markerWidth="6"
              markerHeight="6"
              refX="6"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 6 3, 0 6" fill="#F59E0B" opacity="0.8" />
            </marker>
            <marker
              id="arrowhead-congested"
              markerWidth="6"
              markerHeight="6"
              refX="6"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 6 3, 0 6" fill="#F97316" opacity="0.8" />
            </marker>
            <marker
              id="arrowhead-severe"
              markerWidth="6"
              markerHeight="6"
              refX="6"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 6 3, 0 6" fill="#EF4444" opacity="0.9" />
            </marker>
          </defs>

          {/* 1. Topology Background Grid Links (subtle connective topology) */}
          {allNodes.map((node) => {
            const num = parseInt(node.id.replace(/\D/g, ""), 10);
            const col = (num - 1) % 12;
            const row = Math.floor((num - 1) / 12);

            return (
              <g key={`mesh-${node.id}`} opacity="0.12">
                {col < 11 && (
                  <line
                    x1={node.x}
                    y1={node.y}
                    x2={node.x + 860 / 11}
                    y2={node.y}
                    stroke="#475569"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                )}
                {row < 9 && (
                  <line
                    x1={node.x}
                    y1={node.y}
                    x2={node.x}
                    y2={node.y + 440 / 9}
                    stroke="#475569"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                )}
              </g>
            );
          })}

          {/* 2. Active Real Traffic Segments from Backend */}
          {displayedRecords.map((record) => {
            const p1 = getNodeCoordinates(record.source_node);
            const p2 = getNodeCoordinates(record.target_node);

            // Skip invalid coordinate mappings
            if (p1.x === 0 && p1.y === 0 && p2.x === 0 && p2.y === 0) return null;

            const isSelected = selectedSegmentId === record.segment_id;
            const isHovered = hoveredSegment?.segment_id === record.segment_id;
            const stateKey = (record.congestion_state || "NORMAL").toUpperCase();
            const colorConfig = STATE_COLORS[stateKey] || STATE_COLORS.NORMAL;

            // Offset parallel bidirectional links slightly
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            const normalX = -dy / len;
            const normalY = dx / len;
            const offsetDist = 2.5;

            const startX = p1.x + normalX * offsetDist;
            const startY = p1.y + normalY * offsetDist;
            const endX = p2.x + normalX * offsetDist;
            const endY = p2.y + normalY * offsetDist;

            return (
              <g
                key={record.segment_id}
                className="cursor-pointer transition-all duration-150"
                onClick={() =>
                  onSelectSegment(
                    isSelected ? null : record.segment_id
                  )
                }
                onMouseEnter={() => setHoveredSegment(record)}
                onMouseLeave={() => setHoveredSegment(null)}
              >
                {/* Wider invisible stroke for easy clicking/hovering */}
                <line
                  x1={startX}
                  y1={startY}
                  x2={endX}
                  y2={endY}
                  stroke="transparent"
                  strokeWidth="14"
                />

                {/* Visible Traffic Link */}
                <line
                  x1={startX}
                  y1={startY}
                  x2={endX}
                  y2={endY}
                  stroke={colorConfig.stroke}
                  strokeWidth={isSelected ? 4.5 : isHovered ? 3.5 : 2.5}
                  strokeLinecap="round"
                  filter={isSelected || isHovered ? "url(#segment-glow)" : undefined}
                  opacity={
                    isSelected
                      ? 1
                      : isHovered
                      ? 1
                      : stateKey === "SEVERE" || stateKey === "CONGESTED"
                      ? 0.95
                      : 0.75
                  }
                />

                {/* Central Flow Direction Pip */}
                <circle
                  cx={(startX + endX) / 2}
                  cy={(startY + endY) / 2}
                  r={isSelected ? 3.5 : 2}
                  fill={colorConfig.stroke}
                  opacity={0.9}
                />
              </g>
            );
          })}

          {/* 3. Topology Nodes (120 Nodes) */}
          {allNodes.map((node) => {
            const isSourceOfActive =
              activeRecord && activeRecord.source_node === node.id;
            const isTargetOfActive =
              activeRecord && activeRecord.target_node === node.id;
            const isHighlighted = isSourceOfActive || isTargetOfActive;

            return (
              <g key={node.id} className="pointer-events-none">
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={isHighlighted ? 4.5 : 2.5}
                  fill={
                    isSourceOfActive
                      ? "#06B6D4"
                      : isTargetOfActive
                      ? "#38BDF8"
                      : "#334155"
                  }
                  stroke={isHighlighted ? "#FFFFFF" : "#0F172A"}
                  strokeWidth={isHighlighted ? 1.5 : 1}
                />
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay (when hovering over a link) */}
        {hoveredSegment && !selectedSegmentId && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700 shadow-xl pointer-events-none flex items-center gap-3 text-xs font-mono">
            <span className="font-bold text-white">
              {hoveredSegment.segment_id}
            </span>
            <span className="text-slate-400">
              {hoveredSegment.source_node} → {hoveredSegment.target_node}
            </span>
            <span
              className={`font-semibold ${
                STATE_COLORS[hoveredSegment.congestion_state]?.text || "text-slate-200"
              }`}
            >
              {hoveredSegment.congestion_state}
            </span>
            <span className="text-slate-300">
              {hoveredSegment.speed_kmh} km/h
            </span>
          </div>
        )}
      </div>

      {/* ================================================== */}
      {/* 4. COMPACT SELECTED SEGMENT DETAIL PANEL (Phase 4) */}
      {/* ================================================== */}
      {activeRecord && (
        <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-4 shadow-xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-white px-2 py-0.5 rounded bg-slate-950 border border-slate-700">
                SEGMENT: {activeRecord.segment_id}
              </span>
              <span className="text-xs font-mono text-cyan-400 font-semibold">
                {activeRecord.source_node} → {activeRecord.target_node}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                  STATE_COLORS[activeRecord.congestion_state]?.bg ||
                  "bg-slate-950 text-slate-400"
                }`}
              >
                {activeRecord.congestion_state}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <ProvenanceBadge type="DERIVED" size="sm" />
              {selectedSegmentId && (
                <button
                  onClick={() => onSelectSegment(null)}
                  className="p-1 text-slate-400 hover:text-white rounded"
                  title="Close Segment Details"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Telemetry Key-Value Grid (Real backend fields only) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 text-xs font-mono">
            <div className="p-2 rounded bg-slate-950/60 border border-slate-800/80 space-y-0.5">
              <span className="text-[10px] text-slate-500 block">speed_kmh</span>
              <span className="font-bold text-white text-sm">
                {activeRecord.speed_kmh} <span className="text-[10px] font-normal text-slate-400">km/h</span>
              </span>
            </div>

            <div className="p-2 rounded bg-slate-950/60 border border-slate-800/80 space-y-0.5">
              <span className="text-[10px] text-slate-500 block">flow_vph</span>
              <span className="font-bold text-white text-sm">
                {activeRecord.flow_vph} <span className="text-[10px] font-normal text-slate-400">vph</span>
              </span>
            </div>

            <div className="p-2 rounded bg-slate-950/60 border border-slate-800/80 space-y-0.5">
              <span className="text-[10px] text-slate-500 block">occupancy_pct</span>
              <span className="font-bold text-white text-sm">
                {activeRecord.occupancy_pct}%
              </span>
            </div>

            <div className="p-2 rounded bg-slate-950/60 border border-slate-800/80 space-y-0.5">
              <span className="text-[10px] text-slate-500 block">queue_length_veh</span>
              <span className="font-bold text-white text-sm">
                {activeRecord.queue_length_veh} <span className="text-[10px] font-normal text-slate-400">veh</span>
              </span>
            </div>

            <div className="p-2 rounded bg-slate-950/60 border border-slate-800/80 space-y-0.5">
              <span className="text-[10px] text-slate-500 block">delay_min</span>
              <span className="font-bold text-white text-sm">
                {activeRecord.delay_min} <span className="text-[10px] font-normal text-slate-400">min</span>
              </span>
            </div>

            <div className="p-2 rounded bg-slate-950/60 border border-slate-800/80 space-y-0.5">
              <span className="text-[10px] text-slate-500 block">confidence</span>
              <span className="font-bold text-cyan-400 text-sm">
                {Math.round(activeRecord.confidence * 100)}%
              </span>
            </div>
          </div>

          {/* Anomaly & Context Information Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono pt-1">
            <div className="p-2 rounded bg-slate-950/60 border border-slate-800/80 space-y-0.5">
              <span className="text-[10px] text-slate-500 block">anomaly_type</span>
              <span className={`font-semibold ${activeRecord.is_anomaly ? "text-rose-400" : "text-slate-300"}`}>
                {activeRecord.anomaly_type || "NONE"}
              </span>
            </div>

            <div className="p-2 rounded bg-slate-950/60 border border-slate-800/80 space-y-0.5 sm:col-span-2">
              <span className="text-[10px] text-slate-500 block">evidence_reason</span>
              <span className="text-slate-300 text-[11px] truncate block" title={activeRecord.evidence_reason}>
                {activeRecord.evidence_reason || "Standard corridor flow within historical bounds"}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              timestamp: {activeRecord.timestamp}
            </span>
            <span>temporal_status: {activeRecord.temporal_status || "STABLE"}</span>
            <span>roadwork: {activeRecord.roadwork_context || "NONE"}</span>
          </div>
        </div>
      )}
    </div>
  );
}
