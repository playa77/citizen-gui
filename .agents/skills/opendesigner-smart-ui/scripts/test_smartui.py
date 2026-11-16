#!/usr/bin/env python3
"""Tests for Smart UI: the shared validator fixtures (Python and JavaScript must agree exactly), the slot marks, the
catalog generator, the selector, the text fallback and the scope step. Standard library; node runs the JS half when it
is installed (skipped with a note when it is not).

  python3 skills/opendesigner-smart-ui/scripts/test_smartui.py
"""
import json
import pathlib
import shutil
import subprocess
import sys
import tempfile
import unittest

HERE = pathlib.Path(__file__).resolve().parent
SKILL = HERE.parent
ROOT = SKILL.parent.parent
sys.path.insert(0, str(HERE))
import smartui  # noqa: E402
import slots  # noqa: E402  (smartui put the core scripts on the path)

FIX = SKILL / "assets" / "fixtures" / "validator"
CASES = json.loads((FIX / "cases.json").read_text())["cases"]
CAT = json.loads((FIX / "catalog.json").read_text())
TOKENS = ROOT / "examples" / "devtool-dense" / "build" / "css" / "tokens.css"


def keys(errors):
    return sorted(f"{e['rule']}@{e['path']}" for e in errors)


def py_opts(o):
    return {"partial": o.get("partial"), "source": o.get("source"), "limits": o.get("limits"), "allow_empty": o.get("allowEmpty"), "copy": o.get("copy"), "consequences": o.get("consequences"), "status": o.get("status")}


class Validator(unittest.TestCase):
    def test_python_fixtures(self):
        for c in CASES:
            with self.subTest(c["name"]):
                r = smartui.validate(c["answer"], CAT, py_opts(c["opts"]))
                self.assertEqual(keys(r["errors"]), sorted(c["expect"]), json.dumps(r["errors"], indent=1))

    def test_js_matches_python(self):
        node = shutil.which("node")
        if not node:
            self.skipTest("node is not installed: the JavaScript validator was not run")
        js = """
import { validate } from %s;
import fs from "node:fs";
const cat = JSON.parse(fs.readFileSync(%s, "utf8"));
const cases = JSON.parse(fs.readFileSync(%s, "utf8")).cases;
const out = {};
for (const c of cases) out[c.name] = validate(c.answer, cat, c.opts).errors.map((e) => `${e.rule}@${e.path}`).sort();
console.log(JSON.stringify(out));
""" % (json.dumps((SKILL / "assets" / "od-validate.js").as_uri()), json.dumps(str(FIX / "catalog.json")), json.dumps(str(FIX / "cases.json")))
        r = subprocess.run([node, "--input-type=module", "-e", js], capture_output=True, text=True)
        self.assertEqual(r.returncode, 0, r.stderr)
        got = json.loads(r.stdout)
        for c in CASES:
            with self.subTest(c["name"]):
                self.assertEqual(got[c["name"]], sorted(c["expect"]))

    def test_renderer_dates_and_approval_rows(self):
        node = shutil.which("node")
        if not node:
            self.skipTest("node is not installed")
        js = """
globalThis.HTMLElement = class {};
const { fmt, ODSurface } = await import(%s);
const out = { dates: [fmt("2026-11-01", "en-GB"), fmt("2026-11-01", "en-US"), fmt("TH-1043", "en-GB"), fmt("2026-11-14T09:30", "en-GB"), fmt("Uploaded on 2026-11-03", "en-GB"), fmt("Ref 2026-1104-77", "en-GB")] };
const c = { component: "ApprovalPrompt", details: [{ label: "Invoice number", value: "TH-1043" }, { label: "Number", value: "TH-1043" }, { label: "Amount", value: "€184.00" }],
            approve: { label: "Pay", event: { name: "pay_invoice", context: { number: "TH-1043", amount: "€500.00" } } } };
out.rows = ODSurface.prototype.approvalDetails.call({}, c).details;
console.log(JSON.stringify(out));
""" % json.dumps((SKILL / "assets" / "od-surface.js").as_uri())
        r = subprocess.run([node, "--input-type=module", "-e", js], capture_output=True, text=True)
        self.assertEqual(r.returncode, 0, r.stderr)
        got = json.loads(r.stdout)
        self.assertEqual(got["dates"], ["1 Nov 2026", "Nov 1, 2026", "TH-1043", "14 Nov 2026, 09:30", "Uploaded on 3 Nov 2026", "Ref 2026-1104-77"])
        rows = got["rows"]
        self.assertEqual([d["value"] for d in rows].count("TH-1043"), 1)  # one row per value
        self.assertEqual(rows[0], {"label": "Invoice number", "value": "TH-1043"})  # the answer's own label
        self.assertIn({"label": "Amount", "value": "€500.00"}, rows)  # what the button sends wins over what the text says
        self.assertNotIn({"label": "Amount", "value": "€184.00"}, rows)

    def test_extract(self):
        self.assertIsNone(smartui.extract_answer("Paris is the capital of France."))
        self.assertEqual(smartui.extract_answer('Here:\n```a2ui\n[{"version": "1.0"}]\n```'), [{"version": "1.0"}])
        self.assertIn("__parse_error__", smartui.extract_answer("```a2ui\n[{oops\n```"))

    def test_text_fallback(self):
        ans = [c for c in CASES if c["name"] == "ok-results-named"][0]["answer"]
        r = smartui.validate(ans, CAT)
        t = smartui.to_text(r["surfaces"], CAT)
        self.assertIn("Harbour room", t)
        self.assertNotIn("book_room", t)


class Marks(unittest.TestCase):
    def test_every_marked_component_passes(self):
        lib = smartui.LIB
        for d in sorted(p for p in lib.iterdir() if (p / "component.html").exists()):
            src = (d / "component.html").read_text()
            if not slots.has_marks(src):
                continue
            with self.subTest(d.name):
                self.assertEqual(slots.check_marks(src), [])
                spec = json.loads((d / "meta.json").read_text()).get("spec", {})
                if spec.get("data"):
                    self.assertEqual(slots.check_against_spec(src, spec["data"]), [])

    def test_bad_marks_are_caught(self):
        bad = """<style>.odl-x [data-tone="a"]{}</style><div class="odl-x">
<p data-od-slot="Title">x</p><p data-od-slot="t"><b>no</b></p><span data-od-media="m"></span>
<ul data-od-list="items"><li>no item mark</li></ul><p data-od-var="tone" data-tone="a"></p><p data-od-bogus="1"></p></div>"""
        errs = " ".join(slots.check_marks(bad))
        for want in ("is not a name", "holds elements", "goes on an <img>", "no data-od-item", "at least two", "unknown mark"):
            self.assertIn(want, errs)


