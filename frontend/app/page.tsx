"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { DashboardGrid } from "@/components/dashboard/DashboardGrid";
import { HowItWorksModal } from "@/components/help/HowItWorksModal";
import {
  checkBackendHealth,
  getDashboardSummary,
  getCurrentTraffic,
  getIncidents,
  getNetworkNodes,
  getForecasts,
  getSegmentForecast,
  getPropagation,
  getRecommendations,
  ApiClientError,
} from "@/lib/api";
import { HealthResponse } from "@/types/api";
import { DashboardSummaryResponse } from "@/types/dashboard";
import { TrafficRecord } from "@/types/traffic";
import { IncidentRecord } from "@/types/incidents";
import { NodeRecord } from "@/types/network";
import { ForecastRecord, SegmentForecastDetail } from "@/types/forecasts";
import { PropagationRecord } from "@/types/propagation";
import { RecommendationRecord } from "@/types/recommendations";
import { PropagationView } from "@/components/propagation";
import { RecommendationsView } from "@/components/recommendations";

export default function CommandCenterPage() {
  // Step 2 Health check state
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loadingHealth, setLoadingHealth] = useState<boolean>(true);
  const [healthError, setHealthError] = useState<string | null>(null);

  // Step 3B Dashboard summary state
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [loadingSummary, setLoadingSummary] = useState<boolean>(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // Step 4 Geographic Network Nodes state
  const [nodes, setNodes] = useState<NodeRecord[]>([]);
  const [loadingNodes, setLoadingNodes] = useState<boolean>(true);
  const [nodesError, setNodesError] = useState<string | null>(null);

  // Step 3C Traffic Network Intelligence state
  const [trafficRecords, setTrafficRecords] = useState<TrafficRecord[]>([]);
  const [trafficTotal, setTrafficTotal] = useState<number>(0);
  const [loadingTraffic, setLoadingTraffic] = useState<boolean>(true);
  const [trafficError, setTrafficError] = useState<string | null>(null);
  const [trafficOffset, setTrafficOffset] = useState<number>(0);
  const [trafficLimit] = useState<number>(500);
  const [trafficCongestionFilter, setTrafficCongestionFilter] = useState<
    string | undefined
  >(undefined);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(
    null
  );

  // Step 3D Incident Intelligence state
  const [incidentRecords, setIncidentRecords] = useState<IncidentRecord[]>([]);
  const [incidentTotal, setIncidentTotal] = useState<number>(0);
  const [loadingIncidents, setLoadingIncidents] = useState<boolean>(true);
  const [incidentError, setIncidentError] = useState<string | null>(null);
  const [incidentOffset, setIncidentOffset] = useState<number>(0);
  const [incidentLimit] = useState<number>(50);
  const [incidentActiveFilter, setIncidentActiveFilter] =
    useState<string>("ACTIVE");
  const [selectedIncident, setSelectedIncident] =
    useState<IncidentRecord | null>(null);

  // Step 6 Forecast Intelligence state
  const [forecastRecords, setForecastRecords] = useState<ForecastRecord[]>([]);
  const [forecastTotal, setForecastTotal] = useState<number>(0);
  const [loadingForecasts, setLoadingForecasts] = useState<boolean>(true);
  const [forecastsError, setForecastsError] = useState<string | null>(null);
  const [selectedForecastDetail, setSelectedForecastDetail] =
    useState<SegmentForecastDetail | null>(null);
  const [loadingForecastDetail, setLoadingForecastDetail] =
    useState<boolean>(false);

  // Step 7 Propagation Intelligence state
  const [propagationRecords, setPropagationRecords] = useState<
    PropagationRecord[]
  >([]);
  const [propagationTotal, setPropagationTotal] = useState<number>(0);
  const [loadingPropagation, setLoadingPropagation] = useState<boolean>(true);
  const [propagationError, setPropagationError] = useState<string | null>(null);
  const [propagationOffset, setPropagationOffset] = useState<number>(0);
  const [propagationLimit] = useState<number>(50);
  const [propagationRiskFilter, setPropagationRiskFilter] = useState<
    string | undefined
  >(undefined);
  const [selectedPropagation, setSelectedPropagation] =
    useState<PropagationRecord | null>(null);

  // Step 9/10 AI Advisory / Recommendations state
  const [recommendationRecords, setRecommendationRecords] = useState<
    RecommendationRecord[]
  >([]);
  const [recommendationTotal, setRecommendationTotal] = useState<number>(0);
  const [loadingRecommendations, setLoadingRecommendations] =
    useState<boolean>(true);
  const [recommendationsError, setRecommendationsError] = useState<
    string | null
  >(null);
  const [recommendationOffset, setRecommendationOffset] = useState<number>(0);
  const [recommendationLimit] = useState<number>(50);
  const [recommendationUrgencyFilter, setRecommendationUrgencyFilter] = useState<
    string | undefined
  >(undefined);
  const [recommendationTierFilter, setRecommendationTierFilter] = useState<
    string | undefined
  >(undefined);
  const [selectedRecommendation, setSelectedRecommendation] =
    useState<RecommendationRecord | null>(null);

  // Active navigation tab
  const [activeNavId, setActiveNavId] = useState<string>("overview");
  const [fullViewMode, setFullViewMode] = useState<
    "propagation" | "recommendations" | null
  >(null);
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState<boolean>(false);
  const [juryMode, setJuryMode] = useState<boolean>(true);

  const isManualScrollRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Smooth section scroll handler
  const handleNavSelect = useCallback((id: string) => {
    const wasFullView = fullViewMode !== null;
    if (wasFullView) {
      setFullViewMode(null);
    }
    setActiveNavId(id);

    isManualScrollRef.current = true;
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      isManualScrollRef.current = false;
    }, 1000);

    // Map semantic navigation IDs to DOM element IDs
    const targetDomId =
      id === "demo" || id === "scenario-center"
        ? "scenario-center"
        : id === "investigate"
        ? "incidents"
        : id === "impact"
        ? "propagation"
        : id === "response"
        ? "recommendations"
        : id;

    const performScroll = () => {
      const mainEl = document.getElementById("main-scroll-container");

      if (targetDomId === "overview") {
        if (mainEl && mainEl.scrollHeight > mainEl.clientHeight) {
          mainEl.scrollTo({ top: 0, behavior: "smooth" });
        }
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      const element = document.getElementById(targetDomId);
      if (!element) {
        // Fallback retry if DOM was switching view
        setTimeout(() => {
          const elRetry = document.getElementById(targetDomId);
          if (elRetry) {
            if (mainEl && mainEl.scrollHeight > mainEl.clientHeight) {
              const mainRect = mainEl.getBoundingClientRect();
              const elemRect = elRetry.getBoundingClientRect();
              const relativeTop = elemRect.top - mainRect.top + mainEl.scrollTop;
              mainEl.scrollTo({
                top: Math.max(0, relativeTop - 20),
                behavior: "smooth",
              });
            } else {
              elRetry.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          }
        }, 50);
        return;
      }

      if (mainEl && mainEl.scrollHeight > mainEl.clientHeight) {
        const mainRect = mainEl.getBoundingClientRect();
        const elemRect = element.getBoundingClientRect();
        const relativeTop = elemRect.top - mainRect.top + mainEl.scrollTop;
        const targetScrollTop = Math.max(0, relativeTop - 20);

        mainEl.scrollTo({
          top: targetScrollTop,
          behavior: "smooth",
        });
      } else {
        const elemRect = element.getBoundingClientRect();
        const windowScrollTop =
          window.pageYOffset || document.documentElement.scrollTop;
        const targetScrollTop = Math.max(0, elemRect.top + windowScrollTop - 80);

        window.scrollTo({
          top: targetScrollTop,
          behavior: "smooth",
        });
      }
    };

    if (wasFullView) {
      setTimeout(performScroll, 80);
    } else {
      performScroll();
    }
  }, [fullViewMode]);

  // Clean up scroll timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // IntersectionObserver to update active navigation during manual scrolling
  useEffect(() => {
    if (fullViewMode !== null) return;

    const sectionIds = [
      "overview",
      "network",
      "incidents",
      "forecast",
      "propagation",
      "recommendations",
      "simulation",
    ];

    const mainEl = document.getElementById("main-scroll-container");

    const handleScrollCheck = () => {
      if (isManualScrollRef.current) return;

      // Handle top of container
      const currentScrollTop = mainEl ? mainEl.scrollTop : (window.pageYOffset || document.documentElement.scrollTop);
      if (currentScrollTop < 80) {
        setActiveNavId("overview");
        return;
      }

      // Handle bottom of container
      if (mainEl) {
        if (mainEl.scrollTop + mainEl.clientHeight >= mainEl.scrollHeight - 50) {
          setActiveNavId("simulation");
          return;
        }
      }
    };

    mainEl?.addEventListener("scroll", handleScrollCheck, { passive: true });
    window.addEventListener("scroll", handleScrollCheck, { passive: true });

    const observer = new IntersectionObserver(
      (entries) => {
        if (isManualScrollRef.current) return;

        const currentScrollTop = mainEl ? mainEl.scrollTop : (window.pageYOffset || document.documentElement.scrollTop);
        if (currentScrollTop < 80) {
          return;
        }
        if (mainEl && mainEl.scrollTop + mainEl.clientHeight >= mainEl.scrollHeight - 50) {
          return;
        }

        const intersecting = entries.filter((e) => e.isIntersecting);
        if (intersecting.length === 0) return;

        // If currently active section is among the intersecting ones, keep it (prevents horizontal row jitter)
        const activeIsIntersecting = intersecting.some((e) => e.target.id === activeNavId);
        if (activeIsIntersecting) return;

        // Choose the intersecting section closest to the top of the container
        const mainTop = mainEl ? mainEl.getBoundingClientRect().top : 0;
        intersecting.sort((a, b) => {
          const topA = Math.abs(a.boundingClientRect.top - mainTop - 24);
          const topB = Math.abs(b.boundingClientRect.top - mainTop - 24);
          return topA - topB;
        });

        const dominant = intersecting[0];
        if (dominant?.target?.id) {
          setActiveNavId(dominant.target.id);
        }
      },
      {
        root: mainEl,
        rootMargin: "-40px 0px -50% 0px",
        threshold: [0, 0.1, 0.25, 0.5],
      }
    );

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => {
      mainEl?.removeEventListener("scroll", handleScrollCheck);
      window.removeEventListener("scroll", handleScrollCheck);
      observer.disconnect();
    };
  }, [fullViewMode, activeNavId]);

  // Health probe fetcher (GET /health)
  const fetchHealth = useCallback(async () => {
    setLoadingHealth(true);
    setHealthError(null);
    try {
      const data = await checkBackendHealth();
      setHealth(data);
    } catch (err: unknown) {
      setHealth(null);
      if (err instanceof ApiClientError) {
        if (err.status === 0) {
          setHealthError(
            "Network error: Unable to reach FastAPI backend on port 8000."
          );
        } else {
          setHealthError(`HTTP ${err.status}: ${err.statusText}`);
        }
      } else if (err instanceof Error) {
        setHealthError(err.message);
      } else {
        setHealthError("Unexpected error connecting to backend.");
      }
    } finally {
      setLoadingHealth(false);
    }
  }, []);

  // Dashboard summary fetcher (GET /api/dashboard/summary)
  const fetchSummary = useCallback(async () => {
    setLoadingSummary(true);
    setSummaryError(null);
    try {
      const data = await getDashboardSummary();
      setSummary(data);
    } catch (err: unknown) {
      setSummary(null);
      if (err instanceof ApiClientError) {
        if (err.status === 0) {
          setSummaryError(
            "Network error: Unable to connect to /api/dashboard/summary."
          );
        } else {
          setSummaryError(
            `API Error (${err.status}): ${err.statusText || "Server error"}`
          );
        }
      } else if (err instanceof Error) {
        setSummaryError(err.message);
      } else {
        setSummaryError("Failed to load dashboard summary from backend.");
      }
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  // Geographic network nodes fetcher (GET /api/network/nodes)
  const fetchNodes = useCallback(async () => {
    setLoadingNodes(true);
    setNodesError(null);
    try {
      const res = await getNetworkNodes();
      setNodes(res.data);
    } catch (err: unknown) {
      setNodes([]);
      if (err instanceof ApiClientError) {
        if (err.status === 0) {
          setNodesError("Network error: Unable to reach /api/network/nodes.");
        } else {
          setNodesError(`API Error (${err.status}): ${err.statusText || "Server error"}`);
        }
      } else if (err instanceof Error) {
        setNodesError(err.message);
      } else {
        setNodesError("Failed to load organizer node coordinates.");
      }
    } finally {
      setLoadingNodes(false);
    }
  }, []);

  // Traffic network intelligence fetcher (GET /api/traffic/current)
  const fetchTraffic = useCallback(async () => {
    setLoadingTraffic(true);
    setTrafficError(null);
    try {
      const res = await getCurrentTraffic({
        limit: trafficLimit,
        offset: trafficOffset,
        congestion_state: trafficCongestionFilter,
      });
      setTrafficRecords(res.data);
      setTrafficTotal(res.meta.total_records);
    } catch (err: unknown) {
      setTrafficRecords([]);
      setTrafficTotal(0);
      if (err instanceof ApiClientError) {
        if (err.status === 0) {
          setTrafficError(
            "Network error: Unable to reach /api/traffic/current."
          );
        } else {
          setTrafficError(
            `API Error (${err.status}): ${err.statusText || "Server error"}`
          );
        }
      } else if (err instanceof Error) {
        setTrafficError(err.message);
      } else {
        setTrafficError("Failed to load traffic network intelligence.");
      }
    } finally {
      setLoadingTraffic(false);
    }
  }, [trafficLimit, trafficOffset, trafficCongestionFilter]);

  // Incident intelligence fetcher (GET /api/incidents)
  const fetchIncidents = useCallback(async () => {
    setLoadingIncidents(true);
    setIncidentError(null);
    try {
      let incidentState: string | undefined = undefined;
      let severity: number | undefined = undefined;

      if (incidentActiveFilter === "ACTIVE") {
        incidentState = "INCIDENT_SUPPORTED";
      } else if (incidentActiveFilter === "SEV3") {
        severity = 3;
      } else if (incidentActiveFilter === "SEV2") {
        severity = 2;
      } else if (incidentActiveFilter === "SEV1") {
        severity = 1;
      }

      const res = await getIncidents({
        limit: incidentLimit,
        offset: incidentOffset,
        incident_state: incidentState,
        severity: severity,
      });
      setIncidentRecords(res.data);
      setIncidentTotal(res.meta.total_records);
    } catch (err: unknown) {
      setIncidentRecords([]);
      setIncidentTotal(0);
      if (err instanceof ApiClientError) {
        if (err.status === 0) {
          setIncidentError("Network error: Unable to reach /api/incidents.");
        } else {
          setIncidentError(
            `API Error (${err.status}): ${err.statusText || "Server error"}`
          );
        }
      } else if (err instanceof Error) {
        setIncidentError(err.message);
      } else {
        setIncidentError("Failed to load incident intelligence.");
      }
    } finally {
      setLoadingIncidents(false);
    }
  }, [incidentLimit, incidentOffset, incidentActiveFilter]);

  // Forecast intelligence fetcher (GET /api/forecasts)
  const fetchForecasts = useCallback(async () => {
    setLoadingForecasts(true);
    setForecastsError(null);
    try {
      const res = await getForecasts({ limit: 500 });
      setForecastRecords(res.data);
      setForecastTotal(res.meta.total_records);
    } catch (err: unknown) {
      setForecastRecords([]);
      setForecastTotal(0);
      if (err instanceof ApiClientError) {
        setForecastsError(
          err.status === 0
            ? "Network error: Unable to reach /api/forecasts."
            : `API Error (${err.status}): ${err.statusText || "Server error"}`
        );
      } else if (err instanceof Error) {
        setForecastsError(err.message);
      } else {
        setForecastsError("Failed to load forecast intelligence.");
      }
    } finally {
      setLoadingForecasts(false);
    }
  }, []);

  // Segment forecast detail fetcher (GET /api/forecasts/{segment_id})
  const fetchSegmentForecastDetail = useCallback(async (segmentId: string) => {
    setLoadingForecastDetail(true);
    try {
      const detail = await getSegmentForecast(segmentId);
      setSelectedForecastDetail(detail);
    } catch {
      setSelectedForecastDetail(null);
    } finally {
      setLoadingForecastDetail(false);
    }
  }, []);

  // Propagation intelligence fetcher (GET /api/propagation)
  const fetchPropagation = useCallback(async () => {
    setLoadingPropagation(true);
    setPropagationError(null);
    try {
      const res = await getPropagation({
        limit: propagationLimit,
        offset: propagationOffset,
        risk_level: propagationRiskFilter,
      });
      setPropagationRecords(res.data);
      setPropagationTotal(res.meta.total_records);
      if (res.data.length > 0 && !selectedPropagation) {
        setSelectedPropagation(res.data[0]);
      }
    } catch (err: unknown) {
      setPropagationRecords([]);
      setPropagationTotal(0);
      if (err instanceof ApiClientError) {
        setPropagationError(
          err.status === 0
            ? "Network error: Unable to reach /api/propagation."
            : `API Error (${err.status}): ${err.statusText || "Server error"}`
        );
      } else if (err instanceof Error) {
        setPropagationError(err.message);
      } else {
        setPropagationError("Failed to load propagation intelligence.");
      }
    } finally {
      setLoadingPropagation(false);
    }
  }, [propagationLimit, propagationOffset, propagationRiskFilter, selectedPropagation]);

  // Propagation query trigger
  useEffect(() => {
    fetchPropagation();
  }, [fetchPropagation]);

  // AI Advisory / Recommendations fetcher (GET /api/recommendations)
  const fetchRecommendations = useCallback(async () => {
    setLoadingRecommendations(true);
    setRecommendationsError(null);
    try {
      const res = await getRecommendations({
        limit: recommendationLimit,
        offset: recommendationOffset,
        urgency: recommendationUrgencyFilter,
        tier: recommendationTierFilter,
      });
      setRecommendationRecords(res.data);
      setRecommendationTotal(res.meta.total_records);
      if (res.data.length > 0 && !selectedRecommendation) {
        setSelectedRecommendation(res.data[0]);
      }
    } catch (err: unknown) {
      setRecommendationRecords([]);
      setRecommendationTotal(0);
      if (err instanceof ApiClientError) {
        setRecommendationsError(
          err.status === 0
            ? "Network error: Unable to reach /api/recommendations."
            : `API Error (${err.status}): ${err.statusText || "Server error"}`
        );
      } else if (err instanceof Error) {
        setRecommendationsError(err.message);
      } else {
        setRecommendationsError("Failed to load AI advisory recommendations.");
      }
    } finally {
      setLoadingRecommendations(false);
    }
  }, [
    recommendationLimit,
    recommendationOffset,
    recommendationUrgencyFilter,
    recommendationTierFilter,
    selectedRecommendation,
  ]);

  // Initial load
  useEffect(() => {
    fetchHealth();
    fetchSummary();
    fetchNodes();
    fetchForecasts();
    fetchPropagation();
    fetchRecommendations();
  }, [
    fetchHealth,
    fetchSummary,
    fetchNodes,
    fetchForecasts,
    fetchPropagation,
    fetchRecommendations,
  ]);

  // Recommendations query trigger
  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  // Traffic query trigger
  useEffect(() => {
    fetchTraffic();
  }, [fetchTraffic]);

  // Incident query trigger
  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  // Forecast segment detail trigger
  useEffect(() => {
    if (selectedSegmentId) {
      fetchSegmentForecastDetail(selectedSegmentId);
    } else if (forecastRecords.length > 0) {
      fetchSegmentForecastDetail(forecastRecords[0].segment_id);
    }
  }, [selectedSegmentId, forecastRecords, fetchSegmentForecastDetail]);

  const isConnected = !!health && health.status === "healthy";

  return (
    <AppShell
      backendConnected={isConnected}
      backendHealthStatus={health?.status}
      loading={loadingHealth}
      onRetry={fetchHealth}
      activeNavId={activeNavId}
      onNavSelect={handleNavSelect}
      onLaunchJuryDemo={() => handleNavSelect("scenario-center")}
      onOpenHelp={() => setIsHowItWorksOpen(true)}
      juryMode={juryMode}
      onToggleJuryMode={() => setJuryMode((prev) => !prev)}
    >
      {fullViewMode === "propagation" ? (
        <PropagationView
          records={propagationRecords}
          totalRecords={propagationTotal}
          loading={loadingPropagation}
          error={propagationError}
          onRetry={fetchPropagation}
          offset={propagationOffset}
          limit={propagationLimit}
          onPageChange={(newOffset) => setPropagationOffset(newOffset)}
          riskFilter={propagationRiskFilter}
          onFilterChange={(newRisk) => {
            setPropagationRiskFilter(newRisk);
            setPropagationOffset(0);
          }}
          nodes={nodes}
          trafficRecords={trafficRecords}
          trafficTotal={trafficTotal}
          loadingNodes={loadingNodes}
          loadingTraffic={loadingTraffic}
          summaryData={summary}
          selectedSegmentId={selectedSegmentId}
          onSelectSegment={(id) => setSelectedSegmentId(id)}
        />
      ) : fullViewMode === "recommendations" ? (
        <RecommendationsView
          records={recommendationRecords}
          totalRecords={recommendationTotal}
          loading={loadingRecommendations}
          error={recommendationsError}
          onRetry={fetchRecommendations}
          offset={recommendationOffset}
          limit={recommendationLimit}
          onPageChange={(newOffset) => setRecommendationOffset(newOffset)}
          urgencyFilter={recommendationUrgencyFilter}
          onUrgencyFilterChange={(newUrgency) => {
            setRecommendationUrgencyFilter(newUrgency);
            setRecommendationOffset(0);
          }}
          tierFilter={recommendationTierFilter}
          onTierFilterChange={(newTier) => {
            setRecommendationTierFilter(newTier);
            setRecommendationOffset(0);
          }}
          selectedRecommendation={selectedRecommendation}
          onSelectRecommendation={(rec) => {
            setSelectedRecommendation(rec);
            setSelectedSegmentId(rec.target_segment);
          }}
          onLocateSegment={(segmentId) => {
            setSelectedSegmentId(segmentId);
            handleNavSelect("network");
          }}
        />
      ) : (
        <DashboardGrid
          summaryData={summary}
          loadingSummary={loadingSummary}
          summaryError={summaryError}
          onRefreshSummary={() => {
            fetchSummary();
            fetchNodes();
            fetchTraffic();
            fetchIncidents();
            fetchForecasts();
            fetchPropagation();
            fetchRecommendations();
          }}
          nodes={nodes}
          loadingNodes={loadingNodes}
          nodesError={nodesError}
          onRetryNodes={fetchNodes}
          forecastRecords={forecastRecords}
          forecastTotal={forecastTotal}
          loadingForecasts={loadingForecasts}
          forecastsError={forecastsError}
          onRetryForecasts={fetchForecasts}
          selectedForecastDetail={selectedForecastDetail}
          loadingForecastDetail={loadingForecastDetail}
          trafficRecords={trafficRecords}
          trafficTotal={trafficTotal}
          loadingTraffic={loadingTraffic}
          trafficError={trafficError}
          onRetryTraffic={fetchTraffic}
          trafficOffset={trafficOffset}
          trafficLimit={trafficLimit}
          onTrafficPageChange={(newOffset) => setTrafficOffset(newOffset)}
          trafficCongestionFilter={trafficCongestionFilter}
          onTrafficFilterChange={(newState) => {
            setTrafficCongestionFilter(newState);
            setTrafficOffset(0);
          }}
          selectedSegmentId={selectedSegmentId}
          onSelectSegment={(id) => setSelectedSegmentId(id)}
          incidentRecords={incidentRecords}
          incidentTotal={incidentTotal}
          loadingIncidents={loadingIncidents}
          incidentError={incidentError}
          onRetryIncidents={fetchIncidents}
          incidentOffset={incidentOffset}
          incidentLimit={incidentLimit}
          onIncidentPageChange={(newOffset) => setIncidentOffset(newOffset)}
          incidentActiveFilter={incidentActiveFilter}
          onIncidentFilterChange={(newFilter) => {
            setIncidentActiveFilter(newFilter);
            setIncidentOffset(0);
          }}
          selectedIncident={selectedIncident}
          onSelectIncident={(record) => {
            setSelectedIncident(record);
            if (record) {
              setSelectedSegmentId(record.segment_id);
            }
          }}
          onHighlightSegment={(segmentId) => setSelectedSegmentId(segmentId)}
          propagationRecords={propagationRecords}
          propagationTotal={propagationTotal}
          loadingPropagation={loadingPropagation}
          propagationError={propagationError}
          onRetryPropagation={fetchPropagation}
          onOpenPropagationView={() => setFullViewMode("propagation")}
          selectedPropagation={selectedPropagation}
          onSelectPropagation={(record) => {
            setSelectedPropagation(record);
            setSelectedSegmentId(record.seed_segment_id);
          }}
          recommendationRecords={recommendationRecords}
          recommendationTotal={recommendationTotal}
          loadingRecommendations={loadingRecommendations}
          recommendationsError={recommendationsError}
          onRetryRecommendations={fetchRecommendations}
          onOpenRecommendationsView={() => setFullViewMode("recommendations")}
          selectedRecommendation={selectedRecommendation}
          onSelectRecommendation={(record) => {
            setSelectedRecommendation(record);
            setSelectedSegmentId(record.target_segment);
          }}
          healthData={health}
          loadingHealth={loadingHealth}
          healthError={healthError}
          onRetryHealth={fetchHealth}
          onNavigateToSection={handleNavSelect}
          activeNavId={activeNavId}
        />
      )}
      <HowItWorksModal
        isOpen={isHowItWorksOpen}
        onClose={() => setIsHowItWorksOpen(false)}
        onStartDemo={() => {
          setIsHowItWorksOpen(false);
          handleNavSelect("scenario-center");
        }}
      />
    </AppShell>
  );
}
