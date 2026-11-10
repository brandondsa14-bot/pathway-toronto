"use client";
import {useEffect,useState} from "react";

type DemoRoute = {nodes:string[];labels:string[];connection_count:number;total_cost:number;cost_unit:string;status:string;disclaimer:string};
type Entrance = {id:string;building_id:string;label:string;description:string;source_id:string;verification:string;coordinate:null};
type EntranceResponse = {entrances:Entrance[];sources:{id:string;url:string;publisher:string}[];verified_corridor_edges:unknown[]};
const API_BASE = process.env.NEXT_PUBLIC_PATHWAY_API_BASE_URL || "http://localhost:8000";

export default function RoutingLab({start,end}:{start:string;end:string}) {
  const [data,setData]=useState<DemoRoute|null>(null);
  const [error,setError]=useState("");
  const [access,setAccess]=useState(false);
  const [noFloors,setNoFloors]=useState(false);
  const [entrances,setEntrances]=useState<EntranceResponse|null>(null);
  const [apiState,setApiState]=useState("Checking routing API…");
  const [loading,setLoading]=useState(false);
  useEffect(()=>{
    let active=true;
    fetch(`${API_BASE}/api/v1/entrances`).then(async response=>{
      if(!response.ok)throw new Error("API request failed");
      const results=await response.json() as EntranceResponse;
      if(active){setEntrances(results);setApiState("Connected to FastAPI");}
    }).catch(()=>{if(active)setApiState("Backend offline — start uvicorn on port 8000");});
    return ()=>{active=false};
  },[]);
  useEffect(()=>{setData(null);setError("")},[start,end,access,noFloors]);
  async function calculate(){
    setLoading(true);setError("");setData(null);
    const params=new URLSearchParams({start,end,mode:"demo",accessible:String(access),avoid_floor_changes:String(noFloors)});
    try{
      const response=await fetch(`${API_BASE}/api/v1/route?${params.toString()}`);
      const value=await response.json();
      if(!response.ok)throw new Error(typeof value.detail==="string"?value.detail:"Route request failed");
      setData(value as DemoRoute);
    }catch(e){setError(e instanceof Error?e.message:"Unable to load route")}
    finally{setLoading(false)}
  }
  const relevant=entrances?.entrances.filter(e=>e.building_id===end)||[];
  return <section className="routinglab" aria-labelledby="routinglab-title">
    <div className="routinglab-header"><h3 id="routinglab-title">A* routing lab</h3><span className="routinglab-tag">DEMO ONLY</span></div>
    <p className="routinglab-state" role="status">{apiState}</p>
    <p>Test the weighted graph algorithm using synthetic nodes and costs. This does <strong>not</strong> provide real PATH directions.</p>
    <label className="routinglab-option"><input type="checkbox" checked={access} onChange={e=>setAccess(e.target.checked)}/> Exclude edges not marked accessible in demo</label>
    <label className="routinglab-option"><input type="checkbox" checked={noFloors} onChange={e=>setNoFloors(e.target.checked)}/> Avoid demo floor changes</label>
    <button type="button" className="routinglab-button" disabled={loading} onClick={calculate}>{loading?"Computing…":"Calculate synthetic A* route"}</button>
    {error&&<p role="alert" className="routinglab-error">{error}</p>}
    {data&&<div role="status" className="routinglab-result"><strong>{data.labels.join(" → ")}</strong><span>{data.connection_count} edges · {data.total_cost} synthetic cost units</span><small>Not metres or walking time. Do not use to navigate.</small></div>}
    <div className="routinglab-entrances"><h4>Source-described PATH access</h4>
      {relevant.length?relevant.map(e=><div key={e.id} className="routinglab-entrance"><strong>{e.label}</strong><p>{e.description}</p><span>No surveyed entrance coordinates or verified route</span></div>):<p>No source-described entrance registered for this selected location.</p>}
      {relevant.length>0 && <a target="_blank" rel="noopener noreferrer" href="https://www.ttc.ca/subway-stations/Union-station">TTC Union Station source ↗</a>}
    </div>
  </section>;
}
