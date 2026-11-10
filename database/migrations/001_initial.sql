-- Day 5 schema baseline. Indoor edges are never auto-generated from building proximity.
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE TABLE IF NOT EXISTS geographic_sources (
 id TEXT PRIMARY KEY, publisher TEXT NOT NULL, title TEXT NOT NULL,
 source_url TEXT NOT NULL CHECK (source_url ~ '^https://'), accessed_on DATE NOT NULL
);
CREATE TABLE IF NOT EXISTS buildings (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL,
 outdoor_point GEOGRAPHY(POINT,4326), outdoor_accuracy TEXT NOT NULL DEFAULT 'UNKNOWN',
 CHECK (outdoor_accuracy IN ('UNKNOWN','APPROXIMATE','SURVEYED'))
);
CREATE TABLE IF NOT EXISTS floors (
 id TEXT PRIMARY KEY, building_id TEXT NOT NULL REFERENCES buildings(id),
 level_label TEXT NOT NULL, UNIQUE(building_id,level_label)
);
CREATE TABLE IF NOT EXISTS entrances (
 id TEXT PRIMARY KEY, building_id TEXT NOT NULL REFERENCES buildings(id),
 label TEXT NOT NULL, source_description TEXT NOT NULL, source_id TEXT NOT NULL REFERENCES geographic_sources(id),
 verification_status TEXT NOT NULL CHECK (verification_status IN ('SOURCE_DESCRIBED','SURVEYED','RETIRED')),
 interior_position GEOGRAPHY(POINT,4326), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS corridor_nodes (
 id TEXT PRIMARY KEY, building_id TEXT REFERENCES buildings(id), floor_id TEXT REFERENCES floors(id),
 label TEXT NOT NULL, source_id TEXT REFERENCES geographic_sources(id),
 verification_status TEXT NOT NULL CHECK (verification_status IN ('VERIFIED','DEMO','PENDING')),
 interior_position GEOMETRY(POINT, 3857)
);
CREATE TABLE IF NOT EXISTS corridor_edges (
 id BIGSERIAL PRIMARY KEY, from_node TEXT NOT NULL REFERENCES corridor_nodes(id),
 to_node TEXT NOT NULL REFERENCES corridor_nodes(id), length_metres NUMERIC(10,2),
 accessible BOOLEAN, floor_change BOOLEAN NOT NULL DEFAULT FALSE,
 connection_type TEXT NOT NULL, source_id TEXT REFERENCES geographic_sources(id),
 verification_status TEXT NOT NULL CHECK (verification_status IN ('VERIFIED','DEMO','PENDING')),
 CHECK (from_node <> to_node), CHECK (length_metres IS NULL OR length_metres > 0),
 CHECK (verification_status <> 'VERIFIED' OR (source_id IS NOT NULL AND length_metres IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS ix_buildings_outdoor ON buildings USING GIST(outdoor_point);
CREATE INDEX IF NOT EXISTS ix_entrances_building ON entrances(building_id);
CREATE INDEX IF NOT EXISTS ix_edges_from ON corridor_edges(from_node);
CREATE INDEX IF NOT EXISTS ix_edges_to ON corridor_edges(to_node);
-- No fabricated corridor rows inserted in this migration.
