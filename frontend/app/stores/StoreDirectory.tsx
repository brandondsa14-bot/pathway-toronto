"use client";

import { useMemo, useState } from "react";
import { VERIFIED_STORES, findStore } from "./storeCatalog";
import StoreActions from "./StoreActions";

type Props = { selectedStoreId: string | null; onSelectStore: (id: string) => void };

export default function StoreDirectory({ selectedStoreId, onSelectStore }: Props) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const filtered = useMemo(() => VERIFIED_STORES.filter(store =>
    (category === "All" || store.category === category) &&
    `${store.name} ${store.category} ${store.concourse}`.toLowerCase().includes(search.trim().toLowerCase())
  ), [search, category]);
  const selectedStore = findStore(selectedStoreId);
  return <section className="store-directory" aria-label="Source-backed Royal Bank Plaza tenant directory">
    <div className="store-heading"><h3>Discover PATH businesses</h3><small>{VERIFIED_STORES.length} directory listings</small></div>
    <p>Royal Bank Plaza tenants from an official building directory, checked 2026-11-16. No storefront entrance is spatially verified.</p>
    <label className="store-search">Search businesses
      <input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Coffee, Tim Hortons, Wendy’s..." />
    </label>
    <div className="store-filters" role="group" aria-label="Business categories">
      {["All", "Coffee & cafés", "Fast food"].map(c => <button key={c} type="button" aria-pressed={category === c} onClick={() => setCategory(c)}>{c}</button>)}
    </div>
    <div className="store-results">
      {filtered.map(store => <button className="store-result" type="button" key={store.id} aria-pressed={selectedStoreId === store.id}
        onClick={() => onSelectStore(store.id)}>
        <strong>{store.name}</strong><small>{store.category} · {store.buildingName}</small>
      </button>)}
      {filtered.length === 0 && <p>No matching directory records.</p>}
    </div>
    {selectedStore && <div className="store-summary" role="status">
      <strong>{selectedStore.name}</strong><span>{selectedStore.concourse}</span>
      <small>{selectedStore.hoursNote}</small>
      <small>Directory checked: {selectedStore.verifiedOn}</small>
      <StoreActions store={selectedStore} />
      <small>Links go to official brand websites; menu availability may vary by location. No live storefront position or ordering integration is claimed.</small>
    </div>}
  </section>;
}
