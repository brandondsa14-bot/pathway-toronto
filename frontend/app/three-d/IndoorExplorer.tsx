"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";

/** Day 11: deliberately fictional demonstration space; NOT a digital twin of the PATH. */
function SceneFoundation() {
  return <>
    <color attach="background" args={["#122d38"]} />
    <ambientLight intensity={1.1}/>
    <directionalLight intensity={1.8} position={[4, 8, 3]}/>
    <Grid position={[0,0,0]} args={[16,16]} cellSize={1} sectionSize={4} cellColor="#3d7d7b" sectionColor="#62aca5" infiniteGrid={false} fadeDistance={32}/>
    <mesh position={[0, 0.5, 0]}><boxGeometry args={[1,1,1]}/><meshStandardMaterial color="#e9a642" roughness={0.7}/></mesh>
  </>;
}

export default function IndoorExplorer({destinationName}:{destinationName:string}) {
  return <section className="indoor-view" aria-label="Three-dimensional fictional demonstration environment">
    <div className="indoor-banner"><strong>3D development sandbox</strong><span>Fictional scene · NOT an accurate representation of Toronto PATH</span></div>
    <Canvas camera={{ position:[6,5,8], fov:55, near:0.1, far:100 }} dpr={[1,1.75]} gl={{antialias:true}}>
      <Suspense fallback={null}><SceneFoundation/><OrbitControls makeDefault minDistance={3} maxDistance={25}/></Suspense>
    </Canvas>
    <div className="indoor-hint">Orbit: drag · Zoom: scroll · Selected destination: {destinationName} (not spatially mapped)</div>
  </section>;
}
