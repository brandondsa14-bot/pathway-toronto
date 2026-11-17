"use client";

import { useEffect, useMemo, useState } from "react";

type IndoorPlace = {
  id: string; name: string; kind: string; level: number | null;
  position_status: string; has_verified_entry: boolean;
};
type Coverage = {
  status: string; network_id: string; verified_edge_count: number;
  available_levels: number[]; places: IndoorPlace[]; message: string; disclaimer: string;
};
type Segment = {
  from: string; to: string; instruction: string; kind: string;
  length_m: number; floor_from: number; floor_to: number;
  geometry: number[][]; accessible: boolean | null; source_id: string;
  verified_on: string; operational_status?: string; edge_id?: string;
};
type RouteResult = {
  status: string; message: string;
  route: null | {
    labels: string[]; distance_m: number; time_minutes: null;
    steps: Segment[]; floor_changes: number;
  };
};
type CatalogBusiness = {
  id: string; name: string; category: string; kind: "business";
  building_anchor_id: string; building_name: string;
  level: null; lat: null; lon: null; location_status: "BUILDING_LISTED_ONLY";
  navigation_ready: false; source_ids: string[];
  directory_url: string; website_url: string; directory_checked_on: string;
};
type CatalogResponse = {
  status: "BUILDING_DIRECTORY_ONLY"; total: number; count: number;
  categories: string[]; destinations: CatalogBusiness[]; disclaimer: string;
};

