from __future__ import annotations
import json
from pathlib import Path
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from .routing import astar
from .runtime_config import allowed_origins, is_production

DATA_DIR = Path(__file__).resolve().parents[2] / 'data' / 'geographic'
DEMO = json.loads((DATA_DIR / 'demo_graph.json').read_text(encoding='utf8'))
VERIFIED = json.loads((DATA_DIR / 'verified_entrances.json').read_text(encoding='utf8'))
app = FastAPI(title='PATHway Toronto API',version='0.5.0',description='Evidence-gated PATH navigation research API. Live routes are unavailable without reviewed geometry.',
                  docs_url=None if is_production() else '/docs', redoc_url=None if is_production() else '/redoc',
                  openapi_url=None if is_production() else '/openapi.json')
app.add_middleware(CORSMiddleware,allow_origins=allowed_origins(),allow_credentials=False,allow_methods=['GET'],allow_headers=['Accept','Content-Type'])

@app.middleware('http')
async def response_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    response.headers['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=()'
    response.headers['Cache-Control'] = 'no-store'
    return response

class RouteSegment(BaseModel):
    start: str
    end: str
    kind: str
    synthetic_cost: float
    accessible_in_demo: bool
    floor_change: bool

class RouteResponse(BaseModel):
    nodes:list[str]
    labels:list[str]
    connection_count:int
    total_cost:float | None = None
    cost_unit:str | None = None
    status:str
    mode:str
    disclaimer:str
    segments:list[RouteSegment] = []
    floor_change_count:int = 0
    accessible_filter:bool = False
    avoid_floor_changes_filter:bool = False

@app.get('/health')
def health():
    from .indoor_network import load_network
    return {'status': 'ok', 'project': 'PATHway Toronto',
            'data_mode': 'research-only; v1 synthetic; v2 evidence-gated',
            'verified_indoor_edges': len(load_network()['edges'])}

@app.get('/api/v1/network')
def network(mode: str=Query('verified',pattern='^(verified|demo)$')):
    if mode=='demo':return DEMO
    return VERIFIED

@app.get('/api/v1/entrances')
def entrances():return {'entrances':VERIFIED['entrances'],'sources':VERIFIED['sources'],'verified_corridor_edges':[],'status':'SOURCE_DESCRIPTIONS_ONLY'}

@app.get('/api/v1/route', response_model=RouteResponse)
def route_v1(start:str,end:str, mode:str=Query('verified',pattern='^(verified|demo)$'),accessible:bool=False,avoid_floor_changes:bool=False):
    if mode=='verified':
        raise HTTPException(status_code=422,detail='Verified indoor corridor graph is not available. No real-world route can be calculated.')
    ids={n['id'] for n in DEMO['nodes']}
    if start not in ids or end not in ids:
        raise HTTPException(status_code=404,detail='Unknown demonstration node')
    path=astar(DEMO['nodes'],DEMO['edges'],start,end,accessible,avoid_floor_changes)
    if not path:raise HTTPException(status_code=404,detail='No connection in the synthetic graph with these restrictions')
    labels={n['id']:n['label'] for n in DEMO['nodes']}
    # Build descriptions from the traversed edges. No invented lengths or accessible guarantees.
    edge_lookup={frozenset((edge['from'],edge['to'])):edge for edge in DEMO['edges']}
    segments=[]
    for index in range(len(path.nodes)-1):
        a,b=path.nodes[index:index+2]
        edge=edge_lookup[frozenset((a,b))]
        segments.append(RouteSegment(start=a,end=b,kind=edge['kind'],synthetic_cost=edge['cost'],accessible_in_demo=edge.get('accessible',False),floor_change=edge.get('floor_change',False)))
    return RouteResponse(nodes=path.nodes,labels=[labels[x] for x in path.nodes],connection_count=path.edge_count,total_cost=path.total_cost,cost_unit='synthetic_units',status='ILLUSTRATIVE_ONLY',mode='demo',disclaimer='NOT FOR NAVIGATION. Demo topology and accessibility labels are fabricated to test the algorithm.',segments=segments,floor_change_count=sum(int(s.floor_change) for s in segments),accessible_filter=accessible,avoid_floor_changes_filter=avoid_floor_changes)

# Legacy endpoints: retained for compatibility with the Day 1 prototype.
@app.get('/api/places')
def places():return {'places':[{'id':n['id'],'name':n['label'],'position_verification':'NOT_VERIFIED'} for n in DEMO['nodes']],'status':'ILLUSTRATIVE_ONLY'}

@app.get('/api/route',response_model=RouteResponse)
def legacy_route(start:str,end:str):return route_v1(start,end,'demo')

# Day 21: evidence-gated indoor-only routes. Keep /api/v1/route as a separate,
# explicitly synthetic demonstration; never merge it into verified navigation.
from .indoor_api import router as indoor_router
app.include_router(indoor_router)
