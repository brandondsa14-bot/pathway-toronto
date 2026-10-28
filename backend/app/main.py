from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from collections import deque

app = FastAPI(title="PATHway Toronto API", version="0.1.0", description="Day 1: explicitly synthetic demonstration routing, NOT verified indoor navigation")
NODES = {"union":"Union Station", "rbp":"Royal Bank Plaza", "brookfield":"Brookfield Place", "td":"Toronto-Dominion Centre", "commerce":"Commerce Court", "mos":"Mos Mos Coffee"}
EDGES = [("union","rbp"),("rbp","brookfield"),("rbp","td"),("brookfield","commerce"),("rbp","mos")]

class RouteResponse(BaseModel):
    nodes:list[str]
    labels:list[str]
    connection_count:int
    status:str="ILLUSTRATIVE_ONLY"

@app.get('/health')
def health():return {"status":"ok","project":"PATHway Toronto","milestone":"day-01"}

@app.get('/api/places')
def places():return {"places":[{"id":k,"name":v,"position_verification":"NOT_VERIFIED"} for k,v in NODES.items()],"status":"ILLUSTRATIVE_ONLY"}

@app.get('/api/route',response_model=RouteResponse)
def route(start:str,end:str):
    if start not in NODES or end not in NODES:raise HTTPException(status_code=404,detail="Unknown demo node")
    graph={n:[] for n in NODES}
    for a,b in EDGES:graph[a].append(b);graph[b].append(a)
    pending=deque([start]);parent={start:None}
    while pending:
        node=pending.popleft()
        if node==end:break
        for dest in graph[node]:
            if dest not in parent:parent[dest]=node;pending.append(dest)
    if end not in parent:raise HTTPException(status_code=404,detail="No demo connection")
    path=[];p=end
    while p is not None:path.append(p);p=parent[p]
    path.reverse()
    return RouteResponse(nodes=path,labels=[NODES[x] for x in path],connection_count=len(path)-1)
