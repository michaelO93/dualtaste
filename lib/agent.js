// DualTaste agent: Claude plans and calls Qloo tools; every recommendation it returns
// is checked against the Qloo calls it actually made (the "ledger") before it reaches the UI.
// Without ANTHROPIC_API_KEY a deterministic planner runs the same Qloo calls instead.

import Anthropic from "@anthropic-ai/sdk";
import { search, insights, qlooMode } from "./qloo";

const MODEL = "claude-opus-5-5";
const MAX_TURNS = 10;

// UI category -> Qloo entity type
const CATEGORIES = { places: "place", music: "artist", film: "movie" };

const SYSTEM_PROMPT = `You are DualTaste, an agent that helps Nigerians living abroad find places, music and film in their current city that match the tastes they grew up with.

You have no knowledge of your own worth using here: everything you recommend must come from Qloo's taste graph through your tools.

How to work:
1. Resolve every seed with search_qloo. Artists and films usually resolve to entities; dishes, genres and vibes ("jollof rice", "Nollywood") usually resolve to tags. Run the searches in parallel.
2. Call get_insights for each type (place, artist, movie) using the resolved entity_ids and tag_ids plus the user's city. Make follow-up calls if a first pass is thin, for example narrowing to food tags for places.
3. Finish by calling submit_recommendations exactly once with 3-5 items per category, best first.

Rules:
- Only recommend entity_ids that appeared in a get_insights result. Never invent places, artists or films.
- Never recommend one of the user's own seeds back to them.
- Each "why" is one sentence under 25 words naming the seed(s) and shared taste signals that connect it.
- Explanations, the summary and coverage_note describe only what your tool results show (names, tags, locations, affinity). Do not add facts from your own knowledge about the city, venues, artists or films.
- If a category comes back thin, say so plainly in coverage_note rather than padding it.`;

