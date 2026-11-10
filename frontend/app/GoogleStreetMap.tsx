"use client";

import { useEffect, useRef, useState } from "react";
import { outdoorLocations, outdoorLocationById } from "./outdoorLocations";

type Point = { lat: number; lng: number };
type MapInstance = { panTo: (point: Point) => void };
type MapMarker = { addListener: (eventName: string, listener: () => void) => {remove: () => void}; setMap: (map: MapInstance | null) => void };
type GoogleMapsAPI = {
  Map: new (element: HTMLElement, options: Record<string, unknown>) => MapInstance;
  Marker: new (options: Record<string, unknown>) => MapMarker;
};
type GoogleWindow = Window & { google?: { maps?: GoogleMapsAPI } };

const CENTER = {lat:43.6475, lng:-79.3801};
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

type Props = { selectedId: string; onSelectPlace: (id: string) => void };

export default function GoogleStreetMap({selectedId, onSelectPlace}: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapInstance | null>(null);
  const selectRef = useRef(onSelectPlace);
  const [status, setStatus] = useState<"loading"|"ready"|"error">("loading");
  selectRef.current = onSelectPlace;

  useEffect(() => {
    if (!API_KEY) return;
    let cancelled = false;
    let markers: MapMarker[] = [];
    let listeners: Array<{remove: () => void}> = [];
    const w = window as GoogleWindow;
    const initialize = () => {
      if (cancelled || !container.current || !w.google?.maps?.Map || !w.google?.maps?.Marker) return;
      const api = w.google.maps;
      const map = new api.Map(container.current, {
        center: CENTER, zoom: 16, mapTypeControl: true,
        streetViewControl: true, fullscreenControl: true,
        gestureHandling: "cooperative"
      });
      mapRef.current = map;
      markers = outdoorLocations.map(place => {
        const marker = new api.Marker({
          map, position: place.position, title: `${place.name} — approximate outdoor building position`,
        });
        listeners.push(marker.addListener("click", () => selectRef.current(place.id)));
        return marker;
      });
      setStatus("ready");
    };

    const callbackName = "__pathwayGoogleMapsReady";
    const globalCallbacks = window as unknown as Record<string, unknown>;
    globalCallbacks[callbackName] = initialize;
    const existing = document.querySelector<HTMLScriptElement>('script[data-pathway-google-maps]');
    if (w.google?.maps?.Map) initialize();
    else if (!existing) {
      const script = document.createElement("script");
      script.dataset.pathwayGoogleMaps = "true";
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(API_KEY)}&loading=async&callback=${callbackName}&v=weekly`;
      script.async = true;
      script.onerror = () => { if (!cancelled) setStatus("error"); };
      document.head.appendChild(script);
    } else {
      // The current mount replaces the callback while the script is loading.
      existing.addEventListener("error", () => { if (!cancelled) setStatus("error"); }, {once:true});
    }
    const timeout = window.setTimeout(() => {
      if (!cancelled && !mapRef.current) setStatus("error");
    }, 15000);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      listeners.forEach(listener => { if (listener && typeof listener.remove === "function") listener.remove(); });
      markers.forEach(marker => marker.setMap(null));
      markers = []; listeners = [];
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const location = outdoorLocationById[selectedId];
    if (location && mapRef.current) mapRef.current.panTo(location.position);
  }, [selectedId, status]);

  if (!API_KEY) return <div className="googlemap-fallback" role="status">
    <strong>Google Maps API key not configured</strong>
    <p>The Day 2 schematic is still available under <b>PATH layer</b>. Add <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to <code>frontend/.env.local</code> and restart the server.</p>
    <small>No Google Maps API request was made.</small>
  </div>;

  return <div className="googlemap-container">
    <div ref={container} className="googlemap-surface" aria-label="Interactive outdoor Google Map of downtown Toronto with approximate building markers" />
    {status !== "ready" && <div className="googlemap-loading" role="status">{status === "error"
      ? "Google Maps could not load. Check API restrictions, billing, and the browser console."
      : "Loading Google Maps…"}</div>}
    <div className="googlemap-disclaimer">Outdoor building markers are approximate · No PATH entrances or indoor routes verified</div>
  </div>;
}
