"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, Building2, CheckCircle2, ChevronDown, Coffee, Compass, ExternalLink, Layers3, MapPin, Navigation, Search, ShieldAlert, SlidersHorizontal } from "lucide-react";
import VerifiedSpatialMap from "./VerifiedSpatialMap";
import type { CatalogResponse, Coverage, IndoorScene, RouteResult } from "./spatialTypes";

// Browser-exposed API URL is not a credential. The Google Maps key stays in ignored .env.local.
const API = (process.env.NEXT_PUBLIC_PATH_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
const DEFAULT_START = "cibc_square";
const DEFAULT_END = "nathan_phillips_square";

async function getJSON<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, {signal});
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json() as Promise<T>;
}

export default function VerifiedNavigator() {
  const [coverage,setCoverage] = useState<Coverage | null>(null);
  const [scene,setScene] = useState<IndoorScene | null>(null);
  const [catalog,setCatalog] = useState<CatalogResponse | null>(null);
  const [loading,setLoading] = useState(true);
  const [loadError,setLoadError] = useState("");
  const [query,setQuery] = useState("");
  const [category,setCategory] = useState("All");
  const [selectedBusinessId,setSelectedBusinessId] = useState<string | null>(null);
  const [start,setStart] = useState(DEFAULT_START);
  const [end,setEnd] = useState(DEFAULT_END);
  const [level,setLevel] = useState<number | "all">("all");
  const [accessible,setAccessible] = useState(false);
  const [avoidFloors,setAvoidFloors] = useState(false);
  const [pinTarget,setPinTarget] = useState<"start"|"end">("start");
  const [pinMessage,setPinMessage] = useState("");
  const [result,setResult] = useState<RouteResult | null>(null);
  const [checking,setChecking] = useState(false);
  const [panel,setPanel] = useState<"discover"|"route">("discover");
  const [mobileOpen,setMobileOpen] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      getJSON<Coverage>(`${API}/api/v2/indoor/coverage`, controller.signal),
      getJSON<IndoorScene>(`${API}/api/v2/indoor/scene`, controller.signal),
      getJSON<CatalogResponse>(`${API}/api/v2/indoor/catalog`, controller.signal),
    ]).then(([nextCoverage,nextScene,nextCatalog]) => {
      if (!controller.signal.aborted) {
        setCoverage(nextCoverage); setScene(nextScene); setCatalog(nextCatalog);
        setLoadError("");
      }
    }).catch(err => {if (!controller.signal.aborted) setLoadError(`The evidence API is unavailable (${String(err)}). Start FastAPI on port 8000 and refresh.`);})
      .finally(() => {if (!controller.signal.aborted) setLoading(false);});
    return () => controller.abort();
  }, []);

  const places = useMemo(() => coverage?.places ?? [], [coverage]);
  const placeOptions = useMemo(() => places.map(p => ({id:p.id,label:p.name})), [places]);
  const normalized = query.trim().toLowerCase();
  const filteredPlaces = useMemo(() => places.filter(place => `${place.name} ${place.kind}`.toLowerCase().includes(normalized) && (level === "all" || place.level === level)), [places,normalized,level]);
  const filteredBusinesses = useMemo(() => (catalog?.destinations ?? []).filter(business =>
    (category === "All" || business.category === category) && level === "all" &&
    `${business.name} ${business.category} ${business.building_name}`.toLowerCase().includes(normalized)
  ), [catalog,category,normalized,level]);
  const selectedBusiness = catalog?.destinations.find(b => b.id === selectedBusinessId);
  const unavailable = !scene?.feature_count;

  function selectPlace(id:string) {
    setEnd(id); setResult(null); setSelectedBusinessId(null); setMobileOpen(false);
  }
  async function checkRoute() {
    if (!start || !end) return;
    setChecking(true); setResult(null); setLoadError(""); setPinMessage("");
    try {
      const params = new URLSearchParams({start,end,accessible_only:String(accessible),avoid_floor_changes:String(avoidFloors)});
      const data = await getJSON<RouteResult>(`${API}/api/v2/indoor/route?${params}`, new AbortController().signal);
      setResult(data);
    } catch (err) {setLoadError(`Route request failed (${String(err)}). Verify the API server and browser CORS settings.`);}
    finally {setChecking(false);}
  }
  async function tryMapPin(lon:number,lat:number) {
    if (level === "all" || unavailable) {setPinMessage("Choose a verified floor before dropping a pin. No indoor floor is currently mapped.");return;}
    try {
      const data = await getJSON<{status:string;node:null|{id:string;name:string};message?:string}>(`${API}/api/v2/indoor/snap?${new URLSearchParams({lon:String(lon),lat:String(lat),level:String(level)})}`, new AbortController().signal);
      setPinMessage(data.message ?? data.status.replaceAll("_", " "));
      if (data.status === "SNAPPED_TO_REVIEWED_NODE" && data.node) {
        if (pinTarget === "start") setStart(data.node.id); else setEnd(data.node.id);
        setResult(null);
      }
    } catch {setPinMessage("Could not validate the proposed pin. No location was selected.");}
  }
  return <section className="pathway-explorer" aria-label="Verified PATH map-first explorer">
    <div className="pathway-evidence-strip" role="status"><ShieldAlert size={15}/>
      <strong>Research preview</strong><span>Real street context · No licensed indoor corridor geometry</span>
      <span className="pathway-count">{scene?.feature_count ?? 0} mapped indoor segments</span>
    </div>
    <div className="pathway-map-frame">
      <VerifiedSpatialMap scene={scene} selectedId={end} level={level} onSelect={selectPlace} onPin={tryMapPin} route={result}/>
      <div className="pathway-floor-control" aria-label="Indoor floor controls">
        <Layers3 size={19}/><label htmlFor="pathway-floor">Floor</label>
        <select id="pathway-floor" value={level} onChange={e => {setLevel(e.target.value === "all" ? "all" : Number(e.target.value));setResult(null);}}>
          <option value="all">Street context · all floors</option>
          {scene?.levels.map(floor => <option key={floor} value={floor}>Underground level {floor}</option>)}
        </select>
        <small>{!scene?.levels.length ? "No surveyed floor plans" : `${scene.levels.length} reviewed levels`}</small>
      </div>
      <div className="pathway-floating-panel" data-open={mobileOpen}>
        <div className="pathway-panel-head">
          <div><span className="pathway-eyebrow">PATHWAY / TORONTO</span><h3>Find your way <em>beneath the city.</em></h3></div>
          <button className="pathway-mobile-close" type="button" onClick={()=>setMobileOpen(false)} aria-label="Hide search and route panel"><ChevronDown size={20}/></button>
        </div>
        <div className="pathway-panel-tabs" role="group" aria-label="Choose map task">
          <button type="button" aria-pressed={panel==="discover"} onClick={()=>setPanel("discover")}><Search size={16}/> Discover</button>
          <button type="button" aria-pressed={panel==="route"} onClick={()=>setPanel("route")}><Navigation size={16}/> Directions</button>
        </div>
        {panel==="discover" ? <div className="pathway-search-body">
          <label className="pathway-search-input"><Search size={18}/><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search shops, buildings, transit…" aria-label="Search documented PATH places and businesses"/></label>
          <div className="pathway-categories" role="group" aria-label="Business categories">
            {["All", ...(catalog?.categories ?? [])].map(item=><button key={item} type="button" aria-pressed={category===item} onClick={()=>setCategory(item)}>{item}</button>)}
          </div>
          {loading && <p className="pathway-inline-status" role="status">Loading documented locations…</p>}
          {loadError && <p className="pathway-inline-error" role="alert">{loadError}</p>}
          <h4><MapPin size={15}/> Documented landmarks <small>{filteredPlaces.length}</small></h4>
          <div className="pathway-results" role="list">
            {filteredPlaces.map(place=><button role="listitem" type="button" key={place.id} className={end===place.id ? "selected" : ""} onClick={()=>selectPlace(place.id)}>
              <span className="pathway-place-icon"><Building2 size={17}/></span><span><strong>{place.name}</strong><small>{place.position_status === "NAME_ONLY" ? "Location listed · Indoor entrance not mapped" : `Verified node · Level ${place.level}`}</small></span>
              <MapPin size={15}/></button>)}
            {!filteredPlaces.length && <p className="pathway-inline-status">No documented landmarks match this search.</p>}
          </div>
          <h4><Coffee size={15}/> Businesses <small>{filteredBusinesses.length}</small></h4>
          <div className="pathway-results" role="list">
            {filteredBusinesses.map(b=><button role="listitem" type="button" key={b.id} className={selectedBusinessId===b.id?"selected":""} onClick={()=>setSelectedBusinessId(b.id)}>
              <span className="pathway-place-icon"><Coffee size={17}/></span><span><strong>{b.name}</strong><small>{b.building_name} · {b.category}</small></span>
              <MapPin size={15}/></button>)}
            {!filteredBusinesses.length && <p className="pathway-inline-status">No matching directory listings on this filter.</p>}
          </div>
          {selectedBusiness && <div className="pathway-selected-business" role="region" aria-label="Selected business">
            <strong>{selectedBusiness.name}</strong><span>{selectedBusiness.building_name} · Floor and exact entrance unverified</span>
            <small>Directory checked {selectedBusiness.directory_checked_on}. Exact position is not mapped.</small>
            <div><a target="_blank" rel="noopener noreferrer" href={selectedBusiness.directory_url}>Building directory <ExternalLink size={13}/></a><a target="_blank" rel="noopener noreferrer" href={selectedBusiness.website_url}>Official website <ExternalLink size={13}/></a></div>
            <button type="button" disabled>Navigate Here — requires surveyed entrance</button>
          </div>}
          <p className="pathway-source-note">Business names are source-backed; no interior shop units or markers are invented. <a href="https://www.toronto.ca/explore-enjoy/visitor-toronto/path-torontos-downtown-pedestrian-walkway/" target="_blank" rel="noopener noreferrer">City PATH references <ExternalLink size={12}/></a></p>
        </div> : <form className="pathway-route-form" onSubmit={e=>{e.preventDefault();void checkRoute();}}>
          <div className="pathway-route-fields"><div className="pathway-route-dots"><span/><span/></div><div>
            <label>From<select value={start} onChange={e=>{setStart(e.target.value);setResult(null);}}>{placeOptions.map(p=><option value={p.id} key={p.id}>{p.label}</option>)}</select></label>
            <label>To<select value={end} onChange={e=>{setEnd(e.target.value);setResult(null);}}>{placeOptions.map(p=><option value={p.id} key={p.id}>{p.label}</option>)}</select></label>
          </div><button type="button" className="pathway-swap" aria-label="Swap origin and destination" onClick={()=>{setStart(end);setEnd(start);setResult(null);}}><ArrowLeftRight size={19}/></button></div>
          <div className="pathway-route-preferences"><strong><SlidersHorizontal size={15}/> Preferences</strong>
            <label><input type="checkbox" checked={accessible} onChange={e=>{setAccessible(e.target.checked);setResult(null);}}/> Confirmed wheelchair-accessible only</label>
            <label><input type="checkbox" checked={avoidFloors} onChange={e=>{setAvoidFloors(e.target.checked);setResult(null);}}/> Avoid floor changes</label>
            <label>Pin selection mode<select value={pinTarget} onChange={e=>setPinTarget(e.target.value as "start"|"end") }><option value="start">Set starting point</option><option value="end">Set destination</option></select></label>
          </div>
          <button type="submit" className="pathway-primary-btn" disabled={!coverage || checking}>{checking?"Checking route evidence…":"Check indoor-only route"} <Navigation size={17}/></button>
          {result && <div className={`pathway-route-feedback ${result.route ? "found" : ""}`} role="status" aria-live="polite"><strong>{result.status.replaceAll("_"," ")}</strong><p>{result.message}</p>{result.route && <><p>Surveyed edge length: {result.route.distance_m} m · {result.route.floor_changes} floor transitions. No walking-time estimate.</p><ol>{result.route.steps.map((step,i)=><li key={i}>{step.instruction}<small>Source: {step.source_id} · Checked {step.verified_on} · {step.operational_status ?? "Unknown operational state"}</small></li>)}</ol></>}</div>}
          {!result && <p className="pathway-inline-status">Indoor-only navigation will not quietly switch to outdoor walking. Unverified destinations return no route.</p>}
          {pinMessage && <p role="status" className="pathway-inline-status">{pinMessage}</p>}
          {loadError && <p className="pathway-inline-error" role="alert">{loadError}</p>}
        </form>}
      </div>
      {!mobileOpen && <button type="button" className="pathway-panel-reopen" onClick={()=>setMobileOpen(true)} aria-label="Open search and directions panel"><Compass size={18}/> Search and directions</button>}
      <div className="pathway-map-footer"><CheckCircle2 size={14}/><span>Accuracy first: unverified PATH corridors, floor levels and retail units never appear as navigable data.</span></div>
    </div>
  </section>;
}
