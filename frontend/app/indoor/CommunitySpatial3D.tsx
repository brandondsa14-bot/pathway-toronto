"use client";

import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import * as THREE from "three";
import type { OSMCandidate } from "./spatialTypes";

type Props = {
  items: OSMCandidate[]; level: number | "all"; selectedId?: string | null;
  onSelect: (id: string) => void;
};

/** OpenStreetMap outlines shown as flat surfaces in 3D, NEVER surveyed interior rooms.
 * No imaginary walls, store-unit extrusions or corridor connections are created.
 */
export default function CommunitySpatial3D({items,level,selectedId,onSelect}: Props) {
  const data = useMemo(() => {
    const visible = items.filter(item => level === "all" || item.floor === level);
    const polygons = visible.filter(item => item.geometry?.length >= 4).slice(0,250);
    const points = visible.slice(0,450);
    if (!points.length) return {polygons:[],points:[],range:700};
    const bounds = points.reduce((acc,p) => ({
      minLat:Math.min(acc.minLat,p.lat),maxLat:Math.max(acc.maxLat,p.lat),
      minLon:Math.min(acc.minLon,p.lon),maxLon:Math.max(acc.maxLon,p.lon),
    }),{minLat:90,maxLat:-90,minLon:180,maxLon:-180});
    const centerLon=(bounds.minLon+bounds.maxLon)/2;
    const centerLat=(bounds.minLat+bounds.maxLat)/2;
    const xScale=111_320*Math.cos(centerLat*Math.PI/180);
    const zScale=111_320;
    const position=(lon:number,lat:number) => [(lon-centerLon)*xScale,0,-(lat-centerLat)*zScale] as const;
    const shapes = polygons.map(item => {
      const pts=item.geometry.map(([lon,lat])=>{
        const [x,,z]=position(lon,lat);
        return new THREE.Vector2(x,-z);
      });
      const shape = new THREE.Shape(pts);
      shape.closePath();
      return {id:item.id,shape};
    });
    const spots = points.map(item => ({...item,p:position(item.lon,item.lat)}));
    const range=Math.max(450,(bounds.maxLon-bounds.minLon)*xScale,(bounds.maxLat-bounds.minLat)*zScale);
    return {polygons:shapes,points:spots,range};
  },[items,level]);
  const initialDistance=Math.max(650,data.range*1.6);
  return <div className="community3d" aria-label="Community-mapped geography in an illustrative 3D orbit">
    <Canvas key={`${level}-${Math.round(initialDistance)}`} camera={{position:[0,initialDistance*0.85,initialDistance*0.82],fov:56,near:0.5,far:15000}}>
      <color attach="background" args={["#f5f2e9"]}/>
      <ambientLight intensity={1.7}/>
      <directionalLight position={[300,400,-350]} intensity={1.9}/>
      <gridHelper args={[Math.max(1000,data.range*2),24,"#b9c6c2","#d9ded6"]} position={[0,-1,0]}/>
      {data.polygons.map(poly => <mesh key={poly.id} rotation={[-Math.PI/2,0,0]}>
        <shapeGeometry args={[poly.shape]}/>
        <meshStandardMaterial color={poly.id===selectedId?"#69d6bf":"#b9c5c0"} side={THREE.DoubleSide} roughness={1} transparent opacity={0.88}/>
      </mesh>)}
      {data.points.map((item,index)=><group key={item.id} position={[item.p[0],0,item.p[2]]}>
        <mesh position={[0,3,0]} onClick={event=>{event.stopPropagation();onSelect(item.id)}}>
          <sphereGeometry args={[item.id===selectedId?6:3,10,10]}/>
          <meshStandardMaterial color={item.id===selectedId?"#e19e26":item.scope==="POSSIBLE_PATH"?"#159f8f":"#6b93a0"}/>
        </mesh>
        {(item.id===selectedId || index<20) && <Html position={[0,8,0]} center distanceFactor={210}>
          <button className={item.id===selectedId?"community3d-label selected":"community3d-label"} onClick={()=>onSelect(item.id)} title="OSM candidate, not a verified PATH point">{item.name}</button>
        </Html>}
      </group>)}
      <OrbitControls enableRotate enableZoom enablePan minDistance={20} maxDistance={12000} maxPolarAngle={Math.PI/2.05}/>
    </Canvas>
    <div className="community3d-warning" role="status">
      <strong>Community-mapped exploration — NOT verified indoor geometry</strong>
      <span>{data.polygons.length} OpenStreetMap polygons, {data.points.length} points; room dimensions, floor access and routes are not validated. Rotate, zoom and select mapped POIs.</span>
    </div>
  </div>;
}
