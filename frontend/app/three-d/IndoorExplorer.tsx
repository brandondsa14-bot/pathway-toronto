"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import CorridorScene from "./CorridorScene";

export default function IndoorExplorer({destinationName}:{destinationName:string}) {
  return <section className="indoor-view" aria-label="Three-dimensional fictional demonstration environment">
    <div className="indoor-banner"><strong>Fictional 3D corridor prototype</strong><span>Fictional scene · NOT an accurate representation of Toronto PATH</span></div>
    <Canvas camera={{ position:[7,5,12], fov:65, near:0.1, far:100 }} dpr={[1,1.75]} gl={{antialias:true}}>
      <Suspense fallback={null}><CorridorScene/><OrbitControls makeDefault target={[0,1.6,0]} minDistance={3} maxDistance={32} maxPolarAngle={Math.PI/2.1}/></Suspense>
    </Canvas>
    <div className="indoor-hint">Orbit: drag · Zoom: scroll · Model dimensions are invented · Selected destination: {destinationName} (not spatially mapped)</div>
  </section>;
}