class Catalog(unittest.TestCase):
    def test_set_components_exist_and_are_marked(self):
        missing = []
        for c in smartui.load_set()["components"]:
            p = smartui.LIB / c["slug"] / "component.html"
            if not p.exists() or not slots.has_marks(p.read_text()):
                missing.append(c["slug"])
        self.assertEqual(missing, [], "in set.json but not in the library with marks")

    def test_components_md_is_current(self):
        self.assertEqual((smartui.SKILL / "references" / "components.md").read_text(), smartui.components_md(),
                         "run: smartui.py components --write")

    def test_catalog_shape(self):
        cat, bundle = smartui.build_catalog(TOKENS, "Test system", ["images.unsplash.com"])
        self.assertEqual(cat["protocolVersion"], "1.0")
        self.assertEqual(cat["$id"], cat["catalogId"])
        self.assertIn("anyComponent", cat["$defs"])
        self.assertIn("anyFunction", cat["$defs"])
        for name, s in cat["components"].items():
            with self.subTest(name):
                self.assertEqual(s["properties"]["component"], {"const": name})
                self.assertFalse(s.get("additionalProperties", True))
                flat = json.dumps(s)
                for word in ('"style"', '"class"', '"color"', '"theme"'):
                    self.assertNotIn(word + ":", flat.replace(" ", ""))
        self.assertTrue(set(bundle) <= set(cat["components"]))

    def test_visual_enums_are_token_names(self):
        cat, _ = smartui.build_catalog(TOKENS, "Test")
        names = smartui.token_names(TOKENS)

        def walk(s):
            if isinstance(s, dict):
                if s.get("x-od-token"):
                    for v in s["enum"]:
                        self.assertTrue(smartui.token_backed(v, names), v)
                for x in s.values():
                    walk(x)
            elif isinstance(s, list):
                for x in s:
                    walk(x)
        walk(cat["components"])


class Templates(unittest.TestCase):
    DATA = {"vehicle": "AB12 CDE", "seats": 12, "fines": [
        {"reference": "FH1", "status": "Unpaid", "amount": "£70.00", "file": None},
        {"reference": "FH2", "status": "Paid", "amount": "£35.00", "file": "a.pdf"}]}

    def test_bind_paths_lists_tones_and_conditions(self):
        t = {"component": "KeyFacts", "title": "Fines for {vehicle}", "facts": [
            {"label": "Seats", "value": "{seats|text}"},
            {"label": "Unpaid", "value": "{fines[status=Unpaid][0].reference}", "tone": {"tone": "fines[status=Unpaid][0].status", "map": {"Unpaid": "warning", "*": "success"}}},
            {"when": "count(fines[status=Unpaid]) > 5", "then": {"label": "Many", "value": "yes"}}],
            "rows": {"each": "fines", "item": {"cells": [{"text": "{.reference}"}, {"text": "{.file|or:–}"}]}}}
        out = smartui.bind(t, self.DATA)
        self.assertEqual(out["title"], "Fines for AB12 CDE")
        self.assertEqual(out["facts"][0]["value"], "12")
        self.assertEqual(out["facts"][1], {"label": "Unpaid", "value": "FH1", "tone": "warning"})
        self.assertEqual(len(out["facts"]), 2)  # the condition did not hold
        self.assertEqual(out["rows"][0]["cells"][1]["text"], "–")

    def test_pick_the_first_template_whose_condition_holds(self):
        ts = [{"action": "list_fines", "when": "count(fines[status=Unpaid]) == 2", "part": {"component": "A"}},
              {"action": "list_fines", "when": "count(fines[status=Unpaid]) == 1", "part": {"component": "B"}},
              {"action": "list_fines", "part": {"component": "C"}}]
        self.assertEqual(smartui.pick_template(ts, "list_fines", self.DATA)[1]["component"], "B")
        self.assertIsNone(smartui.pick_template(ts, "other", self.DATA))

    def test_drafts_fit_the_data_they_came_from(self):
        cat = json.loads((ROOT / "examples" / "smart-ui-fernhollow" / "opendesigner" / "smart-ui" / "catalog.json").read_text())
        res = {"application": {"reference": "RP-1", "steps": [{"label": "Sent", "state": "done"}, {"label": "Checked", "state": "current"}]}}
        t = smartui.draft_template("application_status", res, cat)
        part = smartui.bind(t["part"], res)
        self.assertEqual(part["component"], "ProgressStatus")
        self.assertEqual(part["status"], "Checked")
        self.assertTrue(smartui.validate(smartui.wrap(part), cat, {"source": res})["ok"])


class McpTemplate(unittest.TestCase):
    def test_show_ui_fills_a_template_from_the_data_agents_result(self):
        import os
        mcp = ROOT / "server" / "mcp"
        if not (mcp / "smartui_tool.py").exists():
            self.skipTest("no MCP server in this copy")
        sys.path.insert(0, str(mcp))
        import importlib
        import live
        os.environ["OD_PROJECT"] = str(ROOT / "examples" / "smart-ui-fernhollow")
        self.addCleanup(os.environ.pop, "OD_PROJECT", None)
        tool = importlib.import_module("smartui_tool")
        app = live.load_app(ROOT / "examples" / "smart-ui-fernhollow" / "server.py")

        class Refused(Exception):
            pass
        sc, _ = tool.show_ui({"template": "list_fines", "data": app.ACTIONS["list_fines"]["fn"]()}, Refused)
        self.assertEqual(sc["answer"][0]["createSurface"]["components"][0]["component"], "KeyFacts")
        with self.assertRaises(Refused):
            tool.show_ui({"template": "no_such_action", "data": {}}, Refused)


class SmallEdits(unittest.TestCase):
    CAT = {"components": {"T": {"properties": {"title": {"type": "string"}, "summary": {"type": "string"}, "tone": {"type": "string", "enum": ["neutral", "danger"]},
                                               "rows": {"type": "array"}}, "required": ["component", "id", "title", "rows"]}}}
    PART = {"component": "T", "id": "root", "title": "Invoices", "summary": "3 in all", "tone": "neutral",
            "rows": [{"n": "A", "s": "paid"}, {"n": "B", "s": "unpaid"}, {"n": "C", "s": "unpaid"}]}

    def test_keep_order_hide_and_set(self):
        out, done = smartui.apply_edit(self.PART, {"keep": [2, 1], "hide": ["summary"], "set": {"tone": "danger"}}, self.CAT)
        self.assertEqual([r["n"] for r in out["rows"]], ["C", "B"])
        self.assertNotIn("summary", out)
        self.assertEqual(out["tone"], "danger")
        self.assertEqual(len(done), 3)

    def test_anything_else_is_ignored(self):
        out, done = smartui.apply_edit(self.PART, {"keep": [7], "hide": ["title"], "set": {"tone": "red"}, "rows": []}, self.CAT)
        self.assertEqual((out, done), (self.PART, []))  # no such row, a required slot, an option the part lacks

    def test_the_schema_lists_only_what_may_change(self):
        sch = smartui.edit_schema(self.PART, self.CAT)
        self.assertEqual(sch["properties"]["hide"]["items"]["enum"], ["summary", "tone"])
        self.assertEqual(sch["properties"]["set"]["properties"]["tone"]["enum"], ["neutral", "danger"])


