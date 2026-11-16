"use client";

import type { VerifiedStore } from "./storeCatalog";

/** Only deliberate clicks follow external sites; no automatic redirects or hidden links. */
export default function StoreActions({ store }: { store: VerifiedStore }) {
  return <div className="store-actions" aria-label={`Official external links for ${store.name}`}>
    <a href={store.websiteUrl} target="_blank" rel="noopener noreferrer">Visit official website ↗</a>
    {store.menuUrl && <a href={store.menuUrl} target="_blank" rel="noopener noreferrer">View official menu ↗</a>}
    {store.orderUrl && <a href={store.orderUrl} target="_blank" rel="noopener noreferrer">Order online ↗</a>}
    <a href={store.sourceUrl} target="_blank" rel="noopener noreferrer">Verify directory listing ↗</a>
  </div>;
}
