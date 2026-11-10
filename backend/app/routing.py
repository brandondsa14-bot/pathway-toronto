"""A* over an explicit, provenance-gated graph. Demo costs are synthetic units."""
from __future__ import annotations
from dataclasses import dataclass
from heapq import heappush, heappop
from itertools import count
from math import isfinite
from typing import Any

@dataclass(frozen=True)
class Route:
    nodes: list[str]
    total_cost: float
    edge_count: int
    algorithm: str = 'astar'

def astar(nodes: list[dict[str,Any]], edges: list[dict[str,Any]], start: str, end: str, accessible: bool=False, avoid_floor_changes: bool=False) -> Route | None:
    """Dijkstra-admissible A* (zero heuristic); supports restricted edges."""
    node_ids = {n['id'] for n in nodes}
    if start not in node_ids or end not in node_ids:
        raise ValueError('Unknown start or destination')
    if start == end:
        return Route([start],0,0)
    graph: dict[str,list[tuple[str,float]]] = {n:[] for n in node_ids}
    for edge in edges:
        a, b = edge['from'], edge['to']
        if a not in node_ids or b not in node_ids:
            raise ValueError('Graph edge references an unknown node')
        cost=float(edge['cost'])
        if not isfinite(cost) or cost <= 0:
            raise ValueError('Graph edge cost must be finite and positive')
        if accessible and not edge.get('accessible',False):
            continue
        if avoid_floor_changes and edge.get('floor_change',False):
            continue
        graph[a].append((b,cost));graph[b].append((a,cost))
    sequence=count()
    queue=[(0.0,next(sequence),start)]
    dist={start:0.0}; previous={}
    while queue:
        current_cost,_,current=heappop(queue)
        if current_cost > dist[current]:continue
        if current == end:
            path=[end]
            while path[-1]!=start:path.append(previous[path[-1]])
            path.reverse()
            return Route(path, round(current_cost,2), len(path)-1)
        for neighbor,cost in graph[current]:
            proposed=current_cost+cost
            if proposed < dist.get(neighbor,float('inf')):
                dist[neighbor]=proposed;previous[neighbor]=current
                # h=0 guarantees shortest path without unverified geometric heuristics.
                heappush(queue,(proposed,next(sequence),neighbor))
    return None
