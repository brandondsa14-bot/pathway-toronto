"use client";

import { useEffect, useRef, useState } from "react";
import { outdoorLocations, outdoorLocationById } from "./outdoorLocations";
import type { ReviewedNode, ReviewedFeature, OSMCandidate, ProposedPin } from "./indoor/spatialTypes";
import type { StreetWalkingRoute } from "./indoor/streetRoutes";

type Point = { lat: number; lng: number };
type MapsListener = { remove: () => void };
type MapInstance = { panTo: (point: Point) => void; fitBounds?: (bounds: {north:number;south:number;east:number;west:number},padding?:number)=>void;
  getCenter?: () => {lat: () => number; lng: () => number} | null;
  getZoom?: () => number | undefined; addListener: (name: string, callback: (event: {latLng?: {lat: () => number; lng: () => number}}) => void) => MapsListener };
type MapMarker = { addListener: (eventName: string, listener: () => void) => MapsListener; setMap: (map: MapInstance | null) => void; getPosition?: () => {lat: () => number; lng: () => number} | null };
type MapPolygon = {setMap: (map: MapInstance | null) => void};
type MapPolyline = {setMap: (map: MapInstance | null) => void};
type GoogleMapsAPI = {
  Map: new (element: HTMLElement, options: Record<string, unknown>) => MapInstance;
  Marker: new (options: Record<string, unknown>) => MapMarker;
  Polyline: new (options: Record<string, unknown>) => MapPolyline;
  Polygon?: new (options: Record<string, unknown>) => MapPolygon;
};
type GoogleWindow = Window & { google?: { maps?: GoogleMapsAPI } };

const CENTER = {lat:43.6475, lng:-79.3801};
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

const EMPTY_NODES: ReviewedNode[] = [];
const EMPTY_FEATURES: ReviewedFeature[] = [];
const EMPTY_COMMUNITY: OSMCandidate[] = [];

type Props = {
  selectedId: string; onSelectPlace: (id: string) => void;
  reviewedNodes?: ReviewedNode[]; reviewedFeatures?: ReviewedFeature[];
  selectedLevel?: number | "all"; onReviewedNodeSelect?: (id: string) => void;
  onReviewedMapClick?: (lon: number, lat: number) => void;
  communityItems?: OSMCandidate[]; selectedCommunityId?: string | null;
  onCommunitySelect?: (id: string) => void;
  proposedStartPin?: ProposedPin | null; proposedEndPin?: ProposedPin | null;
  onProposedPinMove?: (role: "start" | "end", lon: number, lat: number) => void;
  streetWalkingRoute?: StreetWalkingRoute | null;
  streetHighlightedStep?: number;
  onGoogleMapReady?: () => void;
};

