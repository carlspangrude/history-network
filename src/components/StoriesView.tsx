import { useEffect, useMemo, useRef, type ReactNode } from "react";
import GraphCanvas from "./GraphCanvas";
import { STORIES } from "../data/stories";
import type { ForceGraphData, GraphNode } from "../types/graph";

interface StoriesViewProps {
  fullGraphData: ForceGraphData;
  // Lifted to App.tsx (which never unmounts) so it's actually remembered
  // across visits to this tab, since StoriesView itself unmounts/remounts
  // each time — see the GraphCanvas usage below for why.
  graphViewMode: "clusters" | "connections";
  onGraphViewModeChange: (mode: "clusters" | "connections") => void;
  // Same reasoning: which story is open and which step you're on both need
  // to survive leaving and returning to this tab, so they're lifted too.
  activeStoryId: string | null;
  onActiveStoryIdChange: (storyId: string | null) => void;
  stepIndex: number;
  onStepIndexChange: (index: number) => void;
  // Called when an inline [[nodeId|Label]] narrative link is clicked —
  // App.tsx implements this as "select the node and switch to Explore".
  onNavigateToNode: (nodeId: string) => void;
}

function getEndpointId(endpoint: string | GraphNode): string {
  return typeof endpoint === "string" ? endpoint : endpoint.id;
}

// Explore's graphData and the raw fullGraphData passed in here are built
// via .filter()/direct reference, which doesn't clone objects — meaning
// both views' physics simulations would otherwise mutate the exact same
// underlying node objects. Since Stories intentionally uses a different
// collision padding (Connections-style, spread out for readability), its
// reheat would silently "leak" new positions into Explore's shared nodes,
// visible as Explore's graph looking spread out while its own Clusters
// button still shows as active. Cloning nodes (and stripping any physics
// state so Stories starts genuinely fresh) and rebuilding links with
// plain string ids (so react-force-graph re-hydrates them against the
// NEW node objects, not the originals) fully isolates the two.
function cloneGraphDataForStory(fullGraphData: ForceGraphData): ForceGraphData {
  const clonedNodes = fullGraphData.nodes.map((node) => {
    const clone: GraphNode = { ...node };
    delete clone.x;
    delete clone.y;
    delete clone.vx;
    delete clone.vy;
    delete clone.fx;
    delete clone.fy;
    return clone;
  });

  const clonedLinks = fullGraphData.links.map((link) => ({
    ...link,
    source: getEndpointId(link.source),
    target: getEndpointId(link.target),
  }));

  return { nodes: clonedNodes, links: clonedLinks };
}

const NARRATIVE_LINK_PATTERN = /\[\[([^|\]]+)\|([^\]]+)\]\]/g;

// Parses [[nodeId|Label]] segments out of a narrative string into an
// array of plain text and clickable link elements, in original order.
// Matches a word-continuation suffix immediately after a link, with no
// space in between — e.g. the "'s" in "[[aristotle|Aristotle]]'s". Covers
// both straight and curly apostrophes defensively.
const NARRATIVE_LINK_SUFFIX_PATTERN = /^[A-Za-z''’]+/;

function renderNarrative(
  text: string,
  onNavigateToNode: (nodeId: string) => void,
): ReactNode[] {
  const segments: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  let match: RegExpExecArray | null;

  NARRATIVE_LINK_PATTERN.lastIndex = 0;

  while ((match = NARRATIVE_LINK_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push(text.slice(lastIndex, match.index));
    }

    const [, nodeId, label] = match;
    let endIndex = match.index + match[0].length;

    // Glue an immediately-following suffix to the link so the two can
    // never be split across a line break (e.g. "Aristotle" wrapping onto
    // one line and "'s" onto the next). The suffix itself stays outside
    // the clickable button — the link's own label should stay an exact
    // match for the node's name, not include grammatical suffixes.
    const suffixMatch = NARRATIVE_LINK_SUFFIX_PATTERN.exec(
      text.slice(endIndex),
    );
    const suffix = suffixMatch ? suffixMatch[0] : "";
    endIndex += suffix.length;

    const linkButton = (
      <span
        className="story-narrative-link"
        role="button"
        tabIndex={0}
        onClick={() => onNavigateToNode(nodeId)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onNavigateToNode(nodeId);
          }
        }}
      >
        {label}
      </span>
    );

    // Only force nowrap when there's an actual suffix to glue to the
    // link — otherwise this wrapper's white-space: nowrap inherits into
    // the button's own text and prevents long, multi-word labels (e.g.
    // full publication titles) from wrapping at all, forcing horizontal
    // overflow instead of a normal line break.
    if (suffix) {
      segments.push(
        <span
          key={`narrative-link-${key++}`}
          className="story-narrative-link-wrap"
        >
          {linkButton}
          {suffix}
        </span>,
      );
    } else {
      segments.push(
        <span key={`narrative-link-${key++}`}>{linkButton}</span>,
      );
    }

    lastIndex = endIndex;
  }

  if (lastIndex < text.length) {
    segments.push(text.slice(lastIndex));
  }

  return segments;
}