// Public backend base URL, NOT a Google Maps API key. It is expected to be readable by clients.
const API = (process.env.NEXT_PUBLIC_PATH_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
const DEFAULT_START = "cibc_square";
const DEFAULT_END = "nathan_phillips_square";

function LevelLabel({ level }: { level: number | null }) {
  return <>{level === null ? "Floor not surveyed" : level === 0 ? "Street / level 0" : `Level ${level > 0 ? "+" : ""}${level}`}</>;
}

function VerifiedPolyline({ route, level }: { route: NonNullable<RouteResult["route"]>; level: number | "all" }) {
  const paths = route.steps.filter(step => level === "all" || step.floor_from === level || step.floor_to === level);
  const coords = paths.flatMap(step => step.geometry);
  if (!coords.length) return null;
  const longitudes = coords.map(point => point[0]);
  const latitudes = coords.map(point => point[1]);
  const minLon = Math.min(...longitudes), maxLon = Math.max(...longitudes);
  const minLat = Math.min(...latitudes), maxLat = Math.max(...latitudes);
  const project = (point: number[]) => [30 + 640 * ((point[0] - minLon) / (maxLon - minLon || 1)), 270 - 240 * ((point[1] - minLat) / (maxLat - minLat || 1))];
  return <svg className="verified-polyline" viewBox="0 0 700 300" role="img" aria-label="Reviewed route geometry in a schematic viewport, not a street basemap">
    {paths.map((segment, index) => <polyline key={`${segment.from}-${segment.to}-${index}`} points={segment.geometry.map(point => project(point).join(",")).join(" ")} fill="none" stroke="#00a5a1" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />)}
  </svg>;
}

export default function VerifiedNavigator() {
  const [coverage, setCoverage] = useState<Coverage | null>(null);
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [error, setError] = useState("");
  const [catalogError, setCatalogError] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [start, setStart] = useState(DEFAULT_START);
  const [end, setEnd] = useState(DEFAULT_END);
  const [level, setLevel] = useState<number | "all">("all");
  const [accessible, setAccessible] = useState(false);
  const [avoidFloors, setAvoidFloors] = useState(false);
  const [result, setResult] = useState<RouteResult | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API}/api/v2/indoor/coverage`, { signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error(`Coverage HTTP ${response.status}`); return response.json() as Promise<Coverage>; })
      .then(data => { if (!controller.signal.aborted) { setCoverage(data); setError(""); } })
      .catch(err => { if (!controller.signal.aborted) setError(`Cannot load the indoor evidence API: ${String(err)}. Start FastAPI on port 8000.`); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    fetch(`${API}/api/v2/indoor/catalog`, { signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error(`Catalog HTTP ${response.status}`); return response.json() as Promise<CatalogResponse>; })
      .then(data => { if (!controller.signal.aborted) { setCatalog(data); setCatalogError(""); } })
      .catch(err => { if (!controller.signal.aborted) setCatalogError(`Business listings unavailable: ${String(err)}.`); })
      .finally(() => { if (!controller.signal.aborted) setCatalogLoading(false); });
    return () => controller.abort();
  }, []);

  const places = useMemo(() => coverage?.places || [], [coverage]);
  const filtered = useMemo(() => places.filter(place =>
    `${place.name} ${place.kind}`.toLowerCase().includes(query.trim().toLowerCase()) &&
    (level === "all" || place.level === level)), [places, query, level]);
  const businesses = useMemo(() => (catalog?.destinations || []).filter(business =>
    (category === "All" || category === business.category) &&
    (level === "all") &&
    `${business.name} ${business.category} ${business.building_name}`.toLowerCase().includes(query.trim().toLowerCase())
  ), [catalog, category, query, level]);
  const selectedBusiness = catalog?.destinations.find(b => b.id === selectedBusinessId);

  async function checkRoute() {
    if (!start || !end) return;
    setChecking(true);
    setResult(null);
    setError("");
    try {
      const params = new URLSearchParams({ start, end, accessible_only: String(accessible), avoid_floor_changes: String(avoidFloors) });
      const response = await fetch(`${API}/api/v2/indoor/route?${params.toString()}`);
      if (!response.ok) throw new Error(`Route HTTP ${response.status}`);
      setResult(await response.json() as RouteResult);
    } catch (err) {
      setError(`Indoor route request failed: ${String(err)}. Check FastAPI and your browser's network/CORS settings.`);
    } finally {
      setChecking(false);
    }
  }

  return <section className="verified-nav" aria-label="Evidence-gated Toronto PATH navigation">
    <header className="verified-nav-head"><div><span className="verified-kicker">RESEARCH MODE · INDOOR PATH NETWORK</span><h3>Navigate indoors, with evidence</h3><p>Search source-documented places and building-directory businesses. Verified corridor routing remains separate from the fictional 3D and PATH demos.</p></div><span className="verified-status">{coverage?.verified_edge_count ?? 0} verified edges</span></header>
    {loading && <p role="status">Checking indoor network coverage…</p>}
    {error && <p className="verified-error" role="alert">{error}</p>}
    {coverage && <>
      <div className="verified-alert" role="status"><strong>{coverage.status.replaceAll("_", " ")}</strong><span>{coverage.message}</span></div>
      <div className="verified-nav-grid">
        <form className="verified-nav-form" onSubmit={event => { event.preventDefault(); void checkRoute(); }}>
          <label>Starting place<select value={start} onChange={event => { setStart(event.target.value); setResult(null); }}>{places.map(p => <option value={p.id} key={p.id}>{p.name}</option>)}</select></label>
          <label>Destination<select value={end} onChange={event => { setEnd(event.target.value); setResult(null); }}>{places.map(p => <option value={p.id} key={p.id}>{p.name}</option>)}</select></label>
          <label>Floor view<select value={level} onChange={event => setLevel(event.target.value === "all" ? "all" : Number(event.target.value))}><option value="all">All documented floors</option>{coverage.available_levels.map(floor => <option key={floor} value={floor}>Level {floor}</option>)}</select></label>
          {coverage.available_levels.length === 0 && <small>No independently verified indoor floors are loaded yet.</small>}
          <label className="verified-check"><input type="checkbox" checked={accessible} onChange={event => { setAccessible(event.target.checked); setResult(null); }}/> Require confirmed accessible segments</label>
          <label className="verified-check"><input type="checkbox" checked={avoidFloors} onChange={event => { setAvoidFloors(event.target.checked); setResult(null); }}/> Avoid floor transitions</label>
          <button type="submit" disabled={checking || !start || !end}>{checking ? "Checking evidence…" : "Check indoor-only route"}</button>
          <small>No automatic outdoor fallback. We won't invent a corridor, level, travel time or closest exit.</small>
        </form>
        <div className="verified-nav-explorer">
          <label>Search documented places and directory businesses<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="CIBC Square, Union, coffee, Wendy’s…" /></label>
          <div className="verified-section-label">Places · entrance positions not yet verified</div>
          <div className="verified-place-results">{filtered.map(place => <button key={place.id} type="button" onClick={() => { setEnd(place.id); setResult(null); }}><strong>{place.name}</strong><span><LevelLabel level={place.level}/> · {place.position_status === "NAME_ONLY" ? "No verified entry point" : "Reviewed interior position"}</span></button>)}{filtered.length === 0 && <p>No place anchors match this search/floor.</p>}</div>
          <div className="verified-section-label">Businesses · listed in official building directory, precise unit unverified</div>
          <div className="verified-business-filters" role="group" aria-label="Filter business categories">
            {["All", ...(catalog?.categories || [])].map(item => <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}
          </div>
          {catalogLoading && <p className="verified-note">Loading directory references…</p>}
          {catalogError && <p className="verified-error" role="alert">{catalogError}</p>}
          <div className="verified-business-results">
            {businesses.map(business => <button type="button" key={business.id} aria-pressed={selectedBusinessId === business.id} onClick={() => setSelectedBusinessId(business.id)}>
              <strong>{business.name}</strong><span>{business.category} · {business.building_name}</span>
            </button>)}
            {!catalogLoading && businesses.length === 0 && <p className="verified-note">No directory businesses match this category/search/floor.</p>}
          </div>
          {selectedBusiness && <div className="verified-business-detail">
            <strong>{selectedBusiness.name}</strong>
            <span>{selectedBusiness.building_name} · Floor and entrance not surveyed</span>
            <small>Building directory checked: {selectedBusiness.directory_checked_on}. Listed in building only; the displayed 3D storefront is illustrative.</small>
            <div className="verified-business-links">
              <a href={selectedBusiness.directory_url} target="_blank" rel="noopener noreferrer">Official building listing</a>
              <a href={selectedBusiness.website_url} target="_blank" rel="noopener noreferrer">Business website</a>
            </div>
            <button type="button" disabled title="Precise entrance and corridor geometry must be independently verified">Navigate Here — awaiting verified location</button>
            <small>No route to this business can be calculated yet. Do not assume a floor, store entrance or fully indoor connection.</small>
          </div>}
          {catalog && <p className="verified-note">{catalog.total} source-backed business listings. None are mapped to surveyed interior points.</p>}
          <div className="verified-geometry">
            {result?.route ? <VerifiedPolyline route={result.route} level={level}/> : <p>No licensed corridor geometry to draw. The older PATH schematic is a separate illustrative graph.</p>}
          </div>
        </div>
      </div>
      {result && <section className={result.route ? "verified-route-result verified-found" : "verified-route-result"} role="status" aria-live="polite"><strong>{result.status.replaceAll("_", " ")}</strong><p>{result.message}</p>{result.route && <><p>Documented segment length: {result.route.distance_m} m · {result.route.floor_changes} floor changes. Walking time not estimated.</p><ol>{result.route.steps.map((step, idx) => <li key={idx}>{step.instruction} ({step.length_m} m) <small>Source: {step.source_id}; reviewed {step.verified_on}; operation: {step.operational_status ?? "unknown"}.</small></li>)}</ol></>}</section>}
      <p className="verified-footnote">{coverage.disclaimer} Official City PATH diagrams are cited for research; no copyrighted map geometries are copied into this project.</p>
    </>}
  </section>;
}
