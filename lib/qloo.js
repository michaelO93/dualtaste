// Qloo client — fixture graph by default, live hackathon API when QLOO_API_KEY is set.
// Both modes return the same normalized shape so the agent never needs to know which it hit.

import { searchFixture, insightsFixture } from "../fixtures/graph";

const BASE_URL = process.env.QLOO_BASE_URL || "https://hackathon.api.qloo.com";

export const TYPE_URNS = {
  place: "urn:entity:place",
  artist: "urn:entity:artist",
  movie: "urn:entity:movie",
};

export const qlooMode = () => (process.env.QLOO_API_KEY ? "live" : "fixture");

async function qlooGet(path, params) {
  const url = new URL(path, BASE_URL);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "" || (Array.isArray(value) && !value.length)) continue;
    url.searchParams.set(key, Array.isArray(value) ? value.join(",") : String(value));
  }
  const res = await fetch(url, { headers: { "X-Api-Key": process.env.QLOO_API_KEY }, cache: "no-store" });
  if (!res.ok) throw new Error(`Qloo ${path} returned ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

function normalizeEntity(e) {
  return {
    entity_id: e.entity_id,
    name: e.name,
    type: e.types?.[0] ?? e.type ?? e.subtype ?? null,
    affinity: e.query?.affinity ?? e.affinity ?? null,
    popularity: e.popularity ?? null,
    tags: (e.tags ?? []).slice(0, 12).map(t => ({ id: t.tag_id ?? t.id, name: t.name })),
    location: e.properties?.address ?? e.location ?? null,
  };
}

// Resolve free text to entities and tags. Food and genre seeds usually land on tags.
export async function search({ query, types }) {
  if (qlooMode() === "fixture") return searchFixture({ query, types });

  const typeUrns = (types?.length ? types : Object.keys(TYPE_URNS)).map(t => TYPE_URNS[t]).filter(Boolean);
  const [entities, tags] = await Promise.all([
    qlooGet("/search", { query, types: typeUrns, take: 5 }),
    qlooGet("/v2/tags", { "filter.query": query, take: 5 }).catch(() => null),
  ]);
  return {
    entities: (entities.results ?? []).map(normalizeEntity),
    tags: (tags?.results?.tags ?? []).map(t => ({ id: t.id ?? t.tag_id, name: t.name })),
  };
}

// Cross-domain recommendations of `type`, driven by seed entities/tags.
// Places are filtered to the city; music and film use the city as an audience signal.
export async function insights({ entityIds = [], tagIds = [], type, city, take = 8 }) {
  if (qlooMode() === "fixture") return insightsFixture({ entityIds, tagIds, type, city, take });

  const data = await qlooGet("/v2/insights", {
    "filter.type": TYPE_URNS[type],
    "signal.interests.entities": entityIds,
    "signal.interests.tags": tagIds,
    "filter.location.query": type === "place" ? city : undefined,
    "signal.location.query": type === "place" ? undefined : city,
    take,
  });
  return { entities: (data.results?.entities ?? []).map(normalizeEntity) };
}
