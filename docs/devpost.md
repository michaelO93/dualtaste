# DualTaste — Devpost submission

> Paste each section into the matching Devpost field. Numbers come from the live London demo on 30 Oct 2026 (Claude planner, live Qloo API).
> One optional personal line is marked in Inspiration; delete the brackets if you skip it.

**Tagline:** Home tastes, wherever you are. An agent that uses Qloo's taste graph to find what Nigerians abroad will love in their new city, including things they'd never think to search for.

**Demo:** https://dualtaste.vercel.app · **Code:** https://github.com/michaelO93/dualtaste

## Inspiration

Millions of Nigerians live in London, New York, Toronto and beyond. Ask a chatbot what to do in London if you love Burna Boy, Asake, Nollywood and jollof rice, and you get the stereotype: Peckham, the two Nigerian restaurants it has heard of, and Nollywood titles you've already seen. That isn't taste. [Optional: one sentence of your own experience — what moving abroad felt like, or what you went looking for.]

We wanted an agent that knows what people with your taste actually love, in the city you actually live in, and can show its working.

## What it does

You give DualTaste the city you live in and a few things you love from home: artists, films, dishes, vibes. It returns:

- **Beyond the obvious:** music, film, TV and places that people with your taste love, with every Afrobeats, Nollywood and Nigerian-food signal filtered out. For the London demo that meant Koffee and Popcaan (dancehall), ENNY and Kojey Radical (UK rap), and the series *Power*, each with a one-line "bridge" naming the taste signal that connects it to your seeds.
- **Close to home:** real Nigerian spots in your city, with neighbourhoods (805 Restaurants and ESQ Resto Lounge in South Bermondsey, Enish in Camberwell, Mama Calabar in Hendon), plus the artists and films closest to your seeds.
- **Evidence for every pick:** each card shows Qloo's affinity score, the shared taste signals and which of your seeds they came from, and links to the exact Qloo call that returned it.
- **A live trace:** you watch the agent make each Qloo call as it happens.
- **A side-by-side check:** the same Claude model, asked the same question with no Qloo access, so you can see the difference for yourself.

## How we built it

- **Agent:** Claude (`claude-opus-5-5`) plans the work and calls Qloo as tools. It resolves each seed with `/search` and `/v2/tags` (artists and films become entities, dishes become tags like "Jollof Rice"), then runs `/v2/insights` per entity type in parallel: places filtered to the city, and artists, films and TV with the city as an audience signal. A second pass excludes heritage tags to find cross-domain matches. It makes follow-up calls when results are thin and says so when coverage is weak.
- **Grounding check:** the server keeps a ledger of every Qloo call. A pick survives only if a Qloo call actually returned it; "beyond" picks must also come from an exclusion pass and carry no heritage tag. Anything else is dropped and counted in the UI. In the London demo, 0 picks needed dropping.
- **Heritage filtering:** Qloo gives one genre several tag ids (Afrobeats alone appears under genre, style and influence ids), so the server collects every heritage tag it sees during the run, passes them to `filter.exclude.tags`, and re-checks results by tag name.
- **Streaming:** progress streams to the browser as newline-delimited JSON.
- **Fallback:** if Claude is unavailable, a deterministic planner makes the same Qloo calls so the demo never goes dark.
- **Stack:** Next.js 14 on Vercel, Anthropic SDK, Qloo hackathon API.

## How Qloo makes it better

Without Qloo, the model can only repeat what it already associates with "Nigerian". With Qloo, the London demo returned 20 picks from 11 Qloo calls, and 6 of them sit entirely outside the obvious lane: Koffee (affinity 0.97), *Power* (0.96), Popcaan (0.96), ENNY (0.96), Kojey Radical (0.95) and The Lighthouse Theatre in Camberwell. No plain chatbot links a Burna Boy and jollof fan to a Jamaican dancehall artist or a New York crime drama, but the audience data does.

The side-by-side makes the gap concrete: none of the plain model's 9 London picks appear in DualTaste's results. Its answer was Peckham, Chuku's, Ikoyi, Rema, Seyi Vibez, J Hus, *Gangs of Lagos*, *Anikulapo* and *Juju Stories*: reasonable, familiar, and with no evidence behind any of them.

## Challenges

- **Coverage for Nigerian culture varies.** Major artists resolve cleanly and dishes resolve to tags, but "Nollywood" has no tag in Qloo, and some cities return few places once heritage signals are removed. The agent reports thin coverage instead of padding.
- **Rate limits.** The hackathon key throttles bursts of parallel insights calls, so the client runs three requests at a time, retries with backoff on a 429, and caches responses server-side.
- **Keeping the model honest.** It may not add facts from its own knowledge, and the server enforces that every pick traces to a Qloo result.

## What's next

- More of the diaspora: Ghanaian, Kenyan, South African and Caribbean tastes.
- A "bridge back" mode: Nigerian films, music and Lagos places that match the tastes you picked up abroad.
- Saved taste profiles and shareable result pages.

## Built with

`next.js` `react` `vercel` `anthropic` `claude` `qloo`
