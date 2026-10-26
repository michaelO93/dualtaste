// DualTaste agent: Claude plans and calls Qloo tools; every recommendation it returns
// is checked against the Qloo calls it actually made (the "ledger") before it reaches the UI.
// Without ANTHROPIC_API_KEY a deterministic planner runs the same Qloo calls instead.

import Anthropic from "@anthropic-ai/sdk";
import { search, insights, qlooMode } from "./qloo";

const MODEL = "claude-opus-5-5";
const MAX_TURNS = 12;

// UI category -> Qloo entity type
const CATEGORIES = { places: "place", music: "artist", film: "movie" };
const ENTITY_TYPES = Object.values(CATEGORIES);

// Tags that mark a result as Nigerian/African. "Beyond the obvious" picks may carry none of them.
const HERITAGE_TAG = /afro|niger|nolly|lagos|abuja|african|yoruba|igbo|hausa|ghana|highlife|amapiano|alt[eé]\b|jollof|suya|egusi/i;
const isHeritageTag = tag => HERITAGE_TAG.test(tag.name ?? "");

const SYSTEM_PROMPT = `You are DualTaste, an agent that helps Nigerians living abroad find places, music and film in their current city that match the tastes they grew up with.

You have no knowledge of your own worth using here: everything you recommend must come from Qloo's taste graph through your tools.

How to work:
1. Resolve every seed with search_qloo. Artists and films usually resolve to entities; dishes, genres and vibes ("jollof rice", "Nollywood") usually resolve to tags. Run the searches in parallel.
2. Close to home: call get_insights for each type (place, artist, movie) using the resolved entity_ids and tag_ids plus the user's city, with exclude_tag_ids empty. Make follow-up calls if a pass is thin, for example narrowing to food tags for places.
3. Beyond the obvious: call get_insights again for each type with the same signals, but put every heritage tag_id you have seen in exclude_tag_ids (any tag marking something as Nigerian or African: Afrobeats, Afro-fusion, Alté, Amapiano, Highlife, Nollywood, Nigerian or West African cuisine, Lagos, Yoruba, Ghanaian and similar). These results are what people with the user's taste love that the user would never think to search for. This lane is the point of the product, so give it real effort.
Speed matters: the user is waiting. Run steps 2 and 3 together as one batch of six parallel get_insights calls in a single turn (the heritage tag ids are already in your search results), and only make further calls if something came back thin.
4. Finish by calling submit_recommendations exactly once: 3-5 items per close-to-home category, and 3-6 "beyond" items mixing types.

Rules:
- Only recommend entity_ids that appeared in a get_insights result. "beyond" items must come from a call that used exclude_tag_ids. Never invent places, artists or films.
- Never recommend one of the user's own seeds back to them, and never list the same entity twice.
- Each "why" is one sentence under 25 words naming the seed(s) and shared taste signals that connect it. For "beyond" items, name the bridge: the non-heritage signal that links it to the seeds.
- Explanations, the summary and coverage_note describe only what your tool results show (names, tags, locations, affinity). Do not add facts from your own knowledge about the city, venues, artists or films.
- If a category comes back thin, say so plainly in coverage_note rather than padding it.`;

const pickList = {
  type: "array",
  items: {
    type: "object",
    properties: { entity_id: { type: "string" }, why: { type: "string" } },
    required: ["entity_id", "why"],
    additionalProperties: false,
  },
};

const TOOLS = [
  {
    name: "search_qloo",
    description: "Resolve a free-text seed (artist, film, dish, genre, vibe) to Qloo entities and tags. Returns entity_ids with their taste tags (with tag ids), plus matching tags.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "The seed text, e.g. 'Burna Boy' or 'jollof rice'." },
        types: {
          type: "array",
          items: { type: "string", enum: ENTITY_TYPES },
          description: "Entity types to search. Empty array searches all.",
        },
      },
      required: ["query", "types"],
      additionalProperties: false,
    },
  },
  {
    name: "get_insights",
    description: "Get Qloo taste-graph recommendations of one entity type driven by seed entities and/or tags. Places are limited to the city; artists and films use the city as an audience signal. exclude_tag_ids removes any result carrying those tags. Results include affinity scores (0-1) and tags.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        type: { type: "string", enum: ENTITY_TYPES },
        entity_ids: { type: "array", items: { type: "string" } },
        tag_ids: { type: "array", items: { type: "string" } },
        exclude_tag_ids: { type: "array", items: { type: "string" } },
        city: { type: "string" },
        take: { type: "integer", description: "Number of results, 1-15." },
      },
      required: ["type", "entity_ids", "tag_ids", "exclude_tag_ids", "city", "take"],
      additionalProperties: false,
    },
  },
  {
    name: "submit_recommendations",
    description: "Submit the final recommendations. Call exactly once, when done.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        summary: { type: "string", description: "Two sentences on the taste profile you inferred and how it maps to the city." },
        coverage_note: { type: "string", description: "Where Qloo coverage was thin, or an empty string." },
        places: pickList,
        music: pickList,
        film: pickList,
        beyond: pickList,
      },
      required: ["summary", "coverage_note", "places", "music", "film", "beyond"],
      additionalProperties: false,
    },
  },
];

