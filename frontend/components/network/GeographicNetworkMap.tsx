"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  AlertTriangle,
  Clock,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  X,
  Radio,
  SlidersHorizontal,
  Info,
  Maximize2,
  ZoomIn,
  ZoomOut,
  MapPin,
  Compass,
} from "lucide-react";
import { TrafficRecord } from "@/types/traffic";
import { NodeRecord } from "@/types/network";
import { getCurrentTraffic } from "@/lib/api/traffic";
import { ProvenanceBadge } from "../ui/ProvenanceBadge";
import { ORGANIZER_SEGMENTS } from "@/lib/data/organizerNetwork";
import { ScenarioOverlayState } from "@/lib/scenarios/scenarioTypes";

interface GeographicNetworkMapProps {
  nodes: NodeRecord[];
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
  propagationLink?: { seedSegmentId: string; propagatedSegmentId: string } | null;
  scenarioOverlay?: ScenarioOverlayState | null;
}

// Congestion state color map
const STATE_COLORS: Record<string, { stroke: string; bg: string; text: string; label: string }> = {
  NORMAL: {
    stroke: "#20E0A0",
    bg: "bg-emerald-950/50 border-emerald-500/30 text-[#20E0A0]",
    text: "text-[#20E0A0]",
    label: "NORMAL",
  },
  WATCH: {
    stroke: "#FFB020",
    bg: "bg-amber-950/50 border-amber-500/30 text-[#FFB020]",
    text: "text-[#FFB020]",
    label: "WATCH",
  },
  CONGESTED: {
    stroke: "#F97316",
    bg: "bg-orange-950/50 border-orange-500/30 text-orange-400",
    text: "text-orange-400",
    label: "CONGESTED",
  },
  SEVERE: {
    stroke: "#FF3D5A",
    bg: "bg-rose-950/50 border-[#FF3D5A]/30 text-[#FF3D5A]",
    text: "text-[#FF3D5A]",
    label: "SEVERE",
  },
};

