"use client";

import { useState } from "react";

const CATEGORY_LABELS = { places: "Places", music: "Music", film: "Film & TV" };

function describeCall(call) {
  return call.tool === "search_qloo"
    ? `search("${call.args.query}")`
    : `insights(type=${call.args.type}, city=${call.args.city}, signals=${call.args.entity_ids.length + call.args.tag_ids.length})`;
}

function TraceList({ calls, focusCall }) {
  return (
    <ol className="trace-list">
      {calls.map(call => (
        <li key={call.id} id={`call-${call.id}`} className={[focusCall === call.id && "focus", call.pending && "pending"].filter(Boolean).join(" ") || undefined}>
          <span className="call-id">{call.id}</span>
          <div>
            <code>{describeCall(call)}</code>
            <p className="muted small">
              {call.pending
                ? "Waiting for Qloo…"
                : call.error
                  ? `Error: ${call.error}`
                  : `${call.count} results${call.top.length ? ` · ${call.top.join(", ")}` : ""} · ${call.ms} ms`}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function DualTasteApp({ presets, cities }) {
  const [city, setCity] = useState(presets[0].city);
  const [seeds, setSeeds] = useState(presets[0].seeds);
  const [draft, setDraft] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [liveCalls, setLiveCalls] = useState([]);
  const [focusCall, setFocusCall] = useState(null);

  function addSeed(text) {
    const value = text.trim();
    if (value && !seeds.includes(value) && seeds.length < 6) setSeeds([...seeds, value]);
    setDraft("");
  }

  function loadPreset(preset) {
    setCity(preset.city);
    setSeeds(preset.seeds);
    run(preset.city, preset.seeds);
  }

  async function run(runCity = city, runSeeds = draft.trim() ? [...seeds, draft.trim()] : seeds) {
    setDraft("");
    setSeeds(runSeeds);
    setLoading(true);
    setError(null);
    setFocusCall(null);
    setStatus("Starting the agent…");
    setLiveCalls([]);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city: runCity, seeds: runSeeds }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Something went wrong.");

      // NDJSON stream: status/call/reset events, then a final result or error line.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finished = false;
      while (!finished) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();
        for (const line of lines.filter(Boolean)) {
          const event = JSON.parse(line);
          if (event.type === "status") setStatus(event.text);
          else if (event.type === "reset") setLiveCalls([]);
          else if (event.type === "call") setLiveCalls(calls => [...calls.filter(c => c.id !== event.call.id), event.call].sort((a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1))));
          else if (event.type === "error") throw new Error(event.error);
          else if (event.type === "result") {
            setResult(event.result);
            finished = true;
          }
        }
      }
      if (!finished) throw new Error("The connection closed before the agent finished.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function showCall(id) {
    setFocusCall(id);
    document.getElementById(`call-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  const total = result ? Object.values(result.recommendations).reduce((n, items) => n + items.length, 0) : 0;

  return (
    <main className="shell">
      <header className="masthead">
        <p className="eyebrow">Qloo-grounded agent</p>
        <h1>DualTaste</h1>
        <p className="lede">Tell it what you love from home. It finds what matches in the city you live in now, and shows the taste-graph evidence for every pick.</p>
      </header>

      <section className="panel composer" aria-label="Your tastes">
        <div className="presets">
          {presets.map(p => (
            <button key={p.id} type="button" className="preset" onClick={() => loadPreset(p)} disabled={loading}>
              {p.label}
            </button>
          ))}
        </div>

        <form
          onSubmit={e => {
            e.preventDefault();
            run();
          }}
        >
          <label className="field">
            <span>City you live in</span>
            <input list="cities" value={city} onChange={e => setCity(e.target.value)} placeholder="London" required />
            <datalist id="cities">
              {cities.map(c => <option key={c} value={c} />)}
            </datalist>
          </label>

          <div className="field">
            <span id="seeds-label">Tastes from home</span>
            <div className="chips-input" aria-labelledby="seeds-label">
              {seeds.map(s => (
                <span key={s} className="chip">
                  {s}
                  <button type="button" aria-label={`Remove ${s}`} onClick={() => setSeeds(seeds.filter(x => x !== s))}>×</button>
                </span>
              ))}
              <input
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addSeed(draft);
                  } else if (e.key === "Backspace" && !draft && seeds.length) {
                    setSeeds(seeds.slice(0, -1));
                  }
                }}
                placeholder={seeds.length < 6 ? "Artist, film, dish… then Enter" : "Up to 6 tastes"}
                disabled={seeds.length >= 6}
              />
            </div>
          </div>

          <button className="run" type="submit" disabled={loading || !city.trim() || (!seeds.length && !draft.trim())}>
            {loading ? "Working…" : "Find my matches"}
          </button>
        </form>
      </section>

      {loading && (
        <section className="panel live" aria-live="polite">
          <p className="status" role="status">
            <span className="pulse" aria-hidden /> {status}
          </p>
          {liveCalls.length > 0 && <TraceList calls={liveCalls} />}
        </section>
      )}
      {error && <p className="status error" role="alert">{error}</p>}

      {result && !loading && (
        <>
          <section className="panel summary">
            <div className="badges">
              <span className={`badge ${result.mode.qloo}`}>Qloo: {result.mode.qloo === "live" ? "live API" : "sample data"}</span>
              <span className="badge">Planner: {result.mode.planner === "claude" ? "Claude" : "deterministic"}{result.mode.cached ? " (cached)" : ""}</span>
              <span className="badge">{total} picks · {result.trace.length} Qloo calls</span>
              {result.dropped.length > 0 && <span className="badge warn">{result.dropped.length} unsupported picks removed</span>}
            </div>
            <p>{result.summary}</p>
            {result.coverageNote && <p className="muted">{result.coverageNote}</p>}
            {result.mode.plannerNote && <p className="muted small">{result.mode.plannerNote}</p>}
          </section>

          <section className="grid">
            {Object.entries(CATEGORY_LABELS).map(([cat, label]) => (
              <div key={cat} className="column">
                <h2>{label}</h2>
                {result.recommendations[cat].length === 0 && <p className="muted empty">Qloo returned nothing strong enough here for {result.city}.</p>}
                {result.recommendations[cat].map(item => (
                  <article key={item.entity_id} className="card">
                    <div className="card-head">
                      <h3>{item.name}</h3>
                      {item.affinity > 0 && <span className="affinity" title="Qloo affinity score">{Math.round(item.affinity * 100)}</span>}
                    </div>
                    {item.location && <p className="where">{item.location}</p>}
                    <p className="why">{item.why}</p>
                    {item.sharedTags.length > 0 && (
                      <ul className="signals">
                        {item.sharedTags.slice(0, 3).map(t => (
                          <li key={t.name}>
                            {t.name} <span>via {t.seeds.slice(0, 2).join(", ")}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="evidence">
                      Evidence:
                      {item.evidence.map(id => (
                        <button key={id} type="button" onClick={() => showCall(id)}>{id}</button>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            ))}
          </section>

          <details className="panel trace" open>
            <summary>Agent trace: every Qloo call</summary>
            <TraceList calls={result.trace} focusCall={focusCall} />
          </details>
        </>
      )}

      <footer className="foot muted small">Built for the Qloo Agentic Hackathon. Recommendations come only from Qloo results; the model never adds its own.</footer>
    </main>
  );
}
