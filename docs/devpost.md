# DualTaste — Devpost submission draft

> Draft. Fill in the [brackets] once the live Qloo key is in and you've seen real results.

**Tagline:** Home tastes, wherever you are. An agent that uses Qloo's taste graph to find what Nigerians abroad will love in their new city, including things they'd never think to search for.

**Demo:** https://dualtaste.vercel.app · **Code:** https://github.com/michaelO93/dualtaste

## Inspiration

Millions of Nigerians live in London, New York, Toronto and beyond. Ask a chatbot what to do if you love Burna Boy, Nollywood and jollof, and you get the same answer everyone gets: a list of Afrobeats stars you already know and the same three "African restaurants". That isn't taste, it's a stereotype. [One sentence of your own experience here: what moving abroad felt like, what you went looking for.]

## What it does

You give DualTaste the city you live in and a few things you love from home: artists, films, dishes, vibes. It returns:

- **Beyond the obvious:** places, music and films that people with your taste love in your city, with every Afrobeats, Nollywood and Nigerian-food signal filtered out. This is the part only a taste graph can do.
- **Close to home:** the places, artists and films closest to your seeds, for when you want home.
- **Evidence for every pick:** each card links to the exact Qloo call that returned it, the affinity score, and which of your seeds the shared taste came from.
- **A side-by-side check:** the same Claude model, asked the same question without Qloo, so you can see the difference.

## How we built it

- **Agent:** Claude (`claude-opus-5-5`) plans the work and calls Qloo as tools: it resolves each seed with search (artists and films become entities, dishes and genres become tags), runs insights per entity type for the city, then runs a second pass excluding heritage tags to find cross-domain matches. It makes follow-up calls when results are thin and reports gaps honestly.
- **Grounding check:** the server keeps a ledger of every Qloo call. A recommendation survives only if a Qloo call actually returned it; "beyond" picks must also come from an exclusion pass and carry no heritage tags. Anything else is dropped and counted in the UI.
- **Live trace:** progress streams to the browser as newline-delimited JSON, so you watch each Qloo call happen.
- **Stack:** Next.js 14 on Vercel, Anthropic SDK, Qloo hackathon API.

## How Qloo makes it better

Without Qloo, the model can only repeat what it already associates with "Nigerian": the same artists, the same Nollywood titles. With Qloo, [N] of [M] picks in our London demo came from cross-domain affinity the model had no way to know, for example [real example: a non-African venue or film with its affinity score and the shared signal]. In the side-by-side comparison, [X] of the plain model's 9 picks also appear in DualTaste's results, and [Y] could not be found in Qloo at all.

## Challenges

- Coverage for Nigerian entities varies: major artists resolve cleanly, dishes resolve to tags, and some cities return few places. The agent says so instead of padding.
- Keeping the model honest: it is not allowed to add facts from its own knowledge, and the server enforces that every pick traces to a Qloo result.

## What's next

- More cities and more of the diaspora: Ghanaian, Kenyan, South African and Caribbean tastes.
- A "bridge back" mode: Nigerian films, music and Lagos places that match the tastes you picked up abroad.
- Saved taste profiles and shareable result pages.

## Built with

`next.js` `react` `vercel` `anthropic` `claude` `qloo`
