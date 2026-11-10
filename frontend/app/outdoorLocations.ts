/**
 * Day 04 outdoor landmarks. Addresses are sourced from the linked official operator/property pages.
 * Coordinates are APPROXIMATE building-area map markers, not surveyed doorways or PATH entrances.
 * Do not use these coordinates for turn-by-turn walking or accessibility routing.
 */
export type OutdoorLocation = {
  id: string;
  name: string;
  category: 'Building' | 'Transit';
  address: string;
  position: { lat: number; lng: number };
  sourceUrl: string;
};

export const outdoorLocations: OutdoorLocation[] = [
  {id:'union',name:'Union Station',category:'Transit',address:'65 Front Street West, Toronto, ON',position:{lat:43.6455,lng:-79.3807},sourceUrl:'https://torontounion.ca/faqs/'},
  {id:'rbp',name:'Royal Bank Plaza',category:'Building',address:'200 Bay Street, Toronto, ON',position:{lat:43.6468,lng:-79.3801},sourceUrl:'https://royalbankplaza.com/contact-us'},
  {id:'brookfield',name:'Brookfield Place',category:'Building',address:'181 Bay Street, Toronto, ON',position:{lat:43.64725,lng:-79.37835},sourceUrl:'https://www.brookfield.com/contact-us'},
  {id:'td',name:'Toronto-Dominion Centre',category:'Building',address:'66 Wellington Street West, Toronto, ON',position:{lat:43.6476,lng:-79.3814},sourceUrl:'https://www.tdcentre.com/'},
  {id:'commerce',name:'Commerce Court',category:'Building',address:'199 Bay Street, Toronto, ON',position:{lat:43.64835,lng:-79.37945},sourceUrl:'https://www.commercecourt.ca/get-in-touch/'}
];

export const outdoorLocationById = Object.fromEntries(outdoorLocations.map(place => [place.id, place])) as Record<string, OutdoorLocation | undefined>;
