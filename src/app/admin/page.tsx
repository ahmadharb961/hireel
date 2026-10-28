import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/server/session";
import { AdminFrame } from "./AdminFrame";

export default async function AdminOverview() {
  await requireAdmin();
  const t = await getTranslations("admin");
  const real = { isDemo: false };
  const [candidates, published, employers, verified, toReview, requests, accepted, reports, demo] = await Promise.all([
    prisma.candidateProfile.count({ where: real }),
    prisma.candidateProfile.count({ where: { ...real, status: "PUBLISHED" } }),
    prisma.company.count({ where: real }),
    prisma.company.count({ where: { ...real, status: "VERIFIED" } }),
    prisma.video.count({ where: { archivedAt: null, processing: "READY", moderation: "PENDING" } }),
    prisma.introRequest.count({ where: real }),
    prisma.introRequest.count({ where: { ...real, status: "ACCEPTED" } }),
    prisma.report.count({ where: { status: "OPEN" } }),
    prisma.candidateProfile.count({ where: { isDemo: true } }),
  ]);
  const stats: [string, number][] = [
    [t("stats.candidates"), candidates], [t("stats.published"), published], [t("stats.employers"), employers],
    [t("stats.verified"), verified], [t("stats.toReview"), toReview], [t("stats.requests"), requests],
    [t("stats.accepted"), accepted], [t("stats.reports"), reports],
  ];
  return (
    <AdminFrame tab="overview">
      <div className="grid2 stats4">{stats.map(([k, v]) => <div key={k} className="stat"><b>{v}</b><span>{k}</span></div>)}</div>
      <p className="note">{t("realOnly")}{demo ? ` ${t("demoCount", { n: demo })}` : ""}</p>
      <div className="card"><h2 className="h3">{t("securityTitle")}</h2><p className="p">{t("securityBody")}</p></div>
    </AdminFrame>
  );
}