class AuditFixes(unittest.TestCase):
    def test_tone_maps_match_starts_and_default_to_neutral(self):
        m = {"tone": "s", "map": {"Unpaid": "warning", "Paid*": "success"}}
        self.assertEqual(smartui.bind(m, {"s": "Paid £35.00 on 25 August"}), "success")
        self.assertEqual(smartui.bind(m, {"s": "Under review"}), "neutral")

    def test_tone_rule_reads_the_whole_value(self):
        for value in ("No", "No issues found"):
            errs = []
            smartui.tones_from_data({"facts": [{"label": "Overdue", "value": value, "tone": "success"}]}, "/c", errs, "s1")
            self.assertEqual(errs, [], value)

    def test_questions_that_want_a_part(self):
        self.assertFalse(smartui.select("when can I book an appointment?", {"components": {}}, 3, None, None, {"TimeSlots": 3})["short_fact"])
        self.assertTrue(smartui.select("When is the next invoice due?", {"components": {}}, 3, None, None, {"DataTable": 3})["short_fact"])

    def test_a_refresh_keeps_the_confirmed_use_cases(self):
        with tempfile.TemporaryDirectory() as t:
            root = pathlib.Path(t)
            (root / "opendesigner" / "smart-ui").mkdir(parents=True)
            dest = root / "opendesigner" / "smart-ui" / "use-cases.json"
            dest.write_text(json.dumps({"answer_types": [], "confirmed": ["table"], "confirmed_on": "2026-11-16"}))
            import argparse
            smartui.cmd_usecases(argparse.Namespace(project=str(root), app=None, write=True, json=False, confirm=None))
            self.assertEqual(json.loads(dest.read_text())["confirmed"], ["table"])


class CopyRules(unittest.TestCase):
    def test_duplicate_rows_are_text_facts_only(self):
        errs = []
        smartui.duplicate_rows([{"label": "Number", "value": "TH-1043"}, {"label": "Invoice number", "value": "TH-1043"}], "/f", errs, "s1")
        self.assertEqual([e["rule"] for e in errs], ["duplicate-row"])
        errs = []  # a chart's months can have the same value
        smartui.duplicate_rows([{"label": "Jan", "value": 12}, {"label": "Feb", "value": 12}], "/p", errs, "s1")
        self.assertEqual(errs, [])

    def test_two_questions_in_one_are_not_a_short_fact(self):
        cat = json.loads((ROOT / "examples" / "smart-ui-support" / "opendesigner" / "smart-ui" / "catalog.json").read_text())
        self.assertTrue(smartui.select("What plan are we on and when does it renew?", cat, 3, None, {}, {"KeyFacts": 3})["ui"])
        self.assertFalse(smartui.select("How many seats do we have right now?", cat, 3, None, {}, {"KeyFacts": 3})["ui"])


class Selector(unittest.TestCase):
    cat = None

    @classmethod
    def setUpClass(cls):
        cls.cat, _ = smartui.build_catalog(TOKENS, "Test", ["images.unsplash.com"])

    def test_no_ui_for_short_facts(self):
        for m in ("What is the capital of Peru?", "When does the shop open?", "How many seats are left?"):
            with self.subTest(m):
                self.assertFalse(smartui.select(m, self.cat)["ui"])

    def test_fetched_data_does_not_override_r1(self):
        sel = smartui.select("How many seats do we have right now?", self.cat, 3, None, None, {"KeyFacts": 5})
        self.assertFalse(sel["ui"])

    def test_prompt_lists_only_candidates(self):
        text, sel = smartui.build_prompt("Compare the three fare types side by side", self.cat, k=3)
        self.assertTrue(sel["ui"])
        self.assertLessEqual(len(sel["candidates"]), 3)
        others = [n for n in self.cat["components"] if n not in sel["candidates"] and n != "Column"]
        for n in others:
            self.assertNotIn(f"- {n}:", text)


class Scope(unittest.TestCase):
    def test_scope_reads_a_repo_and_marks_gaps(self):
        with tempfile.TemporaryDirectory() as t:
            root = pathlib.Path(t)
            (root / "package.json").write_text(json.dumps({"dependencies": {"next": "15", "ai": "5"}}))
            (root / "app" / "api" / "bookings").mkdir(parents=True)
            (root / "app" / "api" / "bookings" / "route.ts").write_text("export async function POST(req) { return Response.json({}) }")
            (root / "components").mkdir()
            (root / "components" / "ChatPanel.tsx").write_text("export function ChatPanel() { return null }")
            s = smartui.scope(root)
            self.assertEqual(s["framework"], "Next.js")
            self.assertIn("Vercel AI SDK", s["ai_sdks"])
            self.assertIn("components/ChatPanel.tsx", s["chat_surface"])
            self.assertTrue(any(a.get("method") == "POST" and a["changes_data"] for a in s["actions"]))
            self.assertTrue(any("product type" in n for n in s["not_known"]))
            self.assertEqual(s["intents"][0]["intent"], "not known")


class Routes(unittest.TestCase):
    def test_read_routes_become_parts(self):
        cases = [({"path": "/api/invoices", "name": "list_invoices", "doc": "with number, status and due date"}, ["DataTable"]),
                 ({"path": "/api/invoices/<number>", "name": "get_invoice", "doc": "one invoice and its PDF file"}, ["FileCard", "KeyFacts"]),
                 ({"path": "/api/usage", "name": "get_usage", "doc": "calls per month"}, ["LineChart", "BarChart"]),
                 ({"path": "/api/plans", "name": "list_plans", "doc": ""}, ["Comparison"]),
                 ({"path": "/api/subscription", "name": "get_subscription", "doc": "plan, seats"}, ["KeyFacts"]),
                 ({"path": "/api/refunds/:id", "name": "refund_status", "doc": ""}, ["ProgressStatus"]),
                 ({"path": "/api/ping", "name": "ping", "doc": ""}, [])]
        for a, want in cases:
            with self.subTest(a["path"]):
                self.assertEqual(smartui.route_parts(a), want)

    def test_example_app_scope(self):
        s = smartui.scope(ROOT / "examples" / "smart-ui-support")
        gets = {i["from"].split()[1]: i["components"] for i in s["intents"] if i["from"].startswith("GET")}
        self.assertEqual(gets["/api/usage"], ["LineChart", "BarChart"])
        self.assertEqual(sum(1 for a in s["actions"] if a.get("changes_data")), 3)
        self.assertIn("web/assistant.js", s["chat_surface"])


