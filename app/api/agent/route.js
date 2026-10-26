import { runAgent } from "../../../lib/agent";

export const maxDuration = 60;

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const city = typeof body.city === "string" ? body.city.trim().slice(0, 60) : "";
  const seeds = Array.isArray(body.seeds)
    ? [...new Set(body.seeds.filter(s => typeof s === "string").map(s => s.trim().slice(0, 60)).filter(Boolean))].slice(0, 6)
    : [];

  if (!city || !seeds.length) {
    return Response.json({ error: "Give a city and at least one taste from home." }, { status: 400 });
  }

  // Newline-delimited JSON: progress events while the agent works, then one "result" (or "error") line.
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = event => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      try {
        send({ type: "result", result: await runAgent({ city, seeds, onEvent: send }) });
      } catch (err) {
        console.error(err);
        send({ type: "error", error: "The agent hit an error. Try again in a moment." });
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
