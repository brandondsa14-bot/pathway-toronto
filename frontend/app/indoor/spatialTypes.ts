export type ReviewedNode = {
  id: string; name: string; kind: string; level: number;
  lon: number; lat: number; position_status: string; source_ids: string[];
};
export type ReviewedFeature = {
  type: "Feature"; id: string;
  properties: {from: string; to: string; level_from: number; level_to: number;
    kind: string; accessible: boolean | null; operational_status: string;
    source_id: string; verified_on: string};
  geometry: {type: "LineString"; coordinates: number[][]};
};
export type IndoorScene = {
  status: string; coordinate_system: string; floor_elevations_surveyed: boolean;
  levels: number[]; nodes: ReviewedNode[]; features: ReviewedFeature[];
  can_place_pin: boolean; feature_count: number; disclaimer: string;
};
export type IndoorPlace = {
  id: string; name: string; kind: string; level: number | null;
  position_status: string; has_verified_entry: boolean;
};
export type Coverage = {
  status: string; network_id: string; verified_edge_count: number;
  available_levels: number[]; places: IndoorPlace[]; message: string; disclaimer: string;
};
export type RouteStep = {
  from: string; to: string; instruction: string; kind: string;
  length_m: number; floor_from: number; floor_to: number;
  geometry: number[][]; accessible: boolean | null; source_id: string;
  verified_on: string; operational_status?: string; edge_id?: string;
};
export type RouteResult = {
  status: string; message: string;
  route: null | {labels: string[]; nodes: string[]; distance_m: number;
    time_minutes: null; steps: RouteStep[]; floor_changes: number};
};
export type CatalogBusiness = {
  id: string; name: string; category: string; kind: "business";
  building_anchor_id: string; building_name: string;
  level: number | null; lat: number | null; lon: number | null;
  location_status: "BUILDING_LISTED_ONLY"; navigation_ready: false;
  source_ids: string[]; directory_url: string; website_url: string;
  directory_checked_on: string;
};
export type CatalogResponse = {
  status: string; total: number; count: number;
  categories: string[]; destinations: CatalogBusiness[]; disclaimer: string;
};
