import Link from "next/link";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { AccountData } from "@/components/AccountData";
import { Header } from "@/components/Header";
import { LangSwitch } from "@/components/LangSwitch";
import { EmployerNav } from "@/components/Nav";
import { PushCard } from "@/components/PushCard";
import { SignOut } from "@/components/SignOut";
import { ConversationRow } from "@/components/chat/ConversationRow";
import { listTime } from "@/lib/chat-time";
import { prisma } from "@/lib/db";
import { logoUrl } from "@/lib/logo";
import { photoUrl } from "@/lib/photo";
import { categoryNamer } from "@/server/categories";
import { hasUnread } from "@/server/chat";
import { quotaFor, savedCount } from "@/server/employer-data";
import { requireEmployer } from "@/server/session";

/**
 * The company's dashboard: what needs attention first (replies and new messages), then requests
 * still waiting, then numbers, then the company and account settings.
 */
export default async function EmployerDashboard() {
  const emp = await requireEmployer();
  const { company, member, viewer } = emp;
  const locale = await getLocale();
  const [t, td, tc, tch, fmt, catName] = await Promise.all([
    getTranslations("account"), getTranslations("empHome"), getTranslations("companyEdit"), getTranslations("chat"), getFormatter(), categoryNamer(),
  ]);
  const [q, saved, reqs, members] = await Promise.all([
    quotaFor(emp, locale),
    savedCount(member.id),
    prisma.introRequest.findMany({
      where: { senderId: member.id },
      include: { candidate: true, messages: { orderBy: { createdAt: "desc" }, take: 1 } },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.companyMember.count({ where: { companyId: company.id } }),
  ]);
  const plan = company.plan;
  const chats = reqs.filter((r) => r.status === "ACCEPTED")
    .sort((a, b) => (b.lastMessageAt ?? b.respondedAt ?? b.createdAt).getTime() - (a.lastMessageAt ?? a.respondedAt ?? a.createdAt).getTime());
  const unread = chats.filter((r) => hasUnread(r, "company"));
  const waiting = reqs.filter((r) => r.status === "PENDING");
  const accepted = chats.length;
  const answered = reqs.filter((r) => r.status === "ACCEPTED" || r.status === "DECLINED").length;
  const labels = { you: tch("you"), start: tch("startChat"), ended: tch("ended"), unread: tch("new") };
  // Unread chats first, then the most recent ones; four rows at most.
  const rows = [...unread, ...chats.filter((r) => !unread.includes(r))].slice(0, 4);
  const first = viewer.name.split(" ")[0] || viewer.name;
  const summary = unread.length ? td("summaryUnread", { n: unread.length }) : waiting.length ? td("summaryWaiting", { n: waiting.length }) : td("summaryNone");
  const meter = (label: string, used: number, max: number) => (
    <div style={{ marginTop: 12 }}>
      <div className="sw"><p className="p" style={{ color: "var(--tx)" }}>{label}</p><p className="p" style={{ fontVariantNumeric: "tabular-nums" }}><b style={{ color: "var(--tx)" }}>{used}</b> / {max}</p></div>
      <div className="meter"><i style={{ width: `${max ? Math.min(100, (used / max) * 100) : 100}%` }} /></div>
    </div>
  );

  return (
    <div className="scr">
      <Header home="/feed" lang={false} />
      <main className="main"><div className="stack">
        <div>
          <h1 className="h2">{td("welcome", { name: first })}</h1>
          <p className="p">{summary}</p>
        </div>

        <PushCard variant="prompt" who="employer" />

        <div className="row">
          <Link className="btn" href="/feed">{td("discover")}</Link>
          <Link className="btn g" href="/search">{td("search")}</Link>
        </div>

        <section className="msec" aria-labelledby="ed-msgs">
          <h2 className="msec-h" id="ed-msgs">{td("messages")}<Link className="lsec-link" href="/employer/inbox">{td("seeAll")} →</Link></h2>
          {rows.length ? (
            <div className="convs">
              {rows.map((r) => (
                <ConversationRow
                  key={r.id}
                  labels={labels}
                  c={{
                    href: `/employer/chat/${r.id}`, name: r.candidate.fullName, avatar: photoUrl(r.candidate), sub: r.roleTitle,
                    last: r.messages[0] ? { body: r.messages[0].body, mine: r.messages[0].senderId === member.userId } : null,
                    time: listTime(r.lastMessageAt ?? r.respondedAt, fmt), unread: hasUnread(r, "company"), ended: Boolean(r.chatClosedAt),
                  }}
                />
              ))}
            </div>
          ) : <div className="mempty"><b>{td("noChatsTitle")}</b>{td("noChats")}</div>}
          {waiting.length ? <Link className="list-row" href="/employer/inbox"><div className="thumb" style={{ height: 48 }}>{waiting.length}</div><div className="t"><b>{td("waiting", { n: waiting.length })}</b><span>{td("waitingSub")}</span></div></Link> : null}
        </section>

        <div className="grid3">
          <Link className="stat link" href="/employer/saved"><b>{saved}</b><span>{td("statSaved")} →</span></Link>
          <Link className="stat link" href="/employer/inbox"><b>{reqs.length}</b><span>{td("statSent")} →</span></Link>
          <div className="stat"><b>{accepted}</b><span>{answered ? td("statAcceptedRate", { pct: Math.round((accepted / answered) * 100) }) : td("statAccepted")}</span></div>
        </div>

        <h2 className="msec-h" style={{ marginTop: 12 }}>{td("companyTitle")}</h2>
        <div className="card">
          <div className="sw">
            <div className="pv-name">{logoUrl(company) ? <img className="clogo" src={logoUrl(company)!} alt="" /> : <span className="clogo ini">{company.name.slice(0, 1)}</span>}<div><b className="h3">{company.name}</b><p className="p">{[catName(company.industry), company.country, company.size].filter(Boolean).join(" · ")}</p></div></div>
            {company.status === "VERIFIED" ? <span className="tag">✓ {t("verified")}</span> : company.status === "SUSPENDED" ? <span className="tag bad">{t("suspended")}</span> : <span className="tag mute">{t("notVerified")}</span>}
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            <Link className="btn sm o" href="/employer/company">{tc("editButton")}</Link>
            <Link className="btn sm g" href={`/companies/${company.id}`}>{td("viewPage")}</Link>
          </div>
          <p className="note" style={{ marginTop: 8 }}>{company.status === "VERIFIED" ? t("verifiedNote") : company.status === "SUSPENDED" ? t("suspendedNote") : t("notVerifiedNote")}</p>
        </div>
        <div className="card" style={{ background: "var(--soft)", borderColor: "transparent" }}>
          <div className="sw"><h2 className="h3">{t("freeTitle")}</h2><span className="tag">$0</span></div>
          <p className="p" style={{ marginTop: 4 }}>{t("freeBody")}</p>
        </div>
        <div className="card">
          <h2 className="h3">{t("fairTitle")}</h2>
          {meter(t("introThisMonth"), q.used.intro, plan.monthlyIntroRequests)}
          {meter(t("cvThisMonth"), q.used.cv, plan.monthlyCvRequests)}
          {meter(t("savedLimit"), saved, plan.maxSaved)}
          <p className="note" style={{ marginTop: 10 }}>{t("fairNote")}</p>
        </div>

        <h2 className="msec-h" style={{ marginTop: 12 }}>{td("accountTitle")}</h2>
        <PushCard variant="settings" who="employer" />
        <LangSwitch variant="button" />
        <AccountData who="employer" soleMember={members <= 1} />
        <SignOut />
      </div></main>
      <EmployerNav savedCount={saved} />
    </div>
  );
}
