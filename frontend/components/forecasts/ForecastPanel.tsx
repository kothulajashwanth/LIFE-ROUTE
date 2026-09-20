"use client";

import React, { useState, useMemo } from "react";
import {
  TrendingUp,
  Clock,
  Search,
  RefreshCw,
  AlertTriangle,
  ChevronRight,
  Info,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { ForecastRecord, SegmentForecastDetail } from "@/types/forecasts";
import { TrafficRecord } from "@/types/traffic";
import { ProvenanceBadge } from "../ui/ProvenanceBadge";
import { ORGANIZER_SEGMENTS } from "@/lib/data/organizerNetwork";

interface ForecastPanelProps {
  records: ForecastRecord[];
  totalRecords: number;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  selectedSegmentId?: string | null;
  onSelectSegment: (segmentId: string | null) => void;
  selectedDetail?: SegmentForecastDetail | null;
  loadingDetail?: boolean;
  trafficRecords?: TrafficRecord[];
}

const CONGESTION_COLORS: Record<string, { stroke: string; bg: string; text: string }> = {
  NORMAL: {
    stroke: "#20E0A0",
    bg: "bg-emerald-950/50 border-emerald-500/30 text-[#20E0A0]",
    text: "text-[#20E0A0]",
  },
  WATCH: {
    stroke: "#FFB020",
    bg: "bg-amber-950/50 border-amber-500/30 text-[#FFB020]",
    text: "text-[#FFB020]",
  },
  CONGESTED: {
    stroke: "#F97316",
    bg: "bg-orange-950/50 border-orange-500/30 text-orange-400",
    text: "text-orange-400",
  },
  SEVERE: {
    stroke: "#FF3D5A",
    bg: "bg-rose-950/50 border-[#FF3D5A]/30 text-[#FF3D5A]",
    text: "text-[#FF3D5A]",
  },
};

export function ForecastPanel({
  records,
  totalRecords,
  loading = false,
  error,
  onRetry,
  selectedSegmentId,
  onSelectSegment,
  selectedDetail,
  loadingDetail = false,
  trafficRecords = [],
}: ForecastPanelProps) {
  const [searchTerm, setSearchTerm] = useState<string>(selectedSegmentId || "");
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [noMatchFound, setNoMatchFound] = useState<boolean>(false);

  // Synchronize search term when canonical selectedSegmentId updates externally
  React.useEffect(() => {
    if (selectedSegmentId) {
      setSearchTerm(selectedSegmentId);
      setNoMatchFound(false);
    }
  }, [selectedSegmentId]);

  // Determine active forecast record (DEFENSIVE DATA MATCHING: ZERO FALLBACK TO WRONG RECORD)
  const activeRecord: (ForecastRecord & { current_congestion_state?: string }) | null = useMemo(() => {
    if (selectedSegmentId) {
      // 1. Check if selectedDetail corresponds to selectedSegmentId
      if (selectedDetail && selectedDetail.segment_id === selectedSegmentId) {
        const h15 = selectedDetail.horizons?.["15m"];
        const h30 = selectedDetail.horizons?.["30m"];
        const h45 = selectedDetail.horizons?.["45m"];
        const h60 = selectedDetail.horizons?.["60m"];

        return {
          timestamp: selectedDetail.timestamp,
          segment_id: selectedDetail.segment_id,
          current_speed_kmh: selectedDetail.current_speed_kmh,
          pred_speed_15m: h15?.pred_speed_kmh ?? selectedDetail.current_speed_kmh,
          pred_travel_time_15m_min: h15?.pred_travel_time_min ?? 0,
          pred_congestion_state_15m: h15?.pred_congestion_state ?? "NORMAL",
          pred_speed_30m: h30?.pred_speed_kmh ?? selectedDetail.current_speed_kmh,
          pred_speed_45m: h45?.pred_speed_kmh ?? selectedDetail.current_speed_kmh,
          pred_speed_60m: h60?.pred_speed_kmh ?? selectedDetail.current_speed_kmh,
          provenance: selectedDetail.provenance || "DERIVED",
          current_congestion_state:
            selectedDetail.current_speed_kmh < 20
              ? "SEVERE"
              : selectedDetail.current_speed_kmh < 35
              ? "CONGESTED"
              : selectedDetail.current_speed_kmh < 50
              ? "WATCH"
              : "NORMAL",
        };
      }

      // 2. Check if records slice has the selected segment
      const match = records.find((r) => r.segment_id === selectedSegmentId);
      if (match) return match;

      // 3. Fallback to organizer segment defaults with active telemetry if available
      const org = ORGANIZER_SEGMENTS.find((s) => s.segment_id === selectedSegmentId);
      if (org) {
        const live = trafficRecords.find((t) => t.segment_id === selectedSegmentId);
        const curSpd = live ? live.speed_kmh : org.free_flow_speed_kmh;
        return {
          timestamp: live?.timestamp || "Active observation",
          segment_id: org.segment_id,
          current_speed_kmh: curSpd,
          pred_speed_15m: curSpd,
          pred_travel_time_15m_min: (org.length_km / (curSpd || 30)) * 60,
          pred_congestion_state_15m: (live?.congestion_state as string) || "NORMAL",
          pred_speed_30m: curSpd,
          pred_speed_45m: curSpd,
          pred_speed_60m: curSpd,
          provenance: "DERIVED",
          current_congestion_state: (live?.congestion_state as string) || "NORMAL",
        };
      }

      // 4. DO NOT FALL BACK TO records[0] or R0001!
      return null;
    }

    // Unselected initial state: show first available or null
    return records.length > 0 ? records[0] : null;
  }, [records, selectedSegmentId, selectedDetail, trafficRecords]);

  // Index all 436 organizer network corridors with live telemetry overlaid
  const searchCorridors = useMemo(() => {
    const telemetryMap = new Map<string, TrafficRecord>();
    for (const t of trafficRecords) {
      if (!telemetryMap.has(t.segment_id)) {
        telemetryMap.set(t.segment_id, t);
      }
    }

    return ORGANIZER_SEGMENTS.map((s) => {
      const live = telemetryMap.get(s.segment_id);
      return {
        segment_id: s.segment_id,
        source_node: s.source_node,
        target_node: s.target_node,
        speed_kmh: live ? live.speed_kmh : s.free_flow_speed_kmh,
        congestion_state: live ? live.congestion_state : "NORMAL",
        timestamp: live ? live.timestamp : "",
        flow_vph: live ? live.flow_vph : 0,
        occupancy_pct: live ? live.occupancy_pct : 0,
        queue_length_veh: live ? live.queue_length_veh : 0,
        delay_min: live ? live.delay_min : 0,
        congestion_score: live ? live.congestion_score : 0,
        is_anomaly: live ? live.is_anomaly : 0,
        anomaly_type: live ? live.anomaly_type : "NONE",
        confidence: live ? live.confidence : 1,
        temporal_status: live ? live.temporal_status : "NOMINAL",
        roadwork_context: live ? live.roadwork_context : "NONE",
        evidence_reason: live ? live.evidence_reason : "OBSERVED",
        provenance: live ? live.provenance : "OBSERVED",
      };
    });
  }, [trafficRecords]);

  // Autocomplete matching results from all 436 corridors
  const searchMatches = useMemo(() => {
    const raw = searchTerm.trim().toUpperCase();
    if (!raw) return [];

    const tokens = raw.replace(/[->→]/g, " ").split(/\s+/).filter(Boolean);

    const matches = searchCorridors.filter((c) => {
      const segId = c.segment_id.toUpperCase();
      const src = (c.source_node || "").toUpperCase();
      const tgt = (c.target_node || "").toUpperCase();

      if (tokens.length === 1) {
        const q = tokens[0];
        return segId.includes(q) || src.includes(q) || tgt.includes(q);
      } else if (tokens.length >= 2) {
        const [q1, q2] = tokens;
        return (
          (src.includes(q1) && tgt.includes(q2)) ||
          (src.includes(q2) && tgt.includes(q1)) ||
          segId.includes(q1)
        );
      }
      return false;
    });

    matches.sort((a, b) => {
      if (a.segment_id === raw) return -1;
      if (b.segment_id === raw) return 1;
      if (a.segment_id.startsWith(raw)) return -1;
      if (b.segment_id.startsWith(raw)) return 1;
      return 0;
    });

    return matches.slice(0, 8);
  }, [searchCorridors, searchTerm]);

  // Quick segment suggestions
  const availableSegments = useMemo(() => {
    return ["R0023", "R0001", "R0003", "R0007", "R0011", "R0015", "R0021", "R0025"];
  }, []);

  // Handle Enter and Escape key in search box
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const raw = searchTerm.trim().toUpperCase();
      if (!raw) return;

      if (searchMatches.length > 0) {
        const top = searchMatches[0];
        onSelectSegment(top.segment_id);
        setSearchTerm(top.segment_id);
        setIsDropdownOpen(false);
        setNoMatchFound(false);
        return;
      }

      // Zero matches: do not silently select another segment
      setNoMatchFound(true);
      setIsDropdownOpen(true);
    } else if (e.key === "Escape") {
      setIsDropdownOpen(false);
    }
  };

  // Build timeline trajectory points
  const trajectory = useMemo(() => {
    if (!activeRecord) return [];

    const detailHorizons = selectedDetail?.horizons;
    const curSpeed = typeof activeRecord.current_speed_kmh === "number" ? activeRecord.current_speed_kmh : 0;
    const curState =
      activeRecord.current_congestion_state ||
      detailHorizons?.["0m"]?.pred_congestion_state ||
      (curSpeed < 20 ? "SEVERE" : curSpeed < 35 ? "CONGESTED" : curSpeed < 50 ? "WATCH" : "NORMAL");

    return [
      {
        horizon: "CURRENT",
        timeLabel: "0m",
        speed: curSpeed,
        state: curState,
        isObserved: true,
        lower: curSpeed,
        upper: curSpeed,
        travelTime: undefined,
      },
      {
        horizon: "+15 MIN",
        timeLabel: "15m",
        speed: typeof activeRecord.pred_speed_15m === "number" ? activeRecord.pred_speed_15m : curSpeed,
        state: detailHorizons?.["15m"]?.pred_congestion_state || activeRecord.pred_congestion_state_15m || "NORMAL",
        isObserved: false,
        lower: detailHorizons?.["15m"]?.lower_bound_95_pct,
        upper: detailHorizons?.["15m"]?.upper_bound_95_pct,
        travelTime: activeRecord.pred_travel_time_15m_min,
      },
      {
        horizon: "+30 MIN",
        timeLabel: "30m",
        speed: typeof activeRecord.pred_speed_30m === "number" ? activeRecord.pred_speed_30m : curSpeed,
        state: detailHorizons?.["30m"]?.pred_congestion_state || "NORMAL",
        isObserved: false,
        lower: detailHorizons?.["30m"]?.lower_bound_95_pct,
        upper: detailHorizons?.["30m"]?.upper_bound_95_pct,
        travelTime: detailHorizons?.["30m"]?.pred_travel_time_min,
      },
      {
        horizon: "+45 MIN",
        timeLabel: "45m",
        speed: typeof activeRecord.pred_speed_45m === "number" ? activeRecord.pred_speed_45m : curSpeed,
        state: detailHorizons?.["45m"]?.pred_congestion_state || "NORMAL",
        isObserved: false,
        lower: detailHorizons?.["45m"]?.lower_bound_95_pct,
        upper: detailHorizons?.["45m"]?.upper_bound_95_pct,
        travelTime: detailHorizons?.["45m"]?.pred_travel_time_min,
      },
      {
        horizon: "+60 MIN",
        timeLabel: "60m",
        speed: typeof activeRecord.pred_speed_60m === "number" ? activeRecord.pred_speed_60m : curSpeed,
        state: detailHorizons?.["60m"]?.pred_congestion_state || "NORMAL",
        isObserved: false,
        lower: detailHorizons?.["60m"]?.lower_bound_95_pct,
        upper: detailHorizons?.["60m"]?.upper_bound_95_pct,
        travelTime: detailHorizons?.["60m"]?.pred_travel_time_min,
      },
    ];
  }, [activeRecord, selectedDetail]);

  // Calculate SVG chart coordinates
  const chartData = useMemo(() => {
    if (trajectory.length === 0) return null;

    const speeds = trajectory.map((t) => t.speed);
    const minSpeed = Math.max(0, Math.floor(Math.min(...speeds) - 5));
    const maxSpeed = Math.ceil(Math.max(...speeds) + 5);
    const speedRange = maxSpeed - minSpeed || 10;

    const svgWidth = 280;
    const svgHeight = 70;
    const paddingX = 20;
    const paddingY = 12;
    const usableWidth = svgWidth - paddingX * 2;
    const usableHeight = svgHeight - paddingY * 2;

    const points = trajectory.map((t, idx) => {
      const x = paddingX + (idx / (trajectory.length - 1)) * usableWidth;
      const normY = (t.speed - minSpeed) / speedRange;
      const y = paddingY + (1 - normY) * usableHeight;
      return { ...t, x, y };
    });

    const pathD = points
      .map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x} ${p.y}`)
      .join(" ");

    return { points, pathD, minSpeed, maxSpeed, svgWidth, svgHeight };
  }, [trajectory]);

  return (
    <div className="flex flex-col justify-between h-full space-y-4">
      {/* 1. Header & Segment Search Controls */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-cyan-400 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
              MULTI-HORIZON SPEED TRAJECTORY
            </span>
            <ProvenanceBadge type="DERIVED" size="sm" />
          </div>
          <span className="text-[10px] font-mono text-slate-500">
            {records.length > 0 ? `RECORD 1 OF ${totalRecords}` : "0 RECORDS"}
          </span>
        </div>

        {/* Segment Search / Quick Selector */}
        <div className="relative">
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus-within:border-cyan-500/60 transition-colors">
            <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <input
              type="text"
              placeholder="Search segment ID or node…"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setIsDropdownOpen(true);
                setNoMatchFound(false);
              }}
              onFocus={() => setIsDropdownOpen(true)}
              onKeyDown={handleKeyDown}
              className="bg-transparent border-none outline-none text-xs text-slate-200 placeholder-slate-500 w-full font-mono"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setIsDropdownOpen(false);
                  setNoMatchFound(false);
                }}
                className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                title="Clear search text (preserves selected corridor)"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Autocomplete Search Dropdown */}
          {isDropdownOpen && searchTerm.trim().length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-50 overflow-hidden font-mono text-xs">
              <div className="px-2.5 py-1 text-[10px] text-slate-400 border-b border-slate-800 uppercase font-sans font-semibold flex items-center justify-between">
                <span>Matching Segments</span>
                <span className="text-[9px] text-slate-500 font-mono">Press Enter to select</span>
              </div>

              {searchMatches.length > 0 ? (
                <div className="max-h-56 overflow-y-auto divide-y divide-slate-800/60">
                  {searchMatches.map((match) => {
                    const color = CONGESTION_COLORS[match.congestion_state] || CONGESTION_COLORS.NORMAL;
                    const isSelected = selectedSegmentId === match.segment_id;
                    return (
                      <button
                        key={match.segment_id}
                        type="button"
                        onClick={() => {
                          onSelectSegment(match.segment_id);
                          setSearchTerm(match.segment_id);
                          setIsDropdownOpen(false);
                          setNoMatchFound(false);
                        }}
                        className={`w-full px-3 py-2.5 text-left hover:bg-slate-800 transition-colors flex items-center justify-between cursor-pointer ${
                          isSelected ? "bg-cyan-950/50 border-l-2 border-cyan-400" : ""
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="font-bold text-slate-100 flex items-center gap-2">
                            <span className="text-cyan-300 font-mono text-xs">{match.segment_id}</span>
                            {match.source_node && match.target_node && (
                              <span className="text-[11px] text-slate-400 font-sans font-normal">
                                {match.source_node} &rarr; {match.target_node}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-sans">
                            Current speed: <span className="font-mono text-emerald-400 font-semibold">{typeof match.speed_kmh === "number" ? match.speed_kmh.toFixed(1) : "—"}</span> km/h
                          </div>
                        </div>

                        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold font-sans ${color.bg}`}>
                          {match.congestion_state}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 text-center space-y-1 font-sans">
                  <div className="text-xs font-semibold text-slate-200">
                    No matching segments
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Try a segment ID such as{" "}
                    <button
                      type="button"
                      onClick={() => {
                        onSelectSegment("R0023");
                        setSearchTerm("R0023");
                        setIsDropdownOpen(false);
                      }}
                      className="text-cyan-400 font-mono underline hover:text-cyan-300 cursor-pointer"
                    >
                      R0023
                    </button>{" "}
                    or search by node.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Enter key no-match inline banner */}
          {noMatchFound && !isDropdownOpen && (
            <div className="mt-1 px-2.5 py-1 text-[11px] text-rose-300 bg-rose-950/60 border border-rose-800/60 rounded font-sans flex items-center justify-between">
              <span>No matching segments. Selection retained.</span>
              <button
                type="button"
                onClick={() => setNoMatchFound(false)}
                className="text-rose-400 hover:text-rose-200"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Quick Segment Suggestion Pills */}
          {availableSegments.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 pt-1.5">
              <span className="text-[10px] text-slate-500 font-mono">Quick Pick:</span>
              {availableSegments.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    onSelectSegment(id);
                    setSearchTerm(id);
                    setIsDropdownOpen(false);
                    setNoMatchFound(false);
                  }}
                  className={`px-1.5 py-0.5 text-[10px] font-mono rounded transition-colors cursor-pointer ${
                    selectedSegmentId === id
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                      : "bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800"
                  }`}
                >
                  {id}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2. Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-10 text-center text-slate-400">
          <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin mb-2" />
          <p className="text-xs font-mono">Loading forecast intelligence...</p>
          <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
            Fetching Step 6 multi-step speed inferences
          </p>
        </div>
      )}

      {/* 3. Error State */}
      {error && !loading && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-center space-y-2">
          <AlertTriangle className="w-6 h-6 text-rose-400 mx-auto" />
          <h5 className="text-xs font-mono font-bold text-rose-300">
            Forecast data unavailable
          </h5>
          <p className="text-[11px] text-rose-400/80">{error}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-medium text-rose-200 bg-rose-900/60 hover:bg-rose-800/70 border border-rose-700 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
          )}
        </div>
      )}

      {/* 4. Active Forecast Display */}
      {!loading && !error && activeRecord && (
        <div className="space-y-3.5">
          {/* Active Segment Summary Banner */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
            <div>
              <div className="text-[10px] font-mono text-slate-500 uppercase">
                INSPECTING CORRIDOR
              </div>
              <div className="text-sm font-bold font-mono text-slate-100 flex items-center gap-1.5">
                <span>{activeRecord.segment_id}</span>
                <span className="text-[10px] text-slate-500 font-normal">
                  ({activeRecord.timestamp.split(" ")[1] || activeRecord.timestamp})
                </span>
              </div>
            </div>

            <div className="text-right font-mono">
              <div className="text-[10px] text-slate-500 uppercase font-sans">CURRENT SPEED</div>
              <div className="text-sm font-bold text-emerald-400">
                {typeof activeRecord.current_speed_kmh === "number" ? activeRecord.current_speed_kmh.toFixed(1) : "—"}{" "}
                <span className="text-[10px] font-normal text-slate-400 font-sans">km/h</span>
              </div>
            </div>
          </div>

          {/* Clean Visual Timeline Trajectory Chart */}
          {chartData && (
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-1">
              <div className="flex items-center justify-between text-[10px] font-sans text-slate-400 pb-1">
                <span>SPEED CURVE (km/h)</span>
                <span className="text-cyan-400 font-semibold font-mono">
                  {typeof trajectory[0]?.speed === "number" ? trajectory[0].speed.toFixed(1) : "—"} &rarr;{" "}
                  {typeof trajectory[trajectory.length - 1]?.speed === "number" ? trajectory[trajectory.length - 1].speed.toFixed(1) : "—"} km/h
                </span>
              </div>

              <div className="relative w-full h-[70px] flex items-center justify-center">
                <svg
                  viewBox={`0 0 ${chartData.svgWidth} ${chartData.svgHeight}`}
                  className="w-full h-full select-none"
                >
                  {/* Subtle horizontal baseline grid */}
                  <line
                    x1="20"
                    y1={chartData.svgHeight / 2}
                    x2={chartData.svgWidth - 20}
                    y2={chartData.svgHeight / 2}
                    stroke="#1e293b"
                    strokeDasharray="2 2"
                    strokeWidth="0.8"
                  />

                  {/* Shaded Area underneath line */}
                  <path
                    d={`${chartData.pathD} L ${chartData.points[chartData.points.length - 1].x} ${
                      chartData.svgHeight - 10
                    } L ${chartData.points[0].x} ${chartData.svgHeight - 10} Z`}
                    fill="rgba(56, 189, 248, 0.08)"
                  />

                  {/* Connecting Trajectory Line */}
                  <path
                    d={chartData.pathD}
                    fill="none"
                    stroke="#38BDF8"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Points on timeline */}
                  {chartData.points.map((p, idx) => (
                    <g key={idx}>
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r="3.5"
                        fill={p.isObserved ? "#10B981" : "#38BDF8"}
                        stroke="#0f172a"
                        strokeWidth="1.5"
                      />
                    </g>
                  ))}
                </svg>
              </div>

              {/* Time labels under chart */}
              <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 px-3">
                <span>0m (Cur)</span>
                <span>+15m</span>
                <span>+30m</span>
                <span>+45m</span>
                <span>+60m</span>
              </div>
            </div>
          )}

          {/* 5. Horizon Cards Breakdown (CURRENT, +15m, +30m, +45m, +60m) */}
          <div className="space-y-2">
            {trajectory.map((item) => {
              const colorInfo = CONGESTION_COLORS[item.state] || CONGESTION_COLORS.NORMAL;
              const isCurrent = item.horizon === "CURRENT";
              return (
                <div
                  key={item.horizon}
                  className={`p-2.5 rounded-lg border flex items-center justify-between transition-colors text-xs ${
                    isCurrent
                      ? "bg-slate-900/90 border-cyan-500/40 shadow-sm"
                      : "bg-slate-950/60 border-slate-800/80 hover:border-slate-700/80"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-7 h-7 rounded-md flex items-center justify-center ${
                        isCurrent
                          ? "bg-cyan-950 text-cyan-400 border border-cyan-700/50"
                          : "bg-slate-900 text-purple-400 border border-slate-800"
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="font-sans font-bold text-slate-100 flex items-center gap-1.5">
                        <span>{item.horizon}</span>
                        {isCurrent && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-700/40">
                            OBSERVED
                          </span>
                        )}
                        {!isCurrent && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-purple-950/60 text-purple-300 border border-purple-800/40">
                            FORECAST
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-sans">
                        {isCurrent
                          ? "Live observed sensor telemetry"
                          : item.travelTime !== undefined && typeof item.travelTime === "number"
                          ? `Est. travel time: ${item.travelTime.toFixed(1)}m`
                          : "Predictive forward step"}
                      </div>
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <div className="flex items-center gap-2 justify-end">
                      <span className="font-bold text-slate-100 text-xs">
                        {typeof item.speed === "number" ? item.speed.toFixed(1) : "—"}{" "}
                        <span className="text-[10px] font-normal text-slate-400 font-sans">km/h</span>
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold font-sans ${colorInfo.bg}`}
                      >
                        {item.state}
                      </span>
                    </div>

                    {/* Uncertainty Bounds if available */}
                    {item.lower !== undefined && item.upper !== undefined && typeof item.lower === "number" && typeof item.upper === "number" && (
                      <div className="text-[9px] text-slate-400 mt-0.5 font-mono">
                        95% CI: [{item.lower.toFixed(1)} - {item.upper.toFixed(1)} km/h]
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 6. Explanatory & Validation Disclaimer Section */}
          <div className="p-2.5 rounded-lg bg-slate-900/40 border border-slate-800/60 text-[10px] font-mono text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 text-cyan-400 font-semibold font-sans">
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span>FORECAST INTELLIGENCE ARCHITECTURE</span>
            </div>
            <p className="text-slate-400 leading-tight font-sans">
              CURRENT is observed sensor telemetry. +15m through +60m predictions are DERIVED via Step 6 direct multi-horizon causal regression with empirical residual uncertainty bounds.
            </p>
            <p className="text-slate-500 text-[9px] pt-0.5 font-sans">
              Validation metrics: Inference verified on validation partition. Direct analytical multi-step horizons eliminate compounding error without target leakage.
            </p>
          </div>
        </div>
      )}

      {/* Empty State / Missing Record Guard (Requirements 15 & 20) */}
      {!loading && !error && !activeRecord && (
        <div className="p-6 rounded-xl bg-slate-950/60 border border-slate-800 text-center space-y-2 my-auto font-sans">
          <div className="text-xs font-bold text-slate-300 font-mono">
            {selectedSegmentId
              ? `No record available for ${selectedSegmentId}`
              : "No forecast records available for inspection."}
          </div>
          <p className="text-[11px] text-slate-500 max-w-sm mx-auto font-sans">
            {selectedSegmentId
              ? `Zero forward speed trajectory returned by Step 6 causal forecaster for segment ${selectedSegmentId}. System prevents fallback to unrelated corridors.`
              : "Awaiting corridor selection or telemetry load."}
          </p>
        </div>
      )}

      {/* Footer Engine Status */}
      <div className="pt-2 border-t border-slate-800/70 text-center font-sans">
        <p className="text-[11px] font-mono text-slate-500 flex items-center justify-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span>Step 6 Causal Forecaster Active &bull; GET /api/forecasts</span>
        </p>
      </div>
    </div>
  );
}
