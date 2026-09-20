/**
 * Scenario Intelligence & Jury Demo Types
 * 
 * STRICT INTEGRITY:
 * - Operates strictly on the 436 organizer segments and 120 organizer nodes.
 * - Zero synthetic or fabricated roads.
 * - All simulation states explicitly tagged as SIMULATED / DEMO MODE.
 */

export type ScenarioId =
  | "NORMAL"
  | "ACCIDENT"
  | "ROAD_CLOSURE"
  | "LARGE_EVENT"
  | "EMERGENCY"
  | "SUDDEN_CONGESTION"
  | "RECURRING_BOTTLENECK";

export type PlaybackStage =
  | "NORMAL"
  | "INCIDENT"
  | "ASSESS"
  | "CONGESTION"
  | "PROPAGATION"
  | "RESPONSE"
  | "MONITORING"
  | "RECOVERY";

export type SegmentScenarioRole =
  | "NORMAL"
  | "AFFECTED"
  | "INCIDENT"
  | "CLOSED"
  | "AT_RISK"
  | "RECOMMENDED_CORRIDOR"
  | "EMERGENCY_ROUTE"
  | "MONITORED"
  | "RECOVERY";

export type TimelinePhase = "DETECT" | "ASSESS" | "PREDICT" | "RESPOND" | "MONITOR";

export const PHASE_ORDER: Record<TimelinePhase, number> = {
  DETECT: 0,
  ASSESS: 1,
  PREDICT: 2,
  RESPOND: 3,
  MONITOR: 4,
};

export const STAGE_TO_TIMELINE_PHASE: Record<PlaybackStage, TimelinePhase> = {
  NORMAL: "DETECT",
  INCIDENT: "DETECT",
  ASSESS: "ASSESS",
  CONGESTION: "ASSESS",
  PROPAGATION: "PREDICT",
  RESPONSE: "RESPOND",
  MONITORING: "MONITOR",
  RECOVERY: "MONITOR",
};

export interface ActionLogEntry {
  tick: string; // e.g. "T+00", "T+05", "T+10"
  action: string;
  detail: string;
  severity?: "info" | "warning" | "critical" | "success";
}

export interface ScenarioDefinition {
  id: ScenarioId;
  title: string;
  badgeLabel: string;
  description: string;
  targetDescription: string;
  affectedSegmentId: string;
  affectedNodeIds: string[];
  connectedSegmentIds: string[];
  atRiskSegmentIds: string[];
  recommendedCorridorIds: string[];
  emergencyRouteIds?: string[];
  emergencyOriginNode?: string;
  emergencyDestinationNode?: string;
  stageAliases?: Partial<Record<PlaybackStage, string>>;
  specificResultTitle?: string;
  specificResultDetail?: string;
  specificResultProvenance?: "OBSERVED" | "DERIVED" | "SIMULATED" | "HISTORICAL";
  whyExplanation: string[];
  narrationText: string;
  controllerActions: ActionLogEntry[];
}

export interface ScenarioOverlayState {
  scenarioId: ScenarioId;
  scenarioTitle: string;
  stageName: PlaybackStage;
  stageLabel: string;
  tickLabel: string; // "T+00", "T+10", ...
  stageIndex: number;
  timelinePhase: TimelinePhase;
  targetSegmentId: string;
  isPlaying: boolean;
  viewMode: "CURRENT" | "AFTER_RESPONSE";
  affectedSegmentIds: string[];
  atRiskSegmentIds: string[];
  recommendedSegmentIds: string[];
  emergencyRouteSegmentIds: string[];
  closedSegmentIds: string[];
  monitoredSegmentIds: string[];
  highlightNodeIds: string[];
  propagationPairs: { fromSeg: string; toSeg: string }[];
  narration: string;
}

export interface JuryDemoStep {
  stepNumber: number;
  totalSteps: number;
  stepTitle: string;
  scenarioId: ScenarioId;
  stage: PlaybackStage;
  viewMode: "CURRENT" | "AFTER_RESPONSE";
  targetSegmentId: string;
  presenterNarration: string;
  systemActionSummary: string;
}

