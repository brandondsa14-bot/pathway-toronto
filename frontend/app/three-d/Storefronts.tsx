"use client";

import { Html } from "@react-three/drei";
import { VERIFIED_STORES } from "../stores/storeCatalog";

/** Positions are intentionally fabricated, not derived from a floor plan. */
const sampleBays: Array<{ id: string; side: -1 | 1; z: number }> = [
  { id: "mos-rbp", side: -1, z: 7 },
  { id: "tim-rbp", side: 1, z: 7 },
  { id: "starbucks-rbp", side: -1, z: -2 },
  { id: "wendys-rbp", side: 1, z: -2 },
];

export default function Storefronts({ onSelectStore, selectedStoreId }: { onSelectStore: (id: string) => void; selectedStoreId: string | null }) {
  return <group>
    {sampleBays.map(bay => {
      const store = VERIFIED_STORES.find(item => item.id === bay.id);
      if (!store) return null;
      return <group key={bay.id} position={[bay.side * 2.25, 0, bay.z]}>
        <mesh position={[0, 1.65, 0]}>
          <boxGeometry args={[0.06, 2.7, 3.8]} />
          <meshStandardMaterial color={selectedStoreId === store.id ? "#f5d38f" : "#bfd7d4"} metalness={0.2} roughness={0.4} />
        </mesh>
        <Html position={[bay.side * -0.12, 2.05, 0]} center distanceFactor={7}>
          <button type="button" className="storefront-label" aria-pressed={selectedStoreId === store.id}
            onPointerDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); onSelectStore(store.id); }}>
            <strong>{store.name}</strong>
            <small>Demo placement · View details</small>
          </button>
        </Html>
      </group>;
    })}
  </group>;
}
