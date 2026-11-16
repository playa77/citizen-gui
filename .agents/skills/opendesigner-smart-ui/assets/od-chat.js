/* A reference chat client for Smart UI: a message list, a composer and suggestion chips, talking to a server that runs
   the Smart UI turn (live.py: POST /api/chat, POST /api/press). Each answer's text shows as a message; its part shows in
   an <od-surface> that validates it again before drawing. Buttons the person presses go back to /api/press; changes
   only after the approval prompt (od-surface adds approved: true). Copy it, or read it as an example. MIT.

   The server streams each turn (one JSON object per line): the chosen part's skeleton first, then the words as they
   arrive, then the checked answer. A server that doesn't stream answers with one JSON object, which works too.

   <od-chat data-catalog="/system/smart-ui/catalog.json" data-placeholder="Ask about your billing"></od-chat>
   (needs od-surface.js loaded) */
import { announce, datesInText } from "./od-surface.js";

const SID = Math.random().toString(36).slice(2, 10);

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text) n.textContent = text;
  return n;
}

class ODChat extends HTMLElement {
  async connectedCallback() {
    if (this._ready) return;
    this._ready = true;
    this.classList.add("od-chat");
    const loading = el("p", "od-chat-wait", "Loading the assistant…");
    this.setAttribute("aria-busy", "true");
    this.replaceChildren(loading);
    try {
      const res = await fetch(this.dataset.catalog || "/system/smart-ui/catalog.json");
      if (!res.ok) throw new Error(res.status);
      this.catalog = await res.json();
    } catch {
      this.removeAttribute("aria-busy");
      const retry = el("button", "od-chat-chip", "Try again");
      retry.type = "button";
      retry.addEventListener("click", () => { this._ready = false; this.connectedCallback(); });
      this.replaceChildren(el("p", "od-chat-error", "The assistant didn't load. Check your connection, then try again."), retry);
      return;
    }
    this.removeAttribute("aria-busy");
    loading.remove();
    let info = {};
    try { info = await (await fetch("/api/info")).json(); } catch { info = { provider: "none" }; }
    this.info = info;
    const head = el("p", "od-chat-mode",
      info.provider && info.provider !== "recorded" ? `Live: ${info.model || info.provider}` : "Recorded answers");
    this.log = el("div", "od-chat-log");
    this.log.setAttribute("aria-label", "Conversation");
    this.chips = el("div", "od-chat-chips");
    const form = el("form", "od-chat-form");
    const input = el("input");
    input.type = "text";
    input.name = "message";
    input.placeholder = this.dataset.placeholder || "Type your question";
    input.setAttribute("aria-label", "Message");
    input.autocomplete = "off";
    const send = el("button", "", "Send");
    send.type = "submit";
    form.append(input, send);
    form.addEventListener("submit", (e) => { e.preventDefault(); const m = input.value.trim(); if (m) { input.value = ""; this.ask(m); } });
    this.append(head, this.log, this.chips, form);
    this.suggest(info.suggestions || []);
  }

  suggest(list) {
    this.chips.replaceChildren(...list.map((q) => { const b = el("button", "od-chat-chip", q); b.type = "button"; b.addEventListener("click", () => this.ask(q)); return b; }));
  }

  busy(on) {
    this.toggleAttribute("aria-busy", on);
    this.querySelectorAll(".od-chat-form button, .od-chat-chip").forEach((b) => (b.disabled = on));
    if (on) { this.wait = el("p", "od-chat-wait", "Thinking…"); this.log.append(this.wait); this.scroll(); }
    else this.wait?.remove();
  }

  scroll() { this.log.scrollTop = this.log.scrollHeight; }

  async ask(message) {
    this.log.append(el("p", "od-chat-me", message));
    await this.call("/api/chat", { session: SID, message });
  }

  /** Every streamed event goes to the page too (a "what runs behind the answer" panel listens for these). */
  tell(ev) { this.dispatchEvent(new CustomEvent("od-chat-event", { detail: ev, bubbles: true })); }

