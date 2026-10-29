import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/server/session";
import { AdminFrame } from "../../AdminFrame";

/**
 * One chat, read-only. Chats are private: the Hireel team can open one only after
 * someone in it reported it, and every visit is written to the audit log.
 */
export default async function AdminChat({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const t = await getTranslations("adminChat");
  const fmt = await getFormatter();
  const reports = await prisma.report.findMany({ where: { requestId: id }, orderBy: { createdAt: "desc" }, include: { reporter: { select: { email: true } } } });
  if (!reports.length) notFound();
  const r = await prisma.introRequest.findUnique({
    where: { id },
    include: {
      company: { select: { id: true, name: true } },
      candidate: { select: { id: true, fullName: true, userId: true } },
      sender: { include: { user: { select: { name: true } } } },
      messages: { orderBy: { createdAt: "asc" }, take: 1000 },
    },
  });
  if (!r) notFound();
  await prisma.auditLog.create({ data: { actorId: admin.id, action: "admin.view_chat", targetType: "IntroRequest", targetId: id } });
  const date = (d: Date) => fmt.dateTime(d, { dateStyle: "medium", timeStyle: "short" });

  return (
    <AdminFrame tab="reports">
      <Link href="/admin/reports" className="aback">← {t("back")}</Link>
      <div className="card">
        <h1 className="h2">{t("title")}</h1>
        <p className="p">
          <Link href={`/admin/candidates/${r.candidate.id}`}>{r.candidate.fullName}</Link> ↔ <Link href={`/admin/employers/${r.company.id}`}>{r.company.name}</Link> ({r.sender.user.name}) · {r.roleTitle}
        </p>
        <p className="note">{t("privateNote")}</p>
        {reports.map((x) => (
          <p key={x.id} className="p" style={{ marginTop: 6 }}><span className={`tag ${x.status === "OPEN" ? "warn" : "mute"}`}>{x.reason}</span> {x.details} <span className="note">· {x.reporter.email} · {date(x.createdAt)}</span></p>
        ))}
        {r.chatClosedAt ? <p className="note">{t("ended", { who: r.chatClosedBy === "candidate" ? r.candidate.fullName : r.company.name, date: date(r.chatClosedAt) })}</p> : null}
      </div>
      <div className="card">
        {r.messages.length === 0 ? <p className="note">{t("none")}</p> : (
          <div className="stack" style={{ gap: 6 }}>
            {r.messages.map((m) => {
              const cand = m.senderId === r.candidate.userId;
              return (
                <div key={m.id} className={`bub${cand ? "" : " me"}`}>
                  <small style={{ fontWeight: 700, opacity: 0.8 }}>{cand ? r.candidate.fullName : `${r.sender.user.name} · ${r.company.name}`}</small>
                  <p dir="auto">{m.body}</p>
                  <time dateTime={m.createdAt.toISOString()}>{date(m.createdAt)}</time>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <p className="note">{t("viewLogged")}</p>
    </AdminFrame>
  );
}