export const STAGE_TICKS: Record<PlaybackStage, string> = {
  NORMAL: "T+00",
  INCIDENT: "T+05",
  ASSESS: "T+15",
  CONGESTION: "T+25",
  PROPAGATION: "T+35",
  RESPONSE: "T+45",
  MONITORING: "T+55",
  RECOVERY: "T+60",
};

export const PLAYBACK_STAGE_NAMES: PlaybackStage[] = [
  "NORMAL",
  "INCIDENT",
  "ASSESS",
  "CONGESTION",
  "PROPAGATION",
  "RESPONSE",
  "MONITORING",
  "RECOVERY",
];

export const PLAYBACK_STAGES: { stage: PlaybackStage; tick: string; progressPct: number }[] = [
  { stage: "NORMAL", tick: "T+00", progressPct: 0 },
  { stage: "INCIDENT", tick: "T+05", progressPct: 14 },
  { stage: "ASSESS", tick: "T+15", progressPct: 28 },
  { stage: "CONGESTION", tick: "T+25", progressPct: 43 },
  { stage: "PROPAGATION", tick: "T+35", progressPct: 57 },
  { stage: "RESPONSE", tick: "T+45", progressPct: 71 },
  { stage: "MONITORING", tick: "T+55", progressPct: 85 },
  { stage: "RECOVERY", tick: "T+60", progressPct: 100 },
];

