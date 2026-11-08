"use client";

import { useEffect, useRef, useState } from "react";

// Only the minimal Google Maps surface needed here; no new npm dependency required.
type MapInstance = { setCenter: (point: {lat:number; lng:number}) => void };
type GoogleWindow = Window & { google?: {maps?: {Map: new (element: HTMLElement, options: Record<string, unknown>) => MapInstance}} };
const CENTER = {lat:43.6475, lng:-79.3808}; // Approximate public downtown view; NOT an indoor entrance.
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export default function GoogleStreetMap() {
  const container = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading"|"ready"|"error">("loading");

  useEffect(() => {
    if (!API_KEY) return;
    let cancelled = false;
    const w = window as GoogleWindow;
    const render = () => {
      if (cancelled || !container.current || !w.google?.maps?.Map) return;
      new w.google.maps.Map(container.current, {
        center: CENTER, zoom: 15, mapTypeControl: true, streetViewControl: true,
        fullscreenControl: true, gestureHandling: "greedy"
      });
      setStatus("ready");
    };
    if (w.google?.maps?.Map) { render(); return () => {cancelled = true;}; }
    // Load once. A uniquely named callback ensures Map is available before initialization.
    const callback = "__pathwayGoogleMapsReady";
    const host = window as unknown as Record<string, unknown>;
    host[callback] = render;
    const existing = document.querySelector<HTMLScriptElement>('script[data-pathway-google-maps]');
    if (!existing) {
      const script = document.createElement("script");
      script.dataset.pathwayGoogleMaps = "true";
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(API_KEY)}&loading=async&callback=${callback}&v=weekly`;
      script.async = true;
      script.onerror = () => { if (!cancelled) setStatus("error"); };
      document.head.appendChild(script);
    } else {
      // On remount, the global callback above now refers to this active instance.
      // This avoids a stale callback if the user toggles tabs during loading.
      if (w.google?.maps?.Map) render();
      existing.addEventListener("error", () => { if (!cancelled) setStatus("error"); }, {once:true});
    }
    const timeout = window.setTimeout(() => { if (!cancelled && !w.google?.maps?.Map) setStatus("error"); }, 15000);
    return () => {cancelled = true;window.clearTimeout(timeout);};
  }, []);

  if (!API_KEY) {
    return <div className="googlemap-fallback" role="status"><strong>Google Maps API key not configured</strong><p>The working Day 2 schematic is still available under <b>PATH layer</b>. To enable this real outdoor map, add <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to <code>frontend/.env.local</code> and restart the development server.</p><small>No Google Maps API request was made.</small></div>;
  }
  return <div className="googlemap-container"><div ref={container} className="googlemap-surface" aria-label="Google Maps street-level map of downtown Toronto" />{status!=="ready" && <div className="googlemap-loading" role="status">{status==="error" ? "Google Maps could not load. Check the API key, billing or demo-key eligibility, allowed referrers, and your browser console." : "Loading Google Maps…"}</div>}<div className="googlemap-disclaimer">Outdoor Google map · no indoor PATH routes or store positions are shown</div></div>;
}
