/** Browser-only Google Maps Routes Library adapter.
 * These routes are OUTDOOR/STREET WALKING ONLY. Never use this result as PATH evidence.
 * Route information remains on the Google map; no route data is persisted or exported.
 */
export type StreetPoint = {lat: number; lng: number};
export type StreetEndpoint = string | StreetPoint;
export type StreetStep = {
  instruction: string; maneuver: string; distance: string; duration: string;
  path: StreetPoint[];
};
export type StreetWalkingRoute = {
  source: "GOOGLE_STREET_WALKING";
  path: StreetPoint[]; steps: StreetStep[];
  distanceMeters: number | null; durationMillis: number | null;
  warnings: string[];
};

type GCoord = { lat: number | (() => number); lng: number | (() => number) };
type GStep = {instructions?: string; maneuver?: string;
  localizedValues?: {distance?: string; staticDuration?: string}; path?: GCoord[]};
type GRoute = {
  path?: GCoord[]; steps?: GStep[]; legs?: {steps?: GStep[]}[];
  distanceMeters?: number; durationMillis?: number; warnings?: string[];
};
type GRouteClass = {computeRoutes: (request: Record<string, unknown>) => Promise<{routes?: GRoute[]}>};
type GMaps = {importLibrary?: (name: string) => Promise<{Route?: GRouteClass}>};

type GWindow = Window & {google?: {maps?: GMaps}};

function position(value: GCoord): StreetPoint | null {
  const lat = typeof value.lat === "function" ? value.lat() : value.lat;
  const lng = typeof value.lng === "function" ? value.lng() : value.lng;
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return {lat, lng};
}

/** No guesses: only present geometry/instructions actually returned by Google. */
export function parseGoogleWalkingRoute(value: GRoute): StreetWalkingRoute {
  const path = (value.path ?? []).map(position).filter((p): p is StreetPoint => p !== null);
  const steps = (value.legs ?? []).flatMap(leg => leg.steps ?? []).map(step => ({
    instruction: String(step.instructions ?? "Follow the mapped walking segment"),
    maneuver: String(step.maneuver ?? ""),
    distance: String(step.localizedValues?.distance ?? ""),
    duration: String(step.localizedValues?.staticDuration ?? ""),
    path: (step.path ?? []).map(position).filter((p): p is StreetPoint => p !== null),
  }));
  if (path.length < 2) throw new Error("The route provider returned no drawable route geometry.");
  return {
    source: "GOOGLE_STREET_WALKING", path, steps,
    distanceMeters: typeof value.distanceMeters === "number" ? value.distanceMeters : null,
    durationMillis: typeof value.durationMillis === "number" ? value.durationMillis : null,
    warnings: Array.isArray(value.warnings) ? value.warnings : [],
  };
}

export async function computeStreetWalkingRoute(origin: StreetEndpoint, destination: StreetEndpoint): Promise<StreetWalkingRoute> {
  const maps = (window as GWindow).google?.maps;
  if (!maps?.importLibrary) throw new Error("Google Maps is still loading. Open City map and try again.");
  const routes = await maps.importLibrary("routes");
  if (!routes.Route) throw new Error("Google Routes library unavailable. Check Routes API access in Google Cloud.");
  // Routes Library, not legacy DirectionsService. Its route field mask is required.
  const response = await routes.Route.computeRoutes({
    origin, destination, travelMode: "WALKING", routeModifiers: {avoidIndoor: true},
    fields: ["path", "legs", "distanceMeters", "durationMillis", "warnings"],
  });
  if (!response.routes?.length) throw new Error("Google did not return a walkable street route between these points.");
  return parseGoogleWalkingRoute(response.routes[0]);
}

export function googleMapsWalkingLink(origin: StreetEndpoint, destination: StreetEndpoint): string {
  const q = (endpoint: StreetEndpoint) => typeof endpoint === "string" ? endpoint : `${endpoint.lat},${endpoint.lng}`;
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(q(origin))}&destination=${encodeURIComponent(q(destination))}&travelmode=walking`;
}
