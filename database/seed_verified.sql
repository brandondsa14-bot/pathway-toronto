-- Only source-backed entrance descriptions. No invented coordinates, measured edges, or times.
INSERT INTO geographic_sources(id,publisher,title,source_url,accessed_on)
VALUES ('ttc-union','Toronto Transit Commission','Union Station – entrances and Bay Street PATH','https://www.ttc.ca/subway-stations/Union-station','2026-11-09')
ON CONFLICT(id) DO NOTHING;
INSERT INTO buildings(id,name,category) VALUES
 ('union','Union Station','transit'),('rbp','Royal Bank Plaza','building'),
 ('brookfield','Brookfield Place','building'),('td','Toronto-Dominion Centre','building'),('commerce','Commerce Court','building')
ON CONFLICT(id) DO NOTHING;
INSERT INTO entrances(id,building_id,label,source_description,source_id,verification_status) VALUES
 ('rbp_bay','rbp','200 Bay Street PATH access','Bay St west side north of Front St W. See TTC source.','ttc-union','SOURCE_DESCRIBED'),
 ('brookfield_bay','brookfield','181 Bay Street PATH access','Bay St east side north of Front St W. See TTC source.','ttc-union','SOURCE_DESCRIBED'),
 ('union_moat','union','Union Station Moat Entrance','TTC describes accessible Moat Entrance.','ttc-union','SOURCE_DESCRIBED'),
 ('union_front_bay','union','Front & Bay Entrance','TTC describes a sidewalk staircase leading to concourse.','ttc-union','SOURCE_DESCRIBED')
ON CONFLICT(id) DO NOTHING;