// Compact view of a call for the UI trace (streamed live and returned with the result).
function traceEntry(c) {
  return {
    id: c.id,
    tool: c.tool,
    args: c.args,
    ms: c.ms ?? null,
    pending: c.ms === undefined,
    error: c.error ?? null,
    count: c.result ? (c.result.entities?.length ?? 0) + (c.result.tags?.length ?? 0) : 0,
    top: (c.result?.entities ?? []).slice(0, 3).map(e => e.name).concat((c.result?.tags ?? []).slice(0, 2).map(t => `#${t.name}`)),
  };
}

// Every Qloo call gets an id (Q1, Q2, ...) that the UI shows as evidence.
function createLedger(onEvent) {
  const calls = [];
  return {
    calls,
    reset() {
      calls.length = 0;
      onEvent({ type: "reset" });
    },
    async run(tool, args) {
      const id = `Q${calls.length + 1}`;
      const started = Date.now();
      const entry = { id, tool, args };
      calls.push(entry);
      onEvent({ type: "call", call: traceEntry(entry) });
      try {
        entry.result = tool === "search_qloo"
          ? await search({ query: args.query, types: args.types })
          : await insights({
              entityIds: args.entity_ids,
              tagIds: args.tag_ids,
              excludeTagIds: args.exclude_tag_ids ?? [],
              type: args.type,
              city: args.city,
              take: Math.min(Math.max(args.take || 8, 1), 15),
            });
      } catch (err) {
        entry.error = err.message;
      }
      entry.ms = Date.now() - started;
      onEvent({ type: "call", call: traceEntry(entry) });
      return entry;
    },
  };
}

// What the model sees from a tool call: compact, with the call id it can cite.
// Search results carry tag ids so the model can reuse them as signals or exclusions.
function toolResultText(entry) {
  if (entry.error) return JSON.stringify({ call_id: entry.id, error: entry.error });
  const withIds = entry.tool === "search_qloo";
  const entities = (entry.result.entities ?? []).map(e => ({
    entity_id: e.entity_id,
    name: e.name,
    affinity: e.affinity ?? undefined,
    location: e.location ?? undefined,
    tags: e.tags.slice(0, withIds ? 12 : 6).map(t => (withIds ? { id: t.id, name: t.name } : t.name)),
  }));
  return JSON.stringify({ call_id: entry.id, entities, tags: entry.result.tags });
}

// Seed profile: which seed contributed each taste tag, from the signals actually sent to get_insights.
function seedProfile(calls) {
  const searched = calls.filter(c => c.tool === "search_qloo" && c.result);
  const used = new Set(calls.filter(c => c.tool === "get_insights").flatMap(c => [...c.args.entity_ids, ...c.args.tag_ids]));
  const tagSeeds = new Map();
  const add = (tagId, seed) => tagSeeds.set(tagId, new Set([...(tagSeeds.get(tagId) ?? []), seed]));
  for (const call of searched) {
    for (const e of call.result.entities) if (used.has(e.entity_id)) e.tags.forEach(t => add(t.id, e.name));
    for (const t of call.result.tags) if (used.has(t.id)) add(t.id, call.args.query);
  }
  return tagSeeds;
}

const isBeyondCall = c => c.tool === "get_insights" && c.args.exclude_tag_ids?.length > 0;

