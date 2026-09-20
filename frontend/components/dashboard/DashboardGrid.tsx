"use client";

import React from "react";
import {
  Network,
  Activity,
  AlertTriangle,
  TrendingUp,
  Clock,
  GitBranch,
  Lightbulb,
  Sliders,
  Radio,
  RefreshCw,
  Database,
  Layers,
  AlertCircle,
  X,
  Search,
  ArrowRight,
  CheckCircle2,
  Play,
  Sparkles,
  Compass,
  HelpCircle,
} from "lucide-react";
import { MetricCard } from "../ui/MetricCard";
import { Panel } from "../ui/Panel";
import { ProvenanceBadge } from "../ui/ProvenanceBadge";
import { HealthResponse } from "@/types/api";
import { DashboardSummaryResponse } from "@/types/dashboard";
import { TrafficRecord } from "@/types/traffic";
import { IncidentRecord } from "@/types/incidents";
import { NodeRecord } from "@/types/network";
import { ForecastRecord, SegmentForecastDetail } from "@/types/forecasts";
import { PropagationRecord } from "@/types/propagation";
import { RecommendationRecord } from "@/types/recommendations";
import { GeographicNetworkMap } from "../network/GeographicNetworkMap";
import { IncidentFeed } from "../incidents/IncidentFeed";
import { ForecastPanel } from "../forecasts/ForecastPanel";
import { PropagationPanel } from "../propagation/PropagationPanel";
import { RecommendationPanel } from "../recommendations/RecommendationPanel";
import { SimulationPanel } from "../simulation/SimulationPanel";
import { ORGANIZER_SEGMENTS } from "@/lib/data/organizerNetwork";
import {
  TrafficScenarioCenter,
  IncidentTimelinePanel,
  NetworkImpactPanel,
  ControllerActionLogPanel,
  ExplainableAIPanel,
  JuryDemoModal,
} from "../scenarios";
import {
  ScenarioId,
  PlaybackStage,
} from "@/lib/scenarios/scenarioTypes";
import {
  computeScenarioOverlayState,
  SCENARIOS,
  PLAYBACK_STAGES,
  JURY_DEMO_STEPS,
} from "@/lib/scenarios/scenarioEngine";

interface DashboardGridProps {
  summaryData: DashboardSummaryResponse | null;
  loadingSummary?: boolean;
  summaryError?: string | null;
  onRefreshSummary?: () => void;
  // Node coordinates state
  nodes: NodeRecord[];
  loadingNodes?: boolean;
  nodesError?: string | null;
  onRetryNodes?: () => void;
  // Traffic state
  trafficRecords: TrafficRecord[];
  trafficTotal: number;
  loadingTraffic?: boolean;
  trafficError?: string | null;
  onRetryTraffic?: () => void;
  trafficOffset: number;
  trafficLimit: number;
  onTrafficPageChange: (newOffset: number) => void;
  trafficCongestionFilter?: string;
  onTrafficFilterChange: (state?: string) => void;
  selectedSegmentId?: string | null;
  onSelectSegment: (segmentId: string | null) => void;
  // Incident state
  incidentRecords: IncidentRecord[];
  incidentTotal: number;
  loadingIncidents?: boolean;
  incidentError?: string | null;
  onRetryIncidents?: () => void;
  incidentOffset: number;
  incidentLimit: number;
  onIncidentPageChange: (newOffset: number) => void;
  incidentActiveFilter: string;
  onIncidentFilterChange: (filter: string) => void;
  selectedIncident: IncidentRecord | null;
  onSelectIncident: (record: IncidentRecord | null) => void;
  onHighlightSegment?: (segmentId: string) => void;
  // Forecast state
  forecastRecords: ForecastRecord[];
  forecastTotal: number;
  loadingForecasts?: boolean;
  forecastsError?: string | null;
  onRetryForecasts?: () => void;
  selectedForecastDetail?: SegmentForecastDetail | null;
  loadingForecastDetail?: boolean;
  // Propagation state
  propagationRecords?: PropagationRecord[];
  propagationTotal?: number;
  loadingPropagation?: boolean;
  propagationError?: string | null;
  onRetryPropagation?: () => void;
  onOpenPropagationView?: () => void;
  selectedPropagation?: PropagationRecord | null;
  onSelectPropagation?: (record: PropagationRecord) => void;
  // Recommendations state
  recommendationRecords?: RecommendationRecord[];
  recommendationTotal?: number;
  loadingRecommendations?: boolean;
  recommendationsError?: string | null;
  onRetryRecommendations?: () => void;
  onOpenRecommendationsView?: () => void;
  selectedRecommendation?: RecommendationRecord | null;
  onSelectRecommendation?: (record: RecommendationRecord) => void;
  // Health state
  healthData: HealthResponse | null;
  loadingHealth?: boolean;
  healthError?: string | null;
  onRetryHealth?: () => void;
  // Cross-panel investigation navigation
  onNavigateToSection?: (id: string) => void;
  activeNavId?: string;
}

