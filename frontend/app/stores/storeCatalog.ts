/** Source-backed tenant records; store coordinates and walking directions are NOT verified. */
export type StoreCategory = "Coffee & cafés" | "Fast food";
export type VerifiedStore = {
  id: string;
  name: string;
  category: StoreCategory;
  buildingId: "rbp";
  buildingName: string;
  concourse: string;
  hoursNote: string;
  sourceUrl: string;
  websiteUrl: string;
  verifiedOn: string;
  locationVerified: false;
  menuUrl?: string;
  orderUrl?: string;
};

export const VERIFIED_STORES: VerifiedStore[] = [
  {
    id: "mos-rbp", name: "Mos Mos Coffee", category: "Coffee & cafés", buildingId: "rbp",
    buildingName: "Royal Bank Plaza", concourse: "Lower concourse, north of food court (directory description)",
    hoursNote: "Weekdays 7 AM–5 PM; weekends closed (directory listing; check before visiting)",
    sourceUrl: "https://royalbankplaza.com/shop/mos-mos-coffee",
    websiteUrl: "https://www.mosmoscoffee.com/", verifiedOn: "2026-11-16", locationVerified: false
  },
  {
    id: "tim-rbp", name: "Tim Hortons", category: "Coffee & cafés", buildingId: "rbp",
    buildingName: "Royal Bank Plaza", concourse: "200 Bay Street, lower concourse (directory description)",
    hoursNote: "Weekdays 6 AM–5:30 PM; weekends closed (directory listing; check before visiting)",
    sourceUrl: "https://royalbankplaza.com/shop/tim-hortons",
    websiteUrl: "https://www.timhortons.ca/", verifiedOn: "2026-11-16", locationVerified: false
  },
  {
    id: "starbucks-rbp", name: "Starbucks", category: "Coffee & cafés", buildingId: "rbp",
    buildingName: "Royal Bank Plaza", concourse: "Listed in building retail directory; precise unit unverified",
    hoursNote: "Hours listed on the building directory; confirm before visiting",
    sourceUrl: "https://royalbankplaza.com/shop/starbucks",
    websiteUrl: "https://www.starbucks.ca/", verifiedOn: "2026-11-16", locationVerified: false
  },
  {
    id: "wendys-rbp", name: "Wendy’s", category: "Fast food", buildingId: "rbp",
    buildingName: "Royal Bank Plaza", concourse: "Listed in building retail directory; precise unit unverified",
    hoursNote: "Weekdays 6:30 AM–4 PM; weekends closed (directory listing; check before visiting)",
    sourceUrl: "https://royalbankplaza.com/shop/wendys",
    websiteUrl: "https://www.wendys.com/en-ca", verifiedOn: "2026-11-16", locationVerified: false
  },
];

export function findStore(id: string | null): VerifiedStore | undefined {
  return VERIFIED_STORES.find(store => store.id === id);
}
