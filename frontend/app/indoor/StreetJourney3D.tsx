"use client";

import {useEffect, useMemo, useState} from "react";
import {Canvas, useFrame, useThree} from "@react-three/fiber";
import {OrbitControls} from "@react-three/drei";
import * as THREE from "three";
import type {OSMCandidate} from "./spatialTypes";
import type {StreetWalkingRoute} from "./streetRoutes";

type Position = {x:number;y:number;z:number};

function CameraFollow({position,active,range}:{position:Position;active:boolean;range:number}) {
  const {camera,controls} = useThree();
  useFrame(() => {
    if (!active) return;
    const here = new THREE.Vector3(position.x,position.y,position.z);
    const offset = Math.max(65,Math.min(160,range*0.17));
    camera.position.lerp(here.clone().add(new THREE.Vector3(-offset,offset*0.8,offset)),0.065);
    if (controls && "target" in controls) {
      const orbit = controls as unknown as {target:THREE.Vector3;update:()=>void};
      orbit.target.lerp(here,0.08);
      orbit.update();
    }
  });
  return null;
}

/** Outdoor route follows actual provider points. The surrounding low-relief OSM
 * outlines are stylistic geometry and MUST NOT be called real building heights.
 * Never depict PATH corridors or user-eye indoor views here.
 */
