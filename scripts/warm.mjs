// Runs every preset once against a deployment so judges get cached, instant results.
// Usage: npm run warm -- https://dualtaste.vercel.app
import { PRESETS } from "../fixtures/presets.js";

const base = (process.argv[2] || "https://dualtaste.vercel.app").replace(/\/$/, "");

await Promise.all(
  PRESETS.map(async preset => {
    const started = Date.now();
    const res = await fetch(`${base}/api/agent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ city: preset.city, seeds: preset.seeds }),
    });
    const lines = (await res.text()).trim().split("\n");
    const last = JSON.parse(lines.at(-1));
    const seconds = ((Date.now() - started) / 1000).toFixed(1);
    if (last.type !== "result") return console.log(`✗ ${preset.label}: ${last.error ?? res.status}`);
    const { mode, recommendations } = last.result;
    const picks = Object.values(recommendations).reduce((n, items) => n + items.length, 0);
    console.log(`✓ ${preset.label}: ${picks} picks, planner=${mode.planner}${mode.cached ? " (already cached)" : ""}, ${seconds}s`);
  }),
);
