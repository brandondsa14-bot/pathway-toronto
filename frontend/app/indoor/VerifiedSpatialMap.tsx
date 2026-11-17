"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Layers3, MapPinned, LocateFixed, Orbit, Info } from "lucide-react";
import GoogleStreetMap from "../GoogleStreetMap";
import type { IndoorScene, RouteResult, OSMCandidate, ProposedPin } from "./spatialTypes";
import type {StreetWalkingRoute} from "./streetRoutes";

const VerifiedSpatial3D = dynamic(() => import("./VerifiedSpatial3D"), {ssr: false});
const CommunitySpatial3D = dynamic(() => import("./CommunitySpatial3D"), {ssr: false});
const StreetJourney3D = dynamic(() => import("./StreetJourney3D"), {ssr: false});
const PLACE_TO_OUTDOOR: Record<string,string> = {
  union_station: "union", royal_bank_plaza: "rbp",
  brookfield_place: "brookfield", toronto_dominion_centre: "td",
};
const OUTDOOR_TO_PLACE: Record<string,string> = Object.fromEntries(
  Object.entries(PLACE_TO_OUTDOOR).map(([p,o]) => [o,p]));

type Props = {
  scene: IndoorScene | null; selectedId: string; level: number | "all";
  onSelect: (id: string) => void; onPin: (lon: number, lat: number) => void;
  route: RouteResult | null;
  communityItems?: OSMCandidate[]; selectedCommunityId?: string | null;
  onCommunitySelect?: (id: string) => void;
  proposedStartPin?: ProposedPin | null; proposedEndPin?: ProposedPin | null;
  streetRoute?: StreetWalkingRoute | null; streetStep?: number; onGoogleReady?:()=>void;
  onMovePin?: (role: "start" | "end", lon: number, lat: number) => void;
};
export default function VerifiedSpatialMap({scene, selectedId, level, onSelect, onPin, route, communityItems = [], selectedCommunityId, onCommunitySelect, proposedStartPin, proposedEndPin, onMovePin, streetRoute, streetStep, onGoogleReady}: Props) {
  const [mode,setMode] = useState<"street"|"3d"|"community"|"journey">("street");
  useEffect(()=>{if(streetRoute)setMode("street");},[streetRoute]);
  const nodes = useMemo(() => scene?.nodes ?? [], [scene]);
  const features = useMemo(() => scene?.features ?? [], [scene]);
  const selectedRouteIds = new Set(route?.route?.steps.map(step => step.edge_id).filter(Boolean) ?? []);
  const activeFeatures = selectedRouteIds.size ? features.filter(f => selectedRouteIds.has(f.id)) : features;
  const canPin = Boolean(scene?.can_place_pin) && level !== "all";
  return <div className="spatial-map-surface" aria-label="Toronto street context and reviewed indoor geometry">
    {mode === "street" ? <GoogleStreetMap
      selectedId={PLACE_TO_OUTDOOR[selectedId] ?? "rbp"}
      onSelectPlace={id => { if (OUTDOOR_TO_PLACE[id]) onSelect(OUTDOOR_TO_PLACE[id]); }}
      reviewedNodes={nodes} reviewedFeatures={activeFeatures} selectedLevel={level}
      onReviewedNodeSelect={onSelect}
      onReviewedMapClick={onPin}
      communityItems={communityItems} selectedCommunityId={selectedCommunityId}
      onCommunitySelect={onCommunitySelect} proposedStartPin={proposedStartPin}
      proposedEndPin={proposedEndPin} onProposedPinMove={onMovePin}
      streetWalkingRoute={streetRoute} streetHighlightedStep={streetStep} onGoogleMapReady={onGoogleReady}
    /> : mode === "journey" && streetRoute ? <StreetJourney3D route={streetRoute} items={communityItems}/> : mode === "community" ? <CommunitySpatial3D items={communityItems} level={level} selectedId={selectedCommunityId} onSelect={id=>onCommunitySelect?.(id)}/> : scene ? <VerifiedSpatial3D scene={scene} level={level} selectedId={selectedId} onSelect={onSelect}/> : null}
    <div className="spatial-map-tools" role="group" aria-label="Map display mode">
      <button type="button" className={mode === "street" ? "active" : ""} aria-pressed={mode === "street"} onClick={() => setMode("street")}><MapPinned size={15}/> City map</button>
      <button type="button" className={mode === "journey"?"active":""} aria-pressed={mode==="journey"} disabled={!streetRoute} onClick={()=>setMode("journey")} title="Requires a Google walking route; exterior low-relief 3D flyover, not indoor PATH">Route 3D flyover</button>
      <button type="button" className={mode === "community" ? "active" : ""} aria-pressed={mode==="community"} disabled={!communityItems.some(p=>p.geometry?.length>=4)} title="Available only after importing OSM candidate polygons; NOT verified indoor 3D" onClick={()=>setMode("community")}>OSM 3D preview</button>
      <button type="button" className={mode === "3d" ? "active" : ""} aria-pressed={mode === "3d"} disabled={!scene?.feature_count} title={!scene?.feature_count ? "3D needs licensed indoor geometry" : "View surveyed lines in 3D"} onClick={() => setMode("3d")}><Orbit size={15}/> Verified 3D</button>
    </div>
    <div className="spatial-map-evidence"><Layers3 size={15}/><div><strong>{scene?.feature_count ?? 0} reviewed indoor segments</strong><small>{scene?.feature_count ? "Floor-specific line data, subject to source verification" : "Outdoor context only · No surveyed PATH geometry available"}</small></div></div>
    {!!communityItems.length && <div className="spatial-osm-attribution"><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors · ODbL</a> · Candidate places are unverified</div>}
    <div className="spatial-pin-hint"><LocateFixed size={14}/>{canPin ? "Click a reviewed node to propose a pin" : "Click the map to place and drag an approximate pin · NOT indoor positioning"}</div>
    {!scene?.feature_count && <div className="spatial-map-empty" role="status"><Info size={17}/><div><strong>{streetRoute?"The orange walking route is OUTDOORS — not PATH.":"The real PATH geometry isn't licensed here yet."}</strong><span>{streetRoute?"Google walking directions and the flyover cannot establish indoor passages, floor levels or accessibility.":"Explore documented buildings using the live street basemap. Underground floors, retail footprints and routes will appear only when independently verified data is added."}</span></div></div>}
  </div>;
}
