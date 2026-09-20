"use client";

import React, { useState, useMemo } from "react";
import {
  GitBranch,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  ArrowRight,
  Clock,
  Layers,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  X,
  Info,
} from "lucide-react";
import { PropagationRecord } from "@/types/propagation";
import { NodeRecord } from "@/types/network";
import { TrafficRecord } from "@/types/traffic";
import { DashboardSummaryResponse } from "@/types/dashboard";
import { ProvenanceBadge } from "../ui/ProvenanceBadge";
import { PropagationDetailCard } from "./PropagationDetailCard";
import { GeographicNetworkMap } from "../network/GeographicNetworkMap";

interface PropagationViewProps {
  records: PropagationRecord[];
  totalRecords: number;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  offset: number;
  limit: number;
  onPageChange: (newOffset: number) => void;
  riskFilter?: string;
  onFilterChange: (risk?: string) => void;
  nodes: NodeRecord[];
  trafficRecords: TrafficRecord[];
  trafficTotal: number;
  loadingNodes?: boolean;
  loadingTraffic?: boolean;
  summaryData?: DashboardSummaryResponse | null;
  selectedSegmentId?: string | null;
  onSelectSegment: (segmentId: string | null) => void;
}

const RISK_BADGES: Record<string, { bg: string; text: string; border: string; label: string }> = {
  HIGH_SPILLBACK_IMPACT: {
    bg: "bg-rose-950/60",
    text: "text-rose-400",
    border: "border-rose-500/40",
    label: "HIGH IMPACT",
  },
  MODERATE_PROPAGATION: {
    bg: "bg-amber-950/60",
    text: "text-amber-400",
    border: "border-amber-500/40",
    label: "MODERATE",
  },
  LOW_RISK: {
    bg: "bg-emerald-950/60",
    text: "text-emerald-400",
    border: "border-emerald-500/40",
    label: "LOW RISK",
  },
};