// Keep only items that a get_insights call actually returned, with the matching type.
// "beyond" items must come from a call with exclusions and carry no heritage tags.
function ground(final, calls) {
  const tagSeeds = seedProfile(calls);
  const recommendations = {};
  const dropped = [];
  const seen = new Set();
  const lanes = [...Object.entries(CATEGORIES), ["beyond", null]];

  for (const [cat, type] of lanes) {
    recommendations[cat] = [];
    for (const item of final[cat] ?? []) {
      const eligible = cat === "beyond" ? isBeyondCall : c => c.tool === "get_insights";
      const hits = calls.filter(c => eligible(c) && c.result?.entities.some(e => e.entity_id === item.entity_id));
      const entity = hits[0]?.result.entities.find(e => e.entity_id === item.entity_id);
      const entityType = String(entity?.type ?? "").split(":").pop();
      let reason = null;
      if (!entity) reason = cat === "beyond" ? "not returned by a beyond-the-obvious Qloo call" : "not returned by any Qloo call";
      else if (type && entityType !== type) reason = "wrong type";
      else if (cat === "beyond" && entity.tags.some(isHeritageTag)) reason = "carries a heritage tag";
      if (reason) {
        dropped.push({ category: cat, entity_id: item.entity_id, reason });
        continue;
      }
      if (seen.has(entity.entity_id)) continue;
      seen.add(entity.entity_id);

      const shared = entity.tags.filter(t => tagSeeds.has(t.id));
      recommendations[cat].push({
        entity_id: entity.entity_id,
        name: entity.name,
        type: entityType,
        location: entity.location,
        why: item.why,
        affinity: Math.max(...hits.map(c => c.result.entities.find(e => e.entity_id === item.entity_id).affinity ?? 0)),
        sharedTags: shared.map(t => ({ name: t.name, seeds: [...tagSeeds.get(t.id)] })),
        evidence: hits.map(c => c.id),
      });
    }
    recommendations[cat].sort((a, b) => b.affinity - a.affinity);
  }
  return { recommendations, dropped };
}

async function runClaude({ city, seeds, ledger, onEvent }) {
  const client = new Anthropic();
  const messages = [
    { role: "user", content: `I live in ${city}. Tastes from home: ${seeds.map(s => `"${s}"`).join(", ")}. What should I check out here?` },
  ];

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    onEvent({ type: "status", text: turn === 0 ? "Claude is planning which Qloo calls to make…" : "Claude is reading the results and deciding what's next…" });
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium" },
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages,
    });

    if (response.stop_reason === "refusal") throw new Error("Claude declined this request");
    if (response.stop_reason === "max_tokens") throw new Error("Claude ran out of output tokens");

    const toolUses = response.content.filter(b => b.type === "tool_use");
    const submit = toolUses.find(b => b.name === "submit_recommendations");
    if (submit) return submit.input;
    if (!toolUses.length) throw new Error("Claude stopped without submitting recommendations");

    onEvent({ type: "status", text: `Calling Qloo (${toolUses.length} ${toolUses.length === 1 ? "call" : "calls"})…` });
    messages.push({ role: "assistant", content: response.content });
    const entries = await Promise.all(toolUses.map(b => ledger.run(b.name, b.input)));
    messages.push({
      role: "user",
      content: toolUses.map((b, i) => ({
        type: "tool_result",
        tool_use_id: b.id,
        content: toolResultText(entries[i]),
        is_error: Boolean(entries[i].error),
      })),
    });
  }
  throw new Error(`Claude did not finish within ${MAX_TURNS} turns`);
}

function templateWhy(entity, tagSeeds) {
  const shared = entity.tags.filter(t => tagSeeds.has(t.id));
  if (!shared.length) return "Ranked by Qloo affinity to your seeds.";
  const tagNames = shared.slice(0, 2).map(t => t.name);
  // Drop seeds that are the tag itself ("Nollywood" via "Nollywood")
  const via = [...new Set(shared.flatMap(t => [...tagSeeds.get(t.id)]))].filter(s => !tagNames.some(n => n.toLowerCase() === s.toLowerCase()));
  return via.length ? `Shares ${tagNames.join(" and ")} with ${via.slice(0, 2).join(" and ")}.` : `Matches your ${tagNames.join(" and ")} taste.`;
}

// Same tool calls, fixed order, template explanations. Keeps the demo alive without an LLM key.
async function runDeterministic({ city, seeds, ledger }) {
  const searches = await Promise.all(seeds.map(query => ledger.run("search_qloo", { query, types: [] })));
  const entityIds = [];
  const tagIds = [];
  const heritage = new Set();
  for (const s of searches) {
    const top = s.result?.entities[0];
    if (top) entityIds.push(top.entity_id);
    else s.result?.tags.slice(0, 3).forEach(t => tagIds.push(t.id));
    [...(top?.tags ?? []), ...(s.result?.tags ?? [])].filter(isHeritageTag).forEach(t => heritage.add(t.id));
  }

  const signals = { entity_ids: entityIds, tag_ids: tagIds, city };
  await Promise.all([
    ...ENTITY_TYPES.map(type => ledger.run("get_insights", { type, ...signals, exclude_tag_ids: [], take: 4 })),
    ...ENTITY_TYPES.map(type => ledger.run("get_insights", { type, ...signals, exclude_tag_ids: [...heritage], take: 2 })),
  ]);

  const tagSeeds = seedProfile(ledger.calls);
  const final = { summary: "", coverage_note: "", beyond: [] };
  const thin = [];
  for (const [cat, type] of Object.entries(CATEGORIES)) {
    const call = ledger.calls.find(c => c.tool === "get_insights" && c.args.type === type && !isBeyondCall(c));
    const entities = call?.result?.entities ?? [];
    if (entities.length < 3) thin.push(cat);
    final[cat] = entities.map(e => ({ entity_id: e.entity_id, why: templateWhy(e, tagSeeds) }));
  }
  for (const call of ledger.calls.filter(isBeyondCall)) {
    for (const e of call.result?.entities ?? []) final.beyond.push({ entity_id: e.entity_id, why: templateWhy(e, tagSeeds) });
  }
  final.summary = `Taste profile built from ${entityIds.length} entities and ${tagIds.length} tags resolved from your seeds, matched against ${city}.`;
  final.coverage_note = thin.length ? `Thin coverage for ${thin.join(", ")} in ${city}.` : "";
  return final;
}

