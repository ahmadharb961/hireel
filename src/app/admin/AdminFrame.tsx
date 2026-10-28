import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Header } from "@/components/Header";
import { SignOut } from "@/components/SignOut";
import { prisma } from "@/lib/db";

export async function AdminFrame({ tab, children }: { tab: "overview" | "candidates" | "videos" | "employers" | "plans" | "reports"; children: React.ReactNode }) {
  const t = await getTranslations("admin");
  const [pendingVideos, openReports] = await Promise.all([
    prisma.video.count({ where: { archivedAt: null, processing: "READY", moderation: "PENDING" } }),
    prisma.report.count({ where: { status: "OPEN" } }),
  ]);
  const tabs = [
    { k: "overview", href: "/admin", label: t("tabs.overview") },
    { k: "candidates", href: "/admin/candidates", label: t("tabs.candidates") },
    { k: "videos", href: "/admin/videos", label: t("tabs.videos", { n: pendingVideos }) },
    { k: "employers", href: "/admin/employers", label: t("tabs.employers") },
    { k: "plans", href: "/admin/plans", label: t("tabs.plans") },
    { k: "reports", href: "/admin/reports", label: t("tabs.reports", { n: openReports }) },
  ];
  return (
    <div className="scr">
      <Header title={t("title")} home="/admin" />
      <nav className="tabs" aria-label={t("title")}>
        {tabs.map((x) => <Link key={x.k} href={x.href} className={tab === x.k ? "on" : ""} aria-current={tab === x.k ? "page" : undefined}>{x.label}</Link>)}
      </nav>
      <main className="main">
        <div className="stack">{children}</div>
        <div style={{ marginTop: 24 }}><SignOut /></div>
      </main>
    </div>
  );
}