export function PropagationView({
  records,
  totalRecords,
  loading = false,
  error,
  onRetry,
  offset,
  limit,
  onPageChange,
  riskFilter,
  onFilterChange,
  nodes,
  trafficRecords,
  trafficTotal,
  loadingNodes = false,
  loadingTraffic = false,
  summaryData,
  selectedSegmentId,
  onSelectSegment,
}: PropagationViewProps) {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [directionFilter, setDirectionFilter] = useState<string>("ALL");
  const [selectedRecord, setSelectedRecord] = useState<PropagationRecord | null>(
    records.length > 0 ? records[0] : null
  );

  // Filter records by search term & direction
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchSearch =
        !searchTerm.trim() ||
        r.seed_segment_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.propagated_segment_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.evidence_reason.toLowerCase().includes(searchTerm.toLowerCase());

      const matchDirection =
        directionFilter === "ALL" ||
        (directionFilter === "UPSTREAM" && r.direction.includes("UPSTREAM")) ||
        (directionFilter === "DOWNSTREAM" && r.direction.includes("DOWNSTREAM"));

      return matchSearch && matchDirection;
    });
  }, [records, searchTerm, directionFilter]);

  // Derived KPI metrics
  const kpis = useMemo(() => {
    const seeds = new Set(records.map((r) => r.seed_segment_id));
    const highSpillback = records.filter((r) => r.risk_level === "HIGH_SPILLBACK_IMPACT").length;
    const avgScore =
      records.length > 0
        ? records.reduce((acc, r) => acc + r.propagation_score, 0) / records.length
        : 0;

    return {
      seedCount: summaryData?.propagation_risk.active_bottleneck_seeds ?? seeds.size,
      highCount: summaryData?.propagation_risk.high_spillback_impact_events ?? highSpillback,
      avgScore: (avgScore * 100).toFixed(1),
    };
  }, [records, summaryData]);

  // Active propagation connection link for the map
  const activePropagationLink = useMemo(() => {
    if (!selectedRecord) return null;
    return {
      seedSegmentId: selectedRecord.seed_segment_id,
      propagatedSegmentId: selectedRecord.propagated_segment_id,
    };
  }, [selectedRecord]);

  const totalPages = Math.max(1, Math.ceil(totalRecords / limit));
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="space-y-6">
      {/* 1. Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <GitBranch className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold font-mono tracking-wider text-slate-100 uppercase">
                NETWORK PROPAGATION
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium text-cyan-300 bg-cyan-950/80 border border-cyan-500/40">
                STEP 7 SPILLBACK ENGINE
              </span>
              <ProvenanceBadge type="DERIVED" size="sm" />
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Spillback Cascade &amp; Risk Intelligence &middot; Multi-hop queue spillover &amp; starvation footprints
            </p>
          </div>
        </div>

        {onRetry && (
          <button
            onClick={onRetry}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono text-slate-300 bg-slate-950 border border-slate-800 hover:text-white hover:border-slate-700 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-cyan-400" : ""}`} />
            <span>Refresh Intelligence</span>
          </button>
        )}
      </div>

      {/* 2. Conceptual Architecture Cascade Flow Banner */}
      <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono">
        <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 font-bold flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-cyan-400" />
          <span>TOPOLOGICAL CONGESTION PROPAGATION ARCHITECTURE</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-center">
          <div className="p-2.5 rounded-lg bg-slate-900/60 border border-amber-500/30">
            <span className="text-[9px] text-amber-500/80 block uppercase font-bold">1. ORIGIN</span>
            <span className="font-bold text-amber-300">CONGESTED SEED</span>
            <p className="text-[9px] text-slate-500 mt-0.5">Bottleneck queue accumulation</p>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-900/60 border border-cyan-500/30">
            <span className="text-[9px] text-cyan-500/80 block uppercase font-bold">2. DYNAMICS</span>
            <span className="font-bold text-cyan-300">UPSTREAM SPILLBACK</span>
            <p className="text-[9px] text-slate-500 mt-0.5">Storage capacity saturation</p>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-900/60 border border-purple-500/30">
            <span className="text-[9px] text-purple-500/80 block uppercase font-bold">3. ADJACENCY</span>
            <span className="font-bold text-purple-300">CONNECTED SEGMENTS</span>
            <p className="text-[9px] text-slate-500 mt-0.5">Multi-hop graph feeder links</p>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-900/60 border border-rose-500/30">
            <span className="text-[9px] text-rose-500/80 block uppercase font-bold">4. SEVERITY</span>
            <span className="font-bold text-rose-300">PROPAGATION RISK</span>
            <p className="text-[9px] text-slate-500 mt-0.5">Cascade probability &amp; impact</p>
          </div>
        </div>
      </div>

      {/* 3. Summary KPI Bar (Requirement 1) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
          <span className="text-[10px] text-slate-500 uppercase block">BOTTLENECK SEEDS</span>
          <div className="text-2xl font-bold text-amber-400 mt-1">{kpis.seedCount}</div>
          <span className="text-[10px] text-slate-500">Active bottleneck originators</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
          <span className="text-[10px] text-slate-500 uppercase block">HIGH SPILLBACK IMPACT</span>
          <div className="text-2xl font-bold text-rose-400 mt-1">{kpis.highCount}</div>
          <span className="text-[10px] text-slate-500">Severe queue cascade risk</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
          <span className="text-[10px] text-slate-500 uppercase block">MODELED CASCADES</span>
          <div className="text-2xl font-bold text-cyan-400 mt-1">{totalRecords}</div>
          <span className="text-[10px] text-slate-500">Total forward footprint events</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
          <span className="text-[10px] text-slate-500 uppercase block">AVG CASCADE SCORE</span>
          <div className="text-2xl font-bold text-slate-200 mt-1">{kpis.avgScore}%</div>
          <span className="text-[10px] text-slate-500">Mean propagation intensity</span>
        </div>
      </div>

      {/* 4. Filters & Search Toolbar (Requirement 4) */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-950/80 border border-slate-800 rounded-xl font-mono text-xs">
        {/* Risk Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-slate-500 text-[10px] uppercase mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Risk:
          </span>
          <button
            onClick={() => onFilterChange(undefined)}
            className={`px-2.5 py-1 rounded transition-colors ${
              !riskFilter
                ? "bg-slate-800 text-cyan-400 font-bold border border-slate-700"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            ALL
          </button>
          <button
            onClick={() => onFilterChange("HIGH_SPILLBACK_IMPACT")}
            className={`px-2.5 py-1 rounded transition-colors ${
              riskFilter === "HIGH_SPILLBACK_IMPACT"
                ? "bg-rose-950/60 text-rose-400 font-bold border border-rose-500/40"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            HIGH RISK
          </button>
          <button
            onClick={() => onFilterChange("MODERATE_PROPAGATION")}
            className={`px-2.5 py-1 rounded transition-colors ${
              riskFilter === "MODERATE_PROPAGATION"
                ? "bg-amber-950/60 text-amber-400 font-bold border border-amber-500/40"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            MODERATE
          </button>
          <button
            onClick={() => onFilterChange("LOW_RISK")}
            className={`px-2.5 py-1 rounded transition-colors ${
              riskFilter === "LOW_RISK"
                ? "bg-emerald-950/60 text-emerald-400 font-bold border border-emerald-500/40"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            LOW RISK
          </button>
        </div>

        {/* Direction Filter */}
        <div className="flex items-center gap-1">
          <span className="text-slate-500 text-[10px] uppercase mr-1">Direction:</span>
          {(["ALL", "UPSTREAM", "DOWNSTREAM"] as const).map((dir) => (
            <button
              key={dir}
              onClick={() => setDirectionFilter(dir)}
              className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                directionFilter === dir
                  ? "bg-cyan-950/60 text-cyan-300 border border-cyan-500/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {dir}
            </button>
          ))}
        </div>

        {/* Search Box */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter seed/target segment..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 pr-3 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 w-52"
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
      </div>

      {/* 5. Primary Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Interactive Map with Cascade Connection & Records List */}
        <div className="lg:col-span-2 space-y-6">
          {/* Map showing Geographic Network with Cascade Link (Requirement 7) */}
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-4 space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-slate-200 uppercase">
                  CASCADE TOPOLOGY MAP
                </span>
                {selectedRecord && (
                  <span className="text-[10px] font-mono text-cyan-400">
                    Active Link: {selectedRecord.seed_segment_id} &rarr; {selectedRecord.propagated_segment_id}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-mono text-slate-500">
                Straight organizer coordinates &middot; No invented geometry
              </span>
            </div>

            <GeographicNetworkMap
              nodes={nodes}
              records={trafficRecords}
              totalRecords={trafficTotal}
              loading={loadingNodes || loadingTraffic}
              offset={0}
              limit={500}
              onPageChange={() => {}}
              onFilterChange={() => {}}
              selectedSegmentId={selectedSegmentId}
              onSelectSegment={onSelectSegment}
              propagationLink={activePropagationLink}
            />
          </div>

          {/* Propagation Records Table (Requirement 2 & 5) */}
          <div className="rounded-2xl bg-slate-950/80 border border-slate-800 p-4 space-y-3 font-mono">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <span className="text-xs font-bold text-slate-200 uppercase">
                PROPAGATION FOOTPRINT RECORDS ({filteredRecords.length})
              </span>
              <span className="text-[10px] text-slate-500">
                Page {currentPage} of {totalPages}
              </span>
            </div>

            {loading && (
              <div className="py-12 text-center text-slate-400">
                <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin mx-auto mb-2" />
                <p className="text-xs">Loading propagation records from /api/propagation...</p>
              </div>
            )}

            {error && !loading && (
              <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-center space-y-2">
                <AlertTriangle className="w-6 h-6 text-rose-400 mx-auto" />
                <p className="text-xs text-rose-300">{error}</p>
                {onRetry && (
                  <button
                    onClick={onRetry}
                    className="px-3 py-1 rounded bg-rose-900 text-rose-200 hover:bg-rose-800 text-xs"
                  >
                    Retry
                  </button>
                )}
              </div>
            )}

            {!loading && !error && filteredRecords.length === 0 && (
              <div className="py-10 text-center text-xs text-slate-500">
                No propagation events match the selected criteria.
              </div>
            )}

            {!loading && !error && filteredRecords.length > 0 && (
              <div className="space-y-2 overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="text-[10px] text-slate-500 border-b border-slate-800/80 uppercase">
                      <th className="py-2 px-2.5">TIMESTAMP</th>
                      <th className="py-2 px-2.5">SEED</th>
                      <th className="py-2 px-2.5">DIRECTION</th>
                      <th className="py-2 px-2.5">PROPAGATED TARGET</th>
                      <th className="py-2 px-2.5">HOPS</th>
                      <th className="py-2 px-2.5">HORIZON</th>
                      <th className="py-2 px-2.5">SCORE</th>
                      <th className="py-2 px-2.5">RISK LEVEL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((rec, idx) => {
                      const isSelected =
                        selectedRecord?.seed_segment_id === rec.seed_segment_id &&
                        selectedRecord?.propagated_segment_id === rec.propagated_segment_id;
                      const badge = RISK_BADGES[rec.risk_level] || RISK_BADGES.LOW_RISK;

                      return (
                        <tr
                          key={`${rec.seed_segment_id}-${rec.propagated_segment_id}-${idx}`}
                          onClick={() => {
                            setSelectedRecord(rec);
                            onSelectSegment(rec.seed_segment_id);
                          }}
                          className={`border-b border-slate-900 cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-cyan-950/40 text-cyan-200"
                              : "hover:bg-slate-900/50 text-slate-300"
                          }`}
                        >
                          <td className="py-2.5 px-2.5 text-[11px] text-slate-400">
                            {rec.timestamp.split(" ")[1] || rec.timestamp}
                          </td>
                          <td className="py-2.5 px-2.5 font-bold text-amber-400">
                            {rec.seed_segment_id}
                          </td>
                          <td className="py-2.5 px-2.5 text-[10px] text-slate-400">
                            {rec.direction.replace(/_/g, " ")}
                          </td>
                          <td className="py-2.5 px-2.5 font-bold text-rose-400">
                            {rec.propagated_segment_id}
                          </td>
                          <td className="py-2.5 px-2.5">{rec.hops}</td>
                          <td className="py-2.5 px-2.5 text-cyan-400">+{rec.horizon_min}m</td>
                          <td className="py-2.5 px-2.5 font-bold">
                            {(rec.propagation_score * 100).toFixed(0)}%
                          </td>
                          <td className="py-2.5 px-2.5">
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold ${badge.bg} ${badge.text} ${badge.border}`}
                            >
                              {badge.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs text-slate-400">
              <span>
                Showing {offset + 1} - {Math.min(offset + limit, totalRecords)} of {totalRecords} records
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onPageChange(Math.max(0, offset - limit))}
                  disabled={offset === 0 || loading}
                  className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onPageChange(offset + limit)}
                  disabled={offset + limit >= totalRecords || loading}
                  className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Detail Panel (Requirement 6) */}
        <div>
          <PropagationDetailCard
            record={selectedRecord}
            onClose={() => setSelectedRecord(null)}
            onSelectSegment={(segId) => onSelectSegment(segId)}
          />
        </div>
      </div>
    </div>
  );
}
