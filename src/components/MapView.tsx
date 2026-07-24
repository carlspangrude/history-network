import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { ForceGraphData, GraphNode } from "../types/graph";
import { CONTINENT_OUTLINES } from "../data/continentOutlines";

// ===========================================================================
// MapView
//
// Architecture note: this is deliberately NOT one big useEffect that
// rebuilds the whole scene on every prop change. Camera/renderer/scene
// setup happens exactly once; graphData/yearRange/selectedNode changes
// trigger targeted updates (rebuilding points and arcs, or animating the
// camera) against that same persistent scene via refs. An earlier version
// of this file used a single effect with selectedNode in its dependency
// array, which meant every click-to-select silently reset the globe's
// rotation back to default — the smooth reorientation this version adds
// wouldn't have been possible without fixing that first.
//
// Fit Map resets to a fixed default view (side-on, whole globe visible)
// rather than computing a data-driven fit — an earlier version auto-
// followed the camera to frame whatever was currently visible, including
// during playback, but with this dataset's actual geographic spread
// everything already stays in frame throughout an animation, so that
// camera movement was tried and then deliberately removed rather than
// kept as unnecessary complexity. Continent outlines are real data (see
// src/data/continentOutlines.ts), not the earlier hand-approximated
// placeholder shapes.
// ===========================================================================

interface MapViewProps {
  graphData: ForceGraphData;
  selectedNode: GraphNode | null;
  yearRange: [number, number];
  onNodeSelect: (node: GraphNode) => void;
  onSelectionClear: () => void;
}

const NODE_TYPE_COLORS: Record<string, number> = {
  person: 0x6ea8fe,
  institution: 0x67c7d4,
  technology: 0xc9a0f5,
};

// Matches each node type's shape in the 2D graph (person: filled circle,
// institution: house pentagon, technology: solid diamond), oriented flat
// against the sphere's surface facing outward, rather than using a plain
// sphere for everything.
function createPointGeometry(nodeType: string, radius: number): THREE.BufferGeometry {
  if (nodeType === "institution") {
    const shape = new THREE.Shape();
    const sides = 5;
    for (let i = 0; i < sides; i++) {
      // Start pointing up (like a house's roof peak) rather than the
      // default first-vertex-on-the-x-axis orientation.
      const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) {
        shape.moveTo(x, y);
      } else {
        shape.lineTo(x, y);
      }
    }
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }

  if (nodeType === "technology") {
    return new THREE.OctahedronGeometry(radius * 1.15);
  }

  return new THREE.SphereGeometry(radius, 12, 12);
}

// Institution's flat pentagon needs orienting so its face points outward
// from the sphere's surface (like a sticker on a ball) rather than facing
// whatever arbitrary direction ShapeGeometry's default XY-plane
// construction happens to leave it in.
function orientFlatShapeOutward(mesh: THREE.Mesh, outwardDirection: THREE.Vector3): void {
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), outwardDirection);
}

// Camera distance below which clusters break apart into individual
// points; at or above it, a cluster shows as a single number badge.
const CLUSTER_BREAK_ZOOM = 340;

// Renders a small filled circle with a count inside it to an offscreen
// canvas, for use as a Sprite texture. Sprites always face the camera
// automatically, unlike a mesh (which needed manual per-frame
// billboarding in an earlier version of this file).
function createBadgeTexture(count: number, color: number): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const hex = `#${color.toString(16).padStart(6, "0")}`;
    ctx.beginPath();
    ctx.arc(32, 32, 28, 0, Math.PI * 2);
    ctx.fillStyle = hex;
    ctx.fill();
    ctx.fillStyle = "#0a0a0a";
    ctx.font = "bold 28px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(count), 32, 34);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

const SPHERE_RADIUS = 200;
const DEFAULT_CAMERA_Z = 540;
const SELECTED_CAMERA_Z = 450; // "minimal" zoom-in on reorient, per design — still see most of the globe
const MIN_CAMERA_Z = 260; // close enough to read individual points without clipping into the sphere
const MAX_CAMERA_Z = 1400;