class Live(unittest.TestCase):
    """The live loop with a scripted model: routing, the repair round, and approvals (R3)."""

    def setUp(self):
        import live
        self.live = live
        self.app = live.load_app(ROOT / "examples" / "smart-ui-support" / "server.py")
        self.ran = []
        live.Conversation.USE_TEMPLATES = False  # these test the model-written path
        self.addCleanup(setattr, live.Conversation, "USE_TEMPLATES", True)
        a = self.app.ACTIONS["pay_invoice"]
        a["fn"] = (lambda f: (lambda **kw: (self.ran.append(kw), f(**kw))[1]))(a["fn"])

    def script(self, replies, routes=()):
        """A scripted model: routing calls (a schema with "calls") take from routes, answers from replies."""
        it, rt = iter(replies), iter(routes)
        self.asked = []

        def ask(provider, system, turns, schema=None, on_text=None):
            if isinstance(schema, dict) and "calls" in schema.get("properties", {}):
                return next(rt, '{"calls": []}')
            self.asked.append(schema)
            return next(it)
        self.live.ask = ask

    def test_route_answer_repair(self):
        bad = '```a2ui\n{"component": "DataTable", "title": "<b>Open</b>", "columns": [], "rows": []}\n```'
        good = 'Two are open.\n```a2ui\n{"component": "KeyFacts", "title": "Open invoices", "facts": [{"label": "TH-1047", "value": "€1,104.00"}, {"label": "TH-1043", "value": "€184.00"}]}\n```'
        self.script([bad, good])
        conv = self.live.Conversation(self.app, "scripted")
        r = conv.answer("Show my open invoices")
        self.assertEqual([c[0] for c in r["log"]["calls"]], ["list_invoices"])  # routed by its words, no model call
        self.assertFalse(r["log"]["routed_by_model"])
        self.assertEqual(self.ran, [])
        self.assertTrue(r["log"]["first_errors"])
        self.assertTrue(r["log"]["repaired"])
        self.assertEqual(r["log"]["part"], "KeyFacts")
        self.assertIsNotNone(r["answer"])

    def test_a_model_route_never_runs_a_change(self):
        self.script(["It was refunded on 1 June."],
                    ['{"calls": [{"action": "list_invoices", "args": {}}, {"action": "pay_invoice", "args": {"number": "TH-1047"}}]}'])
        r = self.live.Conversation(self.app, "scripted").answer("What happened to the refunded one?")
        self.assertTrue(r["log"]["routed_by_model"])  # refund_status needs an invoice the message doesn't name
        self.assertEqual([c[0] for c in r["log"]["calls"]], ["list_invoices"])  # the change was dropped (R3)
        self.assertEqual(self.ran, [])

    def test_an_id_in_the_message_fills_the_action(self):
        conv = self.live.Conversation(self.app, "scripted")
        calls, sure = conv.fast_route("Can I get invoice TH-1046?")
        self.assertTrue(sure)
        self.assertEqual(calls[0], ("get_invoice", {"number": "TH-1046"}))
        self.assertEqual(conv.fast_route("Compare the plans")[0][0][0], "list_plans")
        self.assertEqual(conv.fast_route("Show my open invoices")[0][0], ("list_invoices", {"status": "open"}))  # a listed choice

    def test_a_negation_never_fills_a_choice(self):
        conv = self.live.Conversation(self.app, "scripted")
        self.assertEqual(conv.fast_route("Which invoices haven't we paid yet?")[0][0], ("list_invoices", {}))  # not status=paid
        self.assertEqual(conv.fast_route("Thanks, that's all"), ([], False))  # "all" is not a request

    def test_structured_reply_and_skeleton(self):
        reply = json.dumps({"text": "Two are open.", "part": {"component": "KeyFacts", "title": "Open invoices", "facts": [
            {"label": "TH-1047", "value": "€1,104.00"}, {"label": "TH-1043", "value": "€184.00"}]}})
        self.script([reply])
        events = []
        r = self.live.Conversation(self.app, "scripted").answer("Show my open invoices", on_event=events.append)
        kinds = [e["type"] for e in events]
        self.assertIn("skeleton", kinds)
        self.assertLess(kinds.index("skeleton"), kinds.index("done") if "done" in kinds else len(kinds))  # drawn before the answer
        self.assertIn("call", kinds)  # the tool-call chip (show_ui)
        self.assertEqual(r["log"]["part"], "KeyFacts")
        self.assertIn("KeyFacts", json.dumps(self.asked[0]))  # the reply was constrained to the chosen parts
        self.assertIn("skeleton", r["log"]["ms"])

    def test_a_part_under_its_own_name(self):
        reply = json.dumps({"text": "Two are open.", "part": {"KeyFacts": {"title": "Open invoices", "facts": [
            {"label": "TH-1047", "value": "€1,104.00"}, {"label": "TH-1043", "value": "€184.00"}]}}})
        self.script([reply])
        r = self.live.Conversation(self.app, "scripted").answer("Show my open invoices")
        self.assertEqual(r["log"]["part"], "KeyFacts")
        sch = smartui.response_schema(self.live.Conversation(self.app, "scripted").catalog, ["KeyFacts", "DataTable"])
        self.assertEqual(sorted(sch["properties"]["part"]["properties"]), ["DataTable", "KeyFacts"])  # one key per part

    def test_a_reversible_change_runs_on_its_shown_button_with_a_toast(self):
        done = []
        fix = lambda id: (done.append(id), {"fixed": id, "toast": f"Fixed {id}", "undo": {"name": "unfix", "context": {"id": id}}})[1]
        unfix = lambda id: (done.append("undo " + id), {"toast": "Change undone"})[1]
        self.app.ACTIONS["fix"] = {"description": "Fix a check.", "changes": True, "reversible": True, "fn": fix, "params": {"id": "check"}}
        self.app.ACTIONS["unfix"] = {"description": "Undo a fix.", "changes": True, "reversible": True, "fn": unfix, "params": {"id": "check"}}
        self.script(["Do you want me to fix it?"] * 8)
        conv = self.live.Conversation(self.app, "scripted")
        r = conv.press({"name": "fix", "context": {"id": "c3"}})  # never shown: asks, runs nothing
        self.assertEqual(done, [])
        shown = [{"createSurface": {"components": [{"x": {"label": "Fix", "event": {"name": "fix", "context": {"id": "c3"}}}}]}}]
        conv._remember_offers(shown)  # a part the model wrote: not enough to run a change on a press
        conv.press({"name": "fix", "context": {"id": "c3"}})
        self.assertEqual(done, [])
        conv._remember_offers(shown, prepared=True)  # a prepared part showed it
        r = conv.press({"name": "fix", "context": {"id": "c3"}})
        self.assertEqual(done, ["c3"])
        self.assertEqual(r["toast"]["text"], "Fixed c3")
        self.assertEqual(r["toast"]["undo"]["name"], "unfix")
        conv.press(r["toast"]["undo"])  # Undo, once
        conv.press(r["toast"]["undo"])
        self.assertEqual(done, ["c3", "undo c3"])
        self.assertEqual(conv.press({"name": "fix", "context": {"id": "c3"}}).get("toast"), None)  # the offer was used
        self.assertEqual(done, ["c3", "undo c3"])

    def test_a_template_fills_the_part_and_the_model_writes_the_sentence(self):
        self.live.Conversation.USE_TEMPLATES = True
        app = self.live.load_app(ROOT / "examples" / "smart-ui-fernhollow" / "server.py")
        self.script([json.dumps({"text": "You have one unpaid fine: £35.00 until Thursday 19 November.", "part": None})])
        events = []
        r = self.live.Conversation(app, "scripted").answer("have I got any parking fines?", on_event=events.append)
        kinds = [e["type"] for e in events]
        self.assertTrue(kinds.index("call") < kinds.index("shell") < kinds.index("part"))
        self.assertTrue(r["log"]["template"])
        part = r["answer"][0]["createSurface"]["components"][0]
        self.assertEqual(part["component"], "KeyFacts")
        self.assertEqual(part["action"]["event"], {"name": "pay_fine", "context": {"reference": "FH40018273"}})
        self.assertNotIn("KeyFacts", json.dumps(self.asked[0]))  # the model was asked for text only
        self.assertEqual(r["log"]["first_errors"], [])

    def test_money_deletion_sending_and_booking_never_run_on_one_press(self):
        conv = self.live.Conversation(self.app, "scripted")
        risky = {"pay_invoice": "Pay one open invoice now with the card on file.", "delete_file": "Delete a file.",
                 "send_reminder": "Email a reminder.", "book_slot": "Book an appointment.", "fix": "Fix a check."}
        for name, doc in risky.items():
            a = {"description": doc, "changes": True, "reversible": True, "fn": lambda **k: {}, "params": {}}
            self.assertEqual(conv._one_press(name, a), name == "fix", name)
        self.assertFalse(conv._one_press("fix", {"description": "Fix a check.", "reversible": True, "consequences": ["It edits your CSS."]}))
        # and a payment marked reversible, on a prepared part, still asks first: nothing is paid
        self.app.ACTIONS["pay_invoice"]["reversible"] = True
        self.addCleanup(self.app.ACTIONS["pay_invoice"].pop, "reversible", None)
        self.script(["Do you want to pay it?"] * 3)
        conv = self.live.Conversation(self.app, "scripted")
        conv._remember_offers([{"createSurface": {"components": [{"x": {"label": "Pay", "event": {"name": "pay_invoice", "context": {"number": "TH-1043"}}}}]}}], prepared=True)
        r = conv.press({"name": "pay_invoice", "context": {"number": "TH-1043"}})
        self.assertEqual(self.ran, [])
        self.assertIsNone(r.get("toast"))

    def test_a_near_miss_is_an_edit_of_the_prepared_part(self):
        self.live.Conversation.USE_TEMPLATES = True
        app = self.live.load_app(ROOT / "examples" / "smart-ui-fernhollow" / "server.py")
        conv = self.live.Conversation(app, "scripted")
        n = len(app.ACTIONS["list_offices"]["fn"]()["offices"])
        self.script([json.dumps({"text": "Hollow Lane is the one open on Saturday.", "edit": {"keep": [0]}})])
        r = conv.answer("Which offices are open on Saturday?")
        rows = r["answer"][0]["createSurface"]["components"][0]["rows"]
        self.assertEqual(r["log"]["mode"], "edit")
        self.assertEqual(len(rows), 1)
        self.assertGreater(n, 1)

    def test_change_needs_the_renderers_approval(self):
        self.script(["It's paid.", "It's paid."])
        conv = self.live.Conversation(self.app, "scripted")
        r = conv.press({"name": "pay_invoice", "context": {"number": "TH-1043"}})  # a "Pay" button on a record: a request
        self.assertEqual(self.ran, [])  # nothing is paid; the reply is the model's (its approval prompt in real use)
        self.assertEqual(r["text"], "It's paid.")
        conv.press({"name": "pay_invoice", "context": {"number": "TH-1043", "approved": True}})  # approved, but never offered
        self.assertEqual(self.ran, [])
        conv._remember_offers([{"createSurface": {"components": [{"approve": {"label": "Pay", "event": {"name": "pay_invoice", "context": {"number": "TH-1043"}}}}]}}])
        conv.press({"name": "pay_invoice", "context": {"number": "TH-1047", "approved": True}})  # offered one invoice, sent another
        self.assertEqual(self.ran, [])
        conv.press({"name": "pay_invoice", "context": {"number": "TH-1043", "approved": True}})
        self.assertEqual(self.ran, [{"number": "TH-1043"}])
        conv.press({"name": "pay_invoice", "context": {"number": "TH-1043", "approved": True}})  # an offer is used once
        self.assertEqual(len(self.ran), 1)

    def test_title_case_is_fixed_without_a_model_call(self):
        title_case = 'Two are open.\n```a2ui\n{"component": "KeyFacts", "title": "Unpaid Invoices On The Team Plan", "facts": [{"label": "TH-1047", "value": "€1,104.00"}, {"label": "TH-1043", "value": "€184.00"}]}\n```'
        self.script([title_case])
        r = self.live.Conversation(self.app, "scripted").answer("Which invoices haven't we paid?")
        self.assertIn("copy-case /0/createSurface/components/0/title", r["log"]["first_errors"])
        self.assertFalse(r["log"]["repaired"])
        self.assertEqual(r["log"]["case_fixed"], 1)
        self.assertEqual(r["answer"][0]["createSurface"]["components"][0]["title"], "Unpaid invoices on the Team plan")

    def test_only_wording_left_still_shows(self):
        filler = 'The invoice was successfully paid.\n```a2ui\n{"component": "KeyFacts", "title": "Paid", "facts": [{"label": "Invoice", "value": "TH-1043"}, {"label": "Amount", "value": "€184.00"}]}\n```'
        self.script([filler, filler])
        r = self.live.Conversation(self.app, "scripted").answer("Did it go through?")
        self.assertTrue(r["log"]["repaired"])
        self.assertIsNotNone(r["answer"])  # wording alone never costs the person the part
        self.assertEqual(r["log"]["final_errors"], ["copy-word text"])

    def test_still_wrong_after_repair_is_text_only(self):
        bad = '```a2ui\n{"component": "Nope"}\n```'
        self.script(["Here.\n" + bad, "Here again.\n" + bad])
        r = self.live.Conversation(self.app, "scripted").answer("Compare the plans")
        self.assertIsNone(r["answer"])
        self.assertTrue(r["log"]["final_errors"])


