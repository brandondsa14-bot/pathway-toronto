"use client";

import { Suspense, useEffect, useRef, useState, type PointerEvent, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import CorridorScene, { DEMO_CORRIDOR } from "./CorridorScene";

type Direction = "forward"|"back"|"left"|"right"|"turnLeft"|"turnRight";
type Controls = {held:RefObject<Set<Direction>>; impulse:RefObject<Direction[]>; rotation:RefObject<{yaw:number;pitch:number}>; reset:number};

function WalkController({held,impulse,rotation,reset}:Controls) {
  const {camera} = useThree();
  const maxX = DEMO_CORRIDOR.halfWidth - 0.48; // camera collision radius inside side walls
  const maxZ = DEMO_CORRIDOR.halfLength - 0.52;
  useEffect(()=>{
    camera.position.set(0,DEMO_CORRIDOR.cameraHeight,13);
    rotation.current.yaw=0; rotation.current.pitch=0;
    camera.rotation.order="YXZ";
    camera.rotation.set(0,0,0);
  },[camera,reset,rotation]);
  useFrame((_,delta)=>{
    const step=Math.min(0.05,delta);
    const actions=new Set(held.current);
    // A keyboard-accessible/touch tap should move a small step, even without a hold.
    const taps=impulse.current.splice(0);
    const turn=(name:Direction)=>actions.has(name)?1:0;
    rotation.current.yaw+=(turn("turnLeft")-turn("turnRight"))*step*1.35;
    for(const tap of taps) {
      if(tap==="turnLeft") rotation.current.yaw+=0.18;
      if(tap==="turnRight") rotation.current.yaw-=0.18;
    }
    const move=(name:Direction)=> (actions.has(name)?step*2.75:0) + taps.filter(t=>t===name).length*0.45;
    const forward=move("forward")-move("back");
    const side=move("right")-move("left");
    const yaw=rotation.current.yaw;
    // Never leave the corridor: no clipping through its side or end walls.
    camera.position.x=Math.max(-maxX,Math.min(maxX,camera.position.x + side*Math.cos(yaw)-forward*Math.sin(yaw)));
    camera.position.z=Math.max(-maxZ,Math.min(maxZ,camera.position.z - side*Math.sin(yaw)-forward*Math.cos(yaw)));
    camera.position.y=DEMO_CORRIDOR.cameraHeight;
    camera.rotation.order="YXZ";
    camera.rotation.y=yaw;
    camera.rotation.x=rotation.current.pitch;
  });
  return null;
}

export default function IndoorExplorer({destinationName}:{destinationName:string}) {
  const held=useRef(new Set<Direction>());
  const impulse=useRef<Direction[]>([]);
  const rotation=useRef({yaw:0,pitch:0});
  const dragging=useRef(false);
  const last=useRef({x:0,y:0});
  const [reset,setReset]=useState(0);
  useEffect(()=>{
    const keys:Record<string,Direction>={w:"forward",arrowup:"forward",s:"back",arrowdown:"back",a:"left",arrowleft:"left",d:"right",arrowright:"right",q:"turnLeft",e:"turnRight"};
    function press(event:KeyboardEvent) {
      if(event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) return;
      const action=keys[event.key.toLowerCase()];
      if(action){held.current.add(action);if(event.target===document.body)event.preventDefault();}
    }
    function release(event:KeyboardEvent){const action=keys[event.key.toLowerCase()];if(action)held.current.delete(action);}
    function stop(){held.current.clear();dragging.current=false;}
    window.addEventListener("keydown",press);window.addEventListener("keyup",release);window.addEventListener("blur",stop);
    return ()=>{window.removeEventListener("keydown",press);window.removeEventListener("keyup",release);window.removeEventListener("blur",stop);};
  },[]);
  function begin(event:PointerEvent<HTMLDivElement>){
    if(event.pointerType==="mouse" && event.button!==0)return;
    dragging.current=true;last.current={x:event.clientX,y:event.clientY};event.currentTarget.setPointerCapture(event.pointerId);
  }
  function move(event:PointerEvent<HTMLDivElement>){
    if(!dragging.current)return;
    rotation.current.yaw-=(event.clientX-last.current.x)*0.0035;
    rotation.current.pitch=Math.max(-0.8,Math.min(0.8,rotation.current.pitch-(event.clientY-last.current.y)*0.0025));
    last.current={x:event.clientX,y:event.clientY};
  }
  function stop(){dragging.current=false;}
  function controlButton(direction:Direction,label:string){return <button key={direction} type="button" aria-label={label}
    onPointerDown={()=>held.current.add(direction)} onPointerUp={()=>held.current.delete(direction)} onPointerCancel={()=>held.current.delete(direction)} onPointerLeave={()=>held.current.delete(direction)}
    onClick={()=>impulse.current.push(direction)}>{label}</button>;}

  return <section className="indoor-view" aria-label="First-person fictional corridor exploration">
    <div className="indoor-banner"><strong>3D corridor sandbox</strong><span>Fictional, unsurveyed environment · NOT an actual PATH route</span></div>
    <div className="indoor-canvas" onPointerDown={begin} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop}>
      <Canvas camera={{position:[0,DEMO_CORRIDOR.cameraHeight,13],fov:76,near:0.05,far:70}} dpr={[1,1.75]} gl={{antialias:true}}>
        <Suspense fallback={null}><CorridorScene/><WalkController held={held} impulse={impulse} rotation={rotation} reset={reset}/></Suspense>
      </Canvas>
    </div>
    <div className="indoor-reticle" aria-hidden="true">+</div>
    <div className="indoor-help">W/A/S/D or arrow keys: walk · Q/E: turn · Drag to look · Solid walls · Destination: {destinationName} (not geolocated)</div>
    <div className="indoor-pad" aria-label="Touch and keyboard navigation buttons">
      {controlButton("forward","↑")}
      <div className="indoor-pad-row">{controlButton("left","←")}{controlButton("back","↓")}{controlButton("right","→")}</div>
      <div className="indoor-pad-row">{controlButton("turnLeft","↶")}{controlButton("turnRight","↷")}<button type="button" onClick={()=>setReset(value=>value+1)} aria-label="Reset camera position">Reset</button></div>
    </div>
  </section>;
}