function latLngToVector(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

function getEndpointId(endpoint: string | { id: string }): string {
  return typeof endpoint === "string" ? endpoint : endpoint.id;
}

// Resolves where a node should render right now: institutions/technologies
// use their fixed lat/lng; people use whichever `locations` entry is
// active as of the current year filter's right edge (a discrete jump
// between entries, not an interpolated glide — see the location-schema
// design notes for why).
function getCurrentCoordinates(
  node: GraphNode,
  asOfYear: number,
): { lat: number; lng: number } | null {
  if (node.lat !== undefined && node.lng !== undefined) {
    return { lat: node.lat, lng: node.lng };
  }

  if (node.locations && node.locations.length > 0) {
    let current = null;
    for (const loc of node.locations) {
      if (loc.startYear <= asOfYear) {
        current = loc;
      }
    }
    if (!current) {
      return null;
    }
    return { lat: current.lat, lng: current.lng };
  }

  return null;
}

// Groups nodes whose current coordinates round to the same ~0.1-degree
// cell (roughly city-scale) — a group of one renders as a normal point,
// a group of more than one renders as a single cluster point until
// hovered/tapped open.
interface LocationCluster {
  key: string;
  lat: number;
  lng: number;
  members: GraphNode[];
}

function groupNodesByLocation(
  nodes: GraphNode[],
  asOfYear: number,
): LocationCluster[] {
  const clusters = new Map<string, LocationCluster>();

  nodes.forEach((node) => {
    const coords = getCurrentCoordinates(node, asOfYear);
    if (!coords || NODE_TYPE_COLORS[node.type] === undefined) {
      return;
    }
    const key = `${coords.lat.toFixed(1)},${coords.lng.toFixed(1)}`;
    const existing = clusters.get(key);
    if (existing) {
      existing.members.push(node);
    } else {
      clusters.set(key, {
        key,
        lat: coords.lat,
        lng: coords.lng,
        members: [node],
      });
    }
  });

  return Array.from(clusters.values());
}

// Fans a cluster's members out into a small flat circle held just above
// the sphere's surface at that location — the "spiderfy" pattern, so
// overlapping points become individually selectable without needing to
// zoom in.
function getExplodedPositions(
  clusterLat: number,
  clusterLng: number,
  count: number,
): THREE.Vector3[] {
  const basePosition = latLngToVector(clusterLat, clusterLng, SPHERE_RADIUS);
  const outward = basePosition.clone().normalize();
  const worldUp = new THREE.Vector3(0, 1, 0);
  const referenceUp = Math.abs(outward.dot(worldUp)) > 0.99
    ? new THREE.Vector3(1, 0, 0)
    : worldUp;
  const tangent1 = new THREE.Vector3().crossVectors(outward, referenceUp).normalize();
  const tangent2 = new THREE.Vector3().crossVectors(outward, tangent1).normalize();

  const liftHeight = 18;
  const fanRadius = Math.min(9 + count * 1.6, 26);
  const center = basePosition.clone().add(outward.clone().multiplyScalar(liftHeight));

  const positions: THREE.Vector3[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    positions.push(
      center
        .clone()
        .add(tangent1.clone().multiplyScalar(Math.cos(angle) * fanRadius))
        .add(tangent2.clone().multiplyScalar(Math.sin(angle) * fanRadius)),
    );
  }
  return positions;
}


interface ClickableMesh {
  mesh: THREE.Object3D;
  node?: GraphNode;
  clusterKey?: string;
}

function MapView({
  graphData,
  selectedNode,
  yearRange,
  onNodeSelect,
  onSelectionClear,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fitButtonHandlerRef = useRef<(() => void) | null>(null);

  // Persistent Three.js objects — created once in the setup effect below,
  // read/mutated by the targeted-update effects that follow it.
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const pointsGroupRef = useRef<THREE.Group | null>(null);
  const arcsGroupRef = useRef<THREE.Group | null>(null);

  // Callback refs the setup effect's functions can call to trigger a
  // rebuild without needing graphData/yearRange/selectedNode in the
  // one-time effect's own dependency array.
  const rebuildPointsRef = useRef<(() => void) | null>(null);
  const rebuildArcsRef = useRef<(() => void) | null>(null);

  // Interaction state, shared across the pointer handlers and render
  // loop defined inside the setup effect.
  const clickableMeshesRef = useRef<ClickableMesh[]>([]);
  // Whether clusters are currently showing as broken-apart individual
  // points (zoomed in past CLUSTER_BREAK_ZOOM) or as a single number
  // badge — a global zoom-driven state, not tracked per-cluster, since
  // there's no longer any hover/tap gesture involved.
  const clustersBrokenApartRef = useRef(false);
  const isDraggingRef = useRef(false);
  // Whether auto-rotate is currently active. Starts true (spinning on
  // initial view), set false permanently on a drag or a selection —
  // not just paused for the duration of the interaction — until Fit Map
  // explicitly resets it.
  const isSpinningRef = useRef(true);

  // Smooth camera reorientation state — set by the selection-change
  // effect below, consumed frame-by-frame in the render loop.
  const targetQuaternionRef = useRef<THREE.Quaternion | null>(null);
  const targetCameraZRef = useRef<number | null>(null);

  // Mirrors of the latest props, so closures created once in the setup
  // effect always see current values without needing those props in its
  // dependency array (which would force a full scene teardown/rebuild on
  // every change — exactly what this architecture exists to avoid).
  const graphDataRef = useRef(graphData);
  const yearRangeRef = useRef(yearRange);
  const selectedNodeRef = useRef(selectedNode);
  const onNodeSelectRef = useRef(onNodeSelect);
  const onSelectionClearRef = useRef(onSelectionClear);

  useEffect(() => {
    graphDataRef.current = graphData;
  }, [graphData]);
  useEffect(() => {
    yearRangeRef.current = yearRange;
  }, [yearRange]);
  useEffect(() => {
    selectedNodeRef.current = selectedNode;
  }, [selectedNode]);
  useEffect(() => {
    onNodeSelectRef.current = onNodeSelect;
  }, [onNodeSelect]);
  useEffect(() => {
    onSelectionClearRef.current = onSelectionClear;
  }, [onSelectionClear]);

  // ===========================================================================
  // One-time scene setup
  // ===========================================================================
  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 2000);
    camera.position.set(0, 0, DEFAULT_CAMERA_Z);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    container.appendChild(renderer.domElement);

    const group = new THREE.Group();
    group.rotation.x = 0;
    group.rotation.y = -0.6;
    scene.add(group);
    groupRef.current = group;

    const pointsGroup = new THREE.Group();
    group.add(pointsGroup);
    pointsGroupRef.current = pointsGroup;

    const arcsGroup = new THREE.Group();
    group.add(arcsGroup);
    arcsGroupRef.current = arcsGroup;

    // Very subtle ocean fill for contrast against the pure black
    // background — kept semi-transparent, not opaque, so the far side
    // of the sphere (continents, points) stays visible through it,
    // consistent with the sphere being deliberately see-through.
    const oceanGeo = new THREE.SphereGeometry(SPHERE_RADIUS - 1, 48, 32);
    const oceanMat = new THREE.MeshBasicMaterial({
      color: 0x0d1a26,
      transparent: true,
      opacity: 0.5,
    });
    group.add(new THREE.Mesh(oceanGeo, oceanMat));

    const equatorGeo = new THREE.RingGeometry(SPHERE_RADIUS - 0.5, SPHERE_RADIUS + 0.5, 128);
    equatorGeo.rotateX(Math.PI / 2);
    const equatorMat = new THREE.MeshBasicMaterial({
      color: 0x6b6b6b,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    });
    group.add(new THREE.Mesh(equatorGeo, equatorMat));

    const continentMaterial = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(0x8a8a8a) },
        nearOpacity: { value: 0.55 },
        farOpacity: { value: 0.08 },
      },
      vertexShader: `
        varying float vWorldZ;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldZ = worldPosition.z;
          gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        uniform float nearOpacity;
        uniform float farOpacity;
        varying float vWorldZ;
        void main() {
          float t = smoothstep(-40.0, 40.0, vWorldZ);
          float opacity = mix(farOpacity, nearOpacity, t);
          gl_FragColor = vec4(color, opacity);
        }
      `,
      transparent: true,
    });

    CONTINENT_OUTLINES.forEach((ring) => {
      const points = ring.map(([lng, lat]) =>
        latLngToVector(lat, lng, SPHERE_RADIUS + 0.4),
      );
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      group.add(new THREE.Line(geo, continentMaterial));
    });

    // --- Points (cluster-aware, rebuildable) --------------------------
    const disposeObject = (object: THREE.Mesh | THREE.Line | THREE.Sprite) => {
      if (object instanceof THREE.Sprite) {
        object.material.map?.dispose();
        object.material.dispose();
        return;
      }
      object.geometry.dispose();
      const material = object.material;
      if (Array.isArray(material)) {
        material.forEach((m) => m.dispose());
      } else {
        material.dispose();
      }
    };

    const SELECTED_COLOR = 0xffffff;

    const addPoint = (
      position: THREE.Vector3,
      color: number,
      isSelected: boolean,
      nodeType: string,
      registration: { node?: GraphNode; clusterKey?: string },
    ) => {
      const renderColor = isSelected ? SELECTED_COLOR : color;
      const radius = isSelected ? 2.2 : 1.6;
      const geo = createPointGeometry(nodeType, radius);
      const mat = new THREE.MeshBasicMaterial({ color: renderColor, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(position);
      if (nodeType === "institution") {
        orientFlatShapeOutward(mesh, position.clone().normalize());
      }
      pointsGroup.add(mesh);
      clickableMeshesRef.current.push({ mesh, ...registration });

      // Glow stays a plain soft sphere regardless of point shape — it's
      // an ambient halo, not something that needs to match the node's
      // specific silhouette.
      const glowGeo = new THREE.SphereGeometry(radius * 1.7, 12, 12);
      const glowMat = new THREE.MeshBasicMaterial({
        color: renderColor,
        transparent: true,
        opacity: isSelected ? 0.4 : 0.16,
      });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      glow.position.copy(position);
      pointsGroup.add(glow);
    };

    const rebuildPoints = () => {
      while (pointsGroup.children.length > 0) {
        const child = pointsGroup.children[0];
        pointsGroup.remove(child);
        if (child instanceof THREE.Mesh || child instanceof THREE.Sprite) {
          disposeObject(child);
        }
      }
      clickableMeshesRef.current = [];

      const clusters = groupNodesByLocation(
        graphDataRef.current.nodes,
        yearRangeRef.current[1],
      );

      clusters.forEach((cluster) => {
        if (cluster.members.length === 1 || clustersBrokenApartRef.current) {
          const positions =
            cluster.members.length === 1
              ? [latLngToVector(cluster.lat, cluster.lng, SPHERE_RADIUS)]
              : getExplodedPositions(cluster.lat, cluster.lng, cluster.members.length);

          cluster.members.forEach((node, i) => {
            const color = NODE_TYPE_COLORS[node.type];
            const isSelected = selectedNodeRef.current?.id === node.id;
            addPoint(positions[i], color, isSelected, node.type, { node });
          });
        } else {
          const typeCounts = new Map<string, number>();
          cluster.members.forEach((n) => {
            typeCounts.set(n.type, (typeCounts.get(n.type) ?? 0) + 1);
          });
          const dominantType = [...typeCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];
          const color = NODE_TYPE_COLORS[dominantType];

          const position = latLngToVector(cluster.lat, cluster.lng, SPHERE_RADIUS);
          const texture = createBadgeTexture(cluster.members.length, color);
          const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
          const sprite = new THREE.Sprite(spriteMat);
          const badgeScale = 9;
          sprite.scale.set(badgeScale, badgeScale, 1);
          sprite.position.copy(position);
          pointsGroup.add(sprite);
          clickableMeshesRef.current.push({
            mesh: sprite,
            clusterKey: cluster.key,
          });
        }
      });
    };
    rebuildPointsRef.current = rebuildPoints;

    // --- Arcs — only the current selection's direct connections --------
    const rebuildArcs = () => {
      while (arcsGroup.children.length > 0) {
        const child = arcsGroup.children[0];
        arcsGroup.remove(child);
        if (child instanceof THREE.Line) {
          disposeObject(child);
        }
      }

      const selected = selectedNodeRef.current;
      if (!selected) {
        return;
      }

      const selectedCoords = getCurrentCoordinates(selected, yearRangeRef.current[1]);
      if (!selectedCoords) {
        return;
      }
      const selectedPos = latLngToVector(selectedCoords.lat, selectedCoords.lng, SPHERE_RADIUS);

      const nodeById = new Map(graphDataRef.current.nodes.map((n) => [n.id, n]));

      graphDataRef.current.links.forEach((link) => {
        const sourceId = getEndpointId(link.source);
        const targetId = getEndpointId(link.target);
        const otherId = sourceId === selected.id ? targetId : targetId === selected.id ? sourceId : null;
        if (!otherId) {
          return;
        }
        const otherNode = nodeById.get(otherId);
        if (!otherNode) {
          return;
        }
        const otherCoords = getCurrentCoordinates(otherNode, yearRangeRef.current[1]);
        if (!otherCoords) {
          return;
        }
        const otherPos = latLngToVector(otherCoords.lat, otherCoords.lng, SPHERE_RADIUS);

        const mid = selectedPos
          .clone()
          .add(otherPos)
          .multiplyScalar(0.5)
          .normalize()
          .multiplyScalar(SPHERE_RADIUS * 1.18);
        const curve = new THREE.QuadraticBezierCurve3(selectedPos, mid, otherPos);
        const points = curve.getPoints(40);
        const geo = new THREE.BufferGeometry().setFromPoints(points);
        const mat = new THREE.LineBasicMaterial({
          color: 0xffe640,
          transparent: true,
          opacity: 0.45,
        });
        arcsGroup.add(new THREE.Line(geo, mat));
      });
    };
    rebuildArcsRef.current = rebuildArcs;

    rebuildPoints();
    rebuildArcs();

    // --- Drag / auto-rotate / click-to-select ---------------------------
    let hasDraggedThisGesture = false;
    let prevX = 0;
    let prevY = 0;
    const autoRotateSpeed = 0.0009;

    const handlePointerDown = (event: PointerEvent) => {
      isDraggingRef.current = true;
      hasDraggedThisGesture = false;
      prevX = event.clientX;
      prevY = event.clientY;
      container.style.cursor = "grabbing";
      // Manual input takes precedence over any in-progress programmatic
      // reorientation, and over auto-rotate.
      targetQuaternionRef.current = null;
      targetCameraZRef.current = null;
      isSpinningRef.current = false;
    };

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const setPointerFromEvent = (event: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const raycastClickables = (): ClickableMesh | null => {
      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects(
        clickableMeshesRef.current.map((c) => c.mesh),
      );
      if (intersects.length === 0) {
        return null;
      }
      return clickableMeshesRef.current.find((c) => c.mesh === intersects[0].object) ?? null;
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!isDraggingRef.current) {
        return;
      }
      const dx = event.clientX - prevX;
      const dy = event.clientY - prevY;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        hasDraggedThisGesture = true;
      }
      const zoomAdjustedSpeed = 0.005 * (camera.position.z / DEFAULT_CAMERA_Z);
      // World-space axes, not the group's own local axes — this is
      // what keeps "drag right" always meaning the same thing on
      // screen. Rotating group.rotation.x/y directly (Euler angles)
      // used to cause drag direction to invert after a selection
      // reoriented the group via quaternion slerp: Euler decomposition
      // of an arbitrary quaternion can carry a significant tilt, and
      // adding to rotation.x/y from that state no longer corresponds
      // to consistent screen-space left/right.
      const yAxisDelta = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        dx * zoomAdjustedSpeed,
      );
      const xAxisDelta = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(1, 0, 0),
        dy * zoomAdjustedSpeed,
      );
      group.quaternion.premultiply(yAxisDelta).premultiply(xAxisDelta);
      prevX = event.clientX;
      prevY = event.clientY;
    };

    const handlePointerUp = (event: PointerEvent) => {
      isDraggingRef.current = false;
      container.style.cursor = "grab";

      if (hasDraggedThisGesture) {
        return;
      }

      setPointerFromEvent(event);
      const hit = raycastClickables();

      // No hit, or a cluster badge (which doesn't represent one specific
      // node) — both clear selection rather than doing nothing.
      if (!hit || hit.clusterKey) {
        onSelectionClearRef.current();
        return;
      }

      if (hit.node) {
        onNodeSelectRef.current(hit.node);
      }
    };

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      targetCameraZRef.current = null; // manual input wins over any in-progress animation
      const zoomSpeed = 0.5;
      camera.position.z = THREE.MathUtils.clamp(
        camera.position.z + event.deltaY * zoomSpeed,
        MIN_CAMERA_Z,
        MAX_CAMERA_Z,
      );
    };

    container.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    container.addEventListener("wheel", handleWheel, { passive: false });
    container.style.cursor = "grab";

    // --- Fit Map -----------------------------------------------------
    fitButtonHandlerRef.current = () => {
      const defaultEuler = new THREE.Euler(0, -0.6, 0);
      targetQuaternionRef.current = new THREE.Quaternion().setFromEuler(defaultEuler);
      targetCameraZRef.current = DEFAULT_CAMERA_Z;
      isSpinningRef.current = true;
    };

    // --- Resize ------------------------------------------------------------
    const resizeObserver = new ResizeObserver(() => {
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      if (newWidth === 0 || newHeight === 0) {
        return;
      }
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    });
    resizeObserver.observe(container);

    // --- Render loop ---------------------------------------------------
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (targetQuaternionRef.current && !isDraggingRef.current) {
        group.quaternion.slerp(targetQuaternionRef.current, 0.045);
        if (group.quaternion.angleTo(targetQuaternionRef.current) < 0.01) {
          targetQuaternionRef.current = null;
        }
      } else if (!isDraggingRef.current && isSpinningRef.current) {
        group.rotation.y += autoRotateSpeed;
      }

      if (targetCameraZRef.current !== null) {
        camera.position.z += (targetCameraZRef.current - camera.position.z) * 0.045;
        if (Math.abs(camera.position.z - targetCameraZRef.current) < 0.5) {
          camera.position.z = targetCameraZRef.current;
          targetCameraZRef.current = null;
        }
      }

      const shouldBeBrokenApart = camera.position.z < CLUSTER_BREAK_ZOOM;
      if (shouldBeBrokenApart !== clustersBrokenApartRef.current) {
        clustersBrokenApartRef.current = shouldBeBrokenApart;
        rebuildPoints();
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      container.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      container.removeEventListener("wheel", handleWheel);

      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Sprite) {
          disposeObject(object);
        }
      });
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
    // Empty dependency array is deliberate — see the architecture note at
    // the top of this file. Prop changes are handled by the two effects
    // below via the ref mirrors above, not by re-running this setup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===========================================================================
  // Targeted update: rebuild points + arcs when the visible data or the
  // active year changes. The camera deliberately does NOT move in
  // response to this — an earlier version auto-followed the currently-
  // visible points during playback, but with this dataset's geographic
  // spread, everything stays comfortably in frame throughout an
  // animation anyway, so the camera movement wasn't adding anything and
  // was removed.
  // ===========================================================================
  useEffect(() => {
    rebuildPointsRef.current?.();
    rebuildArcsRef.current?.();
  }, [graphData, yearRange]);

  // ===========================================================================
  // Targeted update: smooth camera reorientation + arc rebuild on
  // selection change. Deliberately does NOT touch points/continents/
  // camera setup — only the group's target rotation, the target camera
  // distance, and the arcs.
  // ===========================================================================
  useEffect(() => {
    rebuildPointsRef.current?.(); // selected point's size/glow needs to refresh too
    rebuildArcsRef.current?.();

    if (!selectedNode) {
      return;
    }

    const coords = getCurrentCoordinates(selectedNode, yearRange[1]);
    if (!coords) {
      return;
    }

    const localPosition = latLngToVector(coords.lat, coords.lng, SPHERE_RADIUS).normalize();

    // Not a simple setFromUnitVectors — that finds the shortest rotation
    // to bring localPosition to face the camera, but leaves the roll
    // around the viewing axis completely unconstrained. For a point in
    // the southern hemisphere (or near a pole), that shortest rotation
    // can easily leave the sphere's north pole pointing down on screen —
    // exactly the "upside down" bug this replaces. Instead, build an
    // explicit orthonormal basis and construct the rotation from it, so
    // "up" stays pinned toward the sphere's own north pole throughout.
    const forward = localPosition.clone();
    const worldUp = new THREE.Vector3(0, 1, 0);
    // Degenerate case: the target point is very close to a pole, where
    // forward is nearly parallel to worldUp and their cross product
    // becomes unstable — fall back to a different reference axis.
    const upReference =
      Math.abs(forward.dot(worldUp)) > 0.999
        ? new THREE.Vector3(1, 0, 0)
        : worldUp;
    const right = new THREE.Vector3().crossVectors(upReference, forward).normalize();
    const up = new THREE.Vector3().crossVectors(forward, right).normalize();

    const basisMatrix = new THREE.Matrix4().makeBasis(right, up, forward);
    basisMatrix.transpose(); // inverse of an orthonormal (pure rotation) matrix
    const targetQuaternion = new THREE.Quaternion().setFromRotationMatrix(basisMatrix);

    targetQuaternionRef.current = targetQuaternion;
    targetCameraZRef.current = SELECTED_CAMERA_Z;
    isSpinningRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNode]);

  return (
    <section className="canvas map-canvas">
      <div className="graph-toolbar">
        <div className="graph-toolbar-title">
          <h2>Map</h2>
          <div className="graph-stats">
            <span>
              {
                graphData.nodes.filter((n) => getCurrentCoordinates(n, yearRange[1]))
                  .length
              }{" "}
              located
            </span>
          </div>
        </div>

        <div className="graph-toolbar-actions">
          <button
            className="fit-graph-button"
            type="button"
            onClick={() => fitButtonHandlerRef.current?.()}
          >
            Fit Map
          </button>
        </div>
      </div>

      <div className="map-canvas-container" ref={containerRef} />
    </section>
  );
}

export default MapView;
