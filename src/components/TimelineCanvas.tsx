import { useEffect, useMemo, useRef, useState } from "react";
import type {
  ForceGraphData,
  GraphLink,
  GraphNode,
  NodeType,
} from "../types/graph";
import {
  FILTERABLE_NODE_TYPES,
  GRAPH_BACKGROUND_COLOR,
  MOVEMENT_NODE_OUTLINE_COLOR,
  NODE_TYPE_COLORS,
  NODE_TYPE_LABELS,
  THEORY_NODE_OUTLINE_COLOR,
} from "../constants/graphVisuals";
import { getEffectiveEndYear } from "../utils/getEffectiveEndYear";

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
  // Type/discipline-filtered nodes with NO year filter applied — used only
  // to drive playback's density-weighted timing. graphData itself is
  // year-filtered and must not be used for this, since playback animates
  // yearRange and would otherwise create a feedback loop.
  nodesIgnoringYearFilter: GraphNode[];
  isOpen: boolean;
  onToggle: () => void;
  compact?: boolean;
  pathwayNodeIds: string[];
  pathwayLinkIds: string[];
  anchoredNodeIds: Set<string>;
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
const MAX_LANE_HEIGHT_FULL = 44;
const MAX_LANE_HEIGHT_COMPACT = 24;
const MINOR_TICK_INTERVAL_YEARS = 200;

// Full playback covers the whole dataset in this real-world duration,
// advancing in discrete throttled steps rather than every animation frame —
// year-by-year granularity isn't perceptible anyway, and fewer discrete
// yearRange changes means fewer downstream graphData recomputations.
const PLAYBACK_DURATION_MS = 12000;
const PLAYBACK_STEP_MS = 200;
const PLAYBACK_STEP_COUNT = PLAYBACK_DURATION_MS / PLAYBACK_STEP_MS;
const MIN_YEAR_RANGE = 10;

function getEndpointId(endpoint: string | GraphNode): string {
  return typeof endpoint === "string" ? endpoint : endpoint.id;
}

function getNodeYear(node: GraphNode): number | undefined {
  return node.startYear ?? getEffectiveEndYear(node);
}

// ===========================================================================
// Shape helpers (pure — compute SVG attrs/points for each node symbol,
// relative to an already-translated origin)
// ===========================================================================

function getPortraitRectAttrs(radius: number) {
  const width = radius * 1.5;
  const height = radius * 2.1;
  return { x: -width / 2, y: -height / 2, width, height };
}

// A simple house silhouette: flat bottom, vertical walls, peaked roof.
function getHousePentagonPoints(radius: number): string {
  const halfWidth = radius * 1.05;
  const bottomY = radius * 1.1;
  const eaveY = radius * 0.1;
  const peakY = -radius * 1.3;

  return [
    `${-halfWidth},${bottomY}`,
    `${halfWidth},${bottomY}`,
    `${halfWidth},${eaveY}`,
    `0,${peakY}`,
    `${-halfWidth},${eaveY}`,
  ].join(" ");
}

function getHexagonPoints(radius: number): string {
  const points: string[] = [];

  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    points.push(`${radius * Math.cos(angle)},${radius * Math.sin(angle)}`);
  }

  return points.join(" ");
}

function getDiamondPoints(radius: number): string {
  return `0,${-radius} ${radius},0 0,${radius} ${-radius},0`;
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
  // Non-null for the whole duration of a playback session — including
  // while paused, not just while actively ticking — so the thumbs/fill
  // stay pinned at the filter bounds captured when the session started,
  // and the triangle marker stays visible, until the session truly ends
  // (natural completion, Reset, or a manual drag). Null the rest of the
  // time, when the slider behaves exactly as a normal filter control.
  playbackPinnedRange: [number, number] | null;
}