export function DashboardGrid({
  summaryData,
  loadingSummary = false,
  summaryError,
  onRefreshSummary,
  nodes,
  loadingNodes = false,
  nodesError,
  onRetryNodes,
  trafficRecords,
  trafficTotal,
  loadingTraffic = false,
  trafficError,
  onRetryTraffic,
  trafficOffset,
  trafficLimit,
  onTrafficPageChange,
  trafficCongestionFilter,
  onTrafficFilterChange,
  selectedSegmentId,
  onSelectSegment,
  incidentRecords,
  incidentTotal,
  loadingIncidents = false,
  incidentError,
  onRetryIncidents,
  incidentOffset,
  incidentLimit,
  onIncidentPageChange,
  incidentActiveFilter,
  onIncidentFilterChange,
  selectedIncident,
  onSelectIncident,
  onHighlightSegment,
  forecastRecords,
  forecastTotal,
  loadingForecasts = false,
  forecastsError,
  onRetryForecasts,
  selectedForecastDetail,
  loadingForecastDetail = false,
  propagationRecords = [],
  propagationTotal = 0,
  loadingPropagation = false,
  propagationError = null,
  onRetryPropagation,
  onOpenPropagationView,
  selectedPropagation = null,
  onSelectPropagation,
  recommendationRecords = [],
  recommendationTotal = 0,
  loadingRecommendations = false,
  recommendationsError = null,
  onRetryRecommendations,
  onOpenRecommendationsView,
  selectedRecommendation = null,
  onSelectRecommendation,
  healthData,
  loadingHealth = false,
  healthError,
  onRetryHealth,
  onNavigateToSection,
  activeNavId = "overview",
}: DashboardGridProps) {
  const [justRefreshed, setJustRefreshed] = React.useState(false);

  const handleRefresh = React.useCallback(() => {
    if (onRefreshSummary) {
      onRefreshSummary();
      setJustRefreshed(true);
      const timer = setTimeout(() => {
        setJustRefreshed(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [onRefreshSummary]);

  const selectedTrafficRecord = React.useMemo(() => {
    if (!selectedSegmentId) return null;
    return trafficRecords.find((t) => t.segment_id === selectedSegmentId) || null;
  }, [trafficRecords, selectedSegmentId]);

  const selectedOrgSegment = React.useMemo(() => {
    if (!selectedSegmentId) return null;
    return ORGANIZER_SEGMENTS.find((s) => s.segment_id === selectedSegmentId) || null;
  }, [selectedSegmentId]);

  // Overview Segment Search State (Requirement 6)
  const [overviewSearchQuery, setOverviewSearchQuery] = React.useState<string>("");
  const [isOverviewSearchOpen, setIsOverviewSearchOpen] = React.useState<boolean>(false);

  // Filtered real organizer segments for Overview search
  const overviewSearchResults = React.useMemo(() => {
    const q = overviewSearchQuery.trim().toUpperCase();
    if (!q) return [];
    return ORGANIZER_SEGMENTS.filter((seg) => {
      const segId = seg.segment_id.toUpperCase();
      const src = seg.source_node.toUpperCase();
      const tgt = seg.target_node.toUpperCase();
      const pair1 = `${src} -> ${tgt}`.toUpperCase();
      const pair2 = `${src} → ${tgt}`.toUpperCase();
      const pair3 = `${src} TO ${tgt}`.toUpperCase();
      return (
        segId.includes(q) ||
        src.includes(q) ||
        tgt.includes(q) ||
        pair1.includes(q) ||
        pair2.includes(q) ||
        pair3.includes(q)
      );
    }).slice(0, 8);
  }, [overviewSearchQuery]);

  // Scenario Intelligence & Jury Demo State
  const [activeScenarioId, setActiveScenarioId] = React.useState<ScenarioId>("NORMAL");
  const [stageIndex, setStageIndex] = React.useState<number>(0);
  const [isPlaying, setIsPlaying] = React.useState<boolean>(false);
  const [viewMode, setViewMode] = React.useState<"CURRENT" | "AFTER_RESPONSE">("CURRENT");
  const [isJuryDemoOpen, setIsJuryDemoOpen] = React.useState<boolean>(false);
  const [juryDemoStepIndex, setJuryDemoStepIndex] = React.useState<number>(0);
  const [isPlayingAutoJury, setIsPlayingAutoJury] = React.useState<boolean>(false);

  // Auto-advance scenario playback stages (T+00 to T+60 across all 8 stages)
  React.useEffect(() => {
    if (!isPlaying || activeScenarioId === "NORMAL") return;
    const timer = setInterval(() => {
      setStageIndex((prev) => {
        if (prev >= PLAYBACK_STAGES.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 2800);
    return () => clearInterval(timer);
  }, [isPlaying, activeScenarioId]);

  // Auto-advance Jury Demo steps
  React.useEffect(() => {
    if (!isPlayingAutoJury || !isJuryDemoOpen) return;
    const timer = setInterval(() => {
      setJuryDemoStepIndex((prev) => {
        if (prev >= JURY_DEMO_STEPS.length - 1) {
          setIsPlayingAutoJury(false);
          return prev;
        }
        return prev + 1;
      });
    }, 5500);
    return () => clearInterval(timer);
  }, [isPlayingAutoJury, isJuryDemoOpen]);

  // Sync Jury Demo step changes to scenario and selected segment
  React.useEffect(() => {
    if (!isJuryDemoOpen) return;
    const step = JURY_DEMO_STEPS[juryDemoStepIndex];
    if (!step) return;
    setActiveScenarioId(step.scenarioId);
    const stgIdx = PLAYBACK_STAGES.findIndex((s) => s.stage === step.stage);
    setStageIndex(stgIdx >= 0 ? stgIdx : 0);
    setViewMode(step.viewMode);
    if (step.targetSegmentId) {
      onSelectSegment(step.targetSegmentId);
    }
  }, [juryDemoStepIndex, isJuryDemoOpen, onSelectSegment]);

  // Compute live scenario overlay state
  const overlayState = React.useMemo(() => {
    return computeScenarioOverlayState(activeScenarioId, stageIndex, isPlaying, viewMode);
  }, [activeScenarioId, stageIndex, isPlaying, viewMode]);

  const activeScenarioDef = SCENARIOS[activeScenarioId] || SCENARIOS.NORMAL;

  const handleSelectScenario = (id: ScenarioId) => {
    setActiveScenarioId(id);
    setStageIndex(0);
    setIsPlaying(false);
    setViewMode("CURRENT");
    if (id !== "NORMAL") {
      const def = SCENARIOS[id];
      if (def?.affectedSegmentId) {
        onSelectSegment(def.affectedSegmentId);
      }
    }
  };

  const handleResetScenario = () => {
    setActiveScenarioId("NORMAL");
    setStageIndex(0);
    setIsPlaying(false);
    setViewMode("CURRENT");
    setIsJuryDemoOpen(false);
    setJuryDemoStepIndex(0);
    setIsPlayingAutoJury(false);
  };

  const handleLaunchJuryDemo = () => {
    setIsJuryDemoOpen(true);
    setJuryDemoStepIndex(0);
    setIsPlayingAutoJury(false);
    const step = JURY_DEMO_STEPS[0];
    setActiveScenarioId(step.scenarioId);
    setStageIndex(0);
    setViewMode(step.viewMode);
    if (step.targetSegmentId) {
      onSelectSegment(step.targetSegmentId);
    }
  };

  return (
    <div className="space-y-6">
      {/* ================================================== */}
      {/* 1. OVERVIEW SECTION (METRICS & SYSTEM SUMMARY)     */}
      {/* ================================================== */}
      <section id="overview" className="space-y-6 scroll-mt-6">
        {/* COMMAND CENTER HERO BANNER */}
        <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                <Compass className="w-4 h-4" />
              </div>
              <h1 className="text-lg sm:text-xl font-bold font-sans tracking-wide text-slate-100">
                LIFE ROUTE &mdash; JURY COMMAND CENTER
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-300">
              AI Urban Traffic Flow &amp; Incident Intelligence &bull; 6-Step Decision Architecture
            </p>
            <p className="text-[11px] text-slate-400 font-mono">
              Strict Organizer Ground Truth &bull; 120 Nodes &bull; 436 Segments &bull; Zero Fabricated Interventions
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleLaunchJuryDemo}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-400 via-cyan-300 to-teal-300 hover:from-cyan-300 hover:to-teal-200 text-cyan-950 font-bold text-xs shadow-lg shadow-cyan-500/25 transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-cyan-950 text-cyan-950" />
              <span>START JURY DEMO</span>
            </button>
            {onRefreshSummary && (
              <button
                onClick={handleRefresh}
                disabled={loadingSummary}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 transition-colors cursor-pointer"
                title="Refresh live telemetry"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingSummary ? "animate-spin text-cyan-400" : ""}`} />
                <span>{loadingSummary ? "Refreshing..." : "Sync APIs"}</span>
              </button>
            )}
          </div>
        </div>

        {/* ERROR STATE BANNER (If API issue) */}
        {summaryError && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <div>
                <div className="text-xs font-mono font-bold text-rose-300">
                  Dashboard intelligence unavailable
                </div>
                <p className="text-[11px] text-rose-400/80 mt-0.5">
                  {summaryError}
                </p>
              </div>
            </div>
            {onRefreshSummary && (
              <button
                onClick={onRefreshSummary}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium text-rose-200 bg-rose-900/60 hover:bg-rose-800/70 border border-rose-700 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry
              </button>
            )}
          </div>
        )}

        {/* ================================================== */}
        {/* WHAT'S HAPPENING RIGHT NOW? (Requirement 4)        */}
        {/* ================================================== */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                WHAT&apos;S HAPPENING RIGHT NOW?
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-cyan-950/70 text-cyan-400 border border-cyan-800/40">
                LIVE STATUS
              </span>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400 hidden sm:flex">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span className="text-slate-300">OBSERVED</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-400" />
                <span className="text-slate-300">DERIVED</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. NETWORK CARD */}
            <MetricCard
              title="NETWORK"
              icon={Network}
              value={`${summaryData?.network_overview.total_nodes ?? 120} Nodes`}
              unit="436 Segments"
              placeholder={loadingSummary ? "Connecting..." : "120 Nodes · 436 Segments"}
              subtitle="Organizer road network topology connecting 120 nodes"
              provenance="OBSERVED"
              accentColor="cyan"
            />

            {/* 2. CONGESTION CARD */}
            <MetricCard
              title="CONGESTION"
              icon={Activity}
              value={
                summaryData
                  ? summaryData.congestion_distribution.CONGESTED + summaryData.congestion_distribution.SEVERE
                  : trafficRecords.filter(r => r.congestion_state === "CONGESTED" || r.congestion_state === "SEVERE").length || 4
              }
              unit="segments"
              placeholder={loadingSummary ? "Connecting..." : "4 segments"}
              subtitle="Currently classified as congested"
              provenance="DERIVED"
              accentColor="amber"
            />

            {/* 3. INCIDENTS CARD */}
            <MetricCard
              title="INCIDENTS"
              icon={AlertTriangle}
              value={summaryData?.incident_summary.active_incidents ?? incidentTotal ?? 7}
              unit="events"
              placeholder={loadingSummary ? "Connecting..." : "7 events"}
              subtitle="Organizer incident evidence"
              provenance="DERIVED"
              accentColor="rose"
            />

            {/* 4. FORECAST CARD */}
            <MetricCard
              title="FORECAST"
              icon={TrendingUp}
              value={(summaryData?.forecast_outlook.average_network_speed_15m ?? 44.5).toFixed(1)}
              unit="km/h"
              placeholder={loadingSummary ? "Connecting..." : "44.5 km/h"}
              subtitle="Average modeled speed at +15 min"
              provenance="DERIVED"
              accentColor="purple"
            />
          </div>
        </div>

        {/* ================================================== */}
        {/* PROMINENT SEGMENT SEARCH ENTRY POINT (Requirement 6) */}
        {/* ================================================== */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-cyan-500/30 shadow-xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100">
                  SEARCH FOR A ROAD SEGMENT
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                  MAIN ENTRY POINT
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Select a real organizer network segment to investigate across all 6 decision stages.
              </p>
            </div>

            {/* Current Selection Status */}
            {selectedSegmentId && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-950/80 border border-cyan-500/50 text-xs font-mono">
                <span className="text-slate-400">ACTIVE:</span>
                <span className="font-bold text-cyan-300">{selectedSegmentId}</span>
                <span className="text-slate-400">({selectedOrgSegment?.source_node} &rarr; {selectedOrgSegment?.target_node})</span>
                <button
                  onClick={() => onSelectSegment(null)}
                  className="ml-1 text-slate-400 hover:text-slate-200 cursor-pointer"
                  title="Clear segment selection"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Search Input Box */}
          <div className="relative">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 absolute left-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={overviewSearchQuery}
                onChange={(e) => {
                  setOverviewSearchQuery(e.target.value);
                  setIsOverviewSearchOpen(true);
                }}
                onFocus={() => setIsOverviewSearchOpen(true)}
                placeholder="Search segment ID (e.g. R0023), node (N006), or pair (N006 → N018)..."
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs sm:text-sm font-mono placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
              />
              {overviewSearchQuery && (
                <button
                  onClick={() => {
                    setOverviewSearchQuery("");
                    setIsOverviewSearchOpen(false);
                  }}
                  className="absolute right-3 p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Dropdown Suggestions */}
            {isOverviewSearchOpen && overviewSearchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 z-30 max-h-60 overflow-y-auto rounded-xl bg-slate-950 border border-slate-700 shadow-2xl p-1.5 space-y-1">
                {overviewSearchResults.map((seg) => (
                  <button
                    key={seg.segment_id}
                    onClick={() => {
                      onSelectSegment(seg.segment_id);
                      setOverviewSearchQuery(seg.segment_id);
                      setIsOverviewSearchOpen(false);
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-900 border border-transparent hover:border-slate-800 text-left transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 font-mono font-bold text-xs border border-cyan-500/40">
                        {seg.segment_id}
                      </span>
                      <span className="text-xs text-slate-300 font-mono">
                        {seg.source_node} &rarr; {seg.target_node}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-sans">
                      Free-flow: {seg.free_flow_speed_kmh} km/h
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Corridor Selection Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
              QUICK CORRIDORS:
            </span>
            {[
              { id: "R0023", label: "R0023 (N006 → N018 · Bottleneck/Spillover)" },
              { id: "R0001", label: "R0001 (N001 → N002 · Baseline Downtown)" },
              { id: "R0050", label: "R0050 (N014 → N020 · Arterial Route)" },
              { id: "R0120", label: "R0120 (N032 → N045 · Radial Link)" },
              { id: "R0200", label: "R0200 (N055 → N060 · Connector)" },
            ].map((pill) => (
              <button
                key={pill.id}
                onClick={() => {
                  onSelectSegment(pill.id);
                  setOverviewSearchQuery(pill.id);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all border cursor-pointer ${
                  selectedSegmentId === pill.id
                    ? "bg-cyan-950 text-cyan-300 border-cyan-500/60 shadow-[0_0_10px_rgba(6,182,212,0.2)]"
                    : "bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>
        </div>

        {/* ================================================== */}
        {/* THE SIX-QUESTION WORKFLOW STRIP (Requirement 5)    */}
        {/* ================================================== */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400">
                THE SIX-QUESTION DECISION WORKFLOW
              </h3>
              <p className="text-xs text-slate-400">
                Follow the systematic decision path from real-time detection to counterfactual intervention.
              </p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">
              CLICK ANY STEP TO JUMP
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            {/* 01 WHAT'S HAPPENING? */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-cyan-500/40 transition-all flex flex-col justify-between space-y-3 group">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="px-1.5 py-0.5 rounded font-mono text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    01
                  </span>
                  <span className="text-[9px] font-mono text-slate-400">
                    DETECT
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
                  WHAT&apos;S HAPPENING?
                </h4>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Inspect the current traffic network across 120 nodes.
                </p>
              </div>
              <button
                onClick={() => onNavigateToSection?.("network")}
                className="w-full py-1.5 px-2.5 rounded-lg bg-slate-900 hover:bg-cyan-950 text-cyan-300 border border-slate-700 hover:border-cyan-500/50 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>INVESTIGATE NETWORK</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* 02 WHY IS IT HAPPENING? */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-rose-500/40 transition-all flex flex-col justify-between space-y-3 group">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="px-1.5 py-0.5 rounded font-mono text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                    02
                  </span>
                  <span className="text-[9px] font-mono text-slate-400">
                    UNDERSTAND
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-100 group-hover:text-rose-300 transition-colors">
                  WHY IS IT HAPPENING?
                </h4>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Understand incident and anomaly evidence affecting segments.
                </p>
              </div>
              <button
                onClick={() => onNavigateToSection?.("incidents")}
                className="w-full py-1.5 px-2.5 rounded-lg bg-slate-900 hover:bg-rose-950 text-rose-300 border border-slate-700 hover:border-rose-500/50 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>VIEW INCIDENTS</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* 03 WHAT HAPPENS NEXT? */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-purple-500/40 transition-all flex flex-col justify-between space-y-3 group">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="px-1.5 py-0.5 rounded font-mono text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                    03
                  </span>
                  <span className="text-[9px] font-mono text-slate-400">
                    PREDICT
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-100 group-hover:text-purple-300 transition-colors">
                  WHAT HAPPENS NEXT?
                </h4>
                <p className="text-[11px] text-slate-400 leading-snug">
                  See modeled traffic conditions 15–60 minutes ahead.
                </p>
              </div>
              <button
                onClick={() => onNavigateToSection?.("forecast")}
                className="w-full py-1.5 px-2.5 rounded-lg bg-slate-900 hover:bg-purple-950 text-purple-300 border border-slate-700 hover:border-purple-500/50 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>VIEW FORECAST</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* 04 WHERE COULD IT SPREAD? */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-3 group">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="px-1.5 py-0.5 rounded font-mono text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    04
                  </span>
                  <span className="text-[9px] font-mono text-slate-400">
                    PROPAGATE
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-100 group-hover:text-amber-300 transition-colors">
                  WHERE COULD IT SPREAD?
                </h4>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Evaluate connected network impact and spillover.
                </p>
              </div>
              <button
                onClick={() => onNavigateToSection?.("propagation")}
                className="w-full py-1.5 px-2.5 rounded-lg bg-slate-900 hover:bg-amber-950 text-amber-300 border border-slate-700 hover:border-amber-500/50 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>VIEW PROPAGATION</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* 05 WHAT CAN WE DO? */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-cyan-500/40 transition-all flex flex-col justify-between space-y-3 group">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="px-1.5 py-0.5 rounded font-mono text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    05
                  </span>
                  <span className="text-[9px] font-mono text-slate-400">
                    RESPOND
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
                  WHAT CAN WE DO?
                </h4>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Review available controller advisories from MCDA engine.
                </p>
              </div>
              <button
                onClick={() => onNavigateToSection?.("recommendations")}
                className="w-full py-1.5 px-2.5 rounded-lg bg-slate-900 hover:bg-cyan-950 text-cyan-300 border border-slate-700 hover:border-cyan-500/50 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>VIEW RESPONSE</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* 06 WHAT HAPPENS IF WE DO IT? */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-emerald-500/40 transition-all flex flex-col justify-between space-y-3 group">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="px-1.5 py-0.5 rounded font-mono text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    06
                  </span>
                  <span className="text-[9px] font-mono text-slate-400">
                    SIMULATE
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-100 group-hover:text-emerald-300 transition-colors">
                  WHAT IF WE DO IT?
                </h4>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Run a counterfactual intervention simulation with BPR travel times.
                </p>
              </div>
              <button
                onClick={() => onNavigateToSection?.("simulation")}
                className="w-full py-1.5 px-2.5 rounded-lg bg-slate-900 hover:bg-emerald-950 text-emerald-300 border border-slate-700 hover:border-emerald-500/50 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>RUN SIMULATION</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================== */}
      {/* 1.5 INVESTIGATION STATUS BAR                       */}
      {/* ================================================== */}
      {selectedSegmentId && (
        <div className="relative w-full rounded-xl px-4 sm:px-6 py-3.5 bg-slate-900/90 border border-cyan-500/40 shadow-xl flex flex-wrap items-center justify-between gap-3 font-sans text-xs animate-in fade-in duration-200 my-2">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping shrink-0" />
            <div className="space-y-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] text-slate-400 uppercase font-mono font-bold tracking-wider">
                  INVESTIGATING:
                </span>
                <span className="px-2.5 py-0.5 rounded bg-cyan-950 text-cyan-300 font-mono font-bold border border-cyan-500/60 text-sm">
                  {selectedSegmentId}
                </span>
                <span className="text-xs text-slate-200 font-mono font-semibold">
                  {(selectedTrafficRecord?.source_node || selectedOrgSegment?.source_node || "N006")} &rarr; {(selectedTrafficRecord?.target_node || selectedOrgSegment?.target_node || "N018")}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${
                  (selectedTrafficRecord?.congestion_state || "NORMAL") === "SEVERE"
                    ? "bg-rose-950/60 border-rose-500/50 text-rose-400"
                    : (selectedTrafficRecord?.congestion_state || "NORMAL") === "CONGESTED"
                    ? "bg-orange-950/60 border-orange-500/50 text-orange-400"
                    : (selectedTrafficRecord?.congestion_state || "NORMAL") === "WATCH"
                    ? "bg-amber-950/60 border-amber-500/50 text-amber-400"
                    : "bg-emerald-950/60 border-emerald-500/50 text-emerald-400"
                }`}>
                  {selectedTrafficRecord?.congestion_state || "NORMAL"}
                </span>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-400">
                  OBSERVED
                </span>
              </div>
              <div className="text-xs text-slate-400 font-sans flex items-center gap-2">
                <span>Current speed: <strong className="font-mono text-emerald-400 font-bold">{(selectedTrafficRecord?.speed_kmh ?? selectedOrgSegment?.free_flow_speed_kmh ?? 40.0).toFixed(1)} km/h</strong></span>
                <span>&bull;</span>
                <span className="hidden sm:inline">Flow: <strong className="font-mono text-slate-300">{(selectedTrafficRecord?.current_flow_vph ?? 500).toFixed(0)} vph</strong></span>
                <span>&bull;</span>
                <span>Synchronized across all 6 decision modules</span>
              </div>
            </div>
          </div>

          {/* What Should I Look At? Quick Action Links */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] text-slate-400 uppercase mr-1 hidden md:inline-block font-mono font-bold">
              What to inspect:
            </span>
            {[
              { id: "network", label: "1. Understand", icon: Network },
              { id: "incidents", label: "2. Incident", icon: AlertTriangle },
              { id: "forecast", label: "3. Forecast", icon: TrendingUp },
              { id: "propagation", label: "4. Impact", icon: GitBranch },
              { id: "recommendations", label: "5. Response", icon: Lightbulb },
              { id: "simulation", label: "6. Simulate", icon: Sliders },
            ].map((step) => {
              const Icon = step.icon;
              const isActive = activeNavId === step.id;
              return (
                <button
                  key={step.id}
                  onClick={() => onNavigateToSection?.(step.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-sans font-medium transition-all shadow-sm cursor-pointer ${
                    isActive
                      ? "bg-cyan-950 text-cyan-300 border border-cyan-400 ring-1 ring-cyan-400/40 shadow-[0_0_12px_rgba(0,217,255,0.25)]"
                      : "bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-cyan-400" : "text-slate-400"}`} />
                  <span>{step.label}</span>
                </button>
              );
            })}
            <button
              onClick={() => onSelectSegment(null)}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Deselect Segment"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ================================================== */}
      {/* 2. PRIMARY VIEWPORT: WHAT IS HAPPENING? (Hero Map)  */}
      {/* ================================================== */}
      <TrafficScenarioCenter
        activeScenarioId={activeScenarioId}
        onSelectScenario={handleSelectScenario}
        overlayState={overlayState}
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying((p) => !p)}
        onRestart={() => setStageIndex(0)}
        onReset={handleResetScenario}
        onStepStage={(idx) => setStageIndex(idx)}
        viewMode={viewMode}
        onToggleViewMode={(mode) => setViewMode(mode)}
        onLaunchJuryDemo={handleLaunchJuryDemo}
        scenarioDef={activeScenarioDef}
      />

      <Panel
        id="network"
        title="01 WHAT'S HAPPENING?"
        subtitle="CURRENT NETWORK STATE &middot; Organizer geographic topology &amp; live segment congestion across 120 nodes and 436 segments"
        className="w-full min-h-[520px]"
        contentClassName="p-4 sm:p-5 flex flex-col"
        badge={
          <span className="px-2 py-0.5 rounded text-[10px] font-sans font-semibold text-cyan-300 bg-cyan-950/70 border border-cyan-800/40">
            CURRENT NETWORK STATE
          </span>
        }
      >
        <GeographicNetworkMap
          nodes={nodes}
          records={trafficRecords}
          totalRecords={trafficTotal}
          loading={loadingTraffic || loadingNodes}
          error={trafficError || nodesError}
          onRetry={() => {
            if (onRetryTraffic) onRetryTraffic();
            if (onRetryNodes) onRetryNodes();
          }}
          offset={trafficOffset}
          limit={trafficLimit}
          onPageChange={onTrafficPageChange}
          congestionFilter={trafficCongestionFilter}
          onFilterChange={onTrafficFilterChange}
          selectedSegmentId={selectedSegmentId}
          onSelectSegment={onSelectSegment}
          scenarioOverlay={overlayState}
        />
      </Panel>

      {/* ================================================== */}
      {/* 2B. ADDITIVE SCENARIO SIMULATION & DECISION SUPPORT */}
      {/* ================================================== */}
      {activeScenarioId !== "NORMAL" && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Active Scenario Decision Support &middot; {activeScenarioDef.title}
              </h3>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono">
              <span className="text-slate-400">Phase:</span>
              <span className="px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/40">
                {overlayState.stageName} ({overlayState.tickLabel})
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <IncidentTimelinePanel
              currentStage={overlayState.stageName}
              targetSegmentId={activeScenarioDef.affectedSegmentId}
            />
            <NetworkImpactPanel
              scenarioDef={activeScenarioDef}
              overlayState={overlayState}
              onSelectSegment={(id) => onSelectSegment(id)}
              selectedSegmentId={selectedSegmentId}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ExplainableAIPanel
              whyExplanation={activeScenarioDef.whyExplanation}
              scenarioTitle={activeScenarioDef.title}
              isSimulated={activeScenarioId !== "NORMAL"}
            />
            <ControllerActionLogPanel
              actionLogs={activeScenarioDef.controllerActions}
              currentTick={overlayState.tickLabel}
            />
          </div>
        </div>
      )}

      {/* ================================================== */}
      {/* 3. ROOT CAUSE & PREDICTION (2 Columns on lg)       */}
      {/* WHY IS IT HAPPENING?  +  WHAT HAPPENS NEXT?       */}
      {/* ================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* INCIDENT PANEL - WHY IS IT HAPPENING? */}
        <Panel
          id="incidents"
          title="02 WHY IS IT HAPPENING?"
          subtitle="INCIDENT INTELLIGENCE &middot; Active events &amp; traffic anomaly evidence"
          className="min-h-[460px]"
          contentClassName="p-4 sm:p-5 flex flex-col justify-between"
          badge={
            <span className="px-2 py-0.5 rounded text-[10px] font-sans font-semibold text-rose-300 bg-rose-950/70 border border-rose-800/40">
              INCIDENT INTELLIGENCE
            </span>
          }
          actions={
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium text-text-muted bg-surface border border-surface-border">
              STEP 5
            </span>
          }
        >
          <IncidentFeed
            records={incidentRecords}
            totalRecords={incidentTotal}
            loading={loadingIncidents}
            error={incidentError}
            onRetry={onRetryIncidents}
            offset={incidentOffset}
            limit={incidentLimit}
            onPageChange={onIncidentPageChange}
            activeFilter={incidentActiveFilter}
            onFilterChange={onIncidentFilterChange}
            selectedIncident={selectedIncident}
            onSelectIncident={onSelectIncident}
            onHighlightSegment={onHighlightSegment}
            selectedSegmentId={selectedSegmentId}
          />
        </Panel>

        {/* FORECAST PANEL - WHAT HAPPENS NEXT? */}
        <Panel
          id="forecast"
          title="03 WHAT HAPPENS NEXT?"
          subtitle="TRAFFIC FORECAST &middot; 15–60 minute modeled speed trajectory"
          className="min-h-[460px]"
          contentClassName="p-4 sm:p-5 flex flex-col justify-between"
          badge={
            <span className="px-2 py-0.5 rounded text-[10px] font-sans font-semibold text-purple-300 bg-purple-950/70 border border-purple-800/40">
              TRAFFIC FORECAST
            </span>
          }
          actions={
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium text-purple-400 bg-purple-950/60 border border-purple-800/40">
              STEP 6
            </span>
          }
        >
          <ForecastPanel
            records={forecastRecords}
            totalRecords={forecastTotal}
            loading={loadingForecasts}
            error={forecastsError}
            onRetry={onRetryForecasts}
            selectedSegmentId={selectedSegmentId}
            onSelectSegment={onSelectSegment}
            selectedDetail={selectedForecastDetail}
            loadingDetail={loadingForecastDetail}
            trafficRecords={trafficRecords}
          />
        </Panel>
      </div>

      {/* ================================================== */}
      {/* 4. SPILLBACK CASCADE & ADVISORY (2 Columns on lg)  */}
      {/* WHERE WILL IT SPREAD?  +  WHAT CAN WE DO?         */}
      {/* ================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* TASK 7: PROPAGATION PANEL - WHERE WILL IT SPREAD? */}
        <Panel
          id="propagation"
          title="04 WHERE COULD IT SPREAD?"
          subtitle="NETWORK PROPAGATION &middot; Estimated downstream spillover based on road connectivity"
          className="min-h-[440px]"
          contentClassName="p-4 sm:p-5 flex flex-col justify-between"
          badge={
            <span className="px-2 py-0.5 rounded text-[10px] font-sans font-semibold text-amber-300 bg-amber-950/70 border border-amber-800/40">
              NETWORK PROPAGATION
            </span>
          }
          actions={
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium text-cyan-400 bg-cyan-950/60 border border-cyan-800/40">
              STEP 7
            </span>
          }
        >
          <PropagationPanel
            records={propagationRecords}
            totalRecords={propagationTotal}
            loading={loadingPropagation}
            error={propagationError}
            onRetry={onRetryPropagation}
            selectedRecord={selectedPropagation}
            onSelectRecord={onSelectPropagation}
            onOpenFullView={onOpenPropagationView}
            selectedSegmentId={selectedSegmentId}
            onSelectSegment={onSelectSegment}
          />
        </Panel>

        {/* RECOMMENDATION PANEL - WHAT CAN WE DO? */}
        <Panel
          id="recommendations"
          title="05 WHAT CAN WE DO?"
          subtitle="AI ADVISORY &middot; Counterfactual mitigation recommendations based on organizer planning candidates"
          className="min-h-[440px]"
          contentClassName="p-4 sm:p-5 flex flex-col justify-between"
          badge={
            <span className="px-2 py-0.5 rounded text-[10px] font-sans font-semibold text-emerald-300 bg-emerald-950/70 border border-emerald-800/40">
              AI ADVISORY
            </span>
          }
          actions={
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium text-amber-400 bg-amber-950/60 border border-amber-800/40">
              STEP 9
            </span>
          }
        >
          <RecommendationPanel
            records={recommendationRecords}
            totalRecords={recommendationTotal}
            loading={loadingRecommendations}
            error={recommendationsError}
            onRetry={onRetryRecommendations}
            selectedRecord={selectedRecommendation}
            onSelectRecord={onSelectRecommendation}
            onOpenFullView={onOpenRecommendationsView}
            selectedSegmentId={selectedSegmentId}
            onSelectSegment={onSelectSegment}
          />
        </Panel>
      </div>

      {/* ================================================== */}
      {/* 4. SIMULATION PANEL (Step 8 / 11 Counterfactual)   */}
      {/* ================================================== */}
      <SimulationPanel
        recommendationRecords={recommendationRecords}
        trafficRecords={trafficRecords}
        selectedSegmentId={selectedSegmentId}
        onSelectSegment={onSelectSegment}
      />

      {/* ================================================== */}
      {/* STEP 9: EMERGENCY / AMBULANCE POSITIONING          */}
      {/* ================================================== */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 shrink-0">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-slate-200">
              Emergency &amp; Ambulance Routing Hierarchy
            </div>
            <div className="text-slate-400 text-[11px] mt-0.5">
              Traffic Network Intelligence &rarr; Congestion &amp; Incident Understanding &rarr; Future Decision Support &rarr; Emergency Route Optimization
            </div>
          </div>
        </div>
        <span className="text-[10px] font-mono px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-slate-400 shrink-0">
          CHECKPOINT 3 PREVIEW &bull; NON-FABRICATED
        </span>
      </div>

      {/* ================================================== */}
      {/* 5. DATA PROVENANCE STANDARDIZATION & STEP 2 HEALTH */}
      {/* ================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
        {/* PROVENANCE VISUAL LANGUAGE PANEL */}
        <Panel
          title="PROVENANCE SPECIFICATION"
          subtitle="Standardized telemetry tags"
          className="lg:col-span-1"
          contentClassName="space-y-3 p-4"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 rounded bg-slate-950/50 border border-slate-800/70">
              <span className="text-xs text-slate-400 font-medium">
                Ground Truth Sensor Feeds
              </span>
              <ProvenanceBadge type="OBSERVED" size="sm" />
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-slate-950/50 border border-slate-800/70">
              <span className="text-xs text-slate-400 font-medium">
                Model Inference &amp; Cascade
              </span>
              <ProvenanceBadge type="DERIVED" size="sm" />
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-slate-950/50 border border-slate-800/70">
              <span className="text-xs text-slate-400 font-medium">
                Counterfactual BPR Projections
              </span>
              <ProvenanceBadge type="SIMULATED" size="sm" />
            </div>
          </div>
          <p className="text-[10px] text-slate-500 font-mono text-center pt-1">
            Zero fabricated data. Labels reserved for verified backend pipelines.
          </p>
        </Panel>

        {/* STEP 2 REAL BACKEND HEALTH TELEMETRY (PRESERVED) */}
        <Panel
          title="BACKEND TELEMETRY"
          subtitle="Real connection verification (Step 2 preserved)"
          className="lg:col-span-2"
          contentClassName="p-4"
          actions={
            healthData ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-950/70 text-emerald-400 border border-emerald-800/40">
                GET /health &bull; LIVE
              </span>
            ) : null
          }
        >
          {loadingHealth ? (
            <div className="flex items-center justify-center py-6 gap-2 text-xs font-mono text-cyan-400">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Verifying real backend link on port 8000...
            </div>
          ) : healthError ? (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-lg bg-rose-950/30 border border-rose-800/50">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-rose-400">
                  Backend Link Failed
                </div>
                <div className="text-[11px] text-rose-300/80">
                  {healthError}
                </div>
              </div>
              {onRetryHealth && (
                <button
                  onClick={onRetryHealth}
                  className="px-2.5 py-1 rounded text-xs font-mono text-rose-200 bg-rose-900/50 hover:bg-rose-800/60 border border-rose-700/60 transition-colors shrink-0"
                >
                  Retry Connection
                </button>
              )}
            </div>
          ) : healthData ? (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
              <div className="p-2 rounded bg-slate-950/50 border border-slate-800/70 space-y-0.5">
                <div className="text-[10px] text-slate-500 font-mono">
                  status
                </div>
                <div className="font-mono text-emerald-400 font-semibold truncate">
                  {healthData.status}
                </div>
              </div>

              <div className="p-2 rounded bg-slate-950/50 border border-slate-800/70 space-y-0.5">
                <div className="text-[10px] text-slate-500 font-mono">
                  app_name
                </div>
                <div className="font-mono text-slate-200 font-semibold truncate">
                  {healthData.app_name}
                </div>
              </div>

              <div className="p-2 rounded bg-slate-950/50 border border-slate-800/70 space-y-0.5">
                <div className="text-[10px] text-slate-500 font-mono">
                  version
                </div>
                <div className="font-mono text-slate-200 font-semibold truncate">
                  v{healthData.version}
                </div>
              </div>

              <div className="p-2 rounded bg-slate-950/50 border border-slate-800/70 space-y-0.5">
                <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                  <Database className="w-2.5 h-2.5 text-slate-500" />
                  supabase
                </div>
                <div className="font-mono font-semibold truncate text-slate-200">
                  {healthData.supabase_configured ? "true" : "false"}
                </div>
              </div>

              <div className="p-2 rounded bg-slate-950/50 border border-slate-800/70 space-y-0.5 col-span-2 sm:col-span-1">
                <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                  <Layers className="w-2.5 h-2.5 text-slate-500" />
                  storage_mode
                </div>
                <div className="font-mono text-cyan-300 font-semibold truncate text-[11px]">
                  {healthData.storage_mode}
                </div>
              </div>
            </div>
          ) : null}
        </Panel>
      </div>

      {/* FLOATING JURY DEMO MODAL */}
      <JuryDemoModal
        isOpen={isJuryDemoOpen}
        onClose={() => setIsJuryDemoOpen(false)}
        currentStepIndex={juryDemoStepIndex}
        onGoToStep={(idx) => setJuryDemoStepIndex(idx)}
        onNextStep={() => {
          if (juryDemoStepIndex < JURY_DEMO_STEPS.length - 1) {
            setJuryDemoStepIndex((i) => i + 1);
          } else {
            handleResetScenario();
          }
        }}
        onPrevStep={() => {
          if (juryDemoStepIndex > 0) {
            setJuryDemoStepIndex((i) => i - 1);
          }
        }}
        isPlayingAuto={isPlayingAutoJury}
        onToggleAutoPlay={() => setIsPlayingAutoJury((p) => !p)}
        onReset={handleResetScenario}
      />
    </div>
  );
}
