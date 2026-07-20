import { useEffect, useMemo, useRef, useState } from "react";
import type {
  ForceGraphData,
  GraphLink,
  GraphNode,
  NodeType,
} from "../types/graph";
import {
  FILTERABLE_NODE_TYPES,
  NODE_TYPE_COLORS,
  NODE_TYPE_LABELS,
} from "../constants/graphVisuals";

interface TimelineCanvasProps {
  graphData: ForceGraphData;
  selectedNode: GraphNode | null;
  selectedRelationshipId: string | null;
  onNodeSelect: (node: GraphNode) => void;
  onRelationshipOpen: (relationshipId: string) => void;
  onSelectionClear: () => void;
  yearBounds: [number, number];
  yearRange: [number, number];
  onYearRangeChange: (range: [number, number]) => void;
  isOpen: boolean;
  onToggle: () => void;
  compact?: boolean;
}

// ===========================================================================
// Layout constants
// ===========================================================================

const AXIS_GAP = 10;
const AXIS_LABEL_OFFSET = 16;
const AXIS_LABEL_BUFFER = 14;
const AXIS_RESERVED_HEIGHT = AXIS_GAP + AXIS_LABEL_OFFSET + AXIS_LABEL_BUFFER;

const FULL_MARGIN = { top: 16, right: 32, bottom: AXIS_RESERVED_HEIGHT, left: 140 };
const COMPACT_MARGIN = { top: 8, right: 20, bottom: AXIS_RESERVED_HEIGHT, left: 100 };
const MAX_LANE_HEIGHT_FULL = 64;
const MAX_LANE_HEIGHT_COMPACT = 32;
const MINOR_TICK_INTERVAL_YEARS = 200;
const MIN_YEAR_RANGE = 10;
const MIN_CHART_DOMAIN_SPAN = 200;

function getEndpointId(endpoint: string | GraphNode): string {
  return typeof endpoint === "string" ? endpoint : endpoint.id;
}

function getNodeYear(node: GraphNode): number | undefined {
  return node.startYear ?? node.endYear;
}

function yearToPercent(year: number, bounds: [number, number]): number {
  const [min, max] = bounds;
  if (max === min) return 0;
  return ((year - min) / (max - min)) * 100;
}

function percentToYear(percent: number, bounds: [number, number]): number {
  const [min, max] = bounds;
  return Math.round(min + (percent / 100) * (max - min));
}

// ===========================================================================
// Custom dual-thumb range slider
// ===========================================================================

interface TimelineRangeSliderProps {
  bounds: [number, number];
  range: [number, number];
  onChange: (range: [number, number]) => void;
  marginLeft: number;
  marginRight: number;
}

