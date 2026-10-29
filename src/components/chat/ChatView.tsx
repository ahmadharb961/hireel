"use client";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icons";
import { Sheet } from "@/components/Sheet";
import { useToast } from "@/components/Toast";
import { refreshUnread } from "@/lib/unread-client";
import { CompanySheet, type CompanyInfo } from "@/components/CompanySheet";

export type ChatMsg = { id: string; mine: boolean; body: string; at: string };
type Pending = { tmp: string; body: string; failed?: boolean };
export type ChatProps = {
  id: string;
  side: "candidate" | "company";
  state: "open" | "closed" | "blocked" | "unavailable";
  closedByMe: boolean;
  initial: ChatMsg[];
  back: string;
  other: { name: string; sub: string; avatar: string | null; href?: string };
  /** Candidate side: the company's details, opened by tapping its name. */
  company?: CompanyInfo & { shared: string };
  /** Company side: what the candidate chose to share. */
  contacts?: { email: string | null; phone: string | null; cvUrl: string | null };
  otherReadAt: string | null;
  /** Report and block run as server actions owned by each side. */
  onReport: (reason: string, details: string) => Promise<{ ok: boolean; error?: string }>;
  onBlock?: () => Promise<{ ok: boolean; error?: string }>;
};

const POLL_MS = 4000;
const MAX = 2000;
const REASONS = ["fake", "money", "harassment", "other"] as const;

function merge(a: ChatMsg[], b: ChatMsg[]) {
  const m = new Map(a.map((x) => [x.id, x]));
  for (const x of b) m.set(x.id, x);
  return [...m.values()].sort((x, y) => x.at.localeCompare(y.at));
}

/**
 * The conversation screen. New messages arrive by asking the server every few seconds
 * while the page is on screen (Hostinger can't keep live connections open).
 */