  async call(url, body) {
    this.busy(true);
    let r, early = null;
    this.tell({ type: "start", url });
    try {
      const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...body, stream: true }) });
      if ((res.headers.get("content-type") || "").includes("ndjson") && res.body) {
        const reader = res.body.getReader(), dec = new TextDecoder();
        let buf = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let i;
          while ((i = buf.indexOf("\n")) >= 0) {
            const ev = JSON.parse(buf.slice(0, i));
            buf = buf.slice(i + 1);
            this.tell(ev);
            if (ev.type === "done") r = ev;
            else if (ev.type === "error") throw new Error(ev.error);
            else if (ev.type !== "lane") early = this.early(early, ev);
          }
        }
        if (!r) throw new Error("the answer stopped early");
      } else {
        r = await res.json();
        if (!res.ok) throw new Error(r.error || res.status);
      }
    } catch (e) {
      this.busy(false);
      early?.turn.remove();
      this.log.append(el("p", "od-chat-error", "The assistant couldn't answer: " + (e.message || e)));
      return;
    }
    this.busy(false);
    if (r.toast) this.toast(r.toast);
    if (!r.text && !r.answer) { early?.turn.remove(); return r; }  // a fix or an undo: the toast is the answer
    this.show(r, early);
    return r;
  }

  /** Feedback after a change, in the system's own colours, with Undo when the app allows it. Polite, never stealing focus. */
  toast(t) {
    if (this.catalog?.components?.Toast) return this.systemToast(t);
    if (!this.toasts) {
      this.toasts = el("div", "od-toasts");
      this.toasts.setAttribute("role", "status");
      this.toasts.setAttribute("aria-live", "polite");
      document.body.append(this.toasts);
    }
    const box = el("div", "od-toast");
    box.dataset.tone = t.tone || "success";
    box.append(el("span", "", t.text));
    if (t.undo && t.undo.name) {
      const b = el("button", "od-toast-undo", "Undo");
      b.type = "button";
      b.addEventListener("click", () => { box.remove(); this.call("/api/press", { session: SID, action: t.undo }); });
      box.append(b);
    }
    this.toasts.append(box);
    if (!t.undo && t.tone !== "danger") setTimeout(() => box.remove(), 4000);  // one with Undo, or an error, stays
  }

  /** The same feedback through the system's own toast part (the library's toast stack), when the catalog has it. */
  systemToast(t) {
    if (!this.toastBox) {
      this.toastBox = el("div", "od-toasts");
      document.body.append(this.toastBox);
    }
    const words = String(t.text || "");
    let message = words, detail = "";
    if (words.length > 48) { const cut = words.lastIndexOf(" ", 47); message = words.slice(0, cut > 20 ? cut : 47); detail = words.slice(message.length).trim().slice(0, 70); }
    const item = { kind: t.tone === "danger" ? "error" : "ok", message, dismiss: { label: "Dismiss", event: { name: "dismiss_toast" } } };
    if (detail) item.detail = detail;
    if (t.undo && t.undo.name) item.action = { label: "Undo", event: t.undo };
    const s = document.createElement("od-surface");
    s.catalog = this.catalog;
    this.toastBox.append(s);
    const ok = s.process([{ version: "1.0", createSurface: { surfaceId: "toast-" + Math.random().toString(36).slice(2, 8), catalogId: this.catalog.catalogId, components: [{ id: "root", component: "Toast", toasts: [item] }] } }]).ok;
    if (!ok) { s.remove(); this.catalog = { ...this.catalog, components: { ...this.catalog.components, Toast: undefined } }; return this.toast(t); }
    s.addEventListener("od-action", (e) => {
      const a = e.detail.action;
      s.remove();
      if (a.name !== "dismiss_toast") this.call("/api/press", { session: SID, action: { name: a.name, context: a.context || {} } });
    });
    if (!item.action && item.kind === "ok") setTimeout(() => s.remove(), 4000);  // a toast with Undo, or an error, stays
  }

  /** While the answer is on its way: the chosen part's skeleton, then the words. Hidden from screen readers until the
   *  checked answer replaces it (one announcement per turn). */
  early(state, ev) {
    if (!state) {
      const turn = el("div", "od-chat-turn od-chat-pending");
      turn.setAttribute("aria-hidden", "true");
      this.wait?.remove();
      this.log.append(turn);
      state = { turn, text: null, surface: null, chip: null };
      this.reveal(turn, true);
    }
    if (ev.type === "call") {  // the tool call that picked the part: visible, so the person sees what is being built
      state.chip = el("p", "od-chat-call", ev.part ? `show_ui · ${ev.part}` : "answer in text");
      state.turn.prepend(state.chip);
      return state;
    }
    if (ev.type === "shell") ev = { ...ev, type: "skeleton" };
    if (ev.type === "text") {
      if (!state.text) { state.text = el("p", "od-chat-bot"); state.turn.prepend(state.text); }
      state.text.textContent = datesInText(ev.text, document.documentElement.lang);
    } else if (ev.type === "part") {  // filled from the data as it lands: replaces the outline, then grows
      const s = document.createElement("od-surface");
      s.catalog = this.catalog;
      s.source = ev.data;
      if (state.surface) state.surface.replaceWith(s); else state.turn.append(s);
      if (!s.process(ev.answer).ok) s.remove(); else state.surface = s;
    } else if (ev.type === "skeleton" && !state.surface) {
      const s = document.createElement("od-surface");
      s.catalog = this.catalog;
      state.turn.append(s);
      s.showLoading(ev.part);
      state.surface = s;
    }
    return state;
  }

  show(r, early) {
    const turn = el("div", "od-chat-turn");
    if (early?.chip) { early.chip.classList.add("is-done"); turn.append(early.chip); }
    if (r.text) turn.append(el("p", "od-chat-bot", datesInText(r.text, document.documentElement.lang)));
    if (r.answer) {
      const s = document.createElement("od-surface");
      s.catalog = this.catalog;
      s.source = r.data;
      turn.append(s);
      const res = s.process(r.answer);
      if (!res.ok) { s.remove(); turn.append(el("p", "od-chat-note", "A part was refused by the checks, so only the text shows.")); }
      s.addEventListener("od-action", (e) => {
        const a = e.detail.action;
        const btn = s.querySelector(`[data-od-event="${CSS.escape(a.name)}"]`);
        if (btn) s.setActionState(btn, "pending", "Sending");
        this.call("/api/press", { session: SID, action: a }).then((res) => { if (btn) s.setActionState(btn, res && res.toast && res.toast.tone !== "danger" ? "done" : "idle", res && res.toast ? "Done" : undefined); });
      });
    }
    const log = r.log || {};
    if (log.repaired && log.first_errors && log.first_errors.length) {  // only a real second model call; a case fix made here isn't one
      turn.append(el("p", "od-chat-note", `Repaired once: the first answer failed ${log.first_errors.length} check${log.first_errors.length > 1 ? "s" : ""} (${log.first_errors.slice(0, 2).join("; ")}).`));
    }
    if (early) early.turn.replaceWith(turn); else this.log.append(turn);
    this.reveal(turn);
    if (!r.answer && r.text) announce(r.text.slice(0, 200));  // a part announces itself; a text-only reply is read here
  }

  /** Bring the newest answer's top into view, in the log and on the page (a phone shows the reply, not the old turns). */
  reveal(turn, quick) {
    const still = quick || matchMedia("(prefers-reduced-motion: reduce)").matches;
    requestAnimationFrame(() => turn.isConnected && turn.scrollIntoView({ block: "start", behavior: still ? "auto" : "smooth" }));
  }
}

if (!customElements.get("od-chat")) customElements.define("od-chat", ODChat);
export default ODChat;
