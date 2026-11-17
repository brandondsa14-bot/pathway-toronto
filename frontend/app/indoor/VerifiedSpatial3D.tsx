"use client";

import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Html, Line } from "@react-three/drei";
import type { IndoorScene } from "./spatialTypes";

type Props = {
  scene: IndoorScene; level: number | "all"; selectedId: string;
  onSelect: (id: string) => void;
};

export default function VerifiedSpatial3D({scene, level, selectedId, onSelect}: Props) {
  const geometry = useMemo(() => {
    const visible = scene.features.filter(edge => level === "all" ||
      edge.properties.level_from === level || edge.properties.level_to === level);
    const nodes = scene.nodes.filter(node => level === "all" || node.level === level);
    const centreLon = scene.nodes.reduce((n, item) => n + item.lon, 0) / (scene.nodes.length || 1);
    const centreLat = scene.nodes.reduce((n, item) => n + item.lat, 0) / (scene.nodes.length || 1);
    const floorMin = Math.min(...scene.levels);
    // Floor heights are abstract visual separation, NOT measured elevations.
    const x = (lon: number) => (lon - centreLon) * 111320 * Math.cos(centreLat * Math.PI / 180);
    const z = (lat: number) => -(lat - centreLat) * 111320;
    const y = (floor: number) => (floor - floorMin) * 5;
    const nodeMap = Object.fromEntries(scene.nodes.map(n => [n.id, n]));
    return {
      lines: visible.map(f => ({
        id: f.id, status: f.properties.operational_status,
        points: f.geometry.coordinates.map(([lon, lat], i, arr) => {
          const start = nodeMap[f.properties.from];
          const end = nodeMap[f.properties.to];
          const t = i / Math.max(1, arr.length - 1);
          const altitude = start && end ? y(start.level) * (1-t) + y(end.level)*t : 0;
          return [x(lon), altitude, z(lat)] as [number, number, number];
        }),
      })),
      nodes: nodes.map(n => ({...n, position: [x(n.lon), y(n.level), z(n.lat)] as [number,number,number]})),
    };
  }, [scene, level]);

  if (!geometry.lines.length) return <div className="spatial-empty">No reviewed geometry on this floor.</div>;
  return <div className="spatial-3d" aria-label="Orbit-controlled view of source-verified walking lines; heights are illustrative">
    <Canvas camera={{position:[60,85,90], fov:50}}>
      <color attach="background" args={["#eaf1f0"]}/>
      <ambientLight intensity={1.5}/>
      <directionalLight position={[20,40,20]} intensity={1.8}/>
      {geometry.lines.map(line => <Line key={line.id} points={line.points} color={line.status === "CONFIRMED_OPEN" ? "#068e8b" : "#b8803a"} lineWidth={6}/>)}
      {geometry.nodes.map(node => <group key={node.id} position={node.position}>
        <mesh onClick={event => { event.stopPropagation(); onSelect(node.id); }}>
          <sphereGeometry args={[selectedId === node.id ? 2.2 : 1.4, 14, 12]}/>
          <meshStandardMaterial color={selectedId === node.id ? "#f19c4b" : "#124e60"}/>
        </mesh>
        <Html position={[0,3,0]} center distanceFactor={18}><button className="spatial-3d-label" onClick={() => onSelect(node.id)}>{node.name} · L{node.level}</button></Html>
      </group>)}
      <OrbitControls makeDefault enablePan enableZoom enableRotate minDistance={5} maxDistance={350}/>
    </Canvas>
    <span className="spatial-3d-disclaimer">3D geometry from reviewed lines only · Floor heights schematic</span>
  </div>;
}
