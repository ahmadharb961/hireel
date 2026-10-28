import { getFormatter, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/server/session";
import { AdminFrame } from "../AdminFrame";
import { ReportControls } from "./ReportControls";

export default async function ReportsAdmin() {
  await requireAdmin();
  const t = await getTranslations("admin");
  const fmt = await getFormatter();
  const reports = await prisma.report.findMany({ where: { status: "OPEN" }, orderBy: { createdAt: "asc" }, include: { reporter: { select: { email: true, role: true } } }, take: 50 });
  const companyIds = reports.filter((r) => r.targetType === "COMPANY").map((r) => r.targetId);
  const candIds = reports.filter((r) => r.targetType === "CANDIDATE").map((r) => r.targetId);
  const [companies, cands] = await Promise.all([
    prisma.company.findMany({ where: { id: { in: companyIds } }, select: { id: true, name: true } }),
    prisma.candidateProfile.findMany({ where: { id: { in: candIds } }, select: { id: true, fullName: true } }),
  ]);
  const name = (r: (typeof reports)[number]) => (r.targetType === "COMPANY" ? companies.find((c) => c.id === r.targetId)?.name : cands.find((c) => c.id === r.targetId)?.fullName) ?? "—";
  return (
    <AdminFrame tab="reports">
      <h1 className="h2">{t("reportsTitle")}</h1>
      {reports.length === 0 ? <div className="empty">{t("noReports")}</div> : reports.map((r) => (
        <div key={r.id} className="card">
          <div className="sw">
            <div><h2 className="h3">{name(r)}</h2><p className="p">{t(`target.${r.targetType}`)} · {t("reportedBy", { email: r.reporter.email })}</p></div>
            <span className="tag warn">{r.reason}</span>
          </div>
          {r.details ? <p className="p" style={{ marginTop: 8, color: "var(--tx)", whiteSpace: "pre-wrap" }}>{r.details}</p> : null}
          <p className="note" style={{ marginTop: 6 }}>{fmt.dateTime(r.createdAt, { dateStyle: "medium", timeStyle: "short" })}</p>
          <ReportControls id={r.id} />
        </div>
      ))}
    </AdminFrame>
  );
}