export const JURY_DEMO_STEPS: JuryDemoStep[] = [
  {
    stepNumber: 1,
    totalSteps: 13,
    stepTitle: "Citywide Operations Overview",
    scenarioId: "NORMAL",
    stage: "NORMAL",
    viewMode: "CURRENT",
    targetSegmentId: "R0023",
    presenterNarration: "Welcome to LIFEROUTE AI. We are currently observing Hyderabad's real organizer network consisting of exactly 120 nodes and 436 verified road segments. All live telemetry and models are active.",
    systemActionSummary: "Baseline network nominal · 120 nodes synchronized · Zero active simulated disruptions",
  },
  {
    stepNumber: 2,
    totalSteps: 13,
    stepTitle: "Accident Scenario Triggered",
    scenarioId: "ACCIDENT",
    stage: "INCIDENT",
    viewMode: "CURRENT",
    targetSegmentId: "R0023",
    presenterNarration: "Imagine an accident has just occurred on arterial corridor R0023 (connecting Node N006 to N018). Notice how the system detects the anomaly immediately without human sensor delays.",
    systemActionSummary: "Corridor R0023 flagged AFFECTED · Speed drop detected · Controller alert triggered",
  },
  {
    stepNumber: 3,
    totalSteps: 13,
    stepTitle: "Impact on Real Road Segment",
    scenarioId: "ACCIDENT",
    stage: "CONGESTION",
    viewMode: "CURRENT",
    targetSegmentId: "R0023",
    presenterNarration: "The incident is localized on a real organizer corridor. Vehicle discharge drops, creating a localized queue that begins to impact the immediate intersection at Node N006.",
    systemActionSummary: "Corridor R0023 capacity reduced by 65% · Localized queue forming on approach",
  },
  {
    stepNumber: 4,
    totalSteps: 13,
    stepTitle: "Connected Network Evaluation",
    scenarioId: "ACCIDENT",
    stage: "PROPAGATION",
    viewMode: "CURRENT",
    targetSegmentId: "R0023",
    presenterNarration: "Instead of only showing that congestion exists, LIFEROUTE analyzes the connected network graph to see where this traffic problem will spread next.",
    systemActionSummary: "Graph adjacency analyzed · Upstream corridors R0021 and R0018 evaluated for spillover",
  },
  {
    stepNumber: 5,
    totalSteps: 13,
    stepTitle: "Congestion Propagation Cascade",
    scenarioId: "ACCIDENT",
    stage: "PROPAGATION",
    viewMode: "CURRENT",
    targetSegmentId: "R0023",
    presenterNarration: "Downstream connecting corridors R0022 and R0017 are now flagged AT RISK in amber. The spillover trajectory shows the city operator exactly which junctions will seize up if no action is taken.",
    systemActionSummary: "Downstream corridors R0022 and R0017 flagged AT RISK · Cascade path visualized",
  },
  {
    stepNumber: 6,
    totalSteps: 13,
    stepTitle: "Multi-Step Speed Forecasting",
    scenarioId: "ACCIDENT",
    stage: "PROPAGATION",
    viewMode: "CURRENT",
    targetSegmentId: "R0023",
    presenterNarration: "Our causal forecaster projects 15 to 60 minute speed trajectories, confirming that without intervention, upstream speeds will degrade into severe breakdown.",
    systemActionSummary: "15m/30m/45m/60m speed trajectories calculated · Breakdown risk highlighted",
  },
  {
    stepNumber: 7,
    totalSteps: 13,
    stepTitle: "Alternative Corridor Identification",
    scenarioId: "ACCIDENT",
    stage: "RESPONSE",
    viewMode: "CURRENT",
    targetSegmentId: "R0023",
    presenterNarration: "LIFEROUTE identifies a viable connected alternative corridor in emerald green: routing vehicles along R0021 and R0025, which possess sufficient spare capacity.",
    systemActionSummary: "Topological detour R0021 → R0025 identified · Graph connectivity verified",
  },
  {
    stepNumber: 8,
    totalSteps: 13,
    stepTitle: "Controller Decision Support Advisory",
    scenarioId: "ACCIDENT",
    stage: "RESPONSE",
    viewMode: "AFTER_RESPONSE",
    targetSegmentId: "R0023",
    presenterNarration: "Now we toggle to AFTER RESPONSE. The controller can review the explainable advisory: signal timing adjustments and dynamic message signs safely divert traffic away from the bottleneck.",
    systemActionSummary: "Simulated response active · Queue diversion successful · Spillover mitigated",
  },
  {
    stepNumber: 9,
    totalSteps: 13,
    stepTitle: "Emergency Vehicle Priority Dispatch",
    scenarioId: "EMERGENCY",
    stage: "INCIDENT",
    viewMode: "CURRENT",
    targetSegmentId: "R0023",
    presenterNarration: "Now the urgency changes. An ambulance must transit from Node N001 to Node N019 while key arterial segments are congested.",
    systemActionSummary: "Emergency vehicle mission registered: N001 to N019 · Primary route blocked",
  },
  {
    stepNumber: 10,
    totalSteps: 13,
    stepTitle: "Dedicated Emergency Route Advisory",
    scenarioId: "EMERGENCY",
    stage: "RESPONSE",
    viewMode: "AFTER_RESPONSE",
    targetSegmentId: "R0001",
    presenterNarration: "LIFEROUTE automatically calculates an unobstructed emergency corridor: N001 → R0001 → R0007 → R0027, completely bypassing all at-risk corridors on the real network.",
    systemActionSummary: "Clean emergency corridor highlighted in bright cyan · Green-wave advisory active",
  },
  {
    stepNumber: 11,
    totalSteps: 13,
    stepTitle: "Recurring Bottleneck Analysis",
    scenarioId: "RECURRING_BOTTLENECK",
    stage: "CONGESTION",
    viewMode: "CURRENT",
    targetSegmentId: "R0009",
    presenterNarration: "Beyond real-time incidents, LIFEROUTE supports long-term city planning. Corridor R0009 suffers from recurring congestion due to its single-lane geometry.",
    systemActionSummary: "Recurring structural bottleneck audited on R0009 · Single lane capacity constraint",
  },
  {
    stepNumber: 12,
    totalSteps: 13,
    stepTitle: "Counterfactual Planning Simulation",
    scenarioId: "RECURRING_BOTTLENECK",
    stage: "RESPONSE",
    viewMode: "AFTER_RESPONSE",
    targetSegmentId: "R0009",
    presenterNarration: "City planners can simulate a counterfactual lane addition (+900 vph capacity). Under our BPR fluid discharge model, peak delay drops by 56% without manual guesswork.",
    systemActionSummary: "BPR What-If simulation executed · Counterfactual capacity improvement evaluated",
  },
  {
    stepNumber: 13,
    totalSteps: 13,
    stepTitle: "Full System Normalization",
    scenarioId: "NORMAL",
    stage: "NORMAL",
    viewMode: "CURRENT",
    targetSegmentId: "R0023",
    presenterNarration: "These are not disconnected demos. LIFEROUTE uses one unified traffic intelligence workflow: Detect what's happening, Predict what's next, Advise what to do, and Simulate the outcome.",
    systemActionSummary: "Jury Demo complete · Original organizer network state restored",
  },
];
