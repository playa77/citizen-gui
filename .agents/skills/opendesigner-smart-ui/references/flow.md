# The Smart UI flow, step by step

Six steps. Each has a gate where the person decides, and a file it leaves behind in `opendesigner/smart-ui/`.

```
scope ──► confirm ──► catalog ──► (each message) select ─► model ─► validate ─► render ─► audit
 reads     person      catalog.json              prompt     A2UI     errors back    <od-surface>  floors + craft
 the repo  says yes    od-components.js          top-k      answer   to the model   tokens.css    ledger
```

## 1. Scope: work out what the assistant must answer
`smartui.py scope --write` reads, and writes nothing else:

| It looks for | Where | When it can't find it |
|---|---|---|
| What the product is | `Q-scope-01` in `opendesigner/state.json`, then the Product section of PRODUCT.md, then `raw.productType` | "not known": ask what the assistant must answer |
| Who uses it | `Q-aud-01` | "not known" |
| Where the assistant lives | files named chat, assistant, copilot, conversation, ai-panel | "not known": ask where it is, or whether it exists yet |
| The framework and AI SDKs | `package.json` (and one level down), `pyproject.toml`, `requirements.txt` | "not known" |
| The tokens | `opendesigner/build/css/tokens.css`, else the project's own CSS variables | offer the opendesigner skill, or a `--ds-*` map |
| The actions | API routes (Express, Flask, FastAPI, Next.js route handlers) and tool definitions | none: the assistant only shows things |

From the product type it proposes intents (`assets/intents.json`: travel, commerce, work tools, developer tools, health, education, content) and one intent per route that changes data (approval, receipt, error). Show the proposal as a short list: intent, the part, where it came from. The person removes, adds and renames. **Nothing about their product is invented**: a product type the list does not know gives one intent, "not known", and you ask.

## 2. Confirm
`smartui.py confirm Comparison,ResultList,...` records the parts the person kept, with the date. Recommend fewer: every part in the catalog is a part the model might pick wrongly, and each costs prompt space. For a first round, four to six parts is plenty.

## 3. Catalog
`smartui.py catalog` writes:
- `catalog.json`: an A2UI v1.0 catalog (`$schema`, `$id` = `catalogId`, `protocolVersion` "1.0", `components`, `functions`, `$defs` with `anyComponent` and `anyFunction`). Each part's properties come from its slot marks and the library's `spec.data`; visual enums are filtered to the system's token families. Our extra facts sit in `metadata.extensions.opendesigner`, the place A2UI keeps for extensions (property-level hints use `x-od-*` keywords, which JSON Schema tools ignore).
- `od-components.js`: each part's own markup and script, for the renderer.

Ask once for the image hosts and link domains the assistant may use (`--allow-images`, `--allow-links`). The default is none: images and links are off until the owner names a host.

## 4. Select and prompt (each message)
`smartui.py prompt --for "<message>" [--data data.json]` (or `build_prompt()` from Python) does two things:
- **Select.** Scores every part against the message (its intents, tags and "use when"), adds the confirmed scope phrases, and keeps the top three. It also decides whether the message gives any reason for UI (R1). No reason: the prompt says "answer in text only".
- **Prompt.** The rules, the output format (after the text, one fenced `a2ui` block holding just the part as a JSON object, which the code wraps in an A2UI `createSurface`; full A2UI messages are accepted too. The short form exists because, in the first eval round, 31 of 75 Claude replies closed the five-deep A2UI brackets in the wrong order), and only the selected parts' properties in a compact form. With `--data`, the data the model may use, so R6 can be checked.

## 4b. A fast turn: a prepared part, found and filled (the reference server, `scripts/live.py`)
A person expects an answer about as fast as a page loads, and to see it build. So the model doesn't write the part each turn:
1. **Prepared ahead of time.** `smartui.py usecases` works out which answer types this product needs, from its evidence; the person confirms; `smartui.py templates` binds a part to each read action's data (`templates.json`). The owner edits the drafts.
2. **Matched, with no model.** `smartui.Matcher` scores the question against each prepared part's intent, example phrasings, action, description and data fields (BM25-style, word stems and shared starts), in well under a millisecond. The router fills the action's values from the question (an id in the action's own shape, a listed choice such as "Hollow Lane"; never from a "not"). A model routes only when the best match needs a value the question doesn't give ("the refunded one").
3. **Drawn at once, filled as data lands.** When the question's words find the action and its prepared part, the tool-call chip and the outline show in a few milliseconds, while the data is fetched; the part fills by code as each piece arrives (a generator action fills it check by check). When a model has to route the question first, the outline follows that call; when no prepared part fits, the chip and outline of the model's part show before its answer, after the data. Colours come from the data (rule `R6-tone`).
4. **One short model call.** The model writes only the sentence (a JSON reply with no part), streamed. A short fact stays a sentence with no part (R1 decides first).
5. **The fallback.** A question no prepared part covers gets a part the model writes, constrained to the chosen parts' schema (Gemini `responseJsonSchema`, Claude a forced tool or `--json-schema`; when a provider finds the schema too complex, fewer parts, then plain JSON), checked the same way. Title Case is fixed on the spot; other failures go back once.

Your own agents (a data agent, RAG) plug in beside this: `references/your-agents.md`. `evals/smart-ui/REPORT.md` has the times (to the outline, to the first data, to the full answer), the share of turns a prepared part served, and the quality, by model.

## 5. Validate
Before anything renders: `smartui.py validate reply.txt --source data.json` (or `validate()` from `od-validate.js`, which `<od-surface>` calls itself). The two validators share one fixture suite (`assets/fixtures/validator/`), so a rule cannot exist in one and not the other. Send failures back once as A2UI errors (`--a2ui`); then fall back to text.

Streaming: validate with `--partial` (or `process(messages, {partial: true})`) while the answer arrives. Missing required properties are allowed; everything else (HTML, styles, outside URLs) is still refused. The renderer shows each missing slot as a loading block.

## 6. Render and audit
`<od-surface>` renders the answer from the part's own markup, filling slots with text only. `smartui.py audit --fixtures` renders every confirmed part in every state of `states.md` and reports to `opendesigner/smart-ui/audit/REPORT.md`, with screenshots. With `--ledger`, each failure becomes an item in the audit ledger (`engine.py ledger`, owned by the core skill). The verdict is never "looks good": say how many renders were checked, which environments, and which checks did not run (for example, the craft checks when `opendesigner-review` lacks them).
