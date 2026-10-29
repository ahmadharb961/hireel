"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { CandidateBrowseNav, EmployerNav } from "@/components/Nav";
import { Player } from "@/components/Player";
import { Sheet } from "@/components/Sheet";
import { LangSwitch } from "@/components/LangSwitch";
import { Logo } from "@/components/Logo";
import { startNavProgress } from "@/components/NavProgress";
import { LIcon } from "@/components/landing/icons";
import { useToast } from "@/components/Toast";
import { GateSheet, RequestSheet, UpgradeBody, type Quota } from "@/components/employer/Sheets";
import { AVAILABILITY, EMPLOYMENT_TYPES, VIDEO_LANGUAGES, WORK_MODES } from "@/lib/constants";
import type { CategoryOption } from "@/lib/categories";
import { useUnread } from "@/lib/unread-client";
import { EXP_BANDS, FEED_PLACES, filtersToQuery, type FeedFilters } from "@/lib/feed-filters";
import type { FeedCard } from "@/server/feed";
import { toggleSave } from "@/app/employer/safe-actions";

type Employer = { quota: Quota; saved: number; maxSaved: number; company: string; userName: string; logo: string | null } | null;
type FilterKey = keyof FeedFilters;

function initials(n: string) {
  return n.split(/\s+/).map((w) => w[0]).join("").slice(0, 3);
}

function posterOf(c: FeedCard) {
  return (c.videos.find((v) => v.lang === c.startLang) ?? c.videos[0])?.poster ?? null;
}