export default function StreetJourney3D({route,items}:{route:StreetWalkingRoute;items:OSMCandidate[]}) {
  const [progress,setProgress] = useState(0);
  const [playing,setPlaying] = useState(false);
  const [follow,setFollow] = useState(true);
  const [speed,setSpeed] = useState(1);

  useEffect(() => {
    if (!playing) return;
    const tick = window.setInterval(() => {
      setProgress(current => {
        const next = current + 0.004*speed;
        if (next >= 1) {setPlaying(false);return 1;}
        return next;
      });
    },100);
    return () => window.clearInterval(tick);
  },[playing,speed]);

  const scene = useMemo(() => {
    const path = route.path;
    const midpoint = path[Math.floor(path.length/2)];
    const xScale = 111_320*Math.cos(midpoint.lat*Math.PI/180);
    const toWorld = (lon:number,lat:number) => new THREE.Vector3((lon-midpoint.lng)*xScale,2.2,-(lat-midpoint.lat)*111_320);
    const routePoints = path.map(p=>toWorld(p.lng,p.lat));
    const line = new THREE.CatmullRomCurve3(routePoints,false,"centripetal",0.35);
    const xs=routePoints.map(p=>p.x), zs=routePoints.map(p=>p.z);
    const range = Math.max(230,Math.max(...xs)-Math.min(...xs),Math.max(...zs)-Math.min(...zs));
    const near = items.filter(item =>
      item.geometry?.length>=4 && item.geometry.length<=180 &&
      Math.abs((item.lon-midpoint.lng)*xScale)<range*0.8+300 &&
      Math.abs((item.lat-midpoint.lat)*111_320)<range*0.8+300
    ).slice(0,120);
    const polygons = near.flatMap(item=>{
      try {
        const s=new THREE.Shape();
        item.geometry.forEach(([lon,lat],i)=>{
          const p=toWorld(lon,lat);
          if (i===0) s.moveTo(p.x,-p.z); else s.lineTo(p.x,-p.z);
        });
        s.closePath();
        // These heights are a deliberately LOW RELIEF rendering, not building heights.
        const geometry=new THREE.ExtrudeGeometry(s,{depth:item.category==="Buildings"?5:2,bevelEnabled:false,steps:1});
        return [{id:item.id,geometry,building:item.category==="Buildings"}];
      } catch {return [];}
    });
    return {line,routePoints,polygons,range};
  },[route,items]);
  const cursor=useMemo(()=>scene.line.getPointAt(Math.min(1,Math.max(0,progress))),[scene,progress]);
  const streetViewPoint=route.path[Math.min(route.path.length-1,Math.round(progress*(route.path.length-1)))];
  const streetViewLink=`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${encodeURIComponent(`${streetViewPoint.lat},${streetViewPoint.lng}`)}`;
  const cameraDistance=Math.max(260,Math.min(4500,scene.range*0.9));
  const stepIndex = Math.min(route.steps.length-1,Math.floor(progress*Math.max(1,route.steps.length)));

  return <div className="pathway-journey3d" aria-label="Three-dimensional outdoor street route preview">
    <Canvas key={route.path.length} camera={{position:[-cameraDistance,cameraDistance*0.82,cameraDistance],fov:53,near:0.5,far:30000}}>
      <color attach="background" args={["#e9f3f2"]}/>
      <ambientLight intensity={1.4}/><directionalLight position={[500,800,-300]} intensity={2.0}/>
      <gridHelper args={[Math.max(1200,scene.range*2.3),36,"#b5ccc7","#d8e4e1"]} position={[0,-0.8,0]}/>
      {scene.polygons.map(p=><mesh key={p.id} geometry={p.geometry} rotation={[-Math.PI/2,0,0]}>
        <meshStandardMaterial color={p.building?"#8cbcb4":"#b8d4cd"} transparent opacity={0.87} side={THREE.DoubleSide}/>
      </mesh>)}
      <mesh><tubeGeometry args={[scene.line,Math.max(24,scene.routePoints.length*2),2.8,8,false]}/><meshStandardMaterial color="#046d74" emissive="#04363b" emissiveIntensity={0.25}/></mesh>
      <mesh position={[scene.routePoints[0].x,4,scene.routePoints[0].z]}><sphereGeometry args={[7,16,12]}/><meshStandardMaterial color="#f0a02d"/></mesh>
      <mesh position={[scene.routePoints[scene.routePoints.length-1].x,4,scene.routePoints[scene.routePoints.length-1].z]}><sphereGeometry args={[7,16,12]}/><meshStandardMaterial color="#2c9fd2"/></mesh>
      <mesh position={[cursor.x,8,cursor.z]}><sphereGeometry args={[6,20,14]}/><meshStandardMaterial color="#e9483c" emissive="#a31e18" emissiveIntensity={0.55}/></mesh>
      <CameraFollow position={{x:cursor.x,y:cursor.y,z:cursor.z}} active={playing&&follow} range={scene.range}/>
      <OrbitControls enablePan enableRotate enableZoom maxDistance={Math.max(900,scene.range*2)} minDistance={12} maxPolarAngle={Math.PI/2.04}/>
    </Canvas>
    <div className="pathway-journey3d-bar">
      <div className="pathway-journey3d-buttons">
        <button type="button" onClick={()=>{if(progress>=1)setProgress(0);setPlaying(v=>!v);}}>{playing?"Pause flyover":"Play flyover"}</button>
        <button type="button" onClick={()=>{setPlaying(false);setProgress(0);}}>Restart</button>
        <a href={streetViewLink} target="_blank" rel="noopener noreferrer" title="Open available outdoor Google Street View imagery near the route">Nearby Street View</a>
        <label><input type="checkbox" checked={follow} onChange={e=>setFollow(e.target.checked)}/> Follow camera</label>
        <label>Speed <select value={speed} onChange={e=>setSpeed(Number(e.target.value))}><option value="1">1×</option><option value="2">2×</option><option value="4">4×</option></select></label>
      </div>
      <label className="pathway-journey3d-slider">Route progress <input type="range" min={0} max={1000} value={Math.round(progress*1000)} onChange={e=>{setPlaying(false);setProgress(Number(e.target.value)/1000);}}/></label>
      <span className="pathway-journey3d-instruction" role="status">{route.steps[stepIndex]?.instruction||"Following Google-sourced outdoor walking geometry"}</span>
    </div>
    <div className="pathway-journey3d-notice">3D outdoor route visualization from Google walking geometry and low-relief OSM outlines. Heights are symbolic. Not a street-level camera, indoor floor model, live position, or PATH wayfinding.</div>
  </div>;
}