function TimelineRangeSlider({
  bounds,
  range,
  onChange,
  marginLeft,
  marginRight,
}: TimelineRangeSliderProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const draggingHandleRef = useRef<"min" | "max" | null>(null);

  // The thumbs track this local state while dragging — cheap, visual only.
  // The parent's `range` (which drives filtering the whole graph and
  // reheating the force simulation) is only updated once, on release, via
  // onChangeRef below. Committing on every pointermove instead was
  // saturating the main thread and hanging the tab during fast drags.
  const [liveRange, setLiveRange] = useState<[number, number]>(range);

  // Sync liveRange when the parent's range changes externally (e.g. a
  // future "reset filters" action) — done during render, per React's
  // guidance for adjusting state from a prop, rather than in an effect,
  // which would cause an extra cascading render on every commit.
  const [syncedRange, setSyncedRange] = useState<[number, number]>(range);

  if (range[0] !== syncedRange[0] || range[1] !== syncedRange[1]) {
    setSyncedRange(range);
    setLiveRange(range);
  }

  const liveRangeRef = useRef(liveRange);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    liveRangeRef.current = liveRange;
    onChangeRef.current = onChange;
  });

  const getYearFromClientX = (clientX: number): number | null => {
    const track = trackRef.current;
    if (!track) return null;

    const rect = track.getBoundingClientRect();
    const percent = Math.min(
      Math.max(((clientX - rect.left) / rect.width) * 100, 0),
      100,
    );

    return percentToYear(percent, bounds);
  };

  useEffect(() => {
    const handleWindowPointerMove = (event: PointerEvent) => {
      const handle = draggingHandleRef.current;
      if (!handle) return;

      const year = getYearFromClientX(event.clientX);
      if (year === null) return;

      setLiveRange((current) => {
        if (handle === "min") {
          const maxAllowed = Math.max(current[1] - MIN_YEAR_RANGE, bounds[0]);
          return [Math.min(year, maxAllowed), current[1]];
        }
        const minAllowed = Math.min(current[0] + MIN_YEAR_RANGE, bounds[1]);
        return [current[0], Math.max(year, minAllowed)];
      });
    };

    const handleWindowPointerUp = () => {
      if (draggingHandleRef.current) {
        onChangeRef.current(liveRangeRef.current);
      }
      draggingHandleRef.current = null;
    };

    window.addEventListener("pointermove", handleWindowPointerMove);
    window.addEventListener("pointerup", handleWindowPointerUp);
    window.addEventListener("pointercancel", handleWindowPointerUp);

    return () => {
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", handleWindowPointerUp);
      window.removeEventListener("pointercancel", handleWindowPointerUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bounds]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const handle = event.currentTarget.dataset.handle as "min" | "max";
    draggingHandleRef.current = handle;
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const handle = event.currentTarget.dataset.handle as "min" | "max";
    const step = event.shiftKey ? 10 : 1;
    let delta = 0;

    if (event.key === "ArrowLeft" || event.key === "ArrowDown") delta = -step;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") delta = step;
    if (delta === 0) return;

    event.preventDefault();

    // Keyboard adjustments aren't high-frequency like drag, so commit immediately.
    if (handle === "min") {
      const maxAllowed = Math.max(range[1] - MIN_YEAR_RANGE, bounds[0]);
      onChange([Math.min(range[0] + delta, maxAllowed), range[1]]);
    } else {
      const minAllowed = Math.min(range[0] + MIN_YEAR_RANGE, bounds[1]);
      onChange([range[0], Math.max(range[1] + delta, minAllowed)]);
    }
  };

  const minPercent = yearToPercent(liveRange[0], bounds);
  const maxPercent = yearToPercent(liveRange[1], bounds);

  return (
    <div className="timeline-range-slider">
      <div
        className="timeline-range-track"
        ref={trackRef}
        style={{ marginLeft, marginRight }}
      >
        <div
          className="timeline-range-fill"
          style={{ left: `${minPercent}%`, width: `${maxPercent - minPercent}%` }}
        />
        <div
          className="timeline-range-thumb"
          data-handle="min"
          style={{ left: `${minPercent}%` }}
          onPointerDown={handlePointerDown}
          onKeyDown={handleKeyDown}
          role="slider"
          aria-label="Filter from year"
          aria-valuemin={bounds[0]}
          aria-valuemax={bounds[1]}
          aria-valuenow={liveRange[0]}
          tabIndex={0}
        />
        <div
          className="timeline-range-thumb"
          data-handle="max"
          style={{ left: `${maxPercent}%` }}
          onPointerDown={handlePointerDown}
          onKeyDown={handleKeyDown}
          role="slider"
          aria-label="Filter to year"
          aria-valuemin={bounds[0]}
          aria-valuemax={bounds[1]}
          aria-valuenow={liveRange[1]}
          tabIndex={0}
        />
      </div>

      <div className="timeline-range-labels" style={{ marginLeft, marginRight }}>
        <span>{liveRange[0]}</span>
        <span>{liveRange[1]}</span>
      </div>
    </div>
  );
}

// ===========================================================================
// Timeline canvas
// ===========================================================================

function TimelineCanvas({
  graphData,
  selectedNode,
  selectedRelationshipId,
  onNodeSelect,
  onRelationshipOpen,
  onSelectionClear,
  yearBounds,
  yearRange,
  onYearRangeChange,
  isOpen,
  onToggle,
  compact = false,
}: TimelineCanvasProps) {

  const MARGIN = compact ? COMPACT_MARGIN : FULL_MARGIN;
  const MAX_LANE_HEIGHT = compact ? MAX_LANE_HEIGHT_COMPACT : MAX_LANE_HEIGHT_FULL;
  const NODE_RADIUS = compact ? 4 : 6;
  const SELECTED_NODE_RADIUS = compact ? 6 : 9;

  // ===========================================================================
  // Refs and State
  // ===========================================================================

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const container = containerRef.current;

    if (!container || !isOpen) {
      return;
    }

    const updateSize = () => {
      setSize({
        width: container.clientWidth,
        height: container.clientHeight,
      });
    };

    updateSize();

    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, [isOpen]);

  const { width, height } = size;

  // ===========================================================================
  // Derived Data
  // ===========================================================================

  const datedNodes = useMemo(
    () => graphData.nodes.filter((node) => getNodeYear(node) !== undefined),
    [graphData.nodes],
  );

  const undatedCount = graphData.nodes.length - datedNodes.length;

  // Auto-fit the chart's plotted domain to whatever data is currently
  // visible (after type/discipline/year filters) — similar to "Fit graph".
  // yearBounds (the full, fixed dataset extent) is left untouched here and
  // continues to define the slider's own draggable range separately.
  const chartYearDomain = useMemo<[number, number]>(() => {
    const years = datedNodes.flatMap((node) => {
      const values: number[] = [];
      if (node.startYear !== undefined) values.push(node.startYear);
      if (node.endYear !== undefined) values.push(node.endYear);
      return values;
    });

    if (years.length === 0) {
      return yearBounds;
    }

    let min = Math.min(...years);
    let max = Math.max(...years);

    const span = max - min;

    if (span < MIN_CHART_DOMAIN_SPAN) {
      const center = (min + max) / 2;
      min = center - MIN_CHART_DOMAIN_SPAN / 2;
      max = center + MIN_CHART_DOMAIN_SPAN / 2;
    }

    return [min, max];
  }, [datedNodes, yearBounds]);

  const lanes = useMemo(() => {
    const typesPresent = new Set(datedNodes.map((node) => node.type));
    return FILTERABLE_NODE_TYPES.filter((type) => typesPresent.has(type));
  }, [datedNodes]);

  const laneIndex = useMemo(() => {
    const map = new Map<NodeType, number>();
    lanes.forEach((type, index) => map.set(type, index));
    return map;
  }, [lanes]);

  // No lower floor here: lane height must always shrink to whatever fits in
  // the measured container height, or the axis (drawn below the last lane)
  // gets pushed past the visible area and clipped by overflow:hidden.
  const laneHeight = useMemo(() => {
    const availableHeight = Math.max(height - MARGIN.top - MARGIN.bottom, 0);
    const laneCount = Math.max(lanes.length, 1);
    const computed = availableHeight / laneCount;
    return Math.min(computed, MAX_LANE_HEIGHT);
  }, [height, lanes.length, MARGIN.top, MARGIN.bottom, MAX_LANE_HEIGHT]);

  const innerWidth = Math.max(width - MARGIN.left - MARGIN.right, 1);

  const xForYear = (year: number) =>
    MARGIN.left + ((year - chartYearDomain[0]) / (chartYearDomain[1] - chartYearDomain[0] || 1)) * innerWidth;

  const yForType = (type: NodeType) => {
    const index = laneIndex.get(type) ?? 0;
    return MARGIN.top + index * laneHeight + laneHeight / 2;
  };

  const axisY = MARGIN.top + lanes.length * laneHeight + AXIS_GAP;

  const nodePositions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();

    datedNodes.forEach((node) => {
      const year = getNodeYear(node);
      if (year === undefined) return;
      map.set(node.id, { x: xForYear(year), y: yForType(node.type) });
    });

    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datedNodes, width, height, chartYearDomain, laneHeight, laneIndex]);

  const visibleLinks = useMemo(
    () =>
      graphData.links.filter((link) => {
        const sourceId = getEndpointId(link.source);
        const targetId = getEndpointId(link.target);
        return nodePositions.has(sourceId) && nodePositions.has(targetId);
      }),
    [graphData.links, nodePositions],
  );

  const connectedNodeIds = useMemo(() => {
    const ids = new Set<string>();
    if (!selectedNode) return ids;

    ids.add(selectedNode.id);

    graphData.links.forEach((link) => {
      const sourceId = getEndpointId(link.source);
      const targetId = getEndpointId(link.target);
      if (sourceId === selectedNode.id) ids.add(targetId);
      if (targetId === selectedNode.id) ids.add(sourceId);
    });

    return ids;
  }, [graphData.links, selectedNode]);

  const yearTicks = useMemo(() => {
    const start = Math.ceil(chartYearDomain[0] / MINOR_TICK_INTERVAL_YEARS) * MINOR_TICK_INTERVAL_YEARS;
    const ticks: number[] = [];

    for (let year = start; year <= chartYearDomain[1]; year += MINOR_TICK_INTERVAL_YEARS) {
      ticks.push(year);
    }

    return ticks;
  }, [chartYearDomain]);

  // ===========================================================================
  // Visual Accessors
  // ===========================================================================

  const getNodeFill = (node: GraphNode) => {
    if (selectedRelationshipId) {
      const link = visibleLinks.find((l) => l.id === selectedRelationshipId);
      const isEndpoint =
        link &&
        (getEndpointId(link.source) === node.id ||
          getEndpointId(link.target) === node.id);
      return isEndpoint ? NODE_TYPE_COLORS[node.type] : "rgba(110, 110, 110, 0.25)";
    }

    if (!selectedNode) {
      return NODE_TYPE_COLORS[node.type];
    }

    if (node.id === selectedNode.id) {
      return "#ffffff";
    }

    return connectedNodeIds.has(node.id)
      ? NODE_TYPE_COLORS[node.type]
      : "rgba(110, 110, 110, 0.25)";
  };

  const getLinkStroke = (link: GraphLink) => {
    if (selectedRelationshipId) {
      return link.id === selectedRelationshipId
        ? "rgba(255, 230, 64, 1)"
        : "rgba(110, 110, 110, 0.1)";
    }

    if (!selectedNode) {
      return "rgba(220, 220, 220, 0.35)";
    }

    const sourceId = getEndpointId(link.source);
    const targetId = getEndpointId(link.target);
    const isConnected = sourceId === selectedNode.id || targetId === selectedNode.id;

    return isConnected ? "rgba(255, 255, 255, 0.8)" : "rgba(110, 110, 110, 0.1)";
  };

  const getLinkWidth = (link: GraphLink) => {
    if (link.id === selectedRelationshipId) return 3;
    if (!selectedNode) return 1;

    const sourceId = getEndpointId(link.source);
    const targetId = getEndpointId(link.target);
    return sourceId === selectedNode.id || targetId === selectedNode.id ? 2 : 0.75;
  };

  const buildArcPath = (source: { x: number; y: number }, target: { x: number; y: number }) => {
    const midX = (source.x + target.x) / 2;
    const dx = Math.abs(target.x - source.x);
    const liftHeight = Math.min(Math.max(dx * 0.25, 12), laneHeight * 1.5);
    const controlY = Math.min(source.y, target.y) - liftHeight;

    return `M ${source.x} ${source.y} Q ${midX} ${controlY} ${target.x} ${target.y}`;
  };

  const isYearRangeAtFullExtent =
    yearRange[0] === yearBounds[0] && yearRange[1] === yearBounds[1];

  const handleResetYearRange = () => {
    onYearRangeChange(yearBounds);
  };

  // ===========================================================================
  // Render
  // ===========================================================================

  return (
    <>
      <button
        className="panel-toggle timeline-toggle"
        type="button"
        aria-expanded={isOpen}
        aria-label={
          isOpen ? "Close timeline panel" : "Open timeline panel"
        }
        onClick={onToggle}
      >
        <span
          className="timeline-toggle-icon"
          style={{ transform: isOpen ? "rotate(90deg)" : "rotate(-90deg)" }}
        >
          ›
        </span>
      </button>

      <section className={compact ? "canvas canvas--compact" : "canvas"}>
        <div className="timeline-header">
          <div>
            <h2>Timeline</h2>
          </div>

          <div className="graph-toolbar-actions">
            <button
              className="fit-graph-button"
              type="button"
              onClick={handleResetYearRange}
              disabled={isYearRangeAtFullExtent}
            >
              Reset filter
            </button>

            <div className="graph-stats">
              <span>{datedNodes.length} dated entries</span>
              {undatedCount > 0 && <span>{undatedCount} without dates</span>}
            </div>
          </div>
        </div>

        {isOpen && (
          <>
            <TimelineRangeSlider
              bounds={yearBounds}
              range={yearRange}
              onChange={onYearRangeChange}
              marginLeft={MARGIN.left}
              marginRight={MARGIN.right}
            />

          <div className="force-graph-container" ref={containerRef}>
            {width > 0 && height > 0 && (
              <svg
                width={width}
                height={height}
                onClick={onSelectionClear}
                style={{ display: "block" }}
              >
                {/* Year axis */}
                <g>
                  <line
                    x1={MARGIN.left}
                    y1={axisY}
                    x2={width - MARGIN.right}
                    y2={axisY}
                    stroke="rgba(220, 220, 220, 0.3)"
                  />
                  {yearTicks.map((year) => (
                    <g key={year} transform={`translate(${xForYear(year)}, ${axisY})`}>
                      <line y2={6} stroke="rgba(220, 220, 220, 0.3)" />
                      <text
                        y={AXIS_LABEL_OFFSET}
                        textAnchor="middle"
                        fill="rgba(220, 220, 220, 0.6)"
                        fontSize={compact ? 10 : 11}
                      >
                        {year}
                      </text>
                    </g>
                  ))}
                </g>

                {/* Lane labels */}
                <g>
                  {lanes.map((type) => (
                    <text
                      key={type}
                      x={MARGIN.left - 12}
                      y={yForType(type)}
                      textAnchor="end"
                      dominantBaseline="middle"
                      fill={NODE_TYPE_COLORS[type]}
                      fontSize={compact ? 10 : 12}
                    >
                      {NODE_TYPE_LABELS[type]}
                    </text>
                  ))}
                </g>

                {/* Links as arcs */}
                <g>
                  {visibleLinks.map((link) => {
                    const sourceId = getEndpointId(link.source);
                    const targetId = getEndpointId(link.target);
                    const sourcePos = nodePositions.get(sourceId);
                    const targetPos = nodePositions.get(targetId);

                    if (!sourcePos || !targetPos) return null;

                    return (
                      <path
                        key={link.id}
                        d={buildArcPath(sourcePos, targetPos)}
                        fill="none"
                        stroke={getLinkStroke(link)}
                        strokeWidth={getLinkWidth(link)}
                        style={{ cursor: "pointer" }}
                        onClick={(event) => {
                          event.stopPropagation();
                          onRelationshipOpen(link.id);
                        }}
                      >
                        <title>{link.relationship}</title>
                      </path>
                    );
                  })}
                </g>

                {/* Nodes */}
                <g>
                  {datedNodes.map((node) => {
                    const pos = nodePositions.get(node.id);
                    if (!pos) return null;

                    const isSelected = node.id === selectedNode?.id;

                    return (
                      <g
                        key={node.id}
                        transform={`translate(${pos.x}, ${pos.y})`}
                        style={{ cursor: "pointer" }}
                        onClick={(event) => {
                          event.stopPropagation();
                          onNodeSelect(node);
                        }}
                      >
                        {isSelected && (
                          <circle r={SELECTED_NODE_RADIUS + 4} fill="none" stroke="#e96500" strokeWidth={2} />
                        )}
                        <circle r={isSelected ? SELECTED_NODE_RADIUS : NODE_RADIUS} fill={getNodeFill(node)} />
                        <title>{`${node.name} · ${node.type}`}</title>
                      </g>
                    );
                  })}
                </g>
              </svg>
            )}
          </div>
          </>
        )}
      </section>
    </>
  );
}

export default TimelineCanvas;