export default function GoogleStreetMap({selectedId, onSelectPlace, reviewedNodes = EMPTY_NODES, reviewedFeatures = EMPTY_FEATURES, selectedLevel = "all", onReviewedNodeSelect, onReviewedMapClick, communityItems = EMPTY_COMMUNITY, selectedCommunityId, onCommunitySelect, proposedStartPin, proposedEndPin, onProposedPinMove,streetWalkingRoute,streetHighlightedStep,onGoogleMapReady}: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapInstance | null>(null);
  const viewRef = useRef<{center:Point;zoom:number}>({center:CENTER,zoom:16});
  const selectRef = useRef(onSelectPlace);
  const reviewedSelectRef = useRef(onReviewedNodeSelect);
  const mapClickRef = useRef(onReviewedMapClick);
  const onCommunitySelectRef = useRef(onCommunitySelect);
  const onProposedPinMoveRef = useRef(onProposedPinMove);
  const communityMarkersRef = useRef<MapMarker[]>([]);
  const communityPolygonsRef = useRef<MapPolygon[]>([]);
  const communityListenersRef = useRef<MapsListener[]>([]);
  const proposedMarkersRef = useRef<MapMarker[]>([]);
  const proposedListenersRef = useRef<MapsListener[]>([]);
  const streetLineRef = useRef<MapPolyline|null>(null);
  const streetFocusRef = useRef<MapPolyline|null>(null);
  const googleReadyRef = useRef(onGoogleMapReady);
  googleReadyRef.current=onGoogleMapReady;
  const [mapReady, setMapReady] = useState(0);
  reviewedSelectRef.current = onReviewedNodeSelect;
  mapClickRef.current = onReviewedMapClick;
  onCommunitySelectRef.current = onCommunitySelect;
  onProposedPinMoveRef.current = onProposedPinMove;
  const [status, setStatus] = useState<"loading"|"ready"|"error">("loading");
  selectRef.current = onSelectPlace;

  useEffect(() => {
    if (!API_KEY) return;
    let cancelled = false;
    let markers: MapMarker[] = [];
    let lines: MapPolyline[] = [];
    let listeners: Array<{remove: () => void}> = [];
    const w = window as GoogleWindow;
    const initialize = () => {
      if (cancelled || !container.current || !w.google?.maps?.Map || !w.google?.maps?.Marker) return;
      const api = w.google.maps;
      const map = new api.Map(container.current, {
        center: viewRef.current.center, zoom: viewRef.current.zoom,
        tilt: 45, rotateControl: true, mapTypeControl: true,
        streetViewControl: true, fullscreenControl: true,
        gestureHandling: "cooperative"
      });
      mapRef.current = map;
      listeners.push(map.addListener("idle",()=>{
        const center=map.getCenter?.(); const zoom=map.getZoom?.();
        if(center && zoom!==undefined) viewRef.current={center:{lat:center.lat(),lng:center.lng()},zoom};
      }));
      markers = outdoorLocations.map(place => {
        const marker = new api.Marker({
          map, position: place.position, title: `${place.name} — approximate outdoor building position`,
        });
        listeners.push(marker.addListener("click", () => selectRef.current(place.id)));
        return marker;
      });
      // The original approximate outdoor markers remain separate from route evidence.
      // Never create unreviewed storefront footprints or interior pins here.
      if (api.Polyline) {
        lines = reviewedFeatures.filter(f => selectedLevel === "all" ||
          f.properties.level_from === selectedLevel || f.properties.level_to === selectedLevel)
          .map(f => new api.Polyline({
            map, path: f.geometry.coordinates.map(([lon, lat]) => ({lat, lng: lon})),
            strokeColor: f.properties.operational_status === "CONFIRMED_OPEN" ? "#087e82" : "#b17b28",
            strokeWeight: 6, strokeOpacity: 0.96,
          }));
      }
      reviewedNodes.filter(n => selectedLevel === "all" || n.level === selectedLevel).forEach(n => {
        const pin = new api.Marker({map, position: {lat: n.lat, lng: n.lon}, title: `${n.name} — reviewed walking node, level ${n.level}`});
        markers.push(pin);
        listeners.push(pin.addListener("click", () => reviewedSelectRef.current?.(n.id)));
      });
      if (mapClickRef.current) listeners.push(map.addListener("click", event => {
        if (event.latLng) mapClickRef.current?.(event.latLng.lng(), event.latLng.lat());
      }));
      setStatus("ready"); setMapReady(count => count + 1);
      googleReadyRef.current?.();
    };

    const callbackName = "__pathwayGoogleMapsReady";
    const globalCallbacks = window as unknown as Record<string, unknown>;
    globalCallbacks[callbackName] = initialize;
    const existing = document.querySelector<HTMLScriptElement>('script[data-pathway-google-maps]');
    if (w.google?.maps?.Map) initialize();
    else if (!existing) {
      const script = document.createElement("script");
      script.dataset.pathwayGoogleMaps = "true";
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(API_KEY)}&loading=async&callback=${callbackName}&v=weekly`;
      script.async = true;
      script.onerror = () => { if (!cancelled) setStatus("error"); };
      document.head.appendChild(script);
    } else {
      // The current mount replaces the callback while the script is loading.
      existing.addEventListener("error", () => { if (!cancelled) setStatus("error"); }, {once:true});
    }
    const timeout = window.setTimeout(() => {
      if (!cancelled && !mapRef.current) setStatus("error");
    }, 15000);
    return () => {
      communityListenersRef.current.forEach(listener => listener?.remove?.());
      communityMarkersRef.current.forEach(marker => marker.setMap(null));
      communityPolygonsRef.current.forEach(poly => poly.setMap(null));
      proposedListenersRef.current.forEach(listener => listener?.remove?.());
      proposedMarkersRef.current.forEach(marker => marker.setMap(null));
      communityListenersRef.current = []; communityMarkersRef.current = []; communityPolygonsRef.current = [];
      proposedMarkersRef.current = []; proposedListenersRef.current = [];
      cancelled = true;
      window.clearTimeout(timeout);
      listeners.forEach(listener => { if (listener && typeof listener.remove === "function") listener.remove(); });
      markers.forEach(marker => marker.setMap(null));
      lines.forEach(line => line.setMap(null));
      markers = []; listeners = [];
      mapRef.current = null;
    };
  }, [reviewedNodes, reviewedFeatures, selectedLevel]);

  // Community POIs and OSM footprints are rendered separately so search/filters
  // never reinitialize the Google map or alter surveyed PATH route geometry.
  useEffect(() => {
    const map = mapRef.current;
    const api = (window as GoogleWindow).google?.maps;
    if (!map || !api?.Marker) return;
    communityListenersRef.current.forEach(listener => listener?.remove?.());
    communityMarkersRef.current.forEach(marker => marker.setMap(null));
    communityPolygonsRef.current.forEach(polygon => polygon.setMap(null));
    communityListenersRef.current = []; communityMarkersRef.current = []; communityPolygonsRef.current = [];
    const colors: Record<string,string> = {
      "Buildings": "#607c8a", "Washrooms": "#3c73bd", "Escalators": "#19816f",
      "Elevators": "#19816f", "Stairs": "#19816f", "Subway entrances": "#7c5cb4",
      "Restaurants & food": "#c06b3e", "Coffee & cafés": "#ab7049", "Shopping": "#a95689",
      "Fashion": "#a95689", "Electronics": "#548ac9", "Grocery": "#6c9b4b",
      "Beauty & wellness": "#b16b9f", "Fitness": "#7294a6",
      "Entrances": "#8d4db3", "ATMs & banks": "#4071ab",
    };
    const candidates = communityItems.filter(item => selectedLevel === "all" || item.floor === selectedLevel);
    const visible = candidates.slice(0,700);
    const selectedCandidate = candidates.find(item => item.id === selectedCommunityId);
    if (selectedCandidate && !visible.some(item => item.id === selectedCandidate.id)) visible.push(selectedCandidate);
    visible.forEach(item => {
      const selected = item.id === selectedCommunityId;
      const marker = new api.Marker({map,position:{lat:item.lat,lng:item.lon},
        title:`${item.name} — ${item.category}; OpenStreetMap community data, NOT verified PATH`,
        icon:{path:0,scale:selected?10:6.5,fillColor:colors[item.category]??"#5a7a86",fillOpacity:0.95,
          strokeColor:selected?"#113b47":"#ffffff",strokeOpacity:1,strokeWeight:selected?3:1.5},
        zIndex:selected?900:undefined});
      communityMarkersRef.current.push(marker);
      communityListenersRef.current.push(marker.addListener("click",()=>onCommunitySelectRef.current?.(item.id)));
    });
    // Actual OSM polygon positions, where supplied. These are NOT surveyed interiors.
    const PolygonConstructor = api.Polygon;
    if (PolygonConstructor) {
      visible.filter(item => item.geometry?.length >= 4).slice(0,180).forEach(item => {
        const polygon = new PolygonConstructor({map,paths:item.geometry.map(([lon,lat])=>({lat,lng:lon})),
          fillColor:"#56a6a9",fillOpacity:0.15,strokeColor:"#267b85",strokeOpacity:0.55,strokeWeight:1,
          clickable:false});
        communityPolygonsRef.current.push(polygon);
      });
    }
    return () => {
      communityListenersRef.current.forEach(listener => listener?.remove?.());
      communityMarkersRef.current.forEach(marker => marker.setMap(null));
      communityPolygonsRef.current.forEach(polygon => polygon.setMap(null));
      communityListenersRef.current=[]; communityMarkersRef.current=[];communityPolygonsRef.current=[];
    };
  }, [communityItems, selectedCommunityId, selectedLevel, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    const api = (window as GoogleWindow).google?.maps;
    proposedListenersRef.current.forEach(listener=>listener?.remove?.());
    proposedMarkersRef.current.forEach(marker=>marker.setMap(null));
    proposedListenersRef.current=[];proposedMarkersRef.current=[];
    if (!map || !api?.Marker) return;
    const pins: {role:"start"|"end";pin:ProposedPin|null|undefined;color:string}[] = [
      {role:"start",pin:proposedStartPin,color:"#f9b844"},
      {role:"end",pin:proposedEndPin,color:"#34a9dc"},
    ];
    pins.forEach(({role,pin,color})=>{
      if(!pin) return;
      const marker=new api.Marker({map,position:{lat:pin.lat,lng:pin.lon},draggable:true,
        title:`Proposed ${role} location. Drag to move; NOT a verified indoor position`,
        icon:{path:0,scale:11,fillColor:color,fillOpacity:1,strokeColor:"#192f3d",strokeWeight:3}});
      proposedMarkersRef.current.push(marker);
      proposedListenersRef.current.push(marker.addListener("dragend",()=>{
        const position=marker.getPosition?.();
        if(position) onProposedPinMoveRef.current?.(role,position.lng(),position.lat());
      }));
    });
    return () => {
      proposedListenersRef.current.forEach(listener=>listener?.remove?.());
      proposedMarkersRef.current.forEach(marker=>marker.setMap(null));
      proposedListenersRef.current=[];proposedMarkersRef.current=[];
    };
  }, [proposedStartPin,proposedEndPin,mapReady]);

  // Provider-computed WALKING route overlay. These lines are never sourced from
  // the verified indoor graph and are visibly labelled as STREET walking.
  useEffect(() => {
    const map=mapRef.current;
    const api=(window as GoogleWindow).google?.maps;
    streetLineRef.current?.setMap(null); streetLineRef.current=null;
    streetFocusRef.current?.setMap(null); streetFocusRef.current=null;
    if(!map || !api?.Polyline || !streetWalkingRoute?.path.length) return;
    const routePath=streetWalkingRoute.path;
    streetLineRef.current=new api.Polyline({map,path:routePath,
      strokeColor:"#e96d2d",strokeOpacity:0.98,strokeWeight:7,zIndex:200});
    if(map.fitBounds && routePath.length>1){
      const lats=routePath.map(p=>p.lat),lngs=routePath.map(p=>p.lng);
      map.fitBounds({north:Math.max(...lats),south:Math.min(...lats),east:Math.max(...lngs),west:Math.min(...lngs)},80);
    }
    return ()=>{streetLineRef.current?.setMap(null);streetLineRef.current=null;};
  },[streetWalkingRoute,mapReady]);

  useEffect(()=>{
    const map=mapRef.current;
    const api=(window as GoogleWindow).google?.maps;
    streetFocusRef.current?.setMap(null);streetFocusRef.current=null;
    const step=streetWalkingRoute?.steps[streetHighlightedStep??-1];
    if(!map || !api?.Polyline || !step?.path?.length) return;
    streetFocusRef.current=new api.Polyline({map,path:step.path,
      strokeColor:"#174d9e",strokeOpacity:1,strokeWeight:10,zIndex:300});
    map.panTo(step.path[0]);
    return ()=>{streetFocusRef.current?.setMap(null);streetFocusRef.current=null;};
  },[streetWalkingRoute,streetHighlightedStep,mapReady]);

  useEffect(() => {
    const place = communityItems.find(p=>p.id===selectedCommunityId);
    if (place && mapRef.current) mapRef.current.panTo({lat:place.lat,lng:place.lon});
  }, [selectedCommunityId,communityItems,mapReady]);

  useEffect(() => {
    const location = outdoorLocationById[selectedId];
    if (location && mapRef.current) mapRef.current.panTo(location.position);
  }, [selectedId, status]);

  if (!API_KEY) return <div className="googlemap-fallback" role="status">
    <strong>Google Maps API key not configured</strong>
    <p>The Day 2 schematic is still available under <b>PATH layer</b>. Add <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to <code>frontend/.env.local</code> and restart the server.</p>
    <small>No Google Maps API request was made.</small>
  </div>;

  return <div className="googlemap-container">
    <div ref={container} className="googlemap-surface" aria-label="Interactive outdoor Google Map of downtown Toronto with approximate building markers" />
    {status !== "ready" && <div className="googlemap-loading" role="status">{status === "error"
      ? "Google Maps could not load. Check API restrictions, billing, and the browser console."
      : "Loading Google Maps…"}</div>}
    <div className="googlemap-disclaimer">Outdoor building markers are approximate · No PATH entrances or indoor routes verified</div>
  </div>;
}