// The comparison: the same model with no tools, asked the same question.
const BASELINE_SCHEMA = {
  type: "object",
  properties: Object.fromEntries(
    Object.keys(CATEGORIES).map(cat => [
      cat,
      {
        type: "array",
        items: {
          type: "object",
          properties: { name: { type: "string" }, why: { type: "string" } },
          required: ["name", "why"],
          additionalProperties: false,
        },
      },
    ]),
  ),
  required: Object.keys(CATEGORIES),
  additionalProperties: false,
};

async function runBaseline({ city, seeds }) {
  const client = new Anthropic();
  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 4000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: { type: "json_schema", schema: BASELINE_SCHEMA } },
    messages: [
      {
        role: "user",
        content: `I'm a Nigerian living in ${city}. My favourite things from home: ${seeds.map(s => `"${s}"`).join(", ")}. Recommend 3 places in ${city} (places), 3 music artists (music) and 3 films or TV shows (film) I'd enjoy, with one short reason each.`,
      },
    ],
  });
  if (response.stop_reason === "refusal") throw new Error("Claude declined the baseline request");
  const text = response.content.find(b => b.type === "text")?.text;
  const baseline = JSON.parse(text);

  // With live Qloo, check whether each baseline pick even exists in the taste graph.
  if (qlooMode() === "live") {
    await Promise.all(
      Object.entries(CATEGORIES).flatMap(([cat, type]) =>
        baseline[cat].map(async item => {
          const found = await search({ query: item.name, types: [type] }).catch(() => null);
          item.inQloo = Boolean(found?.entities.some(e => e.name.toLowerCase() === item.name.toLowerCase()));
        }),
      ),
    );
  }
  return baseline;
}

// Claude runs take 20-30s; repeat requests (presets, judges re-clicking) are served from memory.
const CACHE_TTL_MS = 60 * 60 * 1000;
const cache = new Map();

// onEvent receives progress while the agent works: {type: "status"|"call"|"reset"|"baseline", ...}
export async function runAgent({ city, seeds, onEvent = () => {} }) {
  const key = JSON.stringify([city.toLowerCase(), seeds.map(s => s.toLowerCase()).sort()]);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return { ...hit.result, mode: { ...hit.result.mode, cached: true } };

  const result = await plan({ city, seeds, onEvent });
  if (result.mode.planner === "claude") {
    if (cache.size >= 100) cache.delete(cache.keys().next().value);
    cache.set(key, { at: Date.now(), result });
  }
  return result;
}

async function plan({ city, seeds, onEvent }) {
  const ledger = createLedger(onEvent);
  let planner = process.env.ANTHROPIC_API_KEY ? "claude" : "deterministic";
  let plannerNote = planner === "claude" ? null : "ANTHROPIC_API_KEY not set — using the deterministic planner.";
  let final;

  // The baseline runs alongside the agent so it adds no wait.
  const baselinePromise = planner === "claude"
    ? runBaseline({ city, seeds }).then(
        baseline => (onEvent({ type: "baseline", baseline }), baseline),
        err => (console.error("baseline failed", err), null),
      )
    : Promise.resolve(null);

  if (planner === "claude") {
    try {
      final = await runClaude({ city, seeds, ledger, onEvent });
    } catch (err) {
      plannerNote = `Claude planner failed (${err.message}); fell back to the deterministic planner.`;
      planner = "deterministic";
      ledger.reset();
    }
  }
  if (!final) {
    onEvent({ type: "status", text: "Running the Qloo calls…" });
    final = await runDeterministic({ city, seeds, ledger });
  }

  onEvent({ type: "status", text: "Checking every pick against the Qloo evidence…" });
  const { recommendations, dropped } = ground(final, ledger.calls);

  return {
    city,
    seeds,
    summary: final.summary,
    coverageNote: final.coverage_note,
    recommendations,
    dropped,
    baseline: await baselinePromise,
    mode: { qloo: qlooMode(), planner, plannerNote },
    trace: ledger.calls.map(traceEntry),
  };
}