class Render(unittest.TestCase):
    def test_a_part_rendered_before_it_is_attached_still_runs_its_script(self):
        try:
            from playwright.sync_api import sync_playwright
        except ImportError:
            self.skipTest("Playwright for Python is not installed")
        import surface_audit as A
        with tempfile.TemporaryDirectory() as t:
            cat, bundle = smartui.build_catalog(TOKENS, "Test", ["images.unsplash.com"], only={"data-table"})
            pathlib.Path(t, "cat").mkdir()
            pathlib.Path(t, "cat", "catalog.json").write_text(json.dumps(cat))
            pathlib.Path(t, "cat", "od-components.js").write_text(smartui.bundle_js(bundle))
            fx = json.loads(A.fixture_path("data-table").read_text())
            with tempfile.TemporaryDirectory() as site, A.serve(site) as url:
                A.stage(pathlib.Path(t, "cat"), TOKENS, site)
                with sync_playwright() as p:
                    b = A.launch(p)
                    pg = b.new_page()
                    pg.goto(url + "/index.html")
                    pg.wait_for_function("window.__ready === true")
                    n = pg.evaluate("""async (fx) => {
                      const s = document.createElement("od-surface");
                      s.catalog = await (await fetch("catalog.json")).json();
                      s.process([{version: "1.0", createSurface: {surfaceId: "x", components: [{...fx, id: "root", component: "DataTable"}]}}]);
                      document.body.append(s);   // attached after rendering, as a chat that builds a turn first does
                      return s.querySelectorAll("thead th").length; }""", fx)
                    b.close()
        self.assertGreater(n, 0, "the table's own script never built its header row")


