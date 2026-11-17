"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, Building2, CheckCircle2, ChevronDown, Coffee, Compass, ExternalLink, Layers3, MapPin, Navigation, Search, ShieldAlert, SlidersHorizontal } from "lucide-react";
import VerifiedSpatialMap from "./VerifiedSpatialMap";
import {computeStreetWalkingRoute,googleMapsWalkingLink} from "./streetRoutes";
import type {StreetWalkingRoute,StreetEndpoint} from "./streetRoutes";
import type { CatalogResponse, Coverage, IndoorScene, RouteResult, OSMExploreResponse, OSMCandidate, ProposedPin } from "./spatialTypes";

// Browser-exposed API URL is not a credential. The Google Maps key stays in ignored .env.local.
const API = (process.env.NEXT_PUBLIC_PATH_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
const DEFAULT_START = "cibc_square";
const DEFAULT_END = "nathan_phillips_square";

async function getJSON<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, {signal});
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json() as Promise<T>;
}

export default function VerifiedNavigator({initialPanel = "discover"}: {initialPanel?: "discover" | "route"}) {
  const [coverage,setCoverage] = useState<Coverage | null>(null);
  const [scene,setScene] = useState<IndoorScene | null>(null);
  const [catalog,setCatalog] = useState<CatalogResponse | null>(null);
  const [osm,setOsm] = useState<OSMExploreResponse | null>(null);
  const [osmCategory,setOsmCategory] = useState("All");
  const [osmScope,setOsmScope] = useState<"all" | "POSSIBLE_PATH">("all");
  const [selectedCandidateId,setSelectedCandidateId] = useState<string | null>(null);
  const [proposedStartPin,setProposedStartPin] = useState<ProposedPin | null>(null);
  const [proposedEndPin,setProposedEndPin] = useState<ProposedPin | null>(null);
  const [startPinLevel,setStartPinLevel] = useState<number|null>(null);
  const [endPinLevel,setEndPinLevel] = useState<number|null>(null);
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
  const [panel,setPanel] = useState<"discover"|"route">(initialPanel);
  const [mobileOpen,setMobileOpen] = useState(true);
  const [navigationMode,setNavigationMode] = useState<"indoor"|"street">("indoor");
  const [walkFrom,setWalkFrom] = useState("CIBC Square, Toronto, Ontario");
  const [walkTo,setWalkTo] = useState("Nathan Phillips Square, Toronto, Ontario");
  const [useStartPin,setUseStartPin] = useState(false);
  const [useEndPin,setUseEndPin] = useState(false);
  const [streetRoute,setStreetRoute] = useState<StreetWalkingRoute|null>(null);
  const [streetStep,setStreetStep] = useState<number|undefined>(undefined);
  const [streetLoading,setStreetLoading] = useState(false);
  const [streetError,setStreetError] = useState("");
  const [googleReady,setGoogleReady] = useState(false);
  const [gpsMessage,setGpsMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      getJSON<Coverage>(`${API}/api/v2/indoor/coverage`, controller.signal),
      getJSON<IndoorScene>(`${API}/api/v2/indoor/scene`, controller.signal),
      getJSON<CatalogResponse>(`${API}/api/v2/indoor/catalog`, controller.signal),
      getJSON<OSMExploreResponse>(`${API}/api/v2/indoor/explore`, controller.signal),
    ]).then(([nextCoverage,nextScene,nextCatalog,nextOsm]) => {
      if (!controller.signal.aborted) {
        setCoverage(nextCoverage); setScene(nextScene); setCatalog(nextCatalog); setOsm(nextOsm);
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
  const osmCandidates = useMemo(() => (osm?.items ?? []).filter(item =>
    (osmCategory === "All" || item.category === osmCategory) &&
    (osmScope === "all" || item.scope === "POSSIBLE_PATH") &&
    (level === "all" || item.floor === level) &&
    `${item.name} ${item.category} ${item.street}`.toLowerCase().includes(normalized)
  ), [osm, osmCategory, osmScope, level, normalized]);
  const selectedCandidate = osm?.items.find(item => item.id === selectedCandidateId);
  const floorOptions = useMemo(() => [...new Set([-0.5, -1, -2, ...(scene?.levels ?? []), ...(osm?.floors_in_source ?? [])])].sort((a,b) => b-a), [scene?.levels,osm?.floors_in_source]);
  const mapCandidates = useMemo(() => osmCandidates.slice(0,1200), [osmCandidates]);

  function selectPlace(id:string) {
    setEnd(id); setResult(null); setSelectedBusinessId(null); setMobileOpen(false);
  }
  async function checkRoute() {
    if (!start || !end) return;
    setChecking(true); setResult(null); setLoadError(""); setPinMessage("");
    try {
      const useVerifiedPins = proposedStartPin && proposedEndPin && startPinLevel!==null && endPinLevel!==null &&
        scene?.levels.includes(startPinLevel) && scene?.levels.includes(endPinLevel);
      const params = useVerifiedPins ? new URLSearchParams({
        start_lon:String(proposedStartPin.lon),start_lat:String(proposedStartPin.lat),start_level:String(startPinLevel),
        end_lon:String(proposedEndPin.lon),end_lat:String(proposedEndPin.lat),end_level:String(endPinLevel),
        accessible_only:String(accessible),avoid_floor_changes:String(avoidFloors),
      }) : new URLSearchParams({start,end,accessible_only:String(accessible),avoid_floor_changes:String(avoidFloors)});
      const endpoint=useVerifiedPins?"/api/v2/indoor/route/pins":"/api/v2/indoor/route";
      const data = await getJSON<RouteResult>(`${API}${endpoint}?${params}`, new AbortController().signal);
      setResult(data);
    } catch (err) {setLoadError(`Route request failed (${String(err)}). Verify the API server and browser CORS settings.`);}
    finally {setChecking(false);}
  }
  function setPin(role:"start"|"end",lon:number,lat:number) {
    if(role==="start"){
      setProposedStartPin({lon,lat});setUseStartPin(true);
      setWalkFrom(`Dropped map pin (${lat.toFixed(5)}, ${lon.toFixed(5)})`);
    } else {
      setProposedEndPin({lon,lat});setUseEndPin(true);
      setWalkTo(`Dropped map pin (${lat.toFixed(5)}, ${lon.toFixed(5)})`);
    }
    setStreetRoute(null);setStreetStep(undefined);
  }
  function pinMappedCandidate(item:OSMCandidate,role:"start"|"end") {
    setPin(role,item.lon,item.lat);setPinTarget(role==="start"?"end":"start");
    setNavigationMode("street");setPanel("route");setMobileOpen(true);
    setPinMessage("Using a community-mapped point for OUTDOOR walking. The precise PATH unit or entrance is unverified.");
  }
  const streetOrigin:StreetEndpoint = useStartPin && proposedStartPin ? {lat:proposedStartPin.lat,lng:proposedStartPin.lon} : walkFrom.trim();
  const streetDestination:StreetEndpoint = useEndPin && proposedEndPin ? {lat:proposedEndPin.lat,lng:proposedEndPin.lon} : walkTo.trim();
  async function checkStreetRoute() {
    if(!streetOrigin || !streetDestination) {setStreetError("Enter two addresses or select points on the map.");return;}
    setStreetLoading(true);setStreetError("");setStreetRoute(null);setStreetStep(undefined);
    try {
      const calculated=await computeStreetWalkingRoute(streetOrigin,streetDestination);
      setStreetRoute(calculated);
    } catch(error) {
      setStreetError(`Unable to draw the street route: ${error instanceof Error?error.message:String(error)}. You can open Google Maps walking directions instead. Check that the Routes API is enabled and your Google Cloud key permits it.`);
    } finally {setStreetLoading(false);}
  }
  function chooseMyApproximateLocation() {
    if(!navigator.geolocation) {setGpsMessage("Your browser does not support location access.");return;}
    setGpsMessage("Requesting permission for approximate location…");
    navigator.geolocation.getCurrentPosition(position=>{
      setPin("start",position.coords.longitude,position.coords.latitude);
      setPinTarget("end");setGpsMessage(`Outdoor GPS estimate ±${Math.round(position.coords.accuracy)} m. This does not establish your building or PATH floor.`);
    },error=>setGpsMessage(`Location unavailable: ${error.message}. You can drop a pin instead.`),{enableHighAccuracy:false,timeout:12000,maximumAge:30000});
  }
  async function tryMapPin(lon:number,lat:number) {
    setPin(pinTarget,lon,lat);
    if(pinTarget==="start")setStartPinLevel(level==="all"?null:level);
    else setEndPinLevel(level==="all"?null:level);
    setResult(null);
    if (level === "all" || unavailable || !scene?.levels.includes(level)) {
      setPinMessage(navigationMode==="street" ? "Approximate outdoor pin selected. Click Compute street walking route to request a real route; it does NOT follow PATH corridors." :
        "Proposed pin placed on the geographic map. It is NOT an indoor fix or routing endpoint. An accurately surveyed floor and corridor are required for valid navigation.");
      return;
    }
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
      <strong>Research preview</strong><span>Community-mapped POIs are unverified; indoor directions require surveyed corridors</span>
      <span className="pathway-count">{scene?.feature_count ?? 0} mapped indoor segments</span>
    </div>
    <div className="pathway-map-frame">
      <VerifiedSpatialMap scene={scene} selectedId={end} level={level} onSelect={selectPlace} onPin={tryMapPin} route={result}
        streetRoute={streetRoute} streetStep={streetStep} onGoogleReady={()=>setGoogleReady(true)}
        communityItems={mapCandidates} selectedCommunityId={selectedCandidateId} onCommunitySelect={id => {setSelectedCandidateId(id);setPanel("discover");setMobileOpen(true);}}
        proposedStartPin={proposedStartPin} proposedEndPin={proposedEndPin}
        onMovePin={(role,lon,lat) => {
          setPin(role,lon,lat);
          // Preserve the previously chosen floor for dragged pins; a map drag
          // cannot determine which underground level the user is actually on.
          setPinMessage("Map pin moved. The pin can be used for outdoor walking; it does not identify your PATH floor or an indoor entrance.");
          setResult(null);
        }}/>
      <div className="pathway-floor-control" aria-label="Indoor floor controls">
        <Layers3 size={19}/><label htmlFor="pathway-floor">Floor</label>
        <select id="pathway-floor" value={level} onChange={e => {setLevel(e.target.value === "all" ? "all" : Number(e.target.value));setResult(null);}}>
          <option value="all">Street context · all floors</option>
          {floorOptions.map(floor => <option key={floor} value={floor}>Underground level {floor} · {scene?.levels.includes(floor) ? "reviewed graph" : "unverified map filter"}</option>)}
        </select>
        <small>{!scene?.levels.length ? "No surveyed floors · OSM floor tags ≠ verified levels" : `${scene.levels.length} surveyed levels; other options are OSM-only`}</small>
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
          <div className="pathway-osm-heading"><h4><Layers3 size={15}/> Downtown map points <small>{osmCandidates.length}</small></h4><span>© OpenStreetMap contributors · ODbL</span></div>
          {osm?.status === "NO_OSM_SNAPSHOT" && <div className="pathway-osm-empty" role="status">
            <strong>Import optional community-mapped data to explore more places</strong>
            <p>The official four-store directory is available above. Your downtown OpenStreetMap snapshot has not been downloaded. Run the included one-time importer to add map-marked shops, washrooms, entrances and more.</p>
            <code>python3 tools/import_osm_path_candidates.py --fetch</code>
          </div>}
          {!!osm?.items.length && <>
            <div className="pathway-osm-meta"><strong>{osm.items.length.toLocaleString()} imported downtown points</strong><small>Community-mapped candidates; {osm.path_candidate_count} have underground/indoor hints. Not guaranteed to be in PATH.</small></div>
            <div className="pathway-categories" role="group" aria-label="Map point categories">
              {["All", ...(osm?.categories ?? [])].map(cat => <button type="button" key={cat} aria-pressed={osmCategory===cat} onClick={()=>setOsmCategory(cat)}>{cat}</button>)}
            </div>
            <label className="pathway-osm-scope"><input type="checkbox" checked={osmScope==="POSSIBLE_PATH"} onChange={event=>setOsmScope(event.target.checked?"POSSIBLE_PATH":"all")}/> Show only OSM indoor/underground candidates</label>
            <div className="pathway-results pathway-osm-results" role="list" aria-label="Community-mapped candidate locations">
              {osmCandidates.slice(0,150).map(item => <button key={item.id} type="button" role="listitem" className={selectedCandidateId===item.id?"selected":""} onClick={()=>setSelectedCandidateId(item.id)}>
                <span className="pathway-place-icon"><MapPin size={16}/></span><span><strong>{item.name}</strong><small>{item.category} · {item.floor===null?"Floor unknown":`OSM level ${item.floor}`} · {item.scope === "POSSIBLE_PATH" ? "Indoor/underground hint" : "Nearby downtown"}</small></span>
                <span className="pathway-osm-unverified">OSM</span>
              </button>)}
            </div>
            {osmCandidates.length>150 && <p className="pathway-inline-status">Showing the first 150 directory results. Refine the search, floor or category to find additional places. Map displays up to 700 matching points at once.</p>}
          </>}
          {selectedCandidate && <div className="pathway-selected-business pathway-osm-detail" role="region" aria-label="Community-mapped place details">
            <strong>{selectedCandidate.name}</strong><span>{selectedCandidate.category} · {selectedCandidate.floor===null?"Exact underground floor unknown":`Contributor floor tag ${selectedCandidate.floor}`}</span>
            <small>Community mapping ({selectedCandidate.position_quality === "OSM_POINT"?"mapped point":"feature centroid"}); PATH affiliation, accessibility, current access and precise entry NOT verified.</small>
            <div><a href={selectedCandidate.source_url} target="_blank" rel="noopener noreferrer">Open OSM source <ExternalLink size={13}/></a></div>
            <div className="pathway-candidate-actions"><button type="button" onClick={()=>pinMappedCandidate(selectedCandidate,"start")}>Use as street starting point</button><button type="button" onClick={()=>pinMappedCandidate(selectedCandidate,"end")}>Street directions to here</button></div>
            <small>Outdoor walking uses the OSM point/centroid, not a verified indoor store entrance.</small>
            <button type="button" disabled>Indoor PATH route — requires reviewed walkways</button>
          </div>}
          {osm?.items.length ? <p className="pathway-source-note"><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors (ODbL)</a> · OSM records can be incomplete or outdated; the downtown bbox is not a PATH boundary. These pins are NOT surveyed directions.</p> : null}
          <p className="pathway-source-note">Business names are source-backed; no interior shop units or markers are invented. <a href="https://www.toronto.ca/explore-enjoy/visitor-toronto/path-torontos-downtown-pedestrian-walkway/" target="_blank" rel="noopener noreferrer">City PATH references <ExternalLink size={12}/></a></p>
        </div> : <form className="pathway-route-form" onSubmit={e=>{e.preventDefault();void (navigationMode==="street"?checkStreetRoute():checkRoute());}}>
          <div className="pathway-route-modes" role="group" aria-label="Choose walking navigation type">
            <button type="button" aria-pressed={navigationMode==="indoor"} onClick={()=>setNavigationMode("indoor")}>Verified indoor PATH</button>
            <button type="button" aria-pressed={navigationMode==="street"} onClick={()=>{setNavigationMode("street");setPinMessage("");}}>Street walking</button>
          </div>
          <p className="pathway-route-mode-note">{navigationMode==="indoor"?"Indoor only · Reviewed corridor data required. No automatic outside detours.":"Actual Google walking routes along the outdoor network. This does NOT validate PATH interiors or accessibility."}</p>
          {navigationMode==="street" ? <>
            <div className="pathway-street-fields">
              <label>Starting address or place<input type="search" value={walkFrom} placeholder="Type any address or landmark" onChange={e=>{setWalkFrom(e.target.value);setUseStartPin(false);setStreetRoute(null);}}/></label>
              <label>Destination address or place<input type="search" value={walkTo} placeholder="Type any address or landmark" onChange={e=>{setWalkTo(e.target.value);setUseEndPin(false);setStreetRoute(null);}}/></label>
              <div className="pathway-street-actions"><button type="button" onClick={()=>{const a=walkFrom;setWalkFrom(walkTo);setWalkTo(a);const pin=proposedStartPin;setProposedStartPin(proposedEndPin);setProposedEndPin(pin);const using=useStartPin;setUseStartPin(useEndPin);setUseEndPin(using);setStreetRoute(null);}}>Swap points <ArrowLeftRight size={15}/></button><button type="button" onClick={chooseMyApproximateLocation}>Use approximate location</button></div>
              {gpsMessage && <small role="status">{gpsMessage}</small>}
              <label>Map pin tool<select value={pinTarget} onChange={e=>setPinTarget(e.target.value as "start"|"end")}><option value="start">Drop or move START pin</option><option value="end">Drop or move DESTINATION pin</option></select></label>
              <small>Click or drag a pin on City map. You may also select an OSM result under Discover → Street directions to here. Typed addresses do not require one of six predefined locations.</small>
            </div>
            <button type="submit" className="pathway-primary-btn" disabled={streetLoading||!googleReady}>{streetLoading?"Requesting mapped walking route…":!googleReady?"Loading street map…":"Compute street walking route"} <Navigation size={17}/></button>
            <a className="pathway-street-link" href={googleMapsWalkingLink(streetOrigin,streetDestination)} target="_blank" rel="noopener noreferrer">Open walking directions in Google Maps <ExternalLink size={14}/></a>
            {streetError && <p className="pathway-inline-error" role="alert">{streetError}</p>}
            {streetRoute && <section className="pathway-street-route" aria-label="Google street walking directions" role="status">
              <strong>Street-level walking route · NOT PATH</strong>
              <p>Google-mapped pedestrian geometry. {streetRoute.distanceMeters!==null?`${Math.round(streetRoute.distanceMeters)} m`:"Distance unavailable"} · {streetRoute.durationMillis!==null?`${Math.max(1,Math.round(streetRoute.durationMillis/60000))} min estimated`:"Time unavailable"}</p>
              <p className="pathway-street-warning">This route may involve outdoor streets, stairs, inaccessible areas or incomplete entrances. It is not certified accessible or indoor-only. Do not use it as evidence of PATH connections.</p>
              {streetRoute.warnings.map((warning,i)=><small key={i}>{warning}</small>)}
              <h4>Walking instructions</h4>
              {streetRoute.steps.length ? <ol>{streetRoute.steps.map((step,i)=><li key={i}><button type="button" className={streetStep===i?"active":""} onClick={()=>setStreetStep(i)}><span>{step.instruction}</span><small>{step.distance}{step.duration?` · ${step.duration}`:""}</small></button></li>)}</ol> : <p>Route geometry was returned without individual step instructions. See Google Maps for details.</p>}
              <small>Route data: Google Maps Routes Library. Route is displayed on the Google city map.</small>
            </section>}
          </> : <>
          <div className="pathway-route-fields"><div className="pathway-route-dots"><span/><span/></div><div>
            <label>From<select value={start} onChange={e=>{setStart(e.target.value);setResult(null);}}>{placeOptions.map(p=><option value={p.id} key={p.id}>{p.label}</option>)}</select></label>
            <label>To<select value={end} onChange={e=>{setEnd(e.target.value);setResult(null);}}>{placeOptions.map(p=><option value={p.id} key={p.id}>{p.label}</option>)}</select></label>
          </div><button type="button" className="pathway-swap" aria-label="Swap origin and destination" onClick={()=>{setStart(end);setEnd(start);setResult(null);}}><ArrowLeftRight size={19}/></button></div>
          {(proposedStartPin || proposedEndPin) && <div className="pathway-proposed-pins" role="status">
            <strong>Unverified map pins (drag markers to adjust)</strong>
            {proposedStartPin && <div><span>Start</span> {proposedStartPin.lat.toFixed(5)}, {proposedStartPin.lon.toFixed(5)} <button type="button" onClick={()=>{setProposedStartPin(null);setStartPinLevel(null);}}>Clear</button></div>}
            {proposedEndPin && <div><span>Destination</span> {proposedEndPin.lat.toFixed(5)}, {proposedEndPin.lon.toFixed(5)} <button type="button" onClick={()=>{setProposedEndPin(null);setEndPinLevel(null);}}>Clear</button></div>}
            <small>These are approximate geographic selections; they cannot be used for indoor PATH directions until snapped to reviewed walking nodes.</small>
          </div>}
          <div className="pathway-route-preferences"><strong><SlidersHorizontal size={15}/> Preferences</strong>
            <label><input type="checkbox" checked={accessible} onChange={e=>{setAccessible(e.target.checked);setResult(null);}}/> Confirmed wheelchair-accessible only</label>
            <label><input type="checkbox" checked={avoidFloors} onChange={e=>{setAvoidFloors(e.target.checked);setResult(null);}}/> Avoid floor changes</label>
            <label>Pin selection mode<select value={pinTarget} onChange={e=>setPinTarget(e.target.value as "start"|"end") }><option value="start">Set starting point</option><option value="end">Set destination</option></select></label>
          </div>
          <button type="submit" className="pathway-primary-btn" disabled={!coverage || checking}>{checking?"Checking route evidence…":"Check indoor-only route"} <Navigation size={17}/></button>
          {result && <div className={`pathway-route-feedback ${result.route ? "found" : ""}`} role="status" aria-live="polite"><strong>{result.status.replaceAll("_"," ")}</strong><p>{result.message}</p>{result.route && <><p>Surveyed edge length: {result.route.distance_m} m · {result.route.floor_changes} floor transitions. No walking-time estimate.</p><ol>{result.route.steps.map((step,i)=><li key={i}>{step.instruction}{step.maneuvers?.length ? <ul>{step.maneuvers.map((bend,j) => <li key={j}>{bend.instruction}</li>)}</ul> : null}<small>Source: {step.source_id} · Checked {step.verified_on} · {step.operational_status ?? "Unknown operational state"}</small></li>)}</ol></>}</div>}
          {!result && <p className="pathway-inline-status">Indoor-only navigation will not quietly switch to outdoor walking. Unverified destinations return no route.</p>}
          {pinMessage && <p role="status" className="pathway-inline-status">{pinMessage}</p>}
          {loadError && <p className="pathway-inline-error" role="alert">{loadError}</p>}
          </>}
        </form>}
      </div>
      {!mobileOpen && <button type="button" className="pathway-panel-reopen" onClick={()=>setMobileOpen(true)} aria-label="Open search and directions panel"><Compass size={18}/> Search and directions</button>}
      <div className="pathway-map-footer"><CheckCircle2 size={14}/><span>Accuracy first: unverified PATH corridors, floor levels and retail units never appear as navigable data.</span></div>
    </div>
  </section>;
}
