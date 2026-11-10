"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import GoogleStreetMap from "./GoogleStreetMap";
import RoutePlanner, { type DemoRoute } from "./RoutePlanner";
import { outdoorLocationById } from "./outdoorLocations";
import { Search, MapPin, Navigation, Layers, ChevronRight, ExternalLink, Info, Building2, Route, Coffee, Compass, Box } from "lucide-react";
const IndoorExplorer = dynamic(() => import("./three-d/IndoorExplorer"), { ssr: false });

type Place = { id: string; name: string; type: string; x: number; y: number; description: string; url?: string; verified: boolean };
const places: Place[] = [
  {id:"union",name:"Union Station",type:"Transit",x:320,y:425,description:"Major Toronto transit hub. Schematic marker, not an indoor entrance location.",verified:false},
  {id:"rbp",name:"Royal Bank Plaza",type:"Building",x:344,y:335,description:"PATH-connected commercial complex. Precise interior positions require survey verification.",verified:false},
  {id:"brookfield",name:"Brookfield Place",type:"Building",x:468,y:344,description:"PATH-connected complex; diagram positions are illustrative.",verified:false},
  {id:"td",name:"Toronto-Dominion Centre",type:"Building",x:290,y:240,description:"Financial District commercial complex. Diagram positions are illustrative.",verified:false},
  {id:"commerce",name:"Commerce Court",type:"Building",x:495,y:233,description:"Financial District commercial complex. Diagram positions are illustrative.",verified:false},
  {id:"mos",name:"Mos Mos Coffee",type:"Coffee & cafés",x:385,y:320,description:"Royal Bank Plaza directory lists Mos Mos in the lower concourse, north of the food court. The marker position is NOT surveyed.",url:"https://royalbankplaza.com/food-and-drinks",verified:true},
];
// Illustrative line segments are matched to the synthetic server graph, never to surveyed PATH corridors.
const lines = [{a:"union",b:"rbp"},{a:"rbp",b:"td"},{a:"rbp",b:"brookfield"},{a:"brookfield",b:"commerce"},{a:"rbp",b:"mos"},{a:"td",b:"commerce"}];

