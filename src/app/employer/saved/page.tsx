import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Header } from "@/components/Header";
import { EmployerNav } from "@/components/Nav";
import { prisma } from "@/lib/db";
import { photoUrl } from "@/lib/photo";
import { initialsOf } from "@/server/profile-data";
import { requireEmployer } from "@/server/session";

export default async function SavedPage() {
  const { member, company } = await requireEmployer();
  const t = await getTranslations("saved");
  const rows = await prisma.savedCandidate.findMany({
    where: { memberId: member.id, candidate: { status: "PUBLISHED", user: { suspendedAt: null } } },
    include: { candidate: { include: { skills: { include: { skill: true } } } } },
    orderBy: { createdAt: "desc" },
  });
  return (
    <div className="scr">
      <Header home="/feed" />
      <main className="main"><div className="stack">
        <div><h1 className="h2">{t("title")}</h1><p className="p">{t("count", { n: rows.length, max: company.plan.maxSaved })}</p></div>
        <div className="stack cards2">
        {rows.length === 0 ? <div className="empty">{t("empty")}</div> : rows.map(({ candidate: c }) => (
          <Link key={c.id} className="list-row" href={`/c/${c.id}`}>
            <div className="thumb">{photoUrl(c) ? <img src={photoUrl(c)!} alt="" /> : initialsOf(c.fullName)}</div>
            <div className="t"><b>{c.fullName}</b><span>{c.headline}</span><span>{c.location} · {c.skills.map((s) => s.skill.name).join(", ")}</span></div>
          </Link>
        ))}
        </div>
        <p className="note">{t("phase2")}</p>
      </div></main>
      <EmployerNav savedCount={rows.length} />
    </div>
  );
}
