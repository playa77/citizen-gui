# Your agents, beside the UI step

Smart UI doesn't ship an orchestrator. Teams already have their own agents: a data agent, a search over their documents (RAG), a database tool. Smart UI is the UI step beside them. It prepares the parts, finds the right one for a question, fills it from whatever data your agents bring, checks it, and draws it while the data arrives.

## The turn

| Step | Who does it | Time |
|---|---|---|
| **Match** the question to a prepared part | Smart UI's matcher (`smartui.Matcher`), no model | well under a millisecond |
| **Draw** the part's outline, with the tool-call chip | the renderer (`od-surface`, `od-chat`) | a few milliseconds |
| **Fetch** the data | **your agent**: the app's own actions, RAG, a database | whatever it takes; runs at the same time as the step above |
| **Fill** the part as each piece of data lands, and check it | `smartui.pick_template` and `validate` | milliseconds |
| **Say** one or two sentences | a model, text only, streamed | about a second with a fast model |

Nothing waits for the data before the outline shows. The model never writes the part when a prepared one fits; writing one is the fallback for a question nothing prepared covers, and it is checked the same way.

## Prepare: answer types, then parts

1. `smartui.py usecases --app <your app module> --write` lists the answer types this product needs, from its own data and actions, PRODUCT.md, the project's research (`opendesigner/research/`: findings that name `answer_types`, each cited by its finding id; with none, a keyword count labelled as a fallback) and its screens, each with its reason and the library part it maps to. A type the library has no part for (an embed, for example) is listed as missing, never forced into the wrong part. With no research on what assistants in your industry show, it says so and gives the `research.py` command to run first.
2. The person confirms the list: `smartui.py usecases --confirm "table,record details,..."`.
3. `smartui.py templates --app <your app module> --write` drafts a prepared part for each read action, bound to the shape of its real data (`opendesigner/smart-ui/templates.json`). Edit titles, labels and conditions. The syntax is above `bind()` in `scripts/smartui.py`: `{path}`, lists with `each`, `when` conditions, and tones set by the data (`{"tone": path, "map": {"Unpaid": "warning", "Paid*": "success"}}`; a key ending in `*` matches by its start, and an unlisted value is neutral).

## Plug in your data agent

The UI step needs only two things from your agent: which action or query answers the question, and the data, as it arrives.

- **The app's own read actions**, as in the examples: each is a function with a plain description and its parameters. Smart UI's matcher and router pick it without a model when the question is clear.
- **A search over documents, or a database**: register it the same way. A function that yields its result as it grows makes the part fill as results land:

```python
@app.get("/api/search")
@params(query="what to look for, in the person's words")
def search_docs(query):
    """Passages from the help centre that answer a question, each with its title and link."""
    for batch in your_retriever.stream(query):     # your RAG, your index, your ranking
        yield {"results": batch}
```

- **Your own agent framework**: call Smart UI from it. Match with `smartui.Matcher(templates, actions, scope).match(question)`, fill with `smartui.pick_template(templates, action, data)`, check with `smartui.validate(...)`, then send the result to the page (`<od-surface>.process(...)`), or to a host through MCP (below). The reference server in `scripts/live.py` shows one way to run the two lanes on threads; it is an example, not something you have to use.

## Events the page understands

`od-chat.js` reads one JSON object per line from your server and also dispatches each one as an `od-chat-event` on the page:

| Event | What the person sees |
|---|---|
| `{"type": "call", "name": "show_ui", "intent", "part"}` | a small chip: which part is being built |
| `{"type": "shell", "part"}` | the part's outline, with loading blocks |
| `{"type": "part", "answer", "data"}` | the part filled so far; send it again as more data lands |
| `{"type": "text", "text"}` | the sentence, as it streams |
| `{"type": "lane", "lane", "step", "status", "ms"}` | optional: your agents' steps, for a panel that shows the work |
| `{"type": "done", ...}` | the checked turn |

## Changes and feedback

- A change the person asks for gets an approval prompt that states its consequences (`@warns`, rule `R3-consequence`).
- A change that can be undone (`@reversible`), on a button the person was shown (Fix, Undo), runs when it's pressed. Your action returns `"toast"` and `"undo"`, and the page shows the system's own toast part with Undo.
- Colours follow the data: a value that says "Unpaid" or "Failed" is never shown as success (rule `R6-tone`).

## Over MCP

In a host that renders MCP Apps, the host's model runs your agents. When it has the data, it calls `show_ui({"template": "<action>", "data": <your agent's result>})`: the prepared part is filled by code from the data you pass, and its shape, tokens and buttons are checked (not the data itself: that is your agent's result). The model writes only its sentence. `show_ui({"answer": [...]})` is the fallback, checked the same way. `show_ui` never changes data: a pressed button comes back as `OD:action <name> <context>` for the host to confirm.
