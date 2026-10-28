"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { EmployerNav } from "@/components/Nav";
import { Player } from "@/components/Player";
import { Sheet } from "@/components/Sheet";
import { LangSwitch } from "@/components/LangSwitch";
import { Logo } from "@/components/Logo";
import { useToast } from "@/components/Toast";
import { GateSheet, RequestSheet, UpgradeBody, type Quota } from "@/components/employer/Sheets";
import { INDUSTRIES, VIDEO_LANGUAGES, type VideoLang } from "@/lib/constants";
import type { FeedCard } from "@/server/feed";
import { toggleSave } from "@/app/employer/actions";

type Employer = { quota: Quota; saved: number; maxSaved: number } | null;

function initials(n: string) {
  return n.split(/\s+/).map((w) => w[0]).join("").slice(0, 3);
}

export function Feed({ initial, nextCursor, seed, industry, lang, employer, limited }: { initial: FeedCard[]; nextCursor: string | null; seed: string; industry: string | null; lang: VideoLang | null; employer: Employer; candidateViewer: boolean; limited: boolean }) {
  const t = useTranslations("feed");
  const ti = useTranslations("industries");
  const tl = useTranslations("languages");
  const ta = useTranslations("availability");
  const te = useTranslations("errors");
  const tu = useTranslations("upgrade");
  const router = useRouter();
  const toast = useToast();
  const [cards, setCards] = useState(initial);
  const cursorRef = useRef(nextCursor);
  const loadingRef = useRef(false);
  const [active, setActive] = useState(0);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState<Record<string, boolean>>({});
  const [cardLang, setCardLang] = useState<Record<string, VideoLang>>({});
  const [progress, setProgress] = useState({ i: 0, p: 0 });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [gate, setGate] = useState<string | null>(null);
  const [profileOf, setProfileOf] = useState<FeedCard | null>(null);
  const [requestOf, setRequestOf] = useState<FeedCard | null>(null);
  const [upgrade, setUpgrade] = useState<string | null>(null);
  const [quota, setQuota] = useState(employer?.quota ?? null);
  const [savedN, setSavedN] = useState(employer?.saved ?? 0);
  const feedRef = useRef<HTMLDivElement>(null);
  const counted = useRef(new Set<string>());

  // Load more when two cards from the end (small pages: bulk scraping stays slow and visible).
  const loadMore = useCallback(() => {
    const cur = cursorRef.current;
    if (!cur || loadingRef.current) return;
    loadingRef.current = true;
    const qs = new URLSearchParams({ seed, cursor: cur });
    if (industry) qs.set("industry", industry);
    if (lang) qs.set("lang", lang);
    fetch(`/api/feed?${qs}`).then((r) => r.json()).then((d) => {
      cursorRef.current = d.cards ? d.nextCursor : null;
      if (d.cards) setCards((c) => [...c, ...d.cards.filter((x: FeedCard) => !c.some((y) => y.id === x.id))]);
    }).catch(() => {}).finally(() => { loadingRef.current = false; });
  }, [seed, industry, lang]);

  // Which card is on screen.
  useEffect(() => {
    const root = feedRef.current;
    if (!root) return;
    const total = cards.length;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting || e.intersectionRatio <= 0.6) continue;
        const i = Number((e.target as HTMLElement).dataset.i);
        setActive(i);
        if (i >= total - 2) loadMore();
      }
    }, { root, threshold: [0.6] });
    root.querySelectorAll<HTMLElement>(".item").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [cards.length, loadMore]);

  const reportView = useCallback((videoId: string) => {
    if (!employer || counted.current.has(videoId)) return;
    counted.current.add(videoId);
    fetch("/api/views", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ videoId, watchedMs: 3000 }) }).catch(() => {});
  }, [employer]);

  function setFilter(k: "industry" | "lang", v: string | null) {
    const qs = new URLSearchParams();
    const next = { industry, lang, [k]: v } as { industry: string | null; lang: string | null };
    if (next.industry) qs.set("industry", next.industry);
    if (next.lang) qs.set("lang", next.lang);
    setFiltersOpen(false);
    setCardLang({});
    router.replace(`/feed${qs.size ? `?${qs}` : ""}`);
  }

  async function onSave(c: FeedCard) {
    if (!employer) return setGate("save");
    const r = await toggleSave(c.id);
    if (!r.ok) {
      if (r.error === "saved_limit") return setUpgrade(tu("savedLimit", { plan: quota?.planName ?? "" }));
      return toast(te(r.error));
    }
    setCards((cs) => cs.map((x) => (x.id === c.id ? { ...x, saved: Boolean(r.saved) } : x)));
    setSavedN((n) => n + (r.saved ? 1 : -1));
    toast(r.saved ? t("saved") : t("unsaved"));
  }

  const nFilters = (industry ? 1 : 0) + (lang ? 1 : 0);
  const current = cards[active];

  const feedColumn = (
    <div className="scr fs">
      <header className="fh">
        <Link className="logo" href="/" aria-label="Hireel"><Logo white height={26} /></Link>
        <button type="button" className="fbtn" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(!filtersOpen)}>
          {t("filters")}{nFilters ? ` · ${nFilters}` : ""}
        </button>
      </header>
      {filtersOpen ? (
        <div className="chips">
          <FilterGroups industry={industry} lang={lang} setFilter={setFilter} />
          {!employer ? <p className="note">{t("visitorNote")}</p> : null}
          <LangSwitch variant="button" />
        </div>
      ) : null}
      <div className="feed" ref={feedRef} tabIndex={0} aria-label={t("aria")} onKeyDown={(e) => {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); feedRef.current?.scrollBy({ top: (e.key === "ArrowDown" ? 1 : -1) * feedRef.current.clientHeight, behavior: "smooth" }); }
      }}>
        {cards.length === 0 ? (
          <div className="empty" style={{ color: "#9fb0a8", paddingTop: 140 }}>{limited ? t("slowDown") : nFilters ? t("noMatch") : t("empty")}</div>
        ) : cards.map((c, i) => {
          const v = c.videos.find((x) => x.lang === (cardLang[c.id] ?? c.startLang)) ?? c.videos[0];
          const near = Math.abs(i - active) <= 1;
          const isPaused = Boolean(paused[c.id]);
          return (
            <section key={c.id} className="item" data-i={i}>
              <div className="fcard" style={{ background: "linear-gradient(160deg,#195C48,#2f8a6c)" }} onClick={(e) => { if ((e.target as HTMLElement).closest("button,a")) return; setPaused((p) => ({ ...p, [c.id]: !p[c.id] })); }}>
                {v.hls ? (
                  <Player src={v.hls} poster={v.poster} landscape={v.landscape} active={i === active} load={near} muted={muted} paused={isPaused}
                    onWatched3s={() => reportView(v.id)} onProgress={i === active ? (p) => setProgress({ i, p }) : undefined} />
                ) : (
                  <div className="face" aria-hidden="true">{initials(c.name)}</div>
                )}
                <div className="shade" />
                {isPaused ? <div className="pz" aria-hidden="true"><span>▶</span></div> : null}
                <div className="top">
                  {v.views !== null ? <span className="pill">{t("views", { n: v.views })}</span> : <span />}
                  <span style={{ display: "flex", gap: 6 }}>
                    {c.isDemo ? <span className="pill">{t("demo")}</span> : null}
                    {v.hls ? <button type="button" className="pill mute" onClick={() => setMuted(!muted)} aria-label={t("toggleSound")}>{muted ? `🔇 ${t("muted")}` : `🔊 ${t("soundOn")}`}</button> : null}
                  </span>
                </div>
                <div className="info">
                  {c.videos.length > 1 ? (
                    <div className="langs" role="group" aria-label={t("videoLanguage")}>
                      {c.videos.map((x) => (
                        <button key={x.id} type="button" className={x.id === v.id ? "on" : ""} aria-pressed={x.id === v.id} onClick={() => setCardLang((m) => ({ ...m, [c.id]: x.lang }))}>
                          {tl(x.lang)}{x.primary ? " ★" : ""}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  <span className="avail">{ta(c.availability)}</span>
                  <h2 className="h2">{c.name}</h2>
                  <div className="role">{c.headline}</div>
                  <div className="meta">{t("years", { n: c.years })}{c.location ? ` · ${c.location}` : ""}</div>
                  <div className="skills">{c.skills.map((s) => <span key={s}>{s}</span>)}</div>
                  <div className="actions">
                    <button type="button" className={`btn ${c.saved ? "saved" : "s"}`} onClick={() => onSave(c)}>{c.saved ? `${t("savedBtn")} ✓` : t("save")}</button>
                    <button type="button" className="btn s" onClick={() => (employer ? setProfileOf(c) : setGate("prof"))}>{t("profile")}</button>
                    <button type="button" className="btn m" disabled={c.requested} onClick={() => (employer ? setRequestOf(c) : setGate("req"))}>{c.requested ? t("requestSent") : t("requestIntro")}</button>
                  </div>
                </div>
                {i === active ? <div className="prog" style={{ width: `${progress.i === i ? Math.round(progress.p * 100) : 0}%` }} /> : null}
              </div>
            </section>
          );
        })}
      </div>
      <EmployerNav floating visitor={!employer} savedCount={savedN} onGate={() => setGate("account")} />
    </div>
  );

  return (
    <div className="desk">
      <aside className="side" aria-label={t("filters")}>
        <h2 className="h3" style={{ marginBottom: 12 }}>{t("filters")}</h2>
        <FilterGroups industry={industry} lang={lang} setFilter={setFilter} />
        <p className="note" style={{ marginTop: 16 }}>{t("fairNote")}</p>
        <p className="note" style={{ marginTop: 8 }}>{t("keysNote")}</p>
      </aside>
      <div className="mid">{feedColumn}</div>
      <aside className="side r" aria-label={t("profile")}>
        {current ? (
          employer ? (
            <div className="stack">
              <div><span className="tag">{ta(current.availability)}</span><h2 className="h2" style={{ marginTop: 8 }}>{current.name}</h2><p className="p">{current.headline} · {t("years", { n: current.years })} · {current.location}</p></div>
              <div className="wrap">{current.skills.map((s) => <span key={s} className="sk">{s}</span>)}</div>
              {current.about ? <div className="card"><h3 className="h3">{t("about")}</h3><p className="p">{current.about}</p></div> : null}
              <p className="note">{t("contactPrivate")}</p>
              <div className="row">
                <button type="button" className="btn g" onClick={() => onSave(current)}>{current.saved ? `${t("savedBtn")} ✓` : t("save")}</button>
                <button type="button" className="btn" disabled={current.requested} onClick={() => setRequestOf(current)}>{current.requested ? t("requestSent") : t("requestIntro")}</button>
              </div>
              <Link className="btn o w" href={`/c/${current.id}`}>{t("fullProfile")}</Link>
            </div>
          ) : (
            <div className="card"><h2 className="h3">{t("deskGateTitle")}</h2><p className="p" style={{ marginTop: 6 }}>{t("deskGateBody")}</p><Link className="btn w" style={{ marginTop: 12 }} href="/signup?role=employer">{t("signupFree")}</Link></div>
          )
        ) : null}
      </aside>

      <GateSheet open={Boolean(gate)} onClose={() => setGate(null)} why={gate ?? "save"} />
      <Sheet open={Boolean(profileOf)} onClose={() => setProfileOf(null)} label={profileOf?.name ?? ""}>
        {profileOf ? (
          <>
            <h3 className="h3" style={{ fontSize: 18 }}>{profileOf.name}</h3>
            <p className="p">{profileOf.headline} · {profileOf.location}</p>
            {profileOf.about ? <><label className="lbl">{t("about")}</label><p className="p">{profileOf.about}</p></> : null}
            <label className="lbl">{t("industry")}</label><p className="p">{ti.has(profileOf.industry) ? ti(profileOf.industry) : profileOf.industry}</p>
            <p className="p" style={{ marginTop: 10 }}>{t("contactPrivate")}</p>
            <div className="row" style={{ marginTop: 14 }}>
              <button type="button" className="btn g" onClick={() => setProfileOf(null)}>{t("close")}</button>
              <Link className="btn" href={`/c/${profileOf.id}`}>{t("fullProfile")}</Link>
            </div>
          </>
        ) : null}
      </Sheet>
      {requestOf && quota ? (
        <RequestSheet
          open
          onClose={() => setRequestOf(null)}
          candidate={{ id: requestOf.id, name: requestOf.name }}
          quota={quota}
          onSent={(wantsCv) => {
            setCards((cs) => cs.map((x) => (x.id === requestOf.id ? { ...x, requested: true } : x)));
            setQuota((q) => (q ? { ...q, introLeft: q.introLeft - 1, cvLeft: q.cvLeft - (wantsCv ? 1 : 0) } : q));
            toast(t("sent", { name: requestOf.name.split(" ")[0] }));
            setRequestOf(null);
          }}
        />
      ) : null}
      <Sheet open={Boolean(upgrade)} onClose={() => setUpgrade(null)} label={tu("title")}>
        <UpgradeBody reason={upgrade ?? ""} onClose={() => setUpgrade(null)} />
      </Sheet>
    </div>
  );
}

function FilterGroups({ industry, lang, setFilter }: { industry: string | null; lang: string | null; setFilter: (k: "industry" | "lang", v: string | null) => void }) {
  const t = useTranslations("feed");
  const ti = useTranslations("industries");
  const tl = useTranslations("languages");
  return (
    <>
      <div>
        <h4>{t("industry")}</h4>
        <div className="wrap">
          <button type="button" className={`chip${!industry ? " on" : ""}`} onClick={() => setFilter("industry", null)}>{t("all")}</button>
          {INDUSTRIES.map((k) => <button key={k} type="button" className={`chip${industry === k ? " on" : ""}`} onClick={() => setFilter("industry", k)}>{ti(k)}</button>)}
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <h4>{t("videoLanguage")}</h4>
        <div className="wrap">
          <button type="button" className={`chip${!lang ? " on" : ""}`} onClick={() => setFilter("lang", null)}>{t("any")}</button>
          {VIDEO_LANGUAGES.map((k) => <button key={k} type="button" className={`chip${lang === k ? " on" : ""}`} onClick={() => setFilter("lang", k)}>{tl(k)}</button>)}
        </div>
      </div>
    </>
  );
}