class Offer(unittest.TestCase):
    def test_offer_on_a_chat_and_not_without(self):
        with tempfile.TemporaryDirectory() as t:
            root = pathlib.Path(t)
            (root / "index.html").write_text("<h1>Shop</h1>")
            self.assertIsNone(smartui.offer_reason(root))
            (root / "src").mkdir()
            (root / "src" / "SupportChat.tsx").write_text("export const SupportChat = () => null")
            self.assertIn("SupportChat.tsx", smartui.offer_reason(root))

    def test_no_second_offer_after_an_answer(self):
        with tempfile.TemporaryDirectory() as t:
            root = pathlib.Path(t)
            (root / "assistant.js").write_text("")
            (root / "opendesigner").mkdir()
            (root / "opendesigner" / "state.json").write_text(json.dumps({"profile": {"smart_ui": "declined"}}))
            self.assertIsNone(smartui.offer_reason(root))


PICTURE_PARTS = {"ProductGrid": "product-grid", "PlaceList": "place-list", "PlaceCard": "place-card", "ProductDetail": "product-gallery",
                 "StayCard": "stay-card", "RecipeCard": "recipe-card", "EventCard": "event-card", "HomeListing": "home-listing"}


class PictureParts(unittest.TestCase):
    """The picture parts: each fixture validates, drafts bind from real-looking data, and the picture rules refuse what they should."""
    cat = None

    @classmethod
    def setUpClass(cls):
        cls.cat, _ = smartui.build_catalog(TOKENS, "Test", ["images.unsplash.com", "img.northfold.example"])

    def fixture(self, name):
        return {**json.loads((smartui.LIB / PICTURE_PARTS[name] / "fixture.json").read_text()), "component": name}

    def errs(self, part):
        return [e["rule"] for e in smartui.validate(smartui.wrap(part), self.cat)["errors"]]

    def test_every_picture_part_is_in_the_catalog_and_its_fixture_validates(self):
        for name in PICTURE_PARTS:
            with self.subTest(name):
                self.assertIn(name, self.cat["components"])
                self.assertEqual(self.errs(self.fixture(name)), [])

    def first_media(self, part):
        """The first picture record in a part (a dict with src), for the tests to break."""
        stack = [part]
        while stack:
            v = stack.pop(0)
            if isinstance(v, dict):
                if "src" in v:
                    return v
                stack += list(v.values())
            elif isinstance(v, list):
                stack += v
        return None

    def test_missing_alt_ratio_and_currency_fail_in_every_part(self):
        for name in PICTURE_PARTS:
            with self.subTest(name):
                part = self.fixture(name)
                m = self.first_media(part)
                m.pop("alt")
                self.assertIn("R5-alt", self.errs(part))
                part = self.fixture(name)
                m = self.first_media(part)
                for k in ("width", "height", "ratio"):
                    m.pop(k, None)
                self.assertIn("R5-ratio", self.errs(part))
        for name, where in (("ProductGrid", lambda p: p["items"][0]), ("EventCard", lambda p: p), ("HomeListing", lambda p: p), ("StayCard", lambda p: p)):
            with self.subTest(name + " currency"):
                part = self.fixture(name)
                where(part)["price"] = "149"
                self.assertIn("R6-currency", self.errs(part))

    def test_stock_that_is_gone_or_nearly_gone_is_never_success(self):
        for name, where, key in (("ProductGrid", lambda p: p["items"][0], "status"), ("EventCard", lambda p: p, "status"),
                                 ("ProductDetail", lambda p: p, "stock"), ("PlaceList", lambda p: p["places"][0], "status")):
            for said in ("Sold out", "Only 2 left", "Fully booked"):
                with self.subTest(f"{name}: {said}"):
                    part = self.fixture(name)
                    where(part)[key] = said
                    where(part)["tone"] = "success"
                    self.assertIn("R6-stock", self.errs(part))
                    where(part)["tone"] = "danger" if said != "Only 2 left" else "warning"
                    self.assertNotIn("R6-stock", self.errs(part))

    def test_drafts_bind_picture_data_into_parts_that_validate(self):
        img = "https://img.northfold.example/coats/"
        cases = {
            "ProductGrid": {"coats": [{"id": "c1", "name": "Rose wool coat", "price": "£149", "was_price": "£199", "stock": "Only 2 left", "sizes": ["S", "M"],
                                       "image": img + "pink-coat.webp", "image_alt": "Pink coat on a hanger", "image_width": 683, "image_height": 1024},
                                      {"id": "c2", "name": "Long overcoat", "price": "£189", "stock": "In stock", "sizes": ["M", "L"],
                                       "image": img + "overcoat-front.webp", "image_alt": "Brown overcoat", "image_width": 800, "image_height": 1160}]},
            "PlaceList": {"cafes": [{"name": "The Reading Room", "area": "Mill Street", "rating": 4.8, "distance": "6 min walk", "status": "Open until 20:00",
                                     "photo": {"src": img + "a.webp", "alt": "A café", "width": 960, "height": 600}},
                                    {"name": "Kiln Coffee", "area": "Tanners Yard", "rating": 4.6, "distance": "9 min walk", "status": "Busy after 12:00",
                                     "photo": {"src": img + "b.webp", "alt": "Another café", "width": 960, "height": 600}}]},
            "EventCard": {"event": {"name": "Folk weekender", "date": "Sat 6 Dec", "venue": "St Anne's Hall", "price": "From £14", "seats_left": "Only 6 seats left",
                                    "image": {"src": img + "e.webp", "alt": "A stage", "width": 960, "height": 540}}},
            "RecipeCard": {"recipe": {"title": "Grain bowl", "time": "40 min", "servings": "Serves 2", "steps": ["Roast the squash.", "Cook the farro."],
                                      "ingredients": ["Squash", "Farro"], "photo": {"src": img + "r.webp", "alt": "A grain bowl", "ratio": "3:2"}}},
            "HomeListing": {"home": {"title": "Three-bedroom house", "address": "Larch Road", "price": "£385,000", "bedrooms": "3 bedrooms", "bathrooms": "2 bathrooms",
                                     "status": "Under offer", "photos": [{"src": img + "h.webp", "alt": "A house", "width": 1280, "height": 960}]}},
        }
        for name, data in cases.items():
            with self.subTest(name):
                t = smartui.draft_template("get_" + name.lower(), data, self.cat)
                self.assertIsNotNone(t)
                self.assertEqual(t["part"]["component"], name)
                part = smartui.bind(t["part"], data)
                self.assertEqual(self.errs(part), [], json.dumps(part)[:400])
        stock = smartui.bind(smartui.draft_template("search", cases["ProductGrid"], self.cat)["part"], cases["ProductGrid"])
        self.assertEqual([i["tone"] for i in stock["items"]], ["warning", "success"])

    def test_evidence_names_the_picture_answer_types(self):
        coats = [{"id": "1", "name": "Coat", "price": "£1", "sizes": ["M"], "image": "https://x.example/a.jpg"}] * 2
        cafes = [{"name": "Café", "rating": 4.5, "address": "1 Mill St", "photo": {"src": "https://x.example/a.jpg", "alt": "c"}}] * 2
        self.assertIn("product grid", [t for t, _ in smartui.evidence_from_data("search", {"items": coats})])
        self.assertIn("places", [t for t, _ in smartui.evidence_from_data("near", {"places": cafes})])
        self.assertIn("event", [t for t, _ in smartui.evidence_from_data("gig", {"event": {"name": "Gig", "venue": "Hall", "date": "Fri", "image": "https://x.example/a.jpg"}})])
        self.assertIn("recipe", [t for t, _ in smartui.evidence_from_data("dish", {"recipe": {"title": "Soup", "ingredients": ["Leek"], "photo": "https://x.example/a.jpg"}})])
        self.assertIn("home listing", [t for t, _ in smartui.evidence_from_data("home", {"home": {"title": "Flat", "price": "£1,200", "bedrooms": 2, "photos": [{"src": "https://x.example/a.jpg", "alt": "f"}]}})])
        types = {t for t, _, _ in smartui.ANSWER_TYPES}
        self.assertTrue({"product grid", "product details", "places", "stay", "recipe", "event", "home listing"} <= types)

    def test_renderer_keeps_the_picture_box_and_shows_a_calm_tile(self):
        js = (SKILL / "assets" / "od-surface.js").read_text()
        css = (SKILL / "assets" / "od-surface.css").read_text()
        self.assertIn('"--od-img-ratio"', js)
        self.assertIn('data-od-img', js)
        self.assertIn("IMAGE_OFF", js)
        self.assertIn(":where(.od-surface img[data-od-img])", css)
        self.assertRegex(css, r"prefers-reduced-motion: reduce\)[^}]*img\[data-od-img\]")


