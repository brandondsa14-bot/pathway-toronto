"use client";

import { useEffect, useRef, useState } from "react";
import { Footprints, Info, MapPin } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_PATHWAY_API_BASE_URL || "http://localhost:8000";

export type DemoRoute = {
  nodes: string[];
  labels: string[];
  connection_count: number;
  total_cost: number;
  cost_unit: string;
  status: "ILLUSTRATIVE_ONLY";
  mode: "demo";
  disclaimer: string;
  segments: Array<{start:string;end:string;kind:string;synthetic_cost:number;accessible_in_demo:boolean;floor_change:boolean}>;
  floor_change_count:number;
  accessible_filter:boolean;
  avoid_floor_changes_filter:boolean;
};
type Entrance = { id: string; building_id: string; label: string; description: string; source_id: string };
type EntranceResponse = { entrances: Entrance[] };
type Location = { id: string; name: string };

type Props = {
  locations: Location[];
  origin: string;
  destination: string;
  onOriginChange: (value: string) => void;
  onRouteChange: (route: DemoRoute | null) => void;
};

export default function RoutePlanner({ locations, origin, destination, onOriginChange, onRouteChange }: Props) {
  const [route, setRoute] = useState<DemoRoute | null>(null);
  const [entrances, setEntrances] = useState<Entrance[]>([]);
  const [loading, setLoading] = useState(false);
  const [accessible, setAccessible] = useState(false);
  const [avoidFloors, setAvoidFloors] = useState(false);
  const [error, setError] = useState("");
  const request = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_BASE}/api/v1/entrances`, { signal: controller.signal })
      .then(response => { if (!response.ok) throw Error("Entrance records unavailable"); return response.json() as Promise<EntranceResponse>; })
      .then(result => setEntrances(result.entrances))
      .catch(() => { /* The planner still works when provenance service is temporarily offline. */ });
    return () => controller.abort();
  }, []);

  // Clear stale route visuals immediately when a destination or origin changes.
  useEffect(() => {
    request.current += 1;
    setRoute(null);
    setError("");
    setLoading(false);
    onRouteChange(null);
  // Parent passes an inline callback; only location changes should invalidate the route.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin, destination, accessible, avoidFloors]);

  async function preview() {
    const currentRequest = ++request.current;
    setLoading(true); setError(""); setRoute(null); onRouteChange(null);
    try {
      const params = new URLSearchParams({ start: origin, end: destination, mode: "demo", accessible: String(accessible), avoid_floor_changes: String(avoidFloors) });
      const response = await fetch(`${API_BASE}/api/v1/route?${params}`);
      const body = await response.json();
      if (!response.ok) throw Error(typeof body.detail === "string" ? body.detail : "Route unavailable");
      const result = body as DemoRoute;
      if (result.mode !== "demo" || result.status !== "ILLUSTRATIVE_ONLY") throw Error("Unexpected route provenance");
      if (currentRequest !== request.current) return;
      setRoute(result); onRouteChange(result);
    } catch (e) {
      if (currentRequest !== request.current) return;
      setError(e instanceof Error ? e.message : "Could not reach routing API. Start the backend on port 8000.");
    } finally {
      if (currentRequest === request.current) setLoading(false);
    }
  }

  const access = entrances.filter(entrance => entrance.building_id === destination);
  return <section className="journey" aria-labelledby="journey-title">
    <h3 id="journey-title">Plan a demonstration route</h3>
    <span className="journey-flag">SYNTHETIC NETWORK — NOT REAL DIRECTIONS</span>
    <label className="originlabel" htmlFor="route-origin">ROUTE FROM</label>
    <select id="route-origin" value={origin} onChange={e => onOriginChange(e.target.value)}>
      {locations.filter(p => p.id !== destination).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
    </select>
    <p className="routehelper">The A* backend calculates the lowest synthetic cost. No real walking time, metre distance, or verified PATH corridor is available.</p>
    <fieldset className="journey-preferences">
      <legend>Demo route preferences</legend>
      <label><input type="checkbox" checked={accessible} onChange={event=>setAccessible(event.target.checked)} /> Exclude demo edges labelled inaccessible</label>
      <label><input type="checkbox" checked={avoidFloors} onChange={event=>setAvoidFloors(event.target.checked)} /> Avoid demo floor changes</label>
      <small>These flags belong to a fabricated test graph and DO NOT establish wheelchair accessibility.</small>
    </fieldset>
    <button type="button" className="primary" onClick={preview} disabled={loading || origin === destination}>
      <Footprints size={18} /> {loading ? "Calculating route…" : "Preview illustrative route"}
    </button>
    {error && <p className="journey-error" role="alert">{error}</p>}
    {route && <div className="routeinfo" role="status" aria-live="polite">
      <strong>{route.connection_count ? "Illustrative route highlighted on PATH layer" : "Already at destination"}</strong>
      <p className="journey-path">{route.labels.join(" → ")}</p>
      <small>{route.connection_count} connections · {route.total_cost} synthetic cost units · {route.floor_change_count} demo floor transitions. <b>Not real distance or time.</b></small>
      <ol className="journey-segments">{route.segments.map((segment, i) => <li key={`${segment.start}-${segment.end}-${i}`}>
        {route.labels[i]} → {route.labels[i+1]} · {segment.kind}{segment.floor_change ? " · demo floor change" : ""}{!segment.accessible_in_demo ? " · demo non-accessible edge" : ""}
      </li>)}</ol>
    </div>}
    <div className="journey-access"><h4><MapPin size={15}/> Source-described PATH access</h4>
      {access.length ? access.map(item => <p key={item.id}><strong>{item.label}:</strong> {item.description}</p>) : <p>No published entrance description registered for this location.</p>}
    </div>
    <p className="journey-disclaimer"><Info size={15}/> Never use this demo for real-world navigation or accessible route planning.</p>
  </section>;
}
