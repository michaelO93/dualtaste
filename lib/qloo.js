// Qloo client — fixture graph by default, live hackathon API when QLOO_API_KEY is set.
// Both modes return the same normalized shape so the agent never needs to know which it hit.

import { searchFixture, insightsFixture } from "../fixtures/graph";

const BASE_URL = process.env.QLOO_BASE_URL || "https://hackathon.api.qloo.com";

export const TYPE_URNS = {
  place: "urn:entity:place",
  artist: "urn:entity:artist",
  movie: "urn:entity:movie",
  tv_show: "urn:entity:tv_show",
};

export const qlooMode = () => (process.env.QLOO_API_KEY ? "live" : "fixture");

// The hackathon key is rate-limited: a burst of parallel insights calls returns 429.
// So requests run at most MAX_CONCURRENT at a time, 429s retry with backoff, and
// responses are cached in memory (Qloo allows private server-side caching).
const MAX_CONCURRENT = 3;
const RETRY_DELAYS_MS = [800, 1600, 3200, 6400];
const RESPONSE_TTL_MS = 6 * 60 * 60 * 1000;
const responses = new Map();
let active = 0;
const waiting = [];

async function withSlot(fn) {
  if (active >= MAX_CONCURRENT) await new Promise(resolve => waiting.push(resolve));
  active++;
  try {
    return await fn();
  } finally {
    active--;
    waiting.shift()?.();
  }
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function qlooGet(path, params) {
  const url = new URL(path, BASE_URL);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "" || (Array.isArray(value) && !value.length)) continue;
    url.searchParams.set(key, Array.isArray(value) ? value.join(",") : String(value));
  }
  const cached = responses.get(url.href);
  if (cached && Date.now() - cached.at < RESPONSE_TTL_MS) return cached.data;

  for (let attempt = 0; ; attempt++) {
    const res = await withSlot(() => fetch(url, { headers: { "X-Api-Key": process.env.QLOO_API_KEY }, cache: "no-store" }));
    if (res.status === 429 && attempt < RETRY_DELAYS_MS.length) {
      await sleep(RETRY_DELAYS_MS[attempt]);
      continue;
    }
    if (!res.ok) throw new Error(`Qloo ${path} returned ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();
    if (responses.size >= 500) responses.delete(responses.keys().next().value);
    responses.set(url.href, { at: Date.now(), data });
    return data;
  }
}

// Search returns `types`; insights returns `subtype` (its `type` is just "urn:entity").
// Tags are kept whole (often 40+) so heritage checks see every one.
function normalizeEntity(e) {
  const geo = e.properties?.geocode;
  const area = geo && [geo.name, geo.city].filter((v, i, all) => v && all.indexOf(v) === i).join(", ");
  return {
    entity_id: e.entity_id,
    name: e.name,
    type: e.types?.[0] ?? e.subtype ?? e.type ?? null,
    affinity: e.query?.affinity ?? e.affinity ?? null,
    popularity: e.popularity ?? null,
    tags: (e.tags ?? []).map(t => ({ id: t.tag_id ?? t.id, name: t.name })),
    location: area || e.properties?.address || null,
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
// excludeTagIds drops results carrying those tags (used for "beyond the obvious" picks).
// excludeEntityIds keeps the user's own seeds out of the results.
export async function insights({ entityIds = [], tagIds = [], excludeTagIds = [], excludeEntityIds = [], type, city, take = 8 }) {
  if (qlooMode() === "fixture") return insightsFixture({ entityIds, tagIds, excludeTagIds, type, city, take });

  const data = await qlooGet("/v2/insights", {
    "filter.type": TYPE_URNS[type],
    "signal.interests.entities": entityIds,
    "signal.interests.tags": tagIds,
    "filter.exclude.tags": excludeTagIds,
    "filter.location.query": type === "place" ? city : undefined,
    "signal.location.query": type === "place" ? undefined : city,
    "filter.exclude.entities": excludeEntityIds,
    take,
  });
  return { entities: (data.results?.entities ?? []).map(normalizeEntity) };
}
