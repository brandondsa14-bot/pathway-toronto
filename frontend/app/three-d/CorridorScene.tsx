"use client";

/** Dimensions are arbitrary demonstration units, not Toronto PATH measurements. */
export const DEMO_CORRIDOR = { halfWidth: 2.5, halfLength: 17, cameraHeight: 1.65, wallHeight: 3.3 } as const;

const lamps = [-14, -7, 0, 7, 14];
const displayBays = [-11, -2, 7];

function Wall({side}:{side:-1|1}) {
  return <group>
    <mesh position={[side*DEMO_CORRIDOR.halfWidth,1.65,0]} receiveShadow>
      <boxGeometry args={[0.18,3.3,34]}/>
      <meshStandardMaterial color="#9aadae" roughness={0.76}/>
    </mesh>
    {displayBays.map((z,i) => <group key={`${side}-${z}`}>
      <mesh position={[side*2.39,1.5,z]}>
        <boxGeometry args={[0.08,2.5,4.5]}/>
        <meshStandardMaterial color={i===1?"#477d83":"#4f7582"} metalness={0.15} roughness={0.28} transparent opacity={0.86}/>
      </mesh>
      <mesh position={[side*2.33,2.9,z]}>
        <boxGeometry args={[0.12,0.22,4.65]}/><meshStandardMaterial color="#1e3b44"/>
      </mesh>
      <mesh position={[side*2.32,1.4,z]}>
        <boxGeometry args={[0.12,2.7,0.08]}/><meshStandardMaterial color="#c4d3cf" metalness={0.35}/>
      </mesh>
    </group>)}
  </group>;
}

/** Reusable corridor components, intentionally fictional. */
export default function CorridorScene() {
  return <group>
    <color attach="background" args={["#152f38"]}/>
    <fog attach="fog" args={["#152f38",13,43]}/>
    <ambientLight intensity={1.25}/>
    <hemisphereLight args={["#c0e4e0","#3a4c51",1.0]}/>
    <directionalLight position={[2,10,5]} intensity={1.2}/>
    <mesh position={[0,-0.12,0]} receiveShadow>
      <boxGeometry args={[5,0.24,34]}/><meshStandardMaterial color="#d5ded9" roughness={0.92}/>
    </mesh>
    <mesh position={[0,0.013,0]}>
      <boxGeometry args={[0.13,0.015,27]}/><meshStandardMaterial color="#18b8ae" emissive="#126a65" emissiveIntensity={0.25}/>
    </mesh>
    <mesh position={[0,3.31,0]}>
      <boxGeometry args={[5.18,0.18,34]}/><meshStandardMaterial color="#607a7e" roughness={0.87}/>
    </mesh>
    <Wall side={-1}/><Wall side={1}/>
    {[-17,17].map(z=><mesh key={z} position={[0,1.65,z]}>
      <boxGeometry args={[5,3.3,0.2]}/><meshStandardMaterial color="#566f72" roughness={0.83}/>
    </mesh>)}
    {lamps.map(z=><group key={z}>
      <mesh position={[0,3.18,z]}><boxGeometry args={[1.9,0.04,0.34]}/><meshBasicMaterial color="#dffff6"/></mesh>
      <pointLight position={[0,2.94,z]} color="#e6fff1" intensity={9} distance={7} decay={2}/>
    </group>)}
    {[-1,1].map(side=>lamps.map(z=><mesh key={`${side}-${z}`} position={[side*2.37,0.15,z]}>
      <boxGeometry args={[0.12,0.28,0.25]}/><meshStandardMaterial color="#235e63"/>
    </mesh>))}
  </group>;
}