const TOOLS = [
  {
    name: "search_qloo",
    description: "Resolve a free-text seed (artist, film, dish, genre, vibe) to Qloo entities and tags. Returns entity_ids with their taste tags, plus matching tag_ids.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "The seed text, e.g. 'Burna Boy' or 'jollof rice'." },
        types: {
          type: "array",
          items: { type: "string", enum: ["artist", "movie", "place"] },
          description: "Entity types to search. Empty array searches all.",
        },
      },
      required: ["query", "types"],
      additionalProperties: false,
    },
  },
  {
    name: "get_insights",
    description: "Get Qloo taste-graph recommendations of one entity type driven by seed entities and/or tags. Places are limited to the city; artists and films use the city as an audience signal. Results include affinity scores (0-1) and tags.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["place", "artist", "movie"] },
        entity_ids: { type: "array", items: { type: "string" } },
        tag_ids: { type: "array", items: { type: "string" } },
        city: { type: "string" },
        take: { type: "integer", description: "Number of results, 1-15." },
      },
      required: ["type", "entity_ids", "tag_ids", "city", "take"],
      additionalProperties: false,
    },
  },
  {
    name: "submit_recommendations",
    description: "Submit the final ranked recommendations. Call exactly once, when done.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        summary: { type: "string", description: "Two sentences on the taste profile you inferred and how it maps to the city." },
        coverage_note: { type: "string", description: "Where Qloo coverage was thin, or an empty string." },
        ...Object.fromEntries(
          Object.keys(CATEGORIES).map(cat => [
            cat,
            {
              type: "array",
              items: {
                type: "object",
                properties: { entity_id: { type: "string" }, why: { type: "string" } },
                required: ["entity_id", "why"],
                additionalProperties: false,
              },
            },
          ]),
        ),
      },
      required: ["summary", "coverage_note", ...Object.keys(CATEGORIES)],
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
          : await insights({ entityIds: args.entity_ids, tagIds: args.tag_ids, type: args.type, city: args.city, take: Math.min(Math.max(args.take || 8, 1), 15) });
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
function toolResultText(entry) {
  if (entry.error) return JSON.stringify({ call_id: entry.id, error: entry.error });
  const entities = (entry.result.entities ?? []).map(e => ({
    entity_id: e.entity_id,
    name: e.name,
    affinity: e.affinity ?? undefined,
    location: e.location ?? undefined,
    tags: e.tags.slice(0, 6).map(t => t.name),
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

// Keep only items that a get_insights call actually returned, with the matching type.
function ground(final, calls) {
  const tagSeeds = seedProfile(calls);
  const recommendations = {};
  const dropped = [];
  for (const [cat, type] of Object.entries(CATEGORIES)) {
    recommendations[cat] = [];
    for (const item of final[cat] ?? []) {
      const hits = calls.filter(c => c.tool === "get_insights" && c.result?.entities.some(e => e.entity_id === item.entity_id));
      const entity = hits[0]?.result.entities.find(e => e.entity_id === item.entity_id);
      if (!entity || !String(entity.type ?? "").endsWith(type)) {
        dropped.push({ category: cat, entity_id: item.entity_id, reason: entity ? "wrong type" : "not returned by any Qloo call" });
        continue;
      }
      if (recommendations[cat].some(r => r.entity_id === entity.entity_id)) continue;
      const shared = entity.tags.filter(t => tagSeeds.has(t.id));
      recommendations[cat].push({
        entity_id: entity.entity_id,
        name: entity.name,
        location: entity.location,
        why: item.why,
        affinity: Math.max(...hits.map(c => c.result.entities.find(e => e.entity_id === item.entity_id).affinity ?? 0)),
        sharedTags: shared.map(t => ({ name: t.name, seeds: [...tagSeeds.get(t.id)] })),
        evidence: hits.map(c => c.id),
      });
    }
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

// Same tool calls, fixed order, template explanations. Keeps the demo alive without an LLM key.
async function runDeterministic({ city, seeds, ledger }) {
  const searches = await Promise.all(seeds.map(query => ledger.run("search_qloo", { query, types: [] })));
  const entityIds = [];
  const tagIds = [];
  for (const s of searches) {
    const top = s.result?.entities[0];
    if (top) entityIds.push(top.entity_id);
    else if (s.result?.tags[0]) tagIds.push(s.result.tags[0].id);
  }

  await Promise.all(
    Object.values(CATEGORIES).map(type => ledger.run("get_insights", { type, entity_ids: entityIds, tag_ids: tagIds, city, take: 4 })),
  );

  const tagSeeds = seedProfile(ledger.calls);
  const final = { summary: "", coverage_note: "" };
  const thin = [];
  for (const [cat, type] of Object.entries(CATEGORIES)) {
    const call = ledger.calls.find(c => c.tool === "get_insights" && c.args.type === type);
    const entities = call?.result?.entities ?? [];
    if (entities.length < 3) thin.push(cat);
    final[cat] = entities.map(e => {
      const shared = e.tags.filter(t => tagSeeds.has(t.id));
      const tagNames = shared.slice(0, 2).map(t => t.name);
      // Drop seeds that are the tag itself ("Nollywood" via "Nollywood")
      const via = [...new Set(shared.flatMap(t => [...tagSeeds.get(t.id)]))].filter(s => !tagNames.some(n => n.toLowerCase() === s.toLowerCase()));
      let why = "Ranked by Qloo affinity to your seeds.";
      if (shared.length) {
        why = via.length
          ? `Shares ${tagNames.join(" and ")} with ${via.slice(0, 2).join(" and ")}.`
          : `Matches your ${tagNames.join(" and ")} taste.`;
      }
      return { entity_id: e.entity_id, why };
    });
  }
  final.summary = `Taste profile built from ${entityIds.length} entities and ${tagIds.length} tags resolved from your seeds, matched against ${city}.`;
  final.coverage_note = thin.length ? `Thin coverage for ${thin.join(", ")} in ${city}.` : "";
  return final;
}

// Claude runs take 20-30s; repeat requests (presets, judges re-clicking) are served from memory.
const CACHE_TTL_MS = 60 * 60 * 1000;
const cache = new Map();

// onEvent receives progress while the agent works: {type: "status"|"call"|"reset", ...}
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
    mode: { qloo: qlooMode(), planner, plannerNote },
    trace: ledger.calls.map(traceEntry),
  };
}