export function Feed({ initial, nextCursor, seed, filters, employer, candidateViewer, limited, categories, catNames }: { initial: FeedCard[]; nextCursor: string | null; seed: string; filters: FeedFilters; employer: Employer; candidateViewer: boolean; limited: boolean; categories: CategoryOption[]; catNames: Record<string, string> }) {
  const t = useTranslations("feed");
  const catName = (k: string) => catNames[k] ?? k;
  const tp = useTranslations("prefs");
  const tm = useTranslations("employment");
  const tco = useTranslations("signup.countries");
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
  // Sound on by default. If the browser refuses (nothing tapped yet), the player falls back to muted.
  const [muted, setMuted] = useState(false);
  const [flash, setFlash] = useState<null | "sound" | "mute">(null);
  // True when the browser refused sound before the first tap; a single unmute button is shown then.
  const [forcedMute, setForcedMute] = useState(false);
  const flashTimer = useRef(0);
  const toggleSound = () => {
    const next = !muted;
    setMuted(next);
    setForcedMute(false);
    setFlash(next ? "mute" : "sound");
    window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlash(null), 700);
  };
  const [paused, setPaused] = useState<Record<string, boolean>>({});
  const [cardLang, setCardLang] = useState<Record<string, FeedCard["startLang"]>>({});
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
    const qs = filtersToQuery(filters);
    qs.set("seed", seed);
    qs.set("cursor", cur);
    fetch(`/api/feed?${qs}`).then((r) => r.json()).then((d) => {
      cursorRef.current = d.cards ? d.nextCursor : null;
      if (d.cards) setCards((c) => [...c, ...d.cards.filter((x: FeedCard) => !c.some((y) => y.id === x.id))]);
    }).catch(() => {}).finally(() => { loadingRef.current = false; });
  }, [seed, filters]);

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

  function applyFilters(next: Partial<FeedFilters>) {
    const qs = filtersToQuery(next);
    setFiltersOpen(false);
    setCardLang({});
    startNavProgress();
    router.replace(`/feed${qs.size ? `?${qs}` : ""}`);
  }
  const setFilter = (k: FilterKey, v: string | null) => applyFilters({ ...filters, [k]: v });

  function go(step: number) {
    const el = feedRef.current;
    if (el) el.scrollBy({ top: step * el.clientHeight, behavior: "smooth" });
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
  const openRequest = (c: FeedCard) => (employer ? setRequestOf(c) : setGate("req"));

  const nFilters = Object.values(filters).filter(Boolean).length;
  const current = cards[active];
  const prev = cards[active - 1];
  const next = cards[active + 1];

  const feedColumn = (
    <div className="scr fs">
      <header className="fh">
        <Link className="logo" href="/" aria-label="Hireel"><Logo white height={26} /></Link>
        <button type="button" className="fbtn ic" aria-expanded={filtersOpen} aria-label={`${t("filters")}${nFilters ? ` · ${nFilters}` : ""}`} onClick={() => setFiltersOpen(!filtersOpen)}>
          <LIcon name="sliders" size={22} />
          {nFilters ? <span className="fbtn-n">{nFilters}</span> : null}
        </button>
      </header>
      {filtersOpen ? (
        <div className="chips">
          <FilterGroups filters={filters} setFilter={setFilter} categories={categories} />
          {!employer ? <p className="note">{t("visitorNote")}</p> : null}
          <LangSwitch variant="button" />
        </div>
      ) : null}
      <div className="feed" ref={feedRef} tabIndex={0} aria-label={t("aria")} onKeyDown={(e) => {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); go(e.key === "ArrowDown" ? 1 : -1); }
      }}>
        {cards.length === 0 ? (
          <div className="fempty">
            <span className="fempty-ic"><LIcon name="video" size={30} /></span>
            <h2>{t("emptyTitle")}</h2>
            <p>{limited ? t("slowDown") : nFilters ? t("noMatch") : t("empty")}</p>
            {nFilters ? <button type="button" className="btn m" onClick={() => applyFilters({})}>{t("clear")}</button> : null}
          </div>
        ) : cards.map((c, i) => {
          const v = c.videos.find((x) => x.lang === (cardLang[c.id] ?? c.startLang)) ?? c.videos[0];
          const near = Math.abs(i - active) <= 1;
          const isPaused = Boolean(paused[c.id]);
          return (
            <section key={c.id} className="item" data-i={i}>
              <div className="fcard" style={{ background: "linear-gradient(160deg,#195C48,#2f8a6c)" }} onClick={(e) => { if ((e.target as HTMLElement).closest("button,a")) return; setPaused((p) => ({ ...p, [c.id]: !p[c.id] })); }}>
                {v.hls ? (
                  <Player src={v.hls} poster={v.poster} landscape={v.landscape} active={i === active} load={near} muted={muted} paused={isPaused}
                    onWatched3s={() => reportView(v.id)} onProgress={i === active ? (p) => setProgress({ i, p }) : undefined}
                    onAutoplayBlocked={i === active ? () => { setMuted(true); setForcedMute(true); } : undefined} />
                ) : (
                  <div className="face" aria-hidden="true">{initials(c.name)}</div>
                )}
                <div className="shade" />
                {isPaused ? (
                  <div className="pz2">
                    {v.hls ? <button type="button" className="pz-snd" onClick={toggleSound} aria-label={t("toggleSound")} aria-pressed={!muted}><LIcon name={muted ? "mute" : "sound"} size={20} /></button> : null}
                    <button type="button" className="pz-play" onClick={() => setPaused((p) => ({ ...p, [c.id]: false }))} aria-label={t("play")}><LIcon name="play" fill size={30} /></button>
                  </div>
                ) : i === active && forcedMute && muted && v.hls ? (
                  <div className="pz2"><button type="button" className="pz-snd big" onClick={toggleSound} aria-label={t("toggleSound")}><LIcon name="mute" size={24} /></button></div>
                ) : i === active && flash ? <div className="pz2 flash" aria-hidden="true"><span className="pz-snd"><LIcon name={flash} size={22} /></span></div> : null}
                <div className="top">
                  {v.views !== null ? <span className="pill">{t("views", { n: v.views })}</span> : <span />}
                  <span style={{ display: "flex", gap: 6 }}>
                    {c.isDemo ? <span className="pill">{t("demo")}</span> : null}
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
                  <h2 className="h2 fname">{c.photo ? <img className="fav" src={c.photo} alt="" /> : null}{c.name}</h2>
                  <div className="role">{c.headline}</div>
                  <div className="meta">{t("years", { n: c.years })}{c.location ? ` · ${c.location}` : ""}</div>
                  <div className="skills">{c.skills.map((s) => <span key={s}>{s}</span>)}</div>
                  <div className="actions">
                    <button type="button" className={`btn ${c.saved ? "saved" : "s"}`} onClick={() => onSave(c)}><i className="ai"><LIcon name="bookmark" size={22} fill={c.saved} /></i><span>{c.saved ? `${t("savedBtn")} ✓` : t("save")}</span></button>
                    <button type="button" className="btn s" onClick={() => (employer ? setProfileOf(c) : setGate("prof"))}><i className="ai"><LIcon name="more" size={22} /></i><span>{t("profile")}</span></button>
                    <button type="button" className="btn m" disabled={c.requested} onClick={() => openRequest(c)}><i className="ai"><LIcon name="send" size={22} /></i><span>{c.requested ? t("requestSent") : t("requestIntro")}</span></button>
                  </div>
                </div>
                {i === active ? <div className="prog" style={{ width: `${progress.i === i ? Math.round(progress.p * 100) : 0}%` }} /> : null}
              </div>
            </section>
          );
        })}
      </div>
      {candidateViewer ? <CandidateBrowseNav floating /> : <EmployerNav floating visitor={!employer} savedCount={savedN} onGate={() => setGate("account")} />}
    </div>
  );

  return (
    <div className="desk">
      <DeskTop employer={employer} candidate={candidateViewer} savedN={savedN} onGate={setGate} />

      <aside className="side fside" aria-label={t("filters")}>
        <div className="fpanel">
          <div className="fpanel-hd">
            <h2>{t("filters")}</h2>
            {nFilters ? <button type="button" className="linkbtn" onClick={() => applyFilters({})}>{t("clearAll")}</button> : null}
          </div>
          <FilterGroups filters={filters} setFilter={setFilter} categories={categories} />
          <p className="note fpanel-note">{t("fairNote")}</p>
        </div>
      </aside>

      <div className="mid">
        <div className="stage">
          {prev ? <Peek c={prev} side="prev" label={t("prev")} onClick={() => go(-1)} /> : null}
          <div className="freel">{feedColumn}</div>
          {next ? <Peek c={next} side="next" label={t("next")} onClick={() => go(1)} /> : null}
          {cards.length ? (
            <>
              <button type="button" className="snav prev" aria-label={t("prev")} disabled={active === 0} onClick={() => go(-1)}><LIcon name="chevron" size={22} /></button>
              <button type="button" className="snav next" aria-label={t("next")} disabled={!next} onClick={() => go(1)}><LIcon name="chevron" size={22} /></button>
            </>
          ) : null}
        </div>
        <p className="stage-tip">{t("keysNote")}</p>
      </div>

      <aside className="side r" aria-label={t("profile")}>
        {current ? (
          <div className="ppanel">
            <div className="pp-head">
              <span className="pp-av">{current.photo ?? posterOf(current) ? <img src={(current.photo ?? posterOf(current))!} alt="" /> : initials(current.name)}</span>
              <div className="pp-id">
                <h2>{current.name}</h2>
                <p>{current.headline}</p>
                {current.isDemo ? <span className="pp-demo">{t("demo")}</span> : null}
              </div>
            </div>
            {employer ? (
              <Link className="btn w pp-main" href={`/c/${current.id}`}>{t("viewProfile")} <LIcon name="arrow" size={16} className="flipx" /></Link>
            ) : (
              <button type="button" className="btn w pp-main" onClick={() => setGate("prof")}>{t("viewProfile")} <LIcon name="arrow" size={16} className="flipx" /></button>
            )}
            <button type="button" className={`btn o w pp-save${current.saved ? " on" : ""}`} onClick={() => onSave(current)}>
              <LIcon name="bookmark" size={16} fill={current.saved} /> {current.saved ? `${t("savedBtn")} ✓` : t("saveCandidate")}
            </button>

            {current.about ? (
              <section className="pp-sec"><h3>{t("about")}</h3><p>{current.about}</p></section>
            ) : !employer ? (
              <section className="pp-lock"><LIcon name="lock" size={20} /><div><b>{t("deskGateTitle")}</b><p>{t("deskGateBody")}</p></div></section>
            ) : null}

            {current.skills.length ? (
              <section className="pp-sec"><h3>{t("keySkills")}</h3><div className="pp-skills">{current.skills.map((s) => <span key={s}>{s}</span>)}</div></section>
            ) : null}

            {current.prefs.roles.length || current.prefs.workModes.length || current.prefs.relocateTo.length ? (
              <section className="pp-sec"><h3>{tp("lookingFor")}</h3>
                {current.prefs.roles.length ? <div className="pp-skills">{current.prefs.roles.map((s) => <span key={s}>{s}</span>)}</div> : null}
                <p className="note" style={{ marginTop: 6 }}>{[...current.prefs.jobTypes.map((k) => tm(k)), ...current.prefs.workModes.map((k) => tp(`mode.${k}` as "mode.ONSITE")), current.prefs.relocateTo.length ? tp("openTo", { places: current.prefs.relocateTo.map((k) => tco(k as "Lebanon")).join(", ") }) : ""].filter(Boolean).join(" · ")}</p>
              </section>
            ) : null}

            <div className="pp-facts">
              <div><LIcon name="briefcase" size={20} /><b>{t("yearsShort", { n: current.years })}</b><span>{t("expLbl")}</span></div>
              {current.location ? <div><LIcon name="pin" size={20} /><b>{current.location}</b><span>{t("locLbl")}</span></div> : null}
              {current.industry ? <div><LIcon name={current.industry} size={20} /><b>{catName(current.industry)}</b><span>{t("indLbl")}</span></div> : null}
              <div><LIcon name="clock" size={20} /><b>{ta(current.availability)}</b><span>{t("availability")}</span></div>
            </div>

            <button type="button" className="pp-req" disabled={current.requested} onClick={() => openRequest(current)}>
              <span className="pp-req-ic"><LIcon name="send" size={20} /></span>
              <span className="pp-req-tx"><b>{current.requested ? t("requestSent") : t("requestIntro")}</b><span>{t("reqSub")}</span></span>
              <LIcon name="chevron" size={18} className="flipx" />
            </button>
            <p className="note">{t("contactPrivate")}</p>
          </div>
        ) : (
          <div className="ppanel">
            <h2 className="pp-how">{t("howTitle")}</h2>
            <ol className="pp-steps">
              {(["how1", "how2", "how3"] as const).map((k, i) => <li key={k}><span>{i + 1}</span>{t(k)}</li>)}
            </ol>
            {!employer ? <Link className="btn w" href="/signup?role=employer">{t("signupFree")}</Link> : null}
          </div>
        )}
      </aside>

      <GateSheet open={Boolean(gate)} onClose={() => setGate(null)} why={gate ?? "save"} />
      <Sheet open={Boolean(profileOf)} onClose={() => setProfileOf(null)} label={profileOf?.name ?? ""}>
        {profileOf ? (
          <>
            <h3 className="h3" style={{ fontSize: 18 }}>{profileOf.name}</h3>
            <p className="p">{profileOf.headline} · {profileOf.location}</p>
            {profileOf.about ? <><label className="lbl">{t("about")}</label><p className="p">{profileOf.about}</p></> : null}
            <label className="lbl">{t("industry")}</label><p className="p">{catName(profileOf.industry)}</p>
            {profileOf.prefs.roles.length || profileOf.prefs.workModes.length || profileOf.prefs.jobTypes.length ? (
              <><label className="lbl">{tp("lookingFor")}</label><p className="p">{[...profileOf.prefs.roles, ...profileOf.prefs.jobTypes.map((k) => tm(k)), ...profileOf.prefs.workModes.map((k) => tp(`mode.${k}` as "mode.ONSITE"))].join(" · ")}</p></>
            ) : null}
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

/** The cards above and below, shown dimmed beside the video on wide screens. */
function Peek({ c, side, label, onClick }: { c: FeedCard; side: "prev" | "next"; label: string; onClick: () => void }) {
  const poster = posterOf(c);
  return (
    <button type="button" className={`peek ${side}`} onClick={onClick} aria-label={label} tabIndex={-1}>
      {poster ? <img src={poster} alt="" /> : <span>{initials(c.name)}</span>}
    </button>
  );
}

/** Top bar on computers: the phone's bottom menu moves up here. */
function DeskTop({ employer, candidate, savedN, onGate }: { employer: Employer; candidate: boolean; savedN: number; onGate: (why: string) => void }) {
  const t = useTranslations("feed");
  const tn = useTranslations("nav");
  const path = usePathname();
  const unread = useUnread(Boolean(employer)).n;
  const links: { href: string; label: string; gate?: string; badge?: number }[] = [
    { href: "/feed", label: tn("discover") },
    { href: "/search", label: tn("search") },
    ...(candidate ? [] : [
      { href: "/employer/saved", label: employer ? tn("savedCount", { n: savedN }) : tn("saved"), gate: "saved" },
      { href: "/employer/inbox", label: tn("inbox"), gate: "inbox", badge: unread },
    ]),
  ];
  return (
    <header className="ftop">
      <Link href="/" className="ftop-logo" aria-label="Hireel"><Logo height={30} /></Link>
      <nav className="ftop-nav">
        {links.map((l) => (!employer && l.gate ? (
          <button key={l.href} type="button" onClick={() => onGate(l.gate!)}>{l.label}</button>
        ) : (
          <Link key={l.href} href={l.href} className={path === l.href ? "on" : ""} aria-current={path === l.href ? "page" : undefined}>{l.label}{l.badge ? <b className="ftop-nb" aria-label={tn("unreadN", { n: l.badge })}>{l.badge > 9 ? "9+" : l.badge}</b> : null}</Link>
        )))}
      </nav>
      <form className="ftop-search" action="/search" role="search">
        <LIcon name="search" size={18} />
        <input name="q" type="search" placeholder={t("searchPh")} aria-label={t("searchPh")} />
      </form>
      <div className="ftop-end">
        <LangSwitch />
        {employer ? (
          <Link href="/employer/account" className="ftop-me">
            {employer.logo ? <img className="clogo" src={employer.logo} alt="" /> : <span className="ftop-av">{initials(employer.userName || employer.company).slice(0, 1)}</span>}
            <span className="ftop-who"><b>{employer.userName}</b><span>{employer.company}</span></span>
          </Link>
        ) : candidate ? (
          <Link href="/candidate" className="btn sm">{tn("myArea")}</Link>
        ) : (
          <>
            <Link href="/login" className="ftop-login">{t("login")}</Link>
            <Link href="/signup?role=employer" className="btn sm">{t("signupEmp")}</Link>
          </>
        )}
      </div>
    </header>
  );
}

function FilterGroups({ filters, setFilter, categories }: { filters: FeedFilters; setFilter: (k: FilterKey, v: string | null) => void; categories: CategoryOption[] }) {
  const t = useTranslations("feed");
  const tl = useTranslations("languages");
  const ta = useTranslations("availability");
  const tc = useTranslations("signup.countries");
  const tp = useTranslations("prefs");
  const tm = useTranslations("employment");
  const groups: { k: FilterKey; title: string; icon: string; anyLabel: string; options: [string, string][] }[] = [
    { k: "industry", title: t("industry"), icon: "all", anyLabel: t("all"), options: categories.map((c) => [c.key, c.name]) },
    { k: "exp", title: t("experience"), icon: "briefcase", anyLabel: t("any"), options: Object.entries(EXP_BANDS).map(([k, [a, b]]) => [k, k.endsWith("+") ? t("expPlus", { n: a }) : t("expBand", { a, b })]) },
    { k: "place", title: t("location"), icon: "pin", anyLabel: t("any"), options: Object.keys(FEED_PLACES).map((k) => [k, tc(k)]) },
    { k: "lang", title: t("videoLanguage"), icon: "connect", anyLabel: t("any"), options: VIDEO_LANGUAGES.map((k) => [k, tl(k)]) },
    { k: "avail", title: t("availability"), icon: "clock", anyLabel: t("any"), options: AVAILABILITY.map((k) => [k, ta(k)]) },
    { k: "mode", title: tp("workModes"), icon: "pin", anyLabel: t("any"), options: WORK_MODES.map((k) => [k, tp(`mode.${k}`)]) },
    { k: "jtype", title: tp("jobTypes"), icon: "briefcase", anyLabel: t("any"), options: EMPLOYMENT_TYPES.map((k) => [k, tm(k)]) },
  ];
  return (
    <>
      {groups.map((g) => (
        <details key={g.k} className="fgrp" open>
          <summary><LIcon name={g.icon} size={16} /><h4>{g.title}</h4><LIcon name="down" size={16} className="fgrp-chev" /></summary>
          <div className="wrap">
            <button type="button" className={`chip${!filters[g.k] ? " on" : ""}`} onClick={() => setFilter(g.k, null)}>{g.anyLabel}</button>
            {g.options.map(([k, label]) => <button key={k} type="button" className={`chip${filters[g.k] === k ? " on" : ""}`} onClick={() => setFilter(g.k, k)}>{label}</button>)}
          </div>
        </details>
      ))}
    </>
  );
}
