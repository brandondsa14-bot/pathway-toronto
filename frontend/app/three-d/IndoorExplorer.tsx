"use client";

import { Suspense, useCallback, useEffect, useRef, useState, type PointerEvent, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import CorridorScene, { DEMO_CORRIDOR } from "./CorridorScene";

type Direction = "forward" | "back" | "left" | "right" | "turnLeft" | "turnRight";
type ViewMode = "first-person" | "overhead";
type Pose = { x: number; z: number; yaw: number };
type Controls = {
  held: RefObject<Set<Direction>>;
  impulse: RefObject<Direction[]>;
  rotation: RefObject<{ yaw: number; pitch: number }>;
  reset: number;
  viewMode: ViewMode;
  onPoseChange: (pose: Pose) => void;
};

function WalkController({ held, impulse, rotation, reset, viewMode, onPoseChange }: Controls) {
  const { camera } = useThree();
  const position = useRef({ x: 0, z: 13 });
  const elapsed = useRef(0);
  const maxX = DEMO_CORRIDOR.halfWidth - 0.48;
  const maxZ = DEMO_CORRIDOR.halfLength - 0.52;

  useEffect(() => {
    position.current = { x: 0, z: 13 };
    rotation.current.yaw = 0;
    rotation.current.pitch = 0;
    onPoseChange({ x: 0, z: 13, yaw: 0 });
  }, [reset, onPoseChange, rotation]);

  useFrame((_, delta) => {
    const step = Math.min(0.05, delta);
    const actions = new Set(held.current);
    const taps = impulse.current.splice(0);
    const active = (name: Direction) => actions.has(name) ? 1 : 0;
    rotation.current.yaw += (active("turnLeft") - active("turnRight")) * step * 1.35;
    for (const tap of taps) {
      if (tap === "turnLeft") rotation.current.yaw += 0.18;
      if (tap === "turnRight") rotation.current.yaw -= 0.18;
    }
    const move = (name: Direction) => (actions.has(name) ? step * 2.75 : 0) + taps.filter(t => t === name).length * 0.45;
    const forward = move("forward") - move("back");
    const side = move("right") - move("left");
    const yaw = rotation.current.yaw;
    position.current.x = Math.max(-maxX, Math.min(maxX, position.current.x + side * Math.cos(yaw) - forward * Math.sin(yaw)));
    position.current.z = Math.max(-maxZ, Math.min(maxZ, position.current.z - side * Math.sin(yaw) - forward * Math.cos(yaw)));

    if (viewMode === "overhead") {
      camera.position.set(position.current.x, 14, position.current.z + 2.5);
      camera.lookAt(position.current.x, 0, position.current.z);
    } else {
      camera.position.set(position.current.x, DEMO_CORRIDOR.cameraHeight, position.current.z);
      camera.rotation.order = "YXZ";
      camera.rotation.set(rotation.current.pitch, yaw, 0);
    }
    elapsed.current += step;
    if (elapsed.current >= 0.15) {
      elapsed.current = 0;
      onPoseChange({ x: position.current.x, z: position.current.z, yaw });
    }
  });
  return null;
}

function MiniMap({ pose }: { pose: Pose }) {
  const px = 80 + pose.x * 10;
  const py = 10 + ((DEMO_CORRIDOR.halfLength - pose.z) / (2 * DEMO_CORRIDOR.halfLength)) * 220;
  return <aside className="indoor-minimap" aria-label="Fictional corridor mini-map">
    <strong>Simulated position</strong>
    <svg viewBox="0 0 160 240" role="img" aria-label="Top-down fictional corridor with your simulated position">
      <rect x="55" y="10" width="50" height="220" rx="4" fill="#c0dcd7" />
      <path d="M80 12V228" stroke="#147c78" strokeWidth="2" strokeDasharray="6 5" />
      <path d="M55 70H105M55 140H105" stroke="#7fa4a7" strokeWidth="2" />
      <g transform={`translate(${px} ${py}) rotate(${-pose.yaw * 180 / Math.PI})`}>
        <circle r="9" fill="#edab43" stroke="#fff" strokeWidth="2" />
        <path d="M0 -15L-5 -7L5 -7Z" fill="#fff" />
      </g>
    </svg>
    <small>Illustrative units · no real indoor position</small>
  </aside>;
}

type SharedNavigation = {
  destinationName: string;
  destinationId: string;
  destinations: Array<{ id: string; name: string }>;
  originName: string;
  routeLabels: string[] | null;
  onSelectDestination: (id: string) => void;
  onReturnToPath: () => void;
};

export default function IndoorExplorer({ destinationName, destinationId, destinations, originName, routeLabels, onSelectDestination, onReturnToPath }: SharedNavigation) {
  const held = useRef(new Set<Direction>());
  const impulse = useRef<Direction[]>([]);
  const rotation = useRef({ yaw: 0, pitch: 0 });
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const [reset, setReset] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("first-person");
  const [pose, setPose] = useState<Pose>({ x: 0, z: 13, yaw: 0 });
  const updatePose = useCallback((next: Pose) => setPose(next), []);

  useEffect(() => {
    const keys: Record<string, Direction> = { w: "forward", arrowup: "forward", s: "back", arrowdown: "back", a: "left", arrowleft: "left", d: "right", arrowright: "right", q: "turnLeft", e: "turnRight" };
    function press(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement || event.metaKey || event.ctrlKey || event.altKey) return;
      const action = keys[event.key.toLowerCase()];
      if (action) { held.current.add(action); if (event.target === document.body) event.preventDefault(); }
    }
    function release(event: KeyboardEvent) { const action = keys[event.key.toLowerCase()]; if (action) held.current.delete(action); }
    function stop() { held.current.clear(); dragging.current = false; }
    window.addEventListener("keydown", press);
    window.addEventListener("keyup", release);
    window.addEventListener("blur", stop);
    return () => { window.removeEventListener("keydown", press); window.removeEventListener("keyup", release); window.removeEventListener("blur", stop); };
  }, []);

  function begin(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    dragging.current = true;
    last.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function move(event: PointerEvent<HTMLDivElement>) {
    if (!dragging.current || viewMode === "overhead") return;
    rotation.current.yaw -= (event.clientX - last.current.x) * 0.0035;
    rotation.current.pitch = Math.max(-0.8, Math.min(0.8, rotation.current.pitch - (event.clientY - last.current.y) * 0.0025));
    last.current = { x: event.clientX, y: event.clientY };
  }
  function stop() { dragging.current = false; }
  function controlButton(direction: Direction, label: string) {
    return <button key={direction} type="button" aria-label={label}
      onPointerDown={() => held.current.add(direction)} onPointerUp={() => held.current.delete(direction)}
      onPointerCancel={() => held.current.delete(direction)} onPointerLeave={() => held.current.delete(direction)}
      onClick={() => impulse.current.push(direction)}>{label}</button>;
  }

  return <section className="indoor-view" aria-label="First-person fictional corridor exploration">
    <div className="indoor-banner"><strong>3D corridor sandbox</strong><span>Fictional, unsurveyed environment · NOT an actual PATH route</span></div>
    <div className="indoor-canvas" onPointerDown={begin} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop}>
      <Canvas camera={{ position: [0, DEMO_CORRIDOR.cameraHeight, 13], fov: 76, near: 0.05, far: 70 }} dpr={[1, 1.75]} gl={{ antialias: true }}>
        <Suspense fallback={null}><CorridorScene /><WalkController held={held} impulse={impulse} rotation={rotation} reset={reset} viewMode={viewMode} onPoseChange={updatePose} /></Suspense>
      </Canvas>
    </div>
    <div className="indoor-reticle" aria-hidden="true">+</div>
    <div className="indoor-help">W/A/S/D: walk · Q/E: turn · Drag: look · Destination: {destinationName} (not map-matched)</div>
    <div className="indoor-view-switch" aria-label="3D camera perspective">
      <button aria-pressed={viewMode === "first-person"} onClick={() => setViewMode("first-person")}>Walk view</button>
      <button aria-pressed={viewMode === "overhead"} onClick={() => setViewMode("overhead")}>Overhead</button>
    </div>
    <MiniMap pose={pose} />
    <section className="indoor-context" aria-label="Shared navigation state">
      <strong>Navigation selection</strong>
      <label htmlFor="indoor-destination">Destination</label>
      <select id="indoor-destination" value={destinationId} onChange={event => onSelectDestination(event.target.value)}>
        {destinations.map(place => <option value={place.id} key={place.id}>{place.name}</option>)}
      </select>
      <small>From: {originName}</small>
      {routeLabels ? <p>2D demo route: {routeLabels.join(" → ")}</p> : <p>No demo route selected. Preview a route on the PATH schematic.</p>}
      <button type="button" onClick={onReturnToPath}>Return to PATH layer</button>
      <small>No indoor route is positioned in 3D; labels are shared only.</small>
    </section>
    <div className="indoor-pad" aria-label="Touch and keyboard navigation buttons">
      {controlButton("forward", "↑")}
      <div className="indoor-pad-row">{controlButton("left", "←")}{controlButton("back", "↓")}{controlButton("right", "→")}</div>
      <div className="indoor-pad-row">{controlButton("turnLeft", "↶")}{controlButton("turnRight", "↷")}
        <button type="button" onClick={() => setReset(value => value + 1)} aria-label="Reset camera position">Reset</button></div>
    </div>
  </section>;
}