// Matches the on-graph pathway badge's color exactly — same fill, dark
// stroke and text — rendered as a standalone SVG for the narrative panel
// instead of drawn on the canvas.
function StepBadge({ stepNumber }: { stepNumber: number }) {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 28 28"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <circle
        cx="14"
        cy="14"
        r="12"
        fill="#9FE2BF"
        stroke="#181818"
        strokeWidth="1.5"
      />
      <text
        x="14"
        y="15"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="12"
        fontFamily="sans-serif"
        fill="#181818"
      >
        {stepNumber}
      </text>
    </svg>
  );
}

function StoriesListView({
  onSelectStory,
}: {
  onSelectStory: (storyId: string) => void;
}) {
  return (
    <div className="stories-list">
      <div className="stories-list-header">
        <h2>Stories</h2>
        <p className="stories-list-intro">
          Curated journeys through the history of ideas — pick one and follow
          the path, one step at a time.
        </p>
      </div>

      <div className="stories-grid">
        {STORIES.map((story) => (
          <button
            key={story.id}
            className="story-card"
            type="button"
            onClick={() => onSelectStory(story.id)}
          >
            <h3>{story.title}</h3>

            <span className="story-card-meta">
              {story.steps.length} Story Points
            </span>

            <p>{story.teaser}</p>

            <div className="tag-list story-card-tags">
              {story.disciplines.map((discipline) => (
                <span key={discipline}>{discipline}</span>
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function StoryViewer({
  storyId,
  fullGraphData,
  viewMode,
  onViewModeChange,
  stepIndex,
  onStepIndexChange,
  onNavigateToNode,
  onExit,
}: {
  storyId: string;
  fullGraphData: ForceGraphData;
  viewMode: "clusters" | "connections";
  onViewModeChange: (mode: "clusters" | "connections") => void;
  stepIndex: number;
  onStepIndexChange: (index: number) => void;
  onNavigateToNode: (nodeId: string) => void;
  onExit: () => void;
}) {
  const story = useMemo(
    () => STORIES.find((s) => s.id === storyId) ?? null,
    [storyId],
  );

  // Isolated copy of the graph data, built once per fullGraphData change —
  // see cloneGraphDataForStory above for why this is necessary.
  const storyGraphData = useMemo(
    () => cloneGraphDataForStory(fullGraphData),
    [fullGraphData],
  );

  // Narrative text length varies a lot between steps — a long step can
  // leave the panel scrolled down, and React doesn't reset scroll
  // position on its own when content changes. Without this, clicking to
  // a step whose content doesn't need to scroll can still show up
  // scrolled partway down from wherever a previous long step left it,
  // pushing the badge near the top out of view.
  const narrativeRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (narrativeRef.current) {
      narrativeRef.current.scrollTop = 0;
    }
  }, [stepIndex]);

  // Every consecutive pair of step nodes must have a real edge somewhere
  // in the dataset — this looks it up rather than assuming an id pattern,
  // since the curated step order doesn't necessarily match how the edge's
  // own source/target happen to be stored.
  const pathwayLinkIds = useMemo(() => {
    if (!story) {
      return [];
    }

    const ids: string[] = [];

    for (let i = 0; i < story.steps.length - 1; i++) {
      const a = story.steps[i].nodeId;
      const b = story.steps[i + 1].nodeId;

      const link = fullGraphData.links.find((candidate) => {
        const source = getEndpointId(candidate.source);
        const target = getEndpointId(candidate.target);
        return (
          (source === a && target === b) || (source === b && target === a)
        );
      });

      if (link) {
        ids.push(link.id);
      }
    }

    return ids;
  }, [story, fullGraphData.links]);

  if (!story) {
    return null;
  }

  // Clamped defensively — if more stories are added later with different
  // lengths, a stepIndex left over from a longer story shouldn't crash a
  // shorter one.
  const currentStepIndex = Math.min(stepIndex, story.steps.length - 1);

  const pathwayNodeIds = story.steps.map((step) => step.nodeId);
  const currentStep = story.steps[currentStepIndex];
  const currentNode =
    storyGraphData.nodes.find((node) => node.id === currentStep.nodeId) ??
    null;

  const handlePrevious = () => {
    onStepIndexChange(Math.max(currentStepIndex - 1, 0));
  };

  const handleNext = () => {
    onStepIndexChange(Math.min(currentStepIndex + 1, story.steps.length - 1));
  };

  return (
    <div className="story-viewer">
      <div className="story-viewer-graph">
        {/*
          A second GraphCanvas instance, deliberately NOT kept mounted when
          this tab isn't active (StoriesView's parent only renders this
          component while the Stories tab is selected) — unlike Explore's
          GraphCanvas, there's no state here worth preserving across tab
          switches, so avoiding a second always-running physics simulation
          in the background was the simpler tradeoff for a first pass.
          View mode is lifted to App.tsx specifically so it survives this
          unmount/remount cycle.

          Node selection is intentionally inert (v1 scope: navigation is
          Previous/Next only), and dragging is fully disabled — hover
          tooltips and zoom/pan still work, but nothing here can be moved
          or anchored.
        */}
        <GraphCanvas
          graphData={storyGraphData}
          selectedNode={currentNode}
          selectedRelationshipId={null}
          onNodeSelect={() => {}}
          onRelationshipOpen={() => {}}
          onSelectionClear={() => {}}
          pathwayNodeIds={pathwayNodeIds}
          pathwayLinkIds={pathwayLinkIds}
          anchoredNodeIds={new Set()}
          onNodeAnchored={() => {}}
          onUnanchorAll={() => {}}
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
          suppressSelectionFocus
          disableNodeDrag
        />
      </div>

      <aside className="story-viewer-narrative" ref={narrativeRef}>
        <button className="fit-graph-button" type="button" onClick={onExit}>
          ← All stories
        </button>

        <h2>{story.title}</h2>

        <StepBadge stepNumber={currentStepIndex + 1} />

        <h3>{currentNode?.name ?? currentStep.nodeId}</h3>

        <p className="story-step-narrative">
          {renderNarrative(currentStep.narrative, onNavigateToNode)}
        </p>

        <div className="story-viewer-nav">
          <button
            className="fit-graph-button"
            type="button"
            onClick={handlePrevious}
            disabled={currentStepIndex === 0}
          >
            Previous
          </button>

          <button
            className="fit-graph-button"
            type="button"
            onClick={handleNext}
            disabled={currentStepIndex === story.steps.length - 1}
          >
            Next
          </button>
        </div>
      </aside>
    </div>
  );
}

function StoriesView({
  fullGraphData,
  graphViewMode,
  onGraphViewModeChange,
  activeStoryId,
  onActiveStoryIdChange,
  stepIndex,
  onStepIndexChange,
  onNavigateToNode,
}: StoriesViewProps) {
  const handleSelectStory = (storyId: string) => {
    onActiveStoryIdChange(storyId);
    onStepIndexChange(0);
  };

  const handleExit = () => {
    onActiveStoryIdChange(null);
    onStepIndexChange(0);
  };

  if (activeStoryId) {
    return (
      <StoryViewer
        storyId={activeStoryId}
        fullGraphData={fullGraphData}
        viewMode={graphViewMode}
        onViewModeChange={onGraphViewModeChange}
        stepIndex={stepIndex}
        onStepIndexChange={onStepIndexChange}
        onNavigateToNode={onNavigateToNode}
        onExit={handleExit}
      />
    );
  }

  return <StoriesListView onSelectStory={handleSelectStory} />;
}

export default StoriesView;