LAYOUT_PAGE = """<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="tokens.css"><link rel="stylesheet" href="od-surface.css"><style>body{margin:0;padding:16px} .host{display:grid;gap:16px}</style>
<script src="od-components.js"></script></head><body><div id="f"></div>
<script type="module">
import "./od-surface.js";
const cat = await (await fetch("catalog.json")).json();
window.__draw = (parts, width, tall) => {
  const f = document.getElementById("f"); f.replaceChildren();
  const host = document.createElement("div"); host.className = "host"; host.style.width = width + "px";
  if (tall) { host.style.gridTemplateColumns = "1fr 1fr"; }
  for (const p of parts) { const s = document.createElement("od-surface"); s.catalog = cat; host.append(s);
    const r = s.process([{version: "1.0", createSurface: {surfaceId: "s1", components: [{...p, id: "root"}]}}], {}); if (!r.ok) throw new Error(JSON.stringify(r.errors)); }
  if (tall) { const t = document.createElement("div"); t.style.height = tall + "px"; host.append(t); }
  f.append(host);
};
window.__ready = true;
</script></body></html>"""
PNG = bytes.fromhex("89504e470d0a1a0a0000000d4948445200000001000000010806000000"
                    "1f15c4890000000d49444154789c6360f8cf00000301010018dd8db00000000049454e44ae426082")