export default function Home() {
  const [query,setQuery] = useState("");
  const [selected,setSelected] = useState("rbp");
  const [origin,setOrigin] = useState("union");
  const [activeRoute,setActiveRoute] = useState<DemoRoute|null>(null);
  const [layer,setLayer] = useState<"path"|"street"|"three">("path");
  const [filter,setFilter] = useState("All");
  const [zoom,setZoom] = useState(1);
  const [mobilePanel,setMobilePanel] = useState<"explore"|"map"|"details">("map");

  const place = places.find(p => p.id===selected)!;
  const outdoorPlace = outdoorLocationById[selected];
  const filtered = useMemo(() => places.filter(p => (filter === "All" || p.type === filter) && `${p.name} ${p.type}`.toLowerCase().includes(query.toLowerCase())),[query,filter]);
  const routeEdges = new Set<string>();
  if (activeRoute) for (let i=0;i<activeRoute.nodes.length-1;i++) routeEdges.add([activeRoute.nodes[i],activeRoute.nodes[i+1]].sort().join("/"));
  function selectPlace(id:string) {setSelected(id);setActiveRoute(null);setMobilePanel("details");}
  function updateOrigin(id:string) {setOrigin(id);setActiveRoute(null);}

  return <main className={`shell mobile-${mobilePanel}`}>
    <nav className="mobiletabs" aria-label="Mobile sections">
      {(["explore","map","details"] as const).map(tab => <button key={tab} className={mobilePanel===tab?"active":""} onClick={()=>setMobilePanel(tab)}>{tab[0].toUpperCase()+tab.slice(1)}</button>)}
    </nav>
    <aside className="sidebar">
      <div className="identity"><div className="brandmark">P<span>↗</span></div><div><strong>PATHway<span className="accent">.</span></strong><small>TORONTO EXPLORER</small></div></div>
      <div className="sidebarbody"><div className="eyebrow">DISCOVER DOWNTOWN</div><h1>Explore the city <em>beneath</em> the city.</h1><p className="intro">Find PATH-connected landmarks and discover downtown destinations.</p>
        <label className="search"><Search size={18}/><input aria-label="Search places" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search buildings, cafés..."/></label>
        <div className="filterrow">{["All","Building","Transit","Coffee & cafés"].map(f=><button key={f} className={filter===f?"chip active":"chip"} onClick={()=>setFilter(f)}>{f}</button>)}</div>
        <div className="sectiontitle"><span>LOCATIONS</span><span>{filtered.length} found</span></div>
        <div className="places">{filtered.map(p=><button key={p.id} className={`place ${p.id===selected?"selected":""}`} onClick={()=>selectPlace(p.id)}><span className="placeicon">{p.type.includes("Coffee")?<Coffee size={19}/>:p.type==="Transit"?<Navigation size={19}/>:<Building2 size={19}/>}</span><span className="placetext"><strong>{p.name}</strong><small>{p.type}</small></span><ChevronRight size={17}/></button>)}{filtered.length===0&&<p className="empty">No places match this search.</p>}</div>
      </div><div className="sidefoot"><Info size={16}/><span>Research prototype · indoor marker coordinates and connections are illustrative, not safe for real-world navigation.</span></div>
    </aside>
    <section className="workspace"><header className="topbar"><span className="crumb">Toronto <ChevronRight size={14}/> Downtown PATH <ChevronRight size={14}/> Explorer</span><div className="topright"><span className="statusdot"/> Day 11 · 3D Foundation <span className="avatar">PT</span></div></header>
      <div className="maparea"><div className="mapheader"><div><div className="eyebrow">DOWNTOWN MAP</div><h2>Financial District <span>↗</span></h2><div className="mapsubtitle"><MapPin size={14}/> Toronto, Ontario</div></div>
        <div className="layers"><button aria-pressed={layer==="street"} onClick={()=>setLayer("street")} className={layer==="street"?"active":""}><Layers size={16}/> Street view</button><button aria-pressed={layer==="path"} onClick={()=>setLayer("path")} className={layer==="path"?"active":""}><Route size={16}/> PATH layer</button><button aria-pressed={layer==="three"} onClick={()=>setLayer("three")} className={layer==="three"?"active":""}><Box size={16}/> 3D demo</button></div>
      </div><div className="mapcanvas">{layer==="street" ? <GoogleStreetMap selectedId={selected} onSelectPlace={selectPlace}/> : layer==="three" ? <IndoorExplorer destinationName={place.name}/> : <>
        <div className="mapgrid"/><div className="street streetone"/><div className="street streettwo"/><div className="street streetthree"/><div className="street streetfour"/><div className="watermark">NOT TO SCALE · DEMONSTRATION GRAPH</div>
        <svg viewBox="0 0 750 570" className="network" aria-label="Illustrative PATH schematic showing synthetic graph routes, not actual walkable corridors" role="img"><g transform={`translate(375 285) scale(${zoom}) translate(-375 -285)`}>
          <g className="blocks"><rect x="230" y="172" width="125" height="110" rx="7"/><rect x="430" y="165" width="130" height="115" rx="7"/><rect x="275" y="295" width="125" height="92" rx="7"/><rect x="425" y="300" width="120" height="90" rx="7"/><rect x="248" y="398" width="155" height="67" rx="7"/></g>
          <g className="roadlabels"><text x="75" y="167">KING ST W</text><text x="85" y="290">WELLINGTON ST W</text><text x="70" y="410">FRONT ST W</text><text x="190" y="515" transform="rotate(-90 190 515)">YORK ST</text><text x="608" y="494" transform="rotate(-90 608 494)">YONGE ST</text></g>
          {lines.map(edge=>{const a=places.find(p=>p.id===edge.a)!;const b=places.find(p=>p.id===edge.b)!;const highlighted=routeEdges.has([edge.a,edge.b].sort().join("/"));return <line key={`${edge.a}-${edge.b}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={highlighted?"pathline route":"pathline"}/>;})}
          {places.map(p=><g key={p.id} onClick={()=>selectPlace(p.id)} className="mapmarker" role="button" tabIndex={0} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();selectPlace(p.id);}}}><circle cx={p.x} cy={p.y} r={selected===p.id?16:12} className={selected===p.id?"marker selectedmarker":"marker"}/><circle cx={p.x} cy={p.y} r="4" fill="white"/><text x={p.x} y={p.y-23} textAnchor="middle" className="markerlabel">{p.name}</text></g>)}
        </g></svg>
        <div className="mapcontrols"><button aria-label="Zoom in" onClick={()=>setZoom(z=>Math.min(1.7,z+.15))}>+</button><button aria-label="Zoom out" onClick={()=>setZoom(z=>Math.max(.75,z-.15))}>−</button><button aria-label="Reset zoom" onClick={()=>setZoom(1)}><Compass size={18}/></button></div>
        <div className="legend"><span className="legendline"/> Synthetic connection <span className="legenddot"/> Destination</div>
        {activeRoute && <div className="route-map-pill" role="status">Highlighted: {activeRoute.connection_count} synthetic connections · Not actual PATH directions</div>}
      </>}</div></div></section>
    <aside className="details"><div className="detailtop"><div className="eyebrow">LOCATION DETAILS</div><span className="smallpill">DEMO</span></div><div className="detailphoto"><div className="buildingvisual"><div className="buildingbar"/><div className="buildingbar small"/><div className="buildingbar"/></div><span>FINANCIAL DISTRICT / TORONTO</span></div>
      <div className="detailcontent"><div className="type"><MapPin size={14}/> {place.type}</div><h2>{place.name}</h2><p>{place.description}</p>
        {outdoorPlace&&<><div className="fact"><span>Official address</span><strong>{outdoorPlace.address}</strong></div><a className="outdoor-source" href={outdoorPlace.sourceUrl} target="_blank" rel="noopener noreferrer">View address source <ExternalLink size={13}/></a><div className="fact"><span>Outdoor map marker</span><strong>Approximate building position, not a PATH entrance</strong></div></>}
        <div className="fact"><span>Location data</span><strong>{place.verified?"Business listed in official directory":"Illustrative marker"}</strong></div><div className="fact"><span>Exact interior geometry</span><strong>Not yet verified</strong></div>
        <RoutePlanner locations={places} origin={origin} destination={selected} onOriginChange={updateOrigin} onRouteChange={setActiveRoute}/>
        {place.url&&<a className="external" href={place.url} target="_blank" rel="noopener noreferrer">View official building directory <ExternalLink size={16}/></a>}
        <div className="notice"><Info size={16}/><span>Verified indoor route geometry and a spatially accurate 3D reconstruction are not yet available. Do not use this demonstration for navigation.</span></div>
      </div>
    </aside>
  </main>;
}
