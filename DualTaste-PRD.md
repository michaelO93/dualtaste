# Product Requirements Document: DualTaste

**Project:** DualTaste — Diaspora / Dual-Taste Reconnection Agent  
**Hackathon:** Qloo Agentic Hackathon  
**Version:** 1.0  
**Date:** October 26, 2026  
**Status:** Draft for hackathon execution

---

## 1. Overview

**Product name (working):** DualTaste  
**One-line description:** An agent that takes a user’s Nigerian (or broader African) cultural tastes and their current city abroad, then surfaces places, experiences, music, film, and content that feel culturally aligned — using Qloo’s taste graph so recommendations are grounded and explainable rather than generic.

**Hackathon context:** Build an autonomous agent that uses the Qloo API in a meaningful way so the system is better *because* of the taste graph. Deliver a live hosted demo and a public open-source repository by October 30, 2026.

---

## 2. Problem Statement

Nigerians and other Africans living abroad often want:

- Places, food, music, or experiences in their new city that actually match their tastes (not just generic “African restaurants” or tourist lists).
- Ways to stay connected to home culture without relying on surface-level recommendations.
- Discovery that understands cross-domain affinities (for example, people who like certain Afrobeats artists also over-index on specific film styles, food, or venue vibes).

Generic large language models collapse this into a short list of global hits or vague suggestions. They lack structured, cross-domain taste signals and frequently default to Western priors or hallucinate entities.

---

## 3. Opportunity and Unique Angle

Qloo’s taste graph links entities across music, film/TV, places, brands, and other domains, and supports location-aware insights. An agent that:

1. Resolves explicit home seeds via Qloo,
2. Queries insights and places in the target city using those signals,
3. Ranks and explains results with traceable evidence,

can produce recommendations that are more culturally grounded and auditable than a plain LLM. The Nigeria/diaspora framing is under-represented in most hackathon entries and provides a concrete user story.

---

## 4. Target Users

- **Primary:** Nigerians (or West Africans) living abroad who want culturally aligned discovery in their current city.
- **Secondary:** Dual-taste users, content creators, or event planners serving diaspora audiences.
- **Evaluators:** Judges who can try preset examples and clearly see the Qloo grounding.

---

## 5. Goals

- Demonstrate that Qloo meaningfully improves recommendation quality and explainability versus a generic LLM baseline.
- Deliver a usable, live demo that a judge can try in under a minute.
- Produce a clean public repository that shows the agent architecture and evidence trail.
- Remain within hackathon constraints (open-source, externally hosted, Qloo-dependent).

---

## 6. Non-Goals (Hackathon Scope)

- Full user accounts, persistent profiles, or social features.
- Broad multi-country African coverage beyond what the API actually returns.
- Production-grade scale or deep personalization beyond the seeds and location the user provides.
- Perfect coverage of every Nigerian entity (signal strength will be surfaced honestly).

---

## 7. User Stories and Core Flows

### Primary Flow

1. User selects or enters current city (examples: London, New York, Toronto, Berlin).
2. User provides 3–5 home seeds (artists, films, food styles/tags, or place types). Optional presets such as “Lagos music + food” or “Nollywood + Afrobeats” are available.
3. Agent resolves seeds, queries Qloo insights/places with those signals plus location, and ranks results.
4. User receives ranked suggestions (places, music, film, food) with short explanations and links back to the Qloo evidence that produced them.
5. Optional secondary mode: “Bridge back” — recommendations of Nigerian content or Lagos places that match the user’s current tastes.

### Judge / Demo Flow

- Preset example loads instantly (for example, specific Afrobeats artists and a Nollywood title in London).
- Clear contrast with a plain LLM baseline is available in the UI or documentation.
- Evidence panel or expandable citations appear for every major recommendation.

---

## 8. Functional Requirements

| ID  | Requirement                                              | Priority |
|-----|----------------------------------------------------------|----------|
| F1  | Seed resolution via Qloo `/search` or tags               | Must     |
| F2  | Insights and place/location queries using seed signals   | Must     |
| F3  | Ranked, explained output constrained to Qloo results     | Must     |
| F4  | Evidence/traceability (which calls produced which items) | Must     |
| F5  | Preset examples for instant demo                         | Must     |
| F6  | Signal-strength or coverage indicator when results are thin | Should |
| F7  | Optional “bridge back to Nigeria” mode                   | Should   |
| F8  | Simple comparison note versus unconstrained LLM          | Nice     |

---

## 9. How Qloo Is Used (Differentiator)

- Resolve every user seed to a Qloo entity or tag.
- Pass those as signals into `/v2/insights` (and place/heatmap endpoints where useful), scoped to the target city.
- Prefer cross-domain results (music to places, film to food, and so on).
- Never allow the language model to invent entities; it may only narrate or rank what Qloo returned.
- Log and display the evidence so judges can verify the grounding.

---

## 10. Technical Approach (High-Level)

- **Frontend:** Simple web UI (React/Next.js or equivalent) or clean chat-style interface, hosted publicly.
- **Backend / agent:** Lightweight orchestration (Node.js, Python, or similar). Deterministic Qloo calls first; LLM used only for constrained narration or ranking.
- **Qloo integration:** Hackathon base URL plus API key. Cache or pre-compute strong preset runs so the demo remains fast.
- **Evidence layer:** Store call identifiers and result snippets; surface them in the UI.
- **Repository:** Public, with a clear open-source license (MIT or equivalent) visible in the About section. README includes setup instructions and architecture notes.

---

## 11. Success Criteria (Hackathon)

- Live demo works without local setup for a judge.
- At least one clear example where Qloo-grounded results differ meaningfully from a generic LLM suggestion.
- Recommendations are traceable to Qloo calls.
- Repository is public, open-source, and documents the agent flow.
- Submission completed before the October 30, 2026 deadline.

---

## 12. Risks and Mitigations

| Risk                                      | Mitigation                                                                 |
|-------------------------------------------|----------------------------------------------------------------------------|
| Thin Qloo coverage for Nigerian entities  | Test early with real seeds. Surface confidence. Lean on stronger domains (major artists, popular titles). Use presets that return usable data. |
| API key delay                             | Request immediately. Design UI and agent structure in parallel.            |
| Time pressure (deadline October 30)       | Strict MVP scope. Prioritize presets and evidence display over polish.    |
| Generic LLM comparison feels weak         | Make the evidence trail and constrained output the core story.            |

---

## 13. Submission Checklist

- [ ] Hackathon API key requested and tested
- [ ] Live externally hosted demo
- [ ] Public repository with visible open-source license
- [ ] Clear description of how Qloo makes the agent better
- [ ] Evidence of agentic use (planning, tool use, traceable results)
- [ ] Submitted on Devpost before deadline

---

## 14. Immediate Next Steps

1. Request the Qloo hackathon API key.
2. Probe a few Nigerian seeds (artists, films, Lagos places) to map real coverage.
3. Lock the exact MVP feature set and UI shape.
4. Scaffold repository and basic agent loop that resolves seeds and calls insights.
5. Build one strong preset end-to-end, then expand.

---

*End of document.*