class LayoutRules(unittest.TestCase):
    """Measured in a browser (Playwright; skipped without it): balanced product rows, photos that keep their shape in one
    column (never under 160 px), text parts that never stretch, and scrollers whose last item never meets the edge."""

    @classmethod
    def setUpClass(cls):
        try:
            from playwright.sync_api import sync_playwright
        except ImportError:
            raise unittest.SkipTest("Playwright for Python is not installed")
        import surface_audit
        cls.tmp = tempfile.TemporaryDirectory()
        cat, bundle = smartui.build_catalog(TOKENS, "Test", ["images.unsplash.com"])
        d = pathlib.Path(cls.tmp.name)
        (d / "catalog.json").write_text(json.dumps(cat))
        (d / "od-components.js").write_text(smartui.bundle_js(bundle))
        for f in ("od-surface.js", "od-validate.js", "od-surface.css"):
            shutil.copy(SKILL / "assets" / f, d / f)
        shutil.copy(TOKENS, d / "tokens.css")
        (d / "index.html").write_text(LAYOUT_PAGE)
        cls.serve = surface_audit.serve(d)
        url = cls.serve.__enter__()
        cls.pw = sync_playwright().start()
        try:
            cls.browser = surface_audit.launch(cls.pw)
        except Exception as e:  # no Chromium and no Chrome on this computer
            cls.pw.stop()
            raise unittest.SkipTest(f"no browser to measure in ({str(e)[:80]})")
        cls.page = cls.browser.new_page(viewport={"width": 1200, "height": 900})
        cls.page.route("https://images.unsplash.com/**", lambda r: r.fulfill(status=200, body=PNG, headers={"content-type": "image/png"}))
        cls.page.goto(url + "/index.html")
        cls.page.wait_for_function("window.__ready === true")

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.pw.stop()
        cls.serve.__exit__(None, None, None)
        cls.tmp.cleanup()

    def fixture(self, name, slug):
        return {**json.loads((smartui.LIB / slug / "fixture.json").read_text()), "component": name}

    def draw(self, parts, width, tall=0, viewport=1200):
        self.page.set_viewport_size({"width": viewport, "height": 900})
        self.page.evaluate("([p, w, t]) => window.__draw(p, w, t)", [parts, width, tall])
        self.page.wait_for_timeout(30)

    def test_product_rows_are_balanced(self):
        base = self.fixture("ProductGrid", "product-grid")
        for n in range(1, 9):
            items = [dict(base["items"][i % len(base["items"])], name=f"Coat {i + 1}",
                          open={"label": "View", "event": {"name": "open_product"}, "a11y_label": f"View coat {i + 1}"}) for i in range(n)]
            for width in (280, 420, 640, 812, 1000):
                with self.subTest(items=n, width=width):
                    self.draw([{**base, "items": items, "note": f"{n} results"}], width)
                    tops = self.page.evaluate("[...document.querySelectorAll('.odl-product-grid .odl-item')].map(e => Math.round(e.getBoundingClientRect().top))")
                    rows = [tops.count(t) for t in sorted(set(tops))]
                    self.assertEqual(sum(rows), n)
                    if max(rows) > 1:
                        self.assertNotIn(1, rows, f"rows {rows}: an item is alone on a row")

    def test_photos_in_one_column_keep_their_shape_and_160px(self):
        cases = [("PlaceCard", "place-card", ".odl-ph", 16 / 10), ("EventCard", "event-card", ".odl-card > .odl-ph", 16 / 9),
                 ("HomeListing", "home-listing", ".odl-pics .odl-ph", 4 / 3), ("LocationCard", "location-card", ".odl-map", 16 / 9),
                 ("RecipeCard", "recipe-card", ".odl-top > .odl-ph", 3 / 2)]
        for name, slug, sel, ratio in cases:
            for width in (240, 300, 420):
                with self.subTest(name, width=width):
                    self.draw([self.fixture(name, slug)], width)
                    w, h = self.page.evaluate(f"(() => {{ const r = document.querySelector('.odl-{slug} {sel}').getBoundingClientRect(); return [r.width, r.height]; }})()")
                    self.assertGreaterEqual(round(h), 160)
                    self.assertAlmostEqual(h, max(160, w / ratio), delta=2)

    def test_text_parts_never_stretch_in_a_taller_row(self):
        for name, slug in (("KeyFacts", "key-facts"), ("Comparison", "comparison")):
            with self.subTest(name):
                self.draw([self.fixture(name, slug)], 900, tall=1400)
                got = self.page.evaluate(f"(() => {{ const s = document.querySelector('od-surface'), r = s.querySelector('.odl-{slug}'); return [s.getBoundingClientRect().height, r.getBoundingClientRect().height, r.scrollHeight]; }})()")
                self.assertLess(got[0], 1400)
                self.assertAlmostEqual(got[1], got[2], delta=1)

    def test_scrollers_end_with_space_after_the_last_item(self):
        places = self.fixture("PlaceList", "place-list")
        more = [dict(p, name=f"{p['name']} {i}", open={"label": "View", "event": {"name": "open_place"}, "a11y_label": f"View place {i}"}) for i, p in enumerate(places["places"] * 2)][:5]
        stay = self.fixture("StayCard", "stay-card")
        gallery = self.fixture("ProductDetail", "product-gallery")
        gallery["photos"] = (gallery["photos"] * 3)[:3]
        comp = self.fixture("Comparison", "comparison")
        comp["options"] = (comp["options"] * 2)[:4]
        for i, o in enumerate(comp["options"]):
            o["name"] = f"Option {i + 1}"
            o["choose"] = {**o["choose"], "a11y_label": f"Choose option {i + 1}"}
        for r in comp["rows"]:
            r["values"] = (r["values"] * 2)[:4]
        cases = [("place row", {**places, "places": more}, ".odl-place-list .odl-list", ":scope > li", 640, 1200, 24),
                 ("stay gallery", stay, ".odl-stay-card .odl-track", ":scope > .odl-slide", 360, 1200, 24),
                 ("product photos", gallery, ".odl-product-gallery .odl-track", ":scope > .odl-slide", 360, 400, 16),
                 ("comparison table", comp, ".odl-comparison .odl-scroll", "[role=cell], [role=columnheader]", 600, 1200, 24)]
        for label, part, sel, items, width, viewport, need in cases:
            with self.subTest(label):
                self.draw([part], width, viewport=viewport)
                gap = self.page.evaluate(f"""(async () => {{
                  const s = document.querySelector('{sel}');
                  if (s.scrollWidth <= s.clientWidth) return 'no scroll';
                  s.style.scrollSnapType = 'none'; s.scrollLeft = s.scrollWidth; await new Promise(r => setTimeout(r, 50));
                  const items = [...s.querySelectorAll('{items}')].filter(e => e.getClientRects().length);
                  const right = Math.max(...items.map(e => e.getBoundingClientRect().right));
                  return s.getBoundingClientRect().right - right;
                }})()""")
                self.assertNotEqual(gap, "no scroll", f"{label} did not scroll at {width} px")
                self.assertGreaterEqual(gap, need - 0.5, f"{label}: {gap} px after the last item")


if __name__ == "__main__":
    unittest.main()
