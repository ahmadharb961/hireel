import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { photoUrl } from "@/lib/photo";
import { requireAdmin } from "@/server/session";
import { signedPlayback } from "@/server/videos";
import { AdminFrame } from "../AdminFrame";

const STATUSES = ["PUBLISHED", "DRAFT", "UNPUBLISHED"] as const;

export default async function CandidatesAdmin({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  await requireAdmin();
  const t = await getTranslations("admin");
  const ta = await getTranslations("adminC");
  const fmt = await getFormatter();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 80);
  const status = STATUSES.find((s) => s === sp.status) ?? null;
  const where: Prisma.CandidateProfileWhereInput = {
    ...(status ? { status } : {}),
    ...(q ? { OR: [
      { fullName: { contains: q, mode: "insensitive" } },
      { headline: { contains: q, mode: "insensitive" } },
      { location: { contains: q, mode: "insensitive" } },
      { user: { email: { contains: q, mode: "insensitive" } } },
    ] } : {}),
  };
  const [rows, counts] = await Promise.all([
    prisma.candidateProfile.findMany({
      where,
      include: {
        user: { select: { email: true, suspendedAt: true, emailVerified: true } },
        videos: { where: { archivedAt: null }, orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }], select: { streamUid: true, moderation: true, processing: true } },
        _count: { select: { requests: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.candidateProfile.groupBy({ by: ["status"], _count: true }),
  ]);
  const n = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;
  const all = counts.reduce((a, c) => a + c._count, 0);
  const posters = await Promise.all(rows.map(async (c) => (c.videos[0] ? (await signedPlayback(c.videos[0]))?.poster ?? null : null)));
  const href = (s: string | null) => `/admin/candidates?${new URLSearchParams({ ...(q ? { q } : {}), ...(s ? { status: s } : {}) })}`;

  return (
    <AdminFrame tab="candidates">
      <h1 className="h2">{ta("title")}</h1>
      <form action="/admin/candidates" method="get" role="search">
        {status ? <input type="hidden" name="status" value={status} /> : null}
        <input className="i" name="q" type="search" defaultValue={q} placeholder={ta("search")} aria-label={ta("search")} />
      </form>
      <div className="wrap">
        <Link className={`chip${!status ? " on" : ""}`} href={href(null)}>{ta("all")} · {all}</Link>
        {STATUSES.map((s) => <Link key={s} className={`chip${status === s ? " on" : ""}`} href={href(s)}>{ta(`status.${s}`)} · {n(s)}</Link>)}
      </div>
      {rows.length === 0 ? <div className="empty">{ta("none")}</div> : (
        <div className="arows">
          {rows.map((c, i) => (
            <Link key={c.id} href={`/admin/candidates/${c.id}`} className="arow">
              <span className="arow-av">{photoUrl(c) ?? posters[i] ? <img src={(photoUrl(c) ?? posters[i])!} alt="" /> : c.fullName.slice(0, 1)}</span>
              <span className="arow-main">
                <b>{c.fullName || "—"} {c.isDemo ? <span className="demo-flag">Demo</span> : null}</b>
                <span>{c.headline || "—"}{c.location ? ` · ${c.location}` : ""}</span>
                <span className="note">{c.user.email} · {t("joined", { date: fmt.dateTime(c.createdAt, { dateStyle: "medium" }) })} · {ta("videosN", { n: c.videos.length })} · {ta("requestsN", { n: c._count.requests })}</span>
              </span>
              <span className="arow-tags">
                <span className={`tag ${c.status === "PUBLISHED" ? "" : "mute"}`}>{ta(`status.${c.status}`)}</span>
                {c.user.suspendedAt ? <span className="tag bad">{ta("suspended")}</span> : null}
                {c.videos.some((v) => v.moderation === "PENDING" && v.processing === "READY") ? <span className="tag warn">{ta("toReview")}</span> : null}
              </span>
            </Link>
          ))}
        </div>
      )}
      {rows.length === 100 ? <p className="note">{ta("first100")}</p> : null}
    </AdminFrame>
  );
}