function TimelineRangeSlider({
  bounds,
  range,
  onChange,
  marginLeft,
  marginRight,
  playbackPinnedRange,
}: TimelineRangeSliderProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const draggingHandleRef = useRef<"min" | "max" | null>(null);
  // Mirrors draggingHandleRef for the sole purpose of being readable
  // during render (see displayRange below) — reading ref.current
  // directly during render isn't safe, since React can't guarantee the
  // render reflects the ref's value at commit time.
  const [isDragging, setIsDragging] = useState(false);

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
      setIsDragging(false);
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
    // yearRange (and therefore liveRange, synced from it) is left at
    // wherever the animation was paused, not the original filter bounds
    // — playbackPinnedRange holds those instead. Re-priming liveRange
    // from it here, right as the drag begins, ensures both the handle
    // being dragged and the other one start from the correct bounds
    // rather than the stale mid-animation position.
    if (playbackPinnedRange !== null) {
      setLiveRange(playbackPinnedRange);
    }
    draggingHandleRef.current = handle;
    setIsDragging(true);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const handle = event.currentTarget.dataset.handle as "min" | "max";
    const step = event.shiftKey ? 10 : 1;
    let delta = 0;

    if (event.key === "ArrowLeft" || event.key === "ArrowDown") delta = -step;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") delta = step;
    if (delta === 0) return;

    event.preventDefault();

    // range itself is left at the stale mid-animation position during a
    // paused session — use the pinned bounds as the basis instead, same
    // reasoning as handlePointerDown above.
    const basis = playbackPinnedRange ?? range;

    // Keyboard adjustments aren't high-frequency like drag, so commit immediately.
    if (handle === "min") {
      const maxAllowed = Math.max(basis[1] - MIN_YEAR_RANGE, bounds[0]);
      onChange([Math.min(basis[0] + delta, maxAllowed), basis[1]]);
    } else {
      const minAllowed = Math.min(basis[0] + MIN_YEAR_RANGE, bounds[1]);
      onChange([basis[0], Math.max(basis[1] + delta, minAllowed)]);
    }
  };

  // While playing or paused, thumbs/fill are pinned at the range
  // captured when playback started (see TimelineCanvas's
  // playbackPinnedRange) rather than following the live, ticking `range`
  // prop — that's the whole point of separating the slider's "filter
  // bounds" role from the triangle's "live animation position" role.
  // Except during an active drag, which should always be reflected
  // immediately regardless of session state — otherwise the thumb
  // visually freezes at the pinned position while the user is mid-drag
  // (the label still updates, since it reads liveRange directly), only
  // jumping to the real position on release. Not playing/paused and not
  // dragging: unchanged, same liveRange-driven behavior as before.
  const displayRange = isDragging ? liveRange : (playbackPinnedRange ?? liveRange);
  const minPercent = yearToPercent(displayRange[0], bounds);
  const maxPercent = yearToPercent(displayRange[1], bounds);

  // The triangle tracks the LIVE range (not the pinned display range) —
  // range[1] is exactly what playback's interval tick is continuously
  // updating, so this is always "the most recent data added." It moves
  // in the same density-weighted bursts as the data reveal itself,
  // deliberately — a smooth, constant-rate version was tried and felt
  // disconnected from the actual pacing of the data.
  const triangleYear = range[1];
  const trianglePercent = yearToPercent(triangleYear, bounds);

  // --- Editable year labels -------------------------------------------
  const [minInputText, setMinInputText] = useState(
    String(Math.round(liveRange[0])),
  );
  const [maxInputText, setMaxInputText] = useState(
    String(Math.round(liveRange[1])),
  );
  const [isMinInputFocused, setIsMinInputFocused] = useState(false);
  const [isMaxInputFocused, setIsMaxInputFocused] = useState(false);

  // Keep the displayed text in sync with the live range, but only while
  // the user isn't actively typing into it — otherwise an external
  // change (playback ticking, a drag, Reset) would overwrite
  // partially-typed input out from under them.
  if (!isMinInputFocused) {
    const rounded = String(Math.round(liveRange[0]));
    if (rounded !== minInputText) {
      setMinInputText(rounded);
    }
  }
  if (!isMaxInputFocused) {
    const rounded = String(Math.round(liveRange[1]));
    if (rounded !== maxInputText) {
      setMaxInputText(rounded);
    }
  }

  const commitMinInput = () => {
    const parsed = Number(minInputText);
    if (!Number.isFinite(parsed)) {
      setMinInputText(String(Math.round(range[0])));
      return;
    }
    const maxAllowed = Math.max(range[1] - MIN_YEAR_RANGE, bounds[0]);
    const clamped = Math.min(Math.max(Math.round(parsed), bounds[0]), maxAllowed);
    onChange([clamped, range[1]]);
  };

  const commitMaxInput = () => {
    const parsed = Number(maxInputText);
    if (!Number.isFinite(parsed)) {
      setMaxInputText(String(Math.round(range[1])));
      return;
    }
    const minAllowed = Math.min(range[0] + MIN_YEAR_RANGE, bounds[1]);
    const clamped = Math.max(Math.min(Math.round(parsed), bounds[1]), minAllowed);
    onChange([range[0], clamped]);
  };

  return (
    <div className="timeline-range-slider">
      <div
        className="timeline-range-track"
        ref={trackRef}
        style={{ marginLeft, marginRight }}
      >
        {playbackPinnedRange !== null && (
          <div
            className="timeline-playback-triangle"
            style={{ left: `${trianglePercent}%` }}
            aria-hidden="true"
          />
        )}

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
          aria-valuenow={displayRange[0]}
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
          aria-valuenow={displayRange[1]}
          tabIndex={0}
        />
      </div>

      <div className="timeline-range-labels" style={{ marginLeft, marginRight }}>
        <input
          className="timeline-range-label-input"
          type="text"
          inputMode="numeric"
          value={minInputText}
          onChange={(event) => setMinInputText(event.target.value)}
          onFocus={() => {
            setIsMinInputFocused(true);
          }}
          onBlur={() => {
            setIsMinInputFocused(false);
            setMinInputText(String(Math.round(range[0])));
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
              commitMinInput();
            } else if (event.key === "Escape") {
              setMinInputText(String(Math.round(range[0])));
              event.currentTarget.blur();
            }
          }}
          aria-label="Filter from year, editable"
        />
        <input
          className="timeline-range-label-input"
          type="text"
          inputMode="numeric"
          value={maxInputText}
          onChange={(event) => setMaxInputText(event.target.value)}
          onFocus={() => {
            setIsMaxInputFocused(true);
          }}
          onBlur={() => {
            setIsMaxInputFocused(false);
            setMaxInputText(String(Math.round(range[1])));
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
              commitMaxInput();
            } else if (event.key === "Escape") {
              setMaxInputText(String(Math.round(range[1])));
              event.currentTarget.blur();
            }
          }}
          aria-label="Filter to year, editable"
        />
      </div>
    </div>
  );
}

