# DualTaste

An agent that uses Qloo's taste graph to give Nigerians abroad culturally aligned recommendations for places, music, and film in the city they live in now — with the Qloo evidence behind every pick.

## How it works

1. **Resolve** — each seed ("Burna Boy", "jollof rice", "Nollywood") goes through Qloo search. Artists and films land on entities; dishes and genres land on tags.
2. **Query** — the agent calls Qloo insights for places (filtered to the city), artists and films (with the city as an audience signal), using the resolved signals.
3. **Ground** — the agent submits its picks, and the server keeps only those that a Qloo insights call actually returned. Anything else is dropped and counted in the UI.
4. **Show evidence** — each card links to the Qloo call(s) that produced it, plus the shared taste tags and which seed they came from.

Planning runs on Claude (`claude-opus-5-5`) with Qloo as tools (`lib/agent.js`). Without `ANTHROPIC_API_KEY`, a deterministic planner makes the same calls in a fixed order.

## Modes

| Variable | Unset | Set |
|---|---|---|
| `QLOO_API_KEY` | Sample fixture graph (`fixtures/graph.js`) — real names, invented tags and scores | Live hackathon API (`https://hackathon.api.qloo.com`) |
| `ANTHROPIC_API_KEY` | Deterministic planner | Claude tool-use planner |

The UI always shows which mode is active.

## Run

```bash
npm install
cp .env.example .env.local   # add keys when you have them
npm run dev
```

## Layout

- `lib/qloo.js` — Qloo client (search, tags, insights), normalized for both modes
- `lib/agent.js` — Claude tool loop, deterministic planner, grounding check, call ledger
- `app/api/agent/route.js` — POST `{ city, seeds }`
- `components/DualTasteApp.js` — input, results, evidence trace
- `fixtures/` — presets and the sample taste graph

## License

MIT