export function ChatView(p: ChatProps) {
  const t = useTranslations("chat");
  const te = useTranslations("errors");
  const fmt = useFormatter();
  const toast = useToast();
  const router = useRouter();
  const [msgs, setMsgs] = useState(p.initial);
  const [pending, setPending] = useState<Pending[]>([]);
  const [state, setState] = useState(p.state);
  const [text, setText] = useState("");
  const [sheet, setSheet] = useState<null | "menu" | "report" | "block" | "end" | "company" | "contacts">(null);
  const [otherRead, setOtherRead] = useState(p.otherReadAt);
  const [reason, setReason] = useState<(typeof REASONS)[number]>("fake");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  const stick = useRef(true);
  const last = useRef(p.initial.at(-1)?.at);

  const poll = useCallback(async () => {
    try {
      const q = new URLSearchParams({ seen: document.visibilityState === "visible" ? "1" : "0" });
      if (last.current) q.set("after", last.current);
      const res = await fetch(`/api/chat/${p.id}?${q}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { state: ChatProps["state"]; messages: ChatMsg[]; otherReadAt: string | null };
      setState(data.state);
      setOtherRead(data.otherReadAt);
      if (data.messages.length) {
        last.current = data.messages.at(-1)!.at;
        setMsgs((m) => merge(m, data.messages));
      }
    } catch {
      // Offline for a moment: the next round tries again.
    }
  }, [p.id]);

  // Leaving the chat (or switching to another app or tab) tells the server, so new messages notify
  // straight away, and updates the unread badges.
  useEffect(() => {
    const leave = () => {
      fetch(`/api/chat/${p.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ leave: true }), keepalive: true }).catch(() => {});
    };
    const onVis = () => { if (document.visibilityState === "hidden") leave(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", leave);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", leave);
      leave();
      refreshUnread();
    };
  }, [p.id]);

  useEffect(() => {
    const timer = setInterval(() => { if (document.visibilityState === "visible") void poll(); }, POLL_MS);
    const onVis = () => { if (document.visibilityState === "visible") void poll(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
    void poll();
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", onVis); window.removeEventListener("focus", onVis); };
  }, [poll]);

  // Like WhatsApp: when the keyboard opens, the chat shrinks to the space above it, so the header stays
  // at the top and the newest messages stay just above the typing box. iPhone Safari doesn't shrink
  // the page by itself (it slides everything up), so the chat follows the visible area instead.
  useEffect(() => {
    const vv = window.visualViewport;
    const el = root.current;
    if (!vv || !el) return;
    const html = document.documentElement;
    const prev = [html.style.overflow, document.body.style.overflow];
    html.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    let raf = 0;
    const fit = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.height = `${vv.height}px`;
        el.style.transform = vv.offsetTop ? `translateY(${vv.offsetTop}px)` : "";
        el.classList.toggle("kb", window.innerHeight - vv.height > 120);
        const l = list.current;
        if (l && stick.current) l.scrollTop = l.scrollHeight;
      });
    };
    fit();
    vv.addEventListener("resize", fit);
    vv.addEventListener("scroll", fit);
    return () => {
      cancelAnimationFrame(raf);
      vv.removeEventListener("resize", fit);
      vv.removeEventListener("scroll", fit);
      [html.style.overflow, document.body.style.overflow] = prev;
    };
  }, []);

  // Stay at the newest message unless the person scrolled up to read older ones.
  useLayoutEffect(() => {
    const el = list.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [msgs, pending]);
  const onScroll = () => {
    const el = list.current;
    if (el) stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  // The box grows with the text, up to about five lines.
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
  }, [text]);

  async function deliver(body: string, tmp: string) {
    try {
      const res = await fetch(`/api/chat/${p.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ body }) });
      const data = (await res.json()) as { ok: true; message: ChatMsg } | { ok: false; error: string };
      if (data.ok) {
        setPending((q) => q.filter((x) => x.tmp !== tmp));
        setMsgs((m) => merge(m, [data.message]));
        return;
      }
      if (data.error === "chat_closed") { setPending((q) => q.filter((x) => x.tmp !== tmp)); void poll(); }
      else setPending((q) => q.map((x) => (x.tmp === tmp ? { ...x, failed: true } : x)));
      toast(t.has(`err.${data.error}` as "err.chat_closed") ? t(`err.${data.error}` as "err.chat_closed") : te(data.error as "generic"));
    } catch {
      setPending((q) => q.map((x) => (x.tmp === tmp ? { ...x, failed: true } : x)));
      toast(te("network"));
    }
  }

  function send() {
    const body = text.trim();
    if (!body || body.length > MAX || state !== "open") return;
    const tmp = `tmp-${Date.now()}`;
    stick.current = true;
    setPending((q) => [...q, { tmp, body }]);
    setText("");
    box.current?.focus();
    void deliver(body, tmp);
  }
  function retry(x: Pending) {
    setPending((q) => q.map((y) => (y.tmp === x.tmp ? { ...y, failed: false } : y)));
    void deliver(x.body, x.tmp);
  }

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>, done: string) {
    setBusy(true);
    const res = await fn();
    setBusy(false);
    setSheet(null);
    if (!res.ok) toast(te((res.error ?? "generic") as "generic"));
    else { toast(done); void poll(); router.refresh(); }
  }
  const endChat = () => run(async () => {
    try {
      const res = await fetch(`/api/chat/${p.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ close: true }) });
      return res.ok ? { ok: true } : { ok: false, error: "generic" };
    } catch { return { ok: false, error: "network" }; }
  }, t("endedDone"));

  // Day labels between messages.
  const day = (iso: string) => new Date(iso).toDateString();
  const dayLabel = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    const y = new Date(); y.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return t("today");
    if (d.toDateString() === y.toDateString()) return t("yesterday");
    return fmt.dateTime(d, { dateStyle: "medium" });
  };

  const notice = state === "closed" ? (p.closedByMe ? t("endedByYou") : t("endedByThem"))
    : state === "blocked" ? (p.side === "candidate" ? t("blockedByYou") : t("unavailable"))
    : state === "unavailable" ? t("unavailable") : null;
  const over = text.length > MAX;
  const lastMine = [...msgs].reverse().find((m) => m.mine);

  return (
    <div className="chat" ref={root}>
      <header className="chat-hd">
        <Link className="ib flip" href={p.back} aria-label={t("back")}><Icon name="back" /></Link>
        {p.company ? (
          <button type="button" className="chat-who" onClick={() => setSheet("company")} aria-label={t("viewCompany")}>
            <span className="chat-av">{p.other.avatar ? <img src={p.other.avatar} alt="" /> : p.other.name.slice(0, 1)}</span>
            <span className="chat-nm"><b>{p.other.name}</b><small>{p.other.sub}</small></span>
          </button>
        ) : p.other.href ? (
          <Link className="chat-who" href={p.other.href}>
            <span className="chat-av">{p.other.avatar ? <img src={p.other.avatar} alt="" /> : p.other.name.slice(0, 1)}</span>
            <span className="chat-nm"><b>{p.other.name}</b><small>{p.other.sub}</small></span>
          </Link>
        ) : (
          <div className="chat-who">
            <span className="chat-av">{p.other.avatar ? <img src={p.other.avatar} alt="" /> : p.other.name.slice(0, 1)}</span>
            <span className="chat-nm"><b>{p.other.name}</b><small>{p.other.sub}</small></span>
          </div>
        )}
        <button type="button" className="ib" onClick={() => setSheet("menu")} aria-label={t("options")}><Icon name="more" /></button>
      </header>

      <div className="chat-list" ref={list} onScroll={onScroll} role="log" aria-live="polite" aria-label={t("messagesWith", { name: p.other.name })}>
        <p className="chat-safe"><Icon name="shield" /> {p.side === "candidate" ? t("safetyCandidate") : t("safetyCompany")}</p>
        {msgs.length === 0 && pending.length === 0 && state === "open" ? <p className="chat-empty">{t("empty", { name: p.other.name })}</p> : null}
        {msgs.map((m, i) => (
          <div key={m.id}>
            {i === 0 || day(msgs[i - 1].at) !== day(m.at) ? <p className="chat-day">{dayLabel(m.at)}</p> : null}
            <div className={`bub${m.mine ? " me" : ""}`}>
              <p dir="auto">{m.body}</p>
              <time dateTime={m.at}>{fmt.dateTime(new Date(m.at), { timeStyle: "short" })}</time>
            </div>
            {m.id === lastMine?.id ? <span className="bub-seen">{otherRead && otherRead >= m.at ? `✓✓ ${t("seen")}` : `✓ ${t("delivered")}`}</span> : null}
          </div>
        ))}
        {pending.map((x) => (
          <div key={x.tmp} className={`bub me${x.failed ? " fail" : " wait"}`}>
            <p dir="auto">{x.body}</p>
            {x.failed ? <button type="button" className="bub-retry" onClick={() => retry(x)}>{t("notSent")}</button> : <time>{t("sending")}</time>}
          </div>
        ))}
        {notice ? <p className="chat-note">{notice}</p> : null}
      </div>

      {state === "open" ? (
        <form className="chat-bar" onSubmit={(e) => { e.preventDefault(); send(); }}>
          <div className="chat-in">
            <textarea
              ref={box}
              rows={1}
              onFocus={() => { stick.current = true; }}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                // On a computer Enter sends and Shift+Enter makes a new line. On phones Enter is a new line.
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && window.matchMedia("(pointer: fine)").matches) { e.preventDefault(); send(); }
              }}
              placeholder={t("placeholder")}
              aria-label={t("placeholder")}
              enterKeyHint="send"
              dir="auto"
            />
            {text.length > MAX - 200 ? <span className={`chat-count${over ? " over" : ""}`}>{MAX - text.length}</span> : null}
          </div>
          <button type="submit" className="chat-send" disabled={!text.trim() || over} aria-label={t("send")}><Icon name="send" /></button>
        </form>
      ) : null}

      <Sheet open={sheet === "menu"} onClose={() => setSheet(null)} label={t("options")}>
        <div className="chat-menu">
          {p.company ? <button type="button" className="btn g w" onClick={() => setSheet("company")}>{t("viewCompany")}</button> : null}
          {p.other.href ? <Link className="btn g w" href={p.other.href}>{t("viewProfile")}</Link> : null}
          {p.contacts ? <button type="button" className="btn g w" onClick={() => setSheet("contacts")}>{t("contactDetails")}</button> : null}
          <button type="button" className="btn g w" onClick={() => setSheet("report")}>{p.side === "candidate" ? t("reportCompany") : t("reportCandidate")}</button>
          {p.onBlock && state !== "blocked" ? <button type="button" className="btn g w bad-t" onClick={() => setSheet("block")}>{t("blockCompany")}</button> : null}
          {state === "open" ? <button type="button" className="btn g w bad-t" onClick={() => setSheet("end")}>{t("endChat")}</button> : null}
          <button type="button" className="btn o w" onClick={() => setSheet(null)}>{t("cancel")}</button>
        </div>
      </Sheet>

      {p.company ? (
        <CompanySheet open={sheet === "company"} onClose={() => setSheet(null)} c={p.company}
          extra={<p className="note" style={{ marginBottom: 8 }}>{t("youShared", { list: p.company.shared })}</p>} />
      ) : null}

      {p.contacts ? (
        <Sheet open={sheet === "contacts"} onClose={() => setSheet(null)} label={t("contactDetails")}>
          <h3 className="h3" style={{ fontSize: 18 }}>{t("contactDetails")}</h3>
          <p className="p">{t("contactNote", { name: p.other.name })}</p>
          {p.contacts.email ? <div className="kv"><span>{t("email")}</span><b dir="ltr"><a href={`mailto:${p.contacts.email}`}>{p.contacts.email}</a></b></div> : null}
          {p.contacts.phone ? <div className="kv"><span>{t("phone")}</span><b dir="ltr"><a href={`tel:${p.contacts.phone.replace(/[^+0-9]/g, "")}`}>{p.contacts.phone}</a></b></div> : null}
          {p.contacts.cvUrl ? <div className="kv"><span>{t("cv")}</span><b><a href={p.contacts.cvUrl}>{t("downloadCv")}</a></b></div> : null}
          {!p.contacts.email && !p.contacts.phone && !p.contacts.cvUrl ? <p className="note">{t("sharedNothing")}</p> : null}
          <button type="button" className="btn g w" style={{ marginTop: 14 }} onClick={() => setSheet(null)}>{t("close")}</button>
        </Sheet>
      ) : null}

      <Sheet open={sheet === "end"} onClose={() => setSheet(null)} label={t("endChat")}>
        <h3 className="h3" style={{ fontSize: 18 }}>{t("endTitle")}</h3>
        <p className="p">{t("endBody", { name: p.other.name })}</p>
        <div className="row" style={{ marginTop: 16 }}>
          <button type="button" className="btn g" onClick={() => setSheet(null)}>{t("cancel")}</button>
          <button type="button" className="btn bad" disabled={busy} onClick={endChat}>{t("endChat")}</button>
        </div>
      </Sheet>

      {p.onBlock ? (
        <Sheet open={sheet === "block"} onClose={() => setSheet(null)} label={t("blockCompany")}>
          <h3 className="h3" style={{ fontSize: 18 }}>{t("blockCompany")}</h3>
          <p className="p">{t("blockBody", { name: p.other.name })}</p>
          <div className="row" style={{ marginTop: 16 }}>
            <button type="button" className="btn g" onClick={() => setSheet(null)}>{t("cancel")}</button>
            <button type="button" className="btn bad" disabled={busy} onClick={() => run(p.onBlock!, t("blockedDone"))}>{t("block")}</button>
          </div>
        </Sheet>
      ) : null}

      <Sheet open={sheet === "report"} onClose={() => setSheet(null)} label={t("reportTitle")}>
        <h3 className="h3" style={{ fontSize: 18 }}>{t("reportTitle")}</h3>
        <p className="p">{t("reportBody")}</p>
        {REASONS.map((k) => (
          <label key={k} className="chk"><input type="radio" name="chat-report" checked={reason === k} onChange={() => setReason(k)} /><span>{t(`reasons.${k}`)}</span></label>
        ))}
        <label className="lbl" htmlFor="chat-report-d">{t("details")}</label>
        <textarea className="i" id="chat-report-d" value={details} onChange={(e) => setDetails(e.target.value)} maxLength={1000} />
        <div className="row" style={{ marginTop: 12 }}>
          <button type="button" className="btn g" onClick={() => setSheet(null)}>{t("cancel")}</button>
          <button type="button" className="btn" disabled={busy} onClick={() => run(() => p.onReport(reason, details), t("reportSent"))}>{t("sendReport")}</button>
        </div>
      </Sheet>
    </div>
  );
}