export function GeographicNetworkMap({
  nodes,
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
  propagationLink = null,
  scenarioOverlay = null,
}: GeographicNetworkMapProps) {
  const [hoveredSegment, setHoveredSegment] = useState<TrafficRecord | null>(null);
  const [hoveredNode, setHoveredNode] = useState<NodeRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>(selectedSegmentId || "");
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [noMatchFound, setNoMatchFound] = useState<boolean>(false);
  const [leafletLoaded, setLeafletLoaded] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Synchronize search text when canonical selectedSegmentId updates externally
  useEffect(() => {
    if (selectedSegmentId) {
      setSearchTerm(selectedSegmentId);
      setNoMatchFound(false);
    }
  }, [selectedSegmentId]);

  const leafletContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<any>(null);
  const segmentsLayerRef = useRef<any>(null);
  const nodesLayerRef = useRef<any>(null);

  // 1. Index organizer nodes by node_id
  const nodeMap = useMemo(() => {
    const map = new Map<string, NodeRecord>();
    for (const n of nodes) {
      map.set(n.node_id, n);
    }
    return map;
  }, [nodes]);

  // 2. Dynamic geographic bounding box calculated strictly from returned API nodes
  const geoBounds = useMemo(() => {
    if (nodes.length === 0) {
      return { minLat: 17.3, maxLat: 17.462, minLon: 78.35, maxLon: 78.548 };
    }
    let minLat = Infinity,
      maxLat = -Infinity,
      minLon = Infinity,
      maxLon = -Infinity;
    for (const n of nodes) {
      if (n.latitude < minLat) minLat = n.latitude;
      if (n.latitude > maxLat) maxLat = n.latitude;
      if (n.longitude < minLon) minLon = n.longitude;
      if (n.longitude > maxLon) maxLon = n.longitude;
    }
    return { minLat, maxLat, minLon, maxLon };
  }, [nodes]);

  const [remoteRecord, setRemoteRecord] = useState<TrafficRecord | null>(null);
  const [loadingRemote, setLoadingRemote] = useState<boolean>(false);

  // Fetch telemetry if selected segment is not in the currently loaded `records` slice
  useEffect(() => {
    if (!selectedSegmentId) {
      setRemoteRecord(null);
      setLoadingRemote(false);
      return;
    }

    const inMemory = records.find((r) => r.segment_id === selectedSegmentId);
    if (inMemory) {
      setRemoteRecord(null);
      setLoadingRemote(false);
      return;
    }

    let isMounted = true;
    setLoadingRemote(true);
    getCurrentTraffic({ segment_id: selectedSegmentId, limit: 1 })
      .then((res) => {
        if (isMounted) {
          if (res.data && res.data.length > 0) {
            setRemoteRecord(res.data[0]);
          } else {
            setRemoteRecord(null);
          }
        }
      })
      .catch(() => {
        if (isMounted) setRemoteRecord(null);
      })
      .finally(() => {
        if (isMounted) setLoadingRemote(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedSegmentId, records]);

  // 3. Complete dataset index of all 436 real organizer segments overlaid with live/observed telemetry
  const allSegments = useMemo(() => {
    const telemetryMap = new Map<string, TrafficRecord>();
    for (const r of records) {
      if (!telemetryMap.has(r.segment_id)) {
        telemetryMap.set(r.segment_id, r);
      }
    }
    if (remoteRecord) {
      telemetryMap.set(remoteRecord.segment_id, remoteRecord);
    }

    return ORGANIZER_SEGMENTS.map((s) => {
      const live = telemetryMap.get(s.segment_id);
      return {
        segment_id: s.segment_id,
        source_node: s.source_node,
        target_node: s.target_node,
        road_class: s.road_class,
        lanes: s.lanes,
        free_flow_speed_kmh: s.free_flow_speed_kmh,
        capacity_vph: s.capacity_vph,
        length_km: s.length_km,
        speed_kmh: live ? live.speed_kmh : s.free_flow_speed_kmh,
        flow_vph: live ? live.flow_vph : 0,
        occupancy_pct: live ? live.occupancy_pct : 0,
        queue_length_veh: live ? live.queue_length_veh : 0,
        delay_min: live ? live.delay_min : 0,
        congestion_score: live ? live.congestion_score : 0,
        congestion_state: (live ? live.congestion_state : "NORMAL") as string,
        is_anomaly: live ? live.is_anomaly : 0,
        anomaly_type: live ? live.anomaly_type : "NONE",
        confidence: live ? live.confidence : 1.0,
        temporal_status: live ? live.temporal_status : "NOMINAL",
        roadwork_context: live ? live.roadwork_context : "NONE",
        evidence_reason: live ? live.evidence_reason : "OBSERVED",
        provenance: live ? live.provenance : "OBSERVED",
        timestamp: live ? live.timestamp : "",
      };
    });
  }, [records, remoteRecord]);

  // 4. Resolve segments with actual node coordinates across all 436 network segments
  const { mappedSegments, unmappedCount } = useMemo(() => {
    let unmapped = 0;
    const mapped: Array<{
      record: TrafficRecord;
      source: NodeRecord;
      target: NodeRecord;
      srcSvg: { x: number; y: number };
      tgtSvg: { x: number; y: number };
    }> = [];

    const { minLat, maxLat, minLon, maxLon } = geoBounds;
    const latSpan = maxLat - minLat || 0.162;
    const lonSpan = maxLon - minLon || 0.198;
    const paddingX = 60;
    const paddingY = 50;
    const width = 960 - paddingX * 2;
    const height = 520 - paddingY * 2;

    const projectSvg = (lat: number, lon: number) => ({
      x: paddingX + ((lon - minLon) / lonSpan) * width,
      y: paddingY + (1 - (lat - minLat) / latSpan) * height,
    });

    for (const seg of allSegments) {
      const src = seg.source_node ? nodeMap.get(seg.source_node) : undefined;
      const tgt = seg.target_node ? nodeMap.get(seg.target_node) : undefined;

      if (!src || !tgt) {
        unmapped++;
        continue;
      }

      mapped.push({
        record: seg as unknown as TrafficRecord,
        source: src,
        target: tgt,
        srcSvg: projectSvg(src.latitude, src.longitude),
        tgtSvg: projectSvg(tgt.latitude, tgt.longitude),
      });
    }

    return { mappedSegments: mapped, unmappedCount: unmapped };
  }, [allSegments, nodeMap, geoBounds]);

  // Active selected traffic record (strictly from real backend data or organizer corridor)
  const activeRecord = useMemo(() => {
    if (!selectedSegmentId) return null;
    return (
      records.find((r) => r.segment_id === selectedSegmentId) ||
      remoteRecord ||
      (allSegments.find((s) => s.segment_id === selectedSegmentId) as unknown as TrafficRecord) ||
      null
    );
  }, [records, selectedSegmentId, remoteRecord, allSegments]);

  // Autocomplete search results from all loaded 436 organizer segments
  // Normalized: trim & uppercase. Matches segment_id, source_node, target_node, or composite node pairs.
  const searchResults = useMemo(() => {
    const raw = searchTerm.trim().toUpperCase();
    if (!raw) return [];

    const tokens = raw.replace(/[->→]/g, " ").split(/\s+/).filter(Boolean);

    const matches = allSegments.filter((s) => {
      const segId = s.segment_id.toUpperCase();
      const src = (s.source_node || "").toUpperCase();
      const tgt = (s.target_node || "").toUpperCase();

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

    return matches.slice(0, 10);
  }, [allSegments, searchTerm]);

  // Handle Enter and Escape keys for search input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const raw = searchTerm.trim().toUpperCase();
      if (!raw) return;

      if (searchResults.length > 0) {
        const top = searchResults[0];
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

  // Auto-pan viewport to selectedSegmentId when it updates
  useEffect(() => {
    if (!selectedSegmentId) return;
    const item = mappedSegments.find((m) => m.record.segment_id === selectedSegmentId);
    if (!item) return;

    if (leafletLoaded && leafletMapRef.current) {
      const midLat = (item.source.latitude + item.target.latitude) / 2;
      const midLon = (item.source.longitude + item.target.longitude) / 2;
      leafletMapRef.current.panTo([midLat, midLon], { animate: true, duration: 0.5 });
    } else {
      const midX = (item.srcSvg.x + item.tgtSvg.x) / 2;
      const midY = (item.srcSvg.y + item.tgtSvg.y) / 2;
      setPanOffset({ x: 480 - midX, y: 260 - midY });
    }
  }, [selectedSegmentId, mappedSegments, leafletLoaded]);

  // 4. Initialize Leaflet Map once
  useEffect(() => {
    if (typeof window === "undefined" || !leafletContainerRef.current) return;
    let isMounted = true;

    async function initMap() {
      let L = (window as any).L;
      if (!L) {
        try {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("Leaflet script failed to load"));
            document.head.appendChild(script);
          });
          L = (window as any).L;
        } catch {
          // Fallback gracefully to high-performance SVG projection
          return;
        }
      }

      if (!L || !leafletContainerRef.current || !isMounted) return;

      if (!leafletMapRef.current) {
        const centerLat = (geoBounds.minLat + geoBounds.maxLat) / 2;
        const centerLon = (geoBounds.minLon + geoBounds.maxLon) / 2;

        const map = L.map(leafletContainerRef.current, {
          center: [centerLat, centerLon],
          zoom: 12,
          attributionControl: true,
          zoomControl: false,
        });

        // OpenStreetMap tile layer (no paid API key required)
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map);

        segmentsLayerRef.current = L.layerGroup().addTo(map);
        nodesLayerRef.current = L.layerGroup().addTo(map);

        leafletMapRef.current = map;
        setLeafletLoaded(true);
      }
    }

    initMap();

    return () => {
      isMounted = false;
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
        segmentsLayerRef.current = null;
        nodesLayerRef.current = null;
      }
    };
  }, [geoBounds]);

  // 5. Update Leaflet Layers efficiently without recreating the map
  useEffect(() => {
    const L = (window as any).L;
    const map = leafletMapRef.current;
    const segmentsLayer = segmentsLayerRef.current;
    const nodesLayer = nodesLayerRef.current;

    if (!L || !map || !segmentsLayer || !nodesLayer) return;

    segmentsLayer.clearLayers();
    nodesLayer.clearLayers();

    // Render segments as straight geographic node-to-node lines
    for (const item of mappedSegments) {
      const baseColor = STATE_COLORS[item.record.congestion_state]?.stroke || "#10B981";
      const isSelected = item.record.segment_id === selectedSegmentId;

      // Scenario role evaluation
      const isSimActive = Boolean(scenarioOverlay && scenarioOverlay.scenarioId !== "NORMAL");
      const segId = item.record.segment_id;
      const isAffected = isSimActive && scenarioOverlay!.affectedSegmentIds.includes(segId);
      const isClosed = isSimActive && scenarioOverlay!.closedSegmentIds.includes(segId);
      const isAtRisk = isSimActive && scenarioOverlay!.atRiskSegmentIds.includes(segId);
      const isRecommended = isSimActive && scenarioOverlay!.recommendedSegmentIds.includes(segId);
      const isEmergency = isSimActive && scenarioOverlay!.emergencyRouteSegmentIds.includes(segId);
      const isMonitored = isSimActive && scenarioOverlay!.monitoredSegmentIds.includes(segId);

      let lineColor = isSelected ? "#00F0FF" : baseColor;
      let lineWeight = isSelected ? 5.5 : 2.5;
      let lineDash: string | undefined = undefined;
      let lineOpacity = isSelected ? 1 : 0.8;
      let scenarioBadge = "";

      if (isEmergency) {
        lineColor = "#06B6D4";
        lineWeight = 6.0;
        lineOpacity = 1.0;
        scenarioBadge = "<span style='color:#06B6D4;font-weight:bold;'>[EMERGENCY ROUTE]</span> ";
      } else if (isClosed) {
        lineColor = "#991B1B";
        lineWeight = 4.5;
        lineDash = "5, 5";
        lineOpacity = 0.9;
        scenarioBadge = "<span style='color:#EF4444;font-weight:bold;'>[SIMULATED ROAD CLOSURE]</span> ";
      } else if (isAffected) {
        lineColor = "#EF4444";
        lineWeight = 6.0;
        lineOpacity = 1.0;
        scenarioBadge = "<span style='color:#EF4444;font-weight:bold;'>[AFFECTED / INCIDENT]</span> ";
      } else if (isRecommended) {
        lineColor = "#10B981";
        lineWeight = 5.0;
        lineOpacity = 1.0;
        scenarioBadge = "<span style='color:#10B981;font-weight:bold;'>[RECOMMENDED CORRIDOR]</span> ";
      } else if (isAtRisk) {
        lineColor = "#F59E0B";
        lineWeight = 4.0;
        lineDash = "6, 6";
        lineOpacity = 0.95;
        scenarioBadge = "<span style='color:#F59E0B;font-weight:bold;'>[AT-RISK SPILLBACK]</span> ";
      } else if (isMonitored) {
        lineColor = "#3B82F6";
        lineWeight = 3.5;
        lineOpacity = 0.9;
        scenarioBadge = "<span style='color:#3B82F6;font-weight:bold;'>[MONITORED]</span> ";
      }

      // Outer glow halo if selected or affected/recommended/emergency
      if (isSelected || isAffected || isEmergency || isRecommended) {
        const glowColor = isEmergency ? "#06B6D4" : isAffected ? "#EF4444" : isRecommended ? "#10B981" : "#00F0FF";
        const glowHalo = L.polyline(
          [
            [item.source.latitude, item.source.longitude],
            [item.target.latitude, item.target.longitude],
          ],
          {
            color: glowColor,
            weight: isSelected ? 12 : 9,
            opacity: isSelected ? 0.45 : 0.35,
            lineCap: "round",
          }
        );
        segmentsLayer.addLayer(glowHalo);
      }

      const line = L.polyline(
        [
          [item.source.latitude, item.source.longitude],
          [item.target.latitude, item.target.longitude],
        ],
        {
          color: lineColor,
          weight: lineWeight,
          opacity: lineOpacity,
          dashArray: lineDash,
          lineCap: "round",
        }
      );

      line.on("click", (e: any) => {
        if (e && e.originalEvent) {
          e.originalEvent.stopPropagation();
        }
        onSelectSegment(item.record.segment_id);
      });

      if (isSelected || isAffected || isEmergency) {
        line.bringToFront();
      }

      line.bindTooltip(
        `${scenarioBadge}<strong>${item.record.segment_id}</strong> (${item.source.node_id} &rarr; ${item.target.node_id})<br/>` +
          `State: <strong>${item.record.congestion_state}</strong> | Speed: ${item.record.speed_kmh.toFixed(2)} km/h`,
        { sticky: true }
      );

      segmentsLayer.addLayer(line);
    }

    // Render 120 nodes subtly (highlighted if part of scenario)
    for (const node of nodes) {
      const isHighlightNode = Boolean(scenarioOverlay && scenarioOverlay.highlightNodeIds?.includes(node.node_id));
      const circle = L.circleMarker([node.latitude, node.longitude], {
        radius: isHighlightNode ? 6 : 3,
        fillColor: isHighlightNode ? "#F59E0B" : "#38BDF8",
        color: isHighlightNode ? "#FEF08A" : "#0284C7",
        weight: isHighlightNode ? 2 : 1,
        opacity: isHighlightNode ? 1.0 : 0.8,
        fillOpacity: isHighlightNode ? 0.9 : 0.6,
      });

      circle.bindTooltip(
        `<strong>${node.node_id}</strong><br/>Lat: ${node.latitude.toFixed(4)}<br/>Lon: ${node.longitude.toFixed(4)}`,
        { sticky: true }
      );

      nodesLayer.addLayer(circle);
    }

    // Render connecting cascade link if propagationLink is provided (Requirement 7)
    if (propagationLink) {
      const seedItem = mappedSegments.find((m) => m.record.segment_id === propagationLink.seedSegmentId);
      const targetItem = mappedSegments.find((m) => m.record.segment_id === propagationLink.propagatedSegmentId);
      if (seedItem && targetItem) {
        const linkLine = L.polyline(
          [
            [(seedItem.source.latitude + seedItem.target.latitude) / 2, (seedItem.source.longitude + seedItem.target.longitude) / 2],
            [(targetItem.source.latitude + targetItem.target.latitude) / 2, (targetItem.source.longitude + targetItem.target.longitude) / 2],
          ],
          {
            color: "#F59E0B",
            dashArray: "6, 6",
            weight: 3.5,
            opacity: 0.9,
          }
        );
        linkLine.bindTooltip(
          `<strong>Cascade Path</strong>: ${seedItem.record.segment_id} &rarr; ${targetItem.record.segment_id}<br/>Modeled Spillback Trajectory`,
          { sticky: true }
        );
        segmentsLayer.addLayer(linkLine);
      }
    }

    // Render scenario propagation animation pairs if active
    if (scenarioOverlay?.propagationPairs && scenarioOverlay.propagationPairs.length > 0) {
      for (const pair of scenarioOverlay.propagationPairs) {
        const s = mappedSegments.find((m) => m.record.segment_id === pair.fromSeg);
        const t = mappedSegments.find((m) => m.record.segment_id === pair.toSeg);
        if (s && t) {
          const simLink = L.polyline(
            [
              [(s.source.latitude + s.target.latitude) / 2, (s.source.longitude + s.target.longitude) / 2],
              [(t.source.latitude + t.target.latitude) / 2, (t.source.longitude + t.target.longitude) / 2],
            ],
            {
              color: "#EF4444",
              dashArray: "5, 5",
              weight: 3.5,
              opacity: 0.9,
            }
          );
          simLink.bindTooltip(
            `<strong>Simulated Spillback Link</strong>: ${pair.fromSeg} &rarr; ${pair.toSeg}`,
            { sticky: true }
          );
          segmentsLayer.addLayer(simLink);
        }
      }
    }
  }, [mappedSegments, nodes, selectedSegmentId, onSelectSegment, propagationLink, scenarioOverlay]);

  // Invalidate Leaflet map size when side panel opens or closes
  useEffect(() => {
    if (leafletMapRef.current) {
      const timer = setTimeout(() => {
        leafletMapRef.current?.invalidateSize();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [selectedSegmentId]);

  // Fit bounds strictly to actual API coordinates
  const handleFitNetwork = useCallback(() => {
    const L = (window as any).L;
    const map = leafletMapRef.current;
    if (L && map && nodes.length > 0) {
      const bounds = L.latLngBounds(nodes.map((n) => [n.latitude, n.longitude]));
      map.fitBounds(bounds, { padding: [25, 25] });
    }
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  }, [nodes]);

  const handleZoomIn = () => {
    if (leafletMapRef.current) leafletMapRef.current.zoomIn();
    setZoomLevel((z) => Math.min(z + 0.3, 3));
  };

  const handleZoomOut = () => {
    if (leafletMapRef.current) leafletMapRef.current.zoomOut();
    setZoomLevel((z) => Math.max(z - 0.3, 0.7));
  };

  const handleResetView = () => {
    handleFitNetwork();
  };

  // SVG Fallback dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };
  const handleMouseUp = () => setIsDragging(false);

  const totalPages = Math.max(1, Math.ceil(totalRecords / limit));
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="flex flex-col gap-4">
      {/* 0. START HERE Primary Action Banner */}
      <div className="p-3.5 bg-gradient-to-r from-cyan-950/80 via-slate-900 to-slate-900 border border-cyan-500/40 rounded-xl shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-sans">
        <div className="flex items-center gap-3">
          <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-cyan-400 text-slate-950 uppercase tracking-wider shadow-sm shrink-0">
            START HERE
          </span>
          <div>
            <div className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <span>Search for a road segment</span>
              <span className="text-xs font-mono font-normal text-slate-400">
                (e.g. <strong className="text-cyan-300">R0023</strong>)
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Select any of the 436 organizer network corridors to inspect telemetry, incidents, forecasts, and what-if simulation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs shrink-0">
          <span className="text-slate-400 font-sans text-[11px]">Quick suggestion:</span>
          <button
            type="button"
            onClick={() => {
              onSelectSegment("R0023");
              setSearchTerm("R0023");
              setIsDropdownOpen(false);
            }}
            className="px-2.5 py-1 rounded-md bg-cyan-950 border border-cyan-500/50 text-cyan-300 font-bold hover:bg-cyan-900 hover:text-white transition-all shadow-sm cursor-pointer"
          >
            Try R0023
          </button>
        </div>
      </div>

      {/* 1. Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-900/80 border border-slate-800 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Compass className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-slate-100 uppercase tracking-wider">
                GEOGRAPHIC NETWORK
              </h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 font-mono">
                CURRENT OBSERVED DATA
              </span>
              <ProvenanceBadge type="OBSERVED" size="sm" />
            </div>
            <p className="text-xs text-slate-400">
              Current observed traffic from organizer-provided validation data &middot; 120 Nodes &middot; 436 Segments
            </p>
          </div>
        </div>

        {/* Filter and Search Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Congestion State Filter */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
            <button
              onClick={() => onFilterChange(undefined)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                !congestionFilter
                  ? "bg-slate-800 text-slate-100 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              ALL
            </button>
            {(["NORMAL", "WATCH", "CONGESTED", "SEVERE"] as const).map((state) => {
              const active = congestionFilter === state;
              const colorInfo = STATE_COLORS[state];
              return (
                <button
                  key={state}
                  onClick={() => onFilterChange(state)}
                  className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                    active
                      ? `${colorInfo.bg} border text-slate-100`
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {state}
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
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
              className="pl-8 pr-7 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/70 w-60 sm:w-64 font-mono"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setIsDropdownOpen(false);
                  setNoMatchFound(false);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                title="Clear search text (preserves selected segment)"
              >
                <X className="w-3 h-3" />
              </button>
            )}

            {/* Live Autocomplete Suggestions Dropdown */}
            {isDropdownOpen && searchTerm.trim().length > 0 && (
              <div className="absolute top-full right-0 mt-1.5 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-50 overflow-hidden font-mono text-xs w-80">
                <div className="px-2.5 py-1 text-[10px] text-slate-400 border-b border-slate-800 uppercase font-sans font-semibold flex items-center justify-between">
                  <span>Matching Segments</span>
                  <span className="text-[9px] text-slate-500 font-mono">Press Enter to select</span>
                </div>

                {searchResults.length > 0 ? (
                  <div className="max-h-60 overflow-y-auto divide-y divide-slate-800/60">
                    {searchResults.map((match) => {
                      const color = STATE_COLORS[match.congestion_state] || STATE_COLORS.NORMAL;
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

            {/* No-match inline feedback if dropdown closed */}
            {noMatchFound && !isDropdownOpen && (
              <div className="absolute top-full right-0 mt-1 px-2.5 py-1 text-[11px] text-rose-300 bg-rose-950/80 border border-rose-800/80 rounded shadow-lg z-50 font-sans flex items-center gap-1.5 whitespace-nowrap">
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
          </div>
        </div>
      </div>

      {/* 2. Map Canvas Container */}
      <div className="relative w-full h-[540px] md:h-[580px] bg-slate-950/90 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col md:flex-row">
        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm">
            <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mb-3" />
            <p className="text-sm font-medium text-slate-300">
              Loading geographic network...
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Synchronizing organizer node coordinates &amp; segment metrics
            </p>
          </div>
        )}

        {/* Error Overlay */}
        {error && !loading && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/90 p-6 text-center">
            <AlertTriangle className="w-10 h-10 text-rose-400 mb-3" />
            <h4 className="text-base font-semibold text-slate-200">
              Geographic network unavailable
            </h4>
            <p className="text-xs text-slate-400 max-w-md mt-1 mb-4">{error}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry
              </button>
            )}
          </div>
        )}

        {/* Primary Map Viewport */}
        <div className="flex-1 relative h-full">
          {/* Simulation Scenario Status Banner (Overlay) */}
          {scenarioOverlay && scenarioOverlay.scenarioId !== "NORMAL" && (
            <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-slate-950/90 border border-amber-500/50 shadow-2xl backdrop-blur-md pointer-events-auto">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[9px] font-bold font-mono bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                  SIMULATED · DEMO
                </span>
                <span className="text-xs font-bold text-slate-100">
                  {scenarioOverlay.scenarioTitle}
                </span>
                <span className="text-[10px] font-mono text-cyan-300">
                  [{scenarioOverlay.tickLabel} · {scenarioOverlay.stageName}]
                </span>
              </div>

              <div className="flex items-center gap-2 text-[10px]">
                <span className="text-slate-400 font-medium">Scenario Mode:</span>
                <span
                  className={`px-2 py-0.5 rounded font-mono font-bold border ${
                    scenarioOverlay.viewMode === "AFTER_RESPONSE"
                      ? "bg-emerald-950/90 text-emerald-300 border-emerald-500/50"
                      : "bg-slate-800 text-slate-300 border-slate-700"
                  }`}
                >
                  {scenarioOverlay.viewMode === "AFTER_RESPONSE" ? "AFTER RESPONSE (ADVISORY)" : "CURRENT (BEFORE)"}
                </span>
              </div>
            </div>
          )}

          {/* Leaflet Map DOM Element */}
          <div
            ref={leafletContainerRef}
            className={`w-full h-full z-10 ${leafletLoaded ? "opacity-100" : "opacity-0 pointer-events-none"} transition-opacity duration-300`}
          />

          {/* SVG Fallback (rendered if Leaflet is loading or offline) */}
          {!leafletLoaded && (
            <div
              className={`w-full h-full cursor-grab ${isDragging ? "cursor-grabbing" : ""}`}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <svg
                viewBox="0 0 960 520"
                className="w-full h-full select-none"
                preserveAspectRatio="xMidYMid meet"
              >
                <g
                  transform={`translate(${panOffset.x}, ${panOffset.y}) scale(${zoomLevel})`}
                  style={{ transformOrigin: "480px 260px" }}
                >
                  {mappedSegments.map(({ record, srcSvg, tgtSvg }) => {
                    const isSelected = record.segment_id === selectedSegmentId;
                    const baseColor = STATE_COLORS[record.congestion_state]?.stroke || "#10B981";

                    // Scenario role evaluation
                    const isSimActive = Boolean(scenarioOverlay && scenarioOverlay.scenarioId !== "NORMAL");
                    const segId = record.segment_id;
                    const isAffected = isSimActive && scenarioOverlay!.affectedSegmentIds.includes(segId);
                    const isClosed = isSimActive && scenarioOverlay!.closedSegmentIds.includes(segId);
                    const isAtRisk = isSimActive && scenarioOverlay!.atRiskSegmentIds.includes(segId);
                    const isRecommended = isSimActive && scenarioOverlay!.recommendedSegmentIds.includes(segId);
                    const isEmergency = isSimActive && scenarioOverlay!.emergencyRouteSegmentIds.includes(segId);
                    const isMonitored = isSimActive && scenarioOverlay!.monitoredSegmentIds.includes(segId);

                    let strokeColor = isSelected ? "#00F0FF" : baseColor;
                    let strokeW = isSelected ? 4.5 : 2.0;
                    let strokeDash: string | undefined = undefined;
                    let strokeOp = isSelected ? 1.0 : 0.8;

                    if (isEmergency) {
                      strokeColor = "#06B6D4";
                      strokeW = 5.0;
                      strokeOp = 1.0;
                    } else if (isClosed) {
                      strokeColor = "#991B1B";
                      strokeW = 3.5;
                      strokeDash = "4 4";
                      strokeOp = 0.9;
                    } else if (isAffected) {
                      strokeColor = "#EF4444";
                      strokeW = 5.0;
                      strokeOp = 1.0;
                    } else if (isRecommended) {
                      strokeColor = "#10B981";
                      strokeW = 4.5;
                      strokeOp = 1.0;
                    } else if (isAtRisk) {
                      strokeColor = "#F59E0B";
                      strokeW = 3.5;
                      strokeDash = "6 6";
                      strokeOp = 0.95;
                    } else if (isMonitored) {
                      strokeColor = "#3B82F6";
                      strokeW = 3.0;
                      strokeOp = 0.9;
                    }

                    return (
                      <g key={record.segment_id}>
                        {/* Wide invisible click capture line */}
                        <line
                          x1={srcSvg.x}
                          y1={srcSvg.y}
                          x2={tgtSvg.x}
                          y2={tgtSvg.y}
                          stroke="transparent"
                          strokeWidth="16"
                          className="cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectSegment(record.segment_id);
                          }}
                          onMouseEnter={() => setHoveredSegment(record)}
                          onMouseLeave={() => setHoveredSegment(null)}
                        />
                        {/* Selected or priority halo glow */}
                        {(isSelected || isAffected || isEmergency || isRecommended) && (
                          <line
                            x1={srcSvg.x}
                            y1={srcSvg.y}
                            x2={tgtSvg.x}
                            y2={tgtSvg.y}
                            stroke={isEmergency ? "#06B6D4" : isAffected ? "#EF4444" : isRecommended ? "#10B981" : "#00F0FF"}
                            strokeWidth={isSelected ? 10 : 8}
                            strokeOpacity={isSelected ? 0.45 : 0.35}
                            strokeLinecap="round"
                            className="pointer-events-none"
                          />
                        )}
                        {/* Segment visible line */}
                        <line
                          x1={srcSvg.x}
                          y1={srcSvg.y}
                          x2={tgtSvg.x}
                          y2={tgtSvg.y}
                          stroke={strokeColor}
                          strokeWidth={strokeW}
                          strokeOpacity={strokeOp}
                          strokeDasharray={strokeDash}
                          strokeLinecap="round"
                          className="pointer-events-none"
                        />
                      </g>
                    );
                  })}

                  {propagationLink && (() => {
                    const s = mappedSegments.find((m) => m.record.segment_id === propagationLink.seedSegmentId);
                    const t = mappedSegments.find((m) => m.record.segment_id === propagationLink.propagatedSegmentId);
                    if (!s || !t) return null;
                    const sX = (s.srcSvg.x + s.tgtSvg.x) / 2;
                    const sY = (s.srcSvg.y + s.tgtSvg.y) / 2;
                    const tX = (t.srcSvg.x + t.tgtSvg.x) / 2;
                    const tY = (t.srcSvg.y + t.tgtSvg.y) / 2;
                    return (
                      <line
                        x1={sX}
                        y1={sY}
                        x2={tX}
                        y2={tY}
                        stroke="#F59E0B"
                        strokeWidth="3"
                        strokeDasharray="6 6"
                        strokeOpacity="0.9"
                      />
                    );
                  })()}

                  {/* Scenario propagation pairs in SVG */}
                  {scenarioOverlay?.propagationPairs?.map((pair, pIdx) => {
                    const s = mappedSegments.find((m) => m.record.segment_id === pair.fromSeg);
                    const t = mappedSegments.find((m) => m.record.segment_id === pair.toSeg);
                    if (!s || !t) return null;
                    const sX = (s.srcSvg.x + s.tgtSvg.x) / 2;
                    const sY = (s.srcSvg.y + s.tgtSvg.y) / 2;
                    const tX = (t.srcSvg.x + t.tgtSvg.x) / 2;
                    const tY = (t.srcSvg.y + t.tgtSvg.y) / 2;
                    return (
                      <line
                        key={`sim-link-${pIdx}`}
                        x1={sX}
                        y1={sY}
                        x2={tX}
                        y2={tY}
                        stroke="#EF4444"
                        strokeWidth="3.5"
                        strokeDasharray="5 5"
                        strokeOpacity="0.9"
                      />
                    );
                  })}

                  {nodes.map((node) => {
                    const { minLat, maxLat, minLon, maxLon } = geoBounds;
                    const latSpan = maxLat - minLat || 0.162;
                    const lonSpan = maxLon - minLon || 0.198;
                    const x = 60 + ((node.longitude - minLon) / lonSpan) * (960 - 120);
                    const y = 50 + (1 - (node.latitude - minLat) / latSpan) * (520 - 100);
                    const isHovered = hoveredNode?.node_id === node.node_id;
                    const isHighlight = Boolean(scenarioOverlay && scenarioOverlay.highlightNodeIds?.includes(node.node_id));

                    return (
                      <circle
                        key={node.node_id}
                        cx={x}
                        cy={y}
                        r={isHighlight ? 5.5 : isHovered ? 4.5 : 2.5}
                        fill={isHighlight ? "#F59E0B" : "#38BDF8"}
                        fillOpacity={isHighlight ? 0.95 : isHovered ? 0.9 : 0.6}
                        stroke={isHighlight ? "#FEF08A" : "#0284c7"}
                        strokeWidth={isHighlight ? 1.5 : 0.5}
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredNode(node)}
                        onMouseLeave={() => setHoveredNode(null)}
                      />
                    );
                  })}
                </g>
              </svg>
            </div>
          )}

          {/* Hovered Node Tooltip (SVG mode) */}
          {hoveredNode && !leafletLoaded && (
            <div className="absolute top-4 left-4 z-20 bg-slate-900/95 border border-slate-700 px-3 py-2 rounded-lg text-xs shadow-xl pointer-events-none font-mono">
              <div className="font-bold text-cyan-400">{hoveredNode.node_id}</div>
              <div className="text-slate-300 text-[11px]">
                Lat: {hoveredNode.latitude.toFixed(4)} &middot; Lon: {hoveredNode.longitude.toFixed(4)}
              </div>
            </div>
          )}

          {/* Map Controls */}
          <div className="absolute bottom-4 left-4 z-20 flex flex-col gap-1.5 bg-slate-900/90 p-1.5 rounded-lg border border-slate-800 shadow-xl">
            <button
              onClick={handleZoomIn}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleFitNetwork}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
              title="Fit Network"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleResetView}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
              title="Reset View"
            >
              <Radio className="w-4 h-4" />
            </button>
          </div>

          {/* Map Legend */}
          <div className="absolute bottom-4 right-4 z-20 bg-slate-900/90 border border-slate-800 px-3.5 py-2.5 rounded-lg shadow-xl text-xs flex flex-col gap-1.5 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-slate-300 text-[11px] font-medium">NORMAL</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-slate-300 text-[11px] font-medium">WATCH</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                <span className="text-slate-300 text-[11px] font-medium">CONGESTED</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span className="text-slate-300 text-[11px] font-medium">SEVERE</span>
              </div>
            </div>
            <div className="text-[10px] text-slate-400 border-t border-slate-800/80 pt-1.5 flex items-center justify-between gap-4 font-mono">
              <span className="text-slate-400">Geometry: organizer node-to-node connectivity</span>
              <span className="text-cyan-400 font-semibold">436 segments &middot; 120 nodes</span>
            </div>
          </div>
        </div>

        {/* 3. Segment Details / Empty State Panel */}
        {selectedSegmentId ? (
          <div className="w-full md:w-80 md:border-l border-t md:border-t-0 border-slate-800 bg-slate-950/95 p-4 flex flex-col justify-between overflow-y-auto z-20 font-sans shadow-2xl shrink-0 max-h-[320px] md:max-h-none">
            <div className="space-y-4">
              {/* Header: SEGMENT INTELLIGENCE Title, Segment ID, and Close Button */}
              <div className="flex items-start justify-between border-b border-slate-800/80 pb-3">
                <div>
                  <div className="text-[11px] font-mono font-bold text-cyan-400 uppercase tracking-wider">
                    SEGMENT INTELLIGENCE
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <h4 className="text-lg font-bold text-slate-100 font-mono">
                      {selectedSegmentId}
                    </h4>
                    {activeRecord && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          STATE_COLORS[activeRecord.congestion_state]?.bg ||
                          "bg-slate-800 text-slate-300 border-slate-700"
                        }`}
                      >
                        {activeRecord.congestion_state}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => onSelectSegment(null)}
                  className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                  title="Close Segment Intelligence"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Loading Telemetry State */}
              {loadingRemote && !activeRecord && (
                <div className="py-12 flex flex-col items-center justify-center text-center text-slate-400 font-mono">
                  <RefreshCw className="w-5 h-5 text-cyan-400 animate-spin mb-2" />
                  <span className="text-xs">Fetching segment telemetry...</span>
                </div>
              )}

              {/* Telemetry Unavailable State */}
              {!loadingRemote && !activeRecord && (
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center space-y-2 font-mono">
                  <AlertTriangle className="w-6 h-6 text-amber-400 mx-auto" />
                  <div className="text-xs font-bold text-slate-200">
                    Telemetry unavailable
                  </div>
                  <p className="text-[11px] text-slate-400">
                    No active telemetry record available for segment {selectedSegmentId}.
                  </p>
                </div>
              )}

              {/* Live Backend Telemetry Data */}
              {activeRecord && (
                <div className="space-y-4 font-mono text-xs">
                  {/* Nodes Section: Source Node & Target Node */}
                  <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-2.5">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      ROAD CONNECTIVITY
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase">
                          Source Node
                        </span>
                        <span className="text-slate-200 font-bold">
                          {activeRecord.source_node || "N/A"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase">
                          Target Node
                        </span>
                        <span className="text-slate-200 font-bold">
                          {activeRecord.target_node || "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Telemetry Metrics (Speed, Flow, Occupancy, Queue) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        OBSERVED TELEMETRY
                      </span>
                      <ProvenanceBadge
                        type={activeRecord.provenance || "OBSERVED"}
                        size="sm"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {/* Speed: XX.XX km/h */}
                      <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-lg">
                        <div className="text-[10px] text-slate-500 uppercase">SPEED</div>
                        <div className="text-sm font-bold text-slate-100 mt-0.5">
                          {typeof activeRecord.speed_kmh === "number" ? activeRecord.speed_kmh.toFixed(1) : "—"}{" "}
                          <span className="text-[10px] font-normal text-slate-400">km/h</span>
                        </div>
                      </div>

                      {/* Flow: XXX.X veh/h */}
                      <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-lg">
                        <div className="text-[10px] text-slate-500 uppercase">FLOW</div>
                        <div className="text-sm font-bold text-slate-100 mt-0.5">
                          {typeof activeRecord.flow_vph === "number" ? activeRecord.flow_vph.toFixed(0) : "—"}{" "}
                          <span className="text-[10px] font-normal text-slate-400">veh/h</span>
                        </div>
                      </div>

                      {/* Occupancy: XX.XX % */}
                      <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-lg">
                        <div className="text-[10px] text-slate-500 uppercase">OCCUPANCY</div>
                        <div className="text-sm font-bold text-slate-100 mt-0.5">
                          {typeof activeRecord.occupancy_pct === "number" ? activeRecord.occupancy_pct.toFixed(1) : "—"}{" "}
                          <span className="text-[10px] font-normal text-slate-400">%</span>
                        </div>
                      </div>

                      {/* Queue: XX vehicles */}
                      <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-lg">
                        <div className="text-[10px] text-slate-500 uppercase">QUEUE</div>
                        <div className="text-sm font-bold text-slate-100 mt-0.5">
                          {typeof activeRecord.queue_length_veh === "number" ? Math.round(activeRecord.queue_length_veh) : "—"}{" "}
                          <span className="text-[10px] font-normal text-slate-400">veh</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Congestion State & Timestamp */}
                  <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-2.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-500 uppercase">
                        Congestion State
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          STATE_COLORS[activeRecord.congestion_state]?.bg ||
                          "bg-slate-800 text-slate-300"
                        }`}
                      >
                        {activeRecord.congestion_state}
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-800/60 pt-2 text-[11px]">
                      <span className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        Timestamp
                      </span>
                      <span className="text-slate-300">{activeRecord.timestamp || "Active observation"}</span>
                    </div>
                  </div>

                  {/* Secondary Telemetry: Delay & Confidence */}
                  {(activeRecord.delay_min !== undefined || activeRecord.confidence !== undefined) && (
                    <div className="bg-slate-900/40 border border-slate-800/60 rounded-lg p-2.5 space-y-1.5 text-[11px]">
                      {activeRecord.delay_min !== undefined && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">DELAY</span>
                          <span className="font-semibold text-amber-400">
                            {typeof activeRecord.delay_min === "number" ? `${activeRecord.delay_min.toFixed(1)} min` : "—"}
                          </span>
                        </div>
                      )}
                      {activeRecord.confidence !== undefined && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">CONFIDENCE</span>
                          <span className="font-semibold text-emerald-400">
                            {typeof activeRecord.confidence === "number" ? `${(activeRecord.confidence * 100).toFixed(0)}%` : "—"}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Close / Deselect Control */}
              <button
                onClick={() => onSelectSegment(null)}
                className="w-full mt-4 py-2 px-3 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs font-mono text-slate-300 hover:text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                Deselect Segment
              </button>
            </div>

            {/* Geometry limitation footnote */}
            <div className="pt-3 border-t border-slate-800/80 text-[10px] text-slate-500 flex items-center gap-1.5 font-sans">
              <Info className="w-3 h-3 text-slate-400 shrink-0" />
              <span>Straight organizer node-to-node link. Real coordinates.</span>
            </div>
          </div>
        ) : (
          <div className="w-full md:w-80 md:border-l border-t md:border-t-0 border-slate-800 bg-slate-950/90 p-5 flex flex-col justify-between z-20 font-sans shadow-2xl shrink-0">
            <div className="flex flex-col items-center text-center space-y-4 my-auto">
              <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-inner">
                <Compass className="w-7 h-7 animate-pulse" />
              </div>
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Select a road segment to begin investigation.
                </h4>
                <p className="text-[11px] text-slate-400 leading-relaxed max-w-[240px] mx-auto">
                  Search for a segment ID above or select one on the map.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 text-left space-y-2 w-full text-xs">
                <div className="text-[10px] text-slate-400 font-mono uppercase font-semibold flex items-center justify-between">
                  <span>Suggested Corridors</span>
                  <span className="text-[9px] text-cyan-400">Click to load</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {[
                    { id: "R0023", label: "R0023", path: "N006 → N018", speed: "40.0 km/h", state: "WATCH" },
                    { id: "R0001", label: "R0001", path: "N001 → N002", speed: "60.0 km/h", state: "NORMAL" },
                    { id: "R0003", label: "R0003", path: "N001 → N013", speed: "30.0 km/h", state: "NORMAL" },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        onSelectSegment(s.id);
                        setSearchTerm(s.id);
                      }}
                      className="px-2.5 py-2 rounded-lg bg-slate-950 hover:bg-cyan-950/60 border border-slate-800 hover:border-cyan-500/40 text-left flex items-center justify-between text-[11px] transition-all cursor-pointer group"
                    >
                      <div className="space-y-0.5">
                        <div className="font-mono font-bold text-cyan-300 group-hover:text-cyan-200">{s.label}</div>
                        <div className="text-[10px] text-slate-400 font-sans">{s.path}</div>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded border border-slate-700 text-slate-400 group-hover:text-slate-200 font-mono">
                        {s.speed}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800/80 text-[10px] text-slate-500 flex items-center gap-1.5 font-sans">
              <Info className="w-3 h-3 text-slate-400 shrink-0" />
              <span>436 organizer segments indexed and ready for investigation.</span>
            </div>
          </div>
        )}
      </div>

      {/* 4. Footer Pagination & Diagnostic Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-900/60 border border-slate-800 rounded-xl text-xs text-slate-400 font-mono">
        <div className="flex items-center gap-2">
          <span>
            Showing <strong className="text-slate-200">{records.length}</strong> of{" "}
            <strong className="text-slate-200">{totalRecords.toLocaleString()}</strong> traffic
            observation records across <strong className="text-cyan-400">436</strong> network
            segments
          </span>
          {unmappedCount > 0 && (
            <span className="text-amber-400 text-[11px] px-1.5 py-0.5 rounded bg-amber-950/40 border border-amber-500/30">
              {unmappedCount} skipped (missing coordinates)
            </span>
          )}
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center gap-2">
          <span className="text-slate-500">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => onPageChange(Math.max(0, offset - limit))}
            disabled={offset === 0 || loading}
            className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => onPageChange(offset + limit)}
            disabled={offset + limit >= totalRecords || loading}
            className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
