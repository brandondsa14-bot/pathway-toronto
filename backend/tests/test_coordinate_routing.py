"""Isolated licensed-test fixtures. No claims of surveyed Toronto PATH geometry."""
from copy import deepcopy

from fastapi.testclient import TestClient
from app.main import app
from app.indoor_network import validate_network
from app.coordinate_routing import route_between_pins

LON,LAT=-79.3800,43.6460
SOURCE="test-only-survey"


def fixture():
    nodes=[
        {"id":name,"name":name,"kind":"junction","position_status":"VERIFIED_JUNCTION",
         "lon":LON+offset,"lat":LAT,"level":level,"source_ids":[SOURCE]}
        for name,offset,level in [("a",0,-1),("b",0.0001,-1),("c",0.0002,-1)]
    ]
    common={"kind":"corridor","accessible":True,"source_id":SOURCE,"review_status":"VERIFIED",
            "verified_on":"2026-11-16","operational_status":"CONFIRMED_OPEN","direction":"BOTH"}
    edges=[
        {**common,"id":"ab","from":"a","to":"b","length_m":10.0,
         "geometry":[[LON,LAT],[LON+.0001,LAT]]},
        {**common,"id":"bc","from":"b","to":"c","length_m":10.0,
         "geometry":[[LON+.0001,LAT],[LON+.0002,LAT]]},
    ]
    return validate_network({"schema_version":"1.0","nodes":nodes,"edges":edges},
                            {"sources":[{"id":SOURCE,"routable_geometry_provided":True,"redistribution_authorized":True}]})


def go(network,origin=.00002,destination=.00008,**kwargs):
    return route_between_pins(network,start_lon=LON+origin,start_lat=LAT,start_level=-1,
                              end_lon=LON+destination,end_lat=LAT,end_level=-1,**kwargs)


def test_production_rejects_arbitrary_pins_with_zero_survey():
    response=TestClient(app).get("/api/v2/indoor/route/pins",params={
        "start_lon":LON,"start_lat":LAT,"start_level":-1,
        "end_lon":LON+.0001,"end_lat":LAT,"end_level":-1,
    })
    assert response.status_code==200
    assert response.json()["status"]=="DATA_NOT_AVAILABLE"
    assert response.json()["route"] is None


def test_same_corridor_two_points_get_interpolated_distance_and_steps():
    result=go(fixture())
    assert result["status"]=="VERIFIED_SEGMENTS_ROUTE"
    assert 5.9<=result["route"]["distance_m"]<=6.1
    assert len(result["route"]["steps"])==1
    assert result["route"]["steps"][0]["geometry"][0][0] > LON


def test_two_edges_are_connected_and_reverse_route_works():
    forward=go(fixture(),origin=.00003,destination=.00018)
    reverse=go(fixture(),origin=.00018,destination=.00003)
    assert forward["status"]=="VERIFIED_SEGMENTS_ROUTE"
    assert reverse["status"]=="VERIFIED_SEGMENTS_ROUTE"
    assert 14.9<=forward["route"]["distance_m"]<=15.1
    assert forward["route"]["distance_m"]==reverse["route"]["distance_m"]


def test_one_way_reverse_cannot_be_silently_used():
    graph=fixture()
    graph["edges"][0]["direction"]="FORWARD"
    assert go(graph,origin=.00008,destination=.00002)["status"]=="NO_VERIFIED_CONNECTION"


def test_only_confirmed_open_accessible_edges_accept_pins():
    graph=fixture()
    graph["edges"][0]["operational_status"]="UNKNOWN"
    assert go(graph)["status"]=="NO_VERIFIED_WALKING_AREA"
    graph=fixture()
    graph["edges"][0]["accessible"]=None
    assert go(graph,accessible_only=True)["status"]=="NO_VERIFIED_WALKING_AREA"
    graph=fixture()
    graph["edges"][0]["operational_status"]="CONFIRMED_CLOSED"
    assert go(graph)["status"]=="NO_VERIFIED_WALKING_AREA"


def test_off_graph_click_and_wrong_floor_are_rejected():
    assert go(fixture(),origin=.004)["status"]=="NO_VERIFIED_WALKING_AREA"
    result=route_between_pins(fixture(),start_lon=LON,start_lat=LAT,start_level=-2,
                              end_lon=LON+.0001,end_lat=LAT,end_level=-1)
    assert result["route"] is None


def test_exact_endpoint_pin_aliases_real_junction():
    result=go(fixture(),origin=0,destination=.00008)
    assert result["status"]=="VERIFIED_SEGMENTS_ROUTE"
    assert 7.9<=result["route"]["distance_m"]<=8.1


def test_no_fabrication_when_only_source_names_exist():
    graph=fixture()
    graph["edges"]=[]
    assert go(graph)["status"]=="DATA_NOT_AVAILABLE"