// ===========================================================================
// Timeline canvas
// ===========================================================================

// Plain SVG shapes instead of Unicode glyphs — "⏸" in particular renders as
// a colored emoji-style icon on many platforms/fonts, inconsistent with the
// plain triangle "▶" typically renders as. currentColor makes both inherit
// whatever the button's current text color is, including on hover.
function PlayIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
      <polygon points="1,0.5 9,5 1,9.5" fill="currentColor" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
      <rect x="1" y="0.5" width="3" height="9" fill="currentColor" />
      <rect x="6" y="0.5" width="3" height="9" fill="currentColor" />
    </svg>
  );
}

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
  nodesIgnoringYearFilter,
  isOpen,
  onToggle,
  compact = false,
  pathwayNodeIds,
  pathwayLinkIds,
  anchoredNodeIds,
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

  // Timeline playback ("watch history unfold"). playbackNodeIndexRef tracks
  // the current position within sortedNodeYears (not a fixed year-per-tick
  // increment), so playback spends real time proportional to node density
  // rather than calendar time. playbackLowerBoundRef tracks the lower
  // bound held for the current session. Both are re-synced from the
  // CURRENT yearRange prop every time Play is pressed (see
  // handlePlaybackToggle) rather than trusted as-is across a pause — that
  // sync is what makes resuming correctly respect any manual slider drag
  // made while paused, instead of silently reverting to a stale position.
  const [isPlaying, setIsPlaying] = useState(false);
  // Whether the chart's plotted domain should stretch to fit the
  // currently-filtered subset — toggled by the Fit Timeline / Show Full
  // Timeline button, which shows whichever label describes the action
  // NOT currently in effect. Defaults to false — dragging a filter shows
  // blank space at the stable, full-range domain until the user
  // explicitly asks for a fit, rather than auto-stretching, which is
  // what caused the domain to visibly jump between two different
  // reference frames the moment animation started or stopped. Also
  // forced back to false by starting playback, a manual drag, or
  // pressing Reset — each of those already invalidates whatever was
  // previously fitted.
  const [isFitEngaged, setIsFitEngaged] = useState(false);
  const playbackIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playbackNodeIndexRef = useRef(0);
  const playbackLowerBoundRef = useRef(yearBounds[0]);
  const playbackUpperBoundRef = useRef(yearBounds[1]);
  // Mirrors playbackLowerBoundRef/playbackUpperBoundRef for the sole
  // purpose of passing down to TimelineRangeSlider's render — reading
  // ref.current directly during render isn't safe (React can't guarantee
  // the render reflects the ref's value at commit time), so this state
  // is set at the same moment the refs are finalized in
  // handlePlaybackToggle, and the refs remain the source of truth used
  // inside the interval callback itself.
  const [playbackPinnedRange, setPlaybackPinnedRange] = useState<
    [number, number] | null
  >(null);

  useEffect(() => {
    return () => {
      if (playbackIntervalRef.current !== null) {
        clearInterval(playbackIntervalRef.current);
      }
    };
  }, []);

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

  // Every dated node's year (type/discipline-filtered, but NOT year-
  // filtered), sorted ascending, with duplicates kept — playback steps
  // through this array by index rather than through raw calendar years, so
  // a stretch with many nodes at similar years naturally consumes more of
  // the fixed step budget than a sparse stretch, without any manual density
  // calculation. Deliberately built from nodesIgnoringYearFilter rather
  // than datedNodes/graphData: those are already year-filtered, and since
  // playback itself animates yearRange, using them here would make this
  // array grow mid-animation and the resulting index targets unstable.
  const sortedNodeYears = useMemo(() => {
    const years: number[] = [];
    for (const node of nodesIgnoringYearFilter) {
      const year = getNodeYear(node);
      if (year !== undefined) {
        years.push(year);
      }
    }
    years.sort((a, b) => a - b);
    return years;
  }, [nodesIgnoringYearFilter]);

  // The chart's plotted domain either stretches to fit the currently
  // filtered subset (when the user has explicitly pressed "Fit
  // Timeline") or shows the stable, full-range domain — used by default,
  // and always used during an animation session (playing or paused), so
  // the reference frame never has to jump between "stretched to a
  // narrow filter" and "the whole dataset" mid-playback. yearBounds (the
  // full, fixed dataset extent) is left untouched here and continues to
  // define the slider's own draggable range separately.
  const isAnimationSessionActive = isPlaying || playbackPinnedRange !== null;

  const chartYearDomain = useMemo<[number, number]>(() => {
    const sourceNodes =
      !isAnimationSessionActive && isFitEngaged ? datedNodes : nodesIgnoringYearFilter;

    // One value per node — the same representative year each node is
    // actually plotted at (getNodeYear: startYear, falling back to
    // endYear only if no startYear exists). Previously this pushed BOTH
    // startYear and endYear per node, so a long-lived node whose
    // startYear fell inside the filter but whose endYear extended far
    // beyond it (e.g. an ongoing movement or institution) would stretch
    // the domain's right edge out to that distant endYear — a variable,
    // right-side-only buffer with no relation to where the plotted data
    // actually sits.
    const years = sourceNodes
      .map((node) => getNodeYear(node))
      .filter((year): year is number => year !== undefined);

    if (years.length === 0) {
      return yearBounds;
    }

    const min = Math.min(...years);
    const max = Math.max(...years);

    return [min, max];
  }, [isAnimationSessionActive, isFitEngaged, datedNodes, nodesIgnoringYearFilter, yearBounds]);

  const lanes = useMemo(() => {
    const typesPresent = new Set(
      nodesIgnoringYearFilter.map((node) => node.type),
    );
    return FILTERABLE_NODE_TYPES.filter((type) => typesPresent.has(type));
  }, [nodesIgnoringYearFilter]);

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

  const isPathwayActive = pathwayNodeIds.length > 0;

  const pathwayNodeIndex = useMemo(() => {
    const map = new Map<string, number>();
    pathwayNodeIds.forEach((id, index) => map.set(id, index));
    return map;
  }, [pathwayNodeIds]);

  const pathwayLinkIdSet = useMemo(
    () => new Set(pathwayLinkIds),
    [pathwayLinkIds],
  );

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
    if (isPathwayActive) {
      return pathwayNodeIndex.has(node.id)
        ? "#ffb703"
        : "rgba(110, 110, 110, 0.2)";
    }

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

  // Whether a node should currently read as de-emphasized, under whichever
  // highlight system (pathway / selected relationship / selected node) is
  // active. Shared by the hollow-shape fill/outline helpers below.
  const isNodeDimmed = (node: GraphNode) => {
    if (isPathwayActive) {
      return !pathwayNodeIndex.has(node.id);
    }

    if (selectedRelationshipId) {
      const link = visibleLinks.find((l) => l.id === selectedRelationshipId);
      const isEndpoint =
        link &&
        (getEndpointId(link.source) === node.id ||
          getEndpointId(link.target) === node.id);
      return !isEndpoint;
    }

    if (selectedNode) {
      return node.id !== selectedNode.id && !connectedNodeIds.has(node.id);
    }

    return false;
  };

  // Fill for "hollow" shapes (movement's circle, theory's hexagon): reads
  // as background/transparent by default, white when it's the selected
  // node itself, the pathway highlight color when active, or dimmed gray
  // otherwise — mirrors getNodeFill's branching but with a background
  // default instead of the type's solid color.
  const getHollowShapeFill = (node: GraphNode) => {
    if (isNodeDimmed(node)) {
      return "rgba(110, 110, 110, 0.2)";
    }

    if (isPathwayActive) {
      return "#ffb703";
    }

    if (node.id === selectedNode?.id) {
      return "#ffffff";
    }

    if (node.type === "movement" && anchoredNodeIds.has(node.id)) {
      return MOVEMENT_NODE_OUTLINE_COLOR;
    }

    return GRAPH_BACKGROUND_COLOR;
  };

  const getShapeOutlineColor = (node: GraphNode, activeColor: string) => {
    return isNodeDimmed(node) ? "rgba(110, 110, 110, 0.3)" : activeColor;
  };

  const getLinkStroke = (link: GraphLink) => {
    if (isPathwayActive) {
      return pathwayLinkIdSet.has(link.id)
        ? "rgba(255, 183, 3, 1)"
        : "rgba(110, 110, 110, 0.08)";
    }

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
    if (isPathwayActive) {
      return pathwayLinkIdSet.has(link.id) ? 3 : 0.5;
    }

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

  // Reachable at any time the button isn't fully disabled — including
  // mid-animation (playing or paused), where it cancels the session
  // entirely: stops any running interval, restores yearRange to the
  // full range that was originally captured for this session (rather
  // than leaving it at whatever partial year the animation had reached),
  // and engages the fitted view for that restored range.
  const handleFitTimeline = () => {
    const hadActiveSession = playbackPinnedRange !== null;

    stopPlayback();

    if (hadActiveSession) {
      onYearRangeChange([
        playbackLowerBoundRef.current,
        playbackUpperBoundRef.current,
      ]);
      setPlaybackPinnedRange(null);
      setIsFitEngaged(true);
      return;
    }

    // No active session to cancel — toggle between the stretched-to-fit
    // view and the full, stable view.
    setIsFitEngaged((current) => !current);
  };

  const stopPlayback = () => {
    if (playbackIntervalRef.current !== null) {
      clearInterval(playbackIntervalRef.current);
      playbackIntervalRef.current = null;
    }
    setIsPlaying(false);
  };

  const handleResetYearRange = () => {
    stopPlayback();
    setPlaybackPinnedRange(null);
    setIsFitEngaged(false);
    onYearRangeChange(yearBounds);
  };

  // Any manual drag on the slider should interrupt an active playback and
  // end the session entirely (not leave it paused-and-resumable) —
  // otherwise the interval's next tick would fight the user's own change,
  // and resuming later would use bounds the user just deliberately
  // overrode. handlePlaybackToggle treats a null playbackPinnedRange as
  // "start fresh," so whatever the user just dragged to is exactly what
  // gets picked up next time Play is pressed.
  const handleManualYearRangeChange = (range: [number, number]) => {
    if (isPlaying) {
      stopPlayback();
    }
    setPlaybackPinnedRange(null);
    setIsFitEngaged(false);
    onYearRangeChange(range);
  };

  // Pressing Play behaves one of two ways:
  // - No active session (playbackPinnedRange is null — a fresh press, or
  //   the previous session ended via natural completion / Reset / a
  //   manual drag): capture the current slider bounds as a new session
  //   and start from the left.
  // - Paused mid-session (playbackPinnedRange is still set): resume the
  //   interval from exactly where playbackNodeIndexRef left off, reusing
  //   the same captured bounds rather than re-reading yearRange — which,
  //   while paused, reflects the mid-animation position, not the
  //   original filter bounds.
  const handlePlaybackToggle = () => {
    if (isPlaying) {
      stopPlayback();
      return;
    }

    setIsFitEngaged(false);

    if (sortedNodeYears.length === 0) {
      return;
    }

    const isResuming = playbackPinnedRange !== null;

    if (!isResuming) {
      const lowerBound = yearRange[0];
      const upperBound = yearRange[1];

      playbackLowerBoundRef.current = lowerBound;
      playbackUpperBoundRef.current = upperBound;
      setPlaybackPinnedRange([lowerBound, upperBound]);

      // Start at the first node year at or after the left bound — not
      // "wherever a previous animation left off."
      let startIndex = sortedNodeYears.findIndex((year) => year >= lowerBound);
      if (startIndex === -1) {
        startIndex = sortedNodeYears.length;
      }
      playbackNodeIndexRef.current = startIndex;

      onYearRangeChange([lowerBound, lowerBound]);
    }
    // else resuming: playbackNodeIndexRef/playbackLowerBoundRef/
    // playbackUpperBoundRef are all already exactly where they were when
    // paused — nothing to re-capture.

    setIsPlaying(true);

    // Node-density-weighted timing: advance by a fixed fraction of the
    // total node population each tick, not a fixed year amount. The
    // triangle tracks this directly (see TimelineRangeSlider), moving in
    // the same bursts as the data reveal rather than at a smooth,
    // constant rate.
    const indexIncrement = Math.max(
      1,
      sortedNodeYears.length / PLAYBACK_STEP_COUNT,
    );

    playbackIntervalRef.current = setInterval(() => {
      playbackNodeIndexRef.current += indexIncrement;

      const reachedEndOfData =
        playbackNodeIndexRef.current >= sortedNodeYears.length;
      const currentYear = reachedEndOfData
        ? yearBounds[1]
        : sortedNodeYears[Math.floor(playbackNodeIndexRef.current)];
      const reachedTarget = currentYear >= playbackUpperBoundRef.current;

      if (reachedEndOfData || reachedTarget) {
        const finalYear = Math.min(playbackUpperBoundRef.current, yearBounds[1]);
        onYearRangeChange([playbackLowerBoundRef.current, finalYear]);
        if (playbackIntervalRef.current !== null) {
          clearInterval(playbackIntervalRef.current);
          playbackIntervalRef.current = null;
        }
        setIsPlaying(false);
        setPlaybackPinnedRange(null);
        return;
      }

      onYearRangeChange([playbackLowerBoundRef.current, currentYear]);
    }, PLAYBACK_STEP_MS);
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
              onClick={handlePlaybackToggle}
              disabled={sortedNodeYears.length === 0}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                {isPlaying ? <PauseIcon /> : <PlayIcon />}
                {isPlaying ? "Pause" : "Play"}
              </span>
            </button>

            <button
              className={
                isPlaying || playbackPinnedRange !== null
                  ? "fit-graph-button fit-graph-button--session-active"
                  : "fit-graph-button"
              }
              type="button"
              onClick={handleFitTimeline}
              disabled={isYearRangeAtFullExtent}
            >
              {isFitEngaged ? "Show Full Timeline" : "Fit Timeline"}
            </button>

            <button
              className="fit-graph-button"
              type="button"
              onClick={handleResetYearRange}
              disabled={isYearRangeAtFullExtent}
            >
              Reset
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
              onChange={handleManualYearRangeChange}
              marginLeft={MARGIN.left}
              marginRight={MARGIN.right}
              playbackPinnedRange={playbackPinnedRange}
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
                      fill={
                        type === "movement"
                          ? MOVEMENT_NODE_OUTLINE_COLOR
                          : NODE_TYPE_COLORS[type]
                      }
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
                        {(() => {
                          const radius = isSelected ? SELECTED_NODE_RADIUS : NODE_RADIUS;

                          if (node.type === "movement") {
                            return (
                              <circle
                                r={radius}
                                fill={getHollowShapeFill(node)}
                                stroke={getShapeOutlineColor(node, MOVEMENT_NODE_OUTLINE_COLOR)}
                                strokeWidth={1.5}
                              />
                            );
                          }

                          if (node.type === "publication") {
                            const rect = getPortraitRectAttrs(radius);
                            return (
                              <rect
                                x={rect.x}
                                y={rect.y}
                                width={rect.width}
                                height={rect.height}
                                fill={getNodeFill(node)}
                                stroke={GRAPH_BACKGROUND_COLOR}
                                strokeWidth={0.75}
                              />
                            );
                          }

                          if (node.type === "institution") {
                            return (
                              <polygon
                                points={getHousePentagonPoints(radius)}
                                fill={getNodeFill(node)}
                                stroke={GRAPH_BACKGROUND_COLOR}
                                strokeWidth={0.75}
                              />
                            );
                          }

                          if (node.type === "theory") {
                            return (
                              <polygon
                                points={getHexagonPoints(radius)}
                                fill={getHollowShapeFill(node)}
                                stroke={getShapeOutlineColor(node, THEORY_NODE_OUTLINE_COLOR)}
                                strokeWidth={1.5}
                              />
                            );
                          }

                          if (node.type === "technology") {
                            return (
                              <polygon
                                points={getDiamondPoints(radius)}
                                fill={getNodeFill(node)}
                                stroke={GRAPH_BACKGROUND_COLOR}
                                strokeWidth={0.75}
                              />
                            );
                          }

                          return <circle r={radius} fill={getNodeFill(node)} />;
                        })()}
                        {pathwayNodeIndex.has(node.id) && (
                          <g transform={`translate(${NODE_RADIUS * 0.9}, ${-NODE_RADIUS * 0.9})`}>
                            <circle r={7} fill="#ffb703" stroke="#181818" strokeWidth={1.5} />
                            <text
                              textAnchor="middle"
                              dominantBaseline="middle"
                              fontSize={8}
                              fill="#181818"
                            >
                              {(pathwayNodeIndex.get(node.id) as number) + 1}
                            </text>
                          </g>
                        )}
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
