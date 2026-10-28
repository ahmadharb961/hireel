import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { Header } from "@/components/Header";
import { EmployerNav } from "@/components/Nav";
import { prisma } from "@/lib/db";
import { photoUrl } from "@/lib/photo";
import { savedCount } from "@/server/employer-data";
import { requireEmployer } from "@/server/session";

/** Requests this company sent. Contact details appear only for accepted requests, as shared. */
export default async function InboxPage() {
  const { member, company } = await requireEmployer();
  const t = await getTranslations("inbox");
  const tcv = await getTranslations("cvFile");
  const fmt = await getFormatter();
  const reqs = await prisma.introRequest.findMany({
    where: { companyId: company.id },
    orderBy: { createdAt: "desc" },
    include: { candidate: { include: { user: { select: { email: true } }, cvFile: { select: { id: true } } } } },
    take: 100,
  });
  const n = await savedCount(member.id);
  return (
    <div className="scr">
      <Header home="/feed" />
      <main className="main"><div className="stack">
        <div><h1 className="h2">{t("title")}</h1><p className="p">{t("subtitle")}</p></div>
        <div className="stack cards2">
        {reqs.length === 0 ? <div className="empty">{t("empty")}</div> : reqs.map((r) => {
          const c = r.candidate;
          const accepted = r.status === "ACCEPTED";
          return (
            <div key={r.id} className="card">
              <div className="sw">
                <div><h2 className="h3 pv-name">{photoUrl(c) ? <img className="pv-av" src={photoUrl(c)!} alt="" style={{ width: 36, height: 36 }} /> : null}<Link href={`/c/${c.id}`} style={{ color: "inherit" }}>{c.fullName}</Link></h2><p className="p">{r.roleTitle} · {t("sent", { date: fmt.dateTime(r.createdAt, { dateStyle: "medium" }) })}</p></div>
                <span className={`tag ${accepted ? "" : r.status === "PENDING" ? "warn" : "mute"}`}>{t(`status.${r.status}`)}</span>
              </div>
              {accepted ? (
                <div style={{ marginTop: 10 }}>
                  {r.shareEmail ? <div className="kv"><span>{t("email")}</span><b dir="ltr">{c.contactEmail || c.user.email}</b></div> : null}
                  {r.sharePhone && c.phone ? <div className="kv"><span>{t("phone")}</span><b dir="ltr">{c.phone}</b></div> : null}
                  {r.shareCv ? <div className="kv"><span>{t("cv")}</span><b><Link href={`/c/${c.id}`}>{t("viewCv")}</Link>{c.cvFile ? <> · <a href={`/api/cv/${c.id}`}>{tcv("downloadCv")}</a></> : null}</b></div> : null}
                  {!r.shareEmail && !r.sharePhone && !r.shareCv ? <p className="note">{t("sharedNothing")}</p> : null}
                  <p className="note" style={{ marginTop: 6 }}>{t("messagingSoon")}</p>
                </div>
              ) : <p className="note" style={{ marginTop: 8 }}>{r.wantsCv ? `${t("askedCv")} ` : ""}{t("appearIfAccepted")}</p>}
            </div>
          );
        })}
        </div>
      </div></main>
      <EmployerNav savedCount={n} />
    </div>
  );
}
