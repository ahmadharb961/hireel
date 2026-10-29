import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { FEED_PAGE_SIZE, type VideoLang } from "@/lib/constants";
import { EXP_BANDS, FEED_PLACES } from "@/lib/feed-filters";
import { photoUrl } from "@/lib/photo";
import { publicViewCount } from "./rules/views";
import { signedPlayback } from "./videos";

export type FeedVideo = {
  id: string;
  lang: VideoLang;
  primary: boolean;
  views: number | null;
  hls: string | null;
  poster: string | null;
  landscape: boolean;
};

export type FeedCard = {
  id: string;
  name: string;
  headline: string;
  years: number;
  location: string;
  industry: string;
  availability: string;
  skills: string[];
  /** What they're looking for (job preferences). Salary is never included. */
  prefs: { roles: string[]; jobTypes: string[]; workModes: string[]; relocateTo: string[] };
  /** Only sent to signed-in employers. */
  about: string | null;
  photo: string | null;
  videos: FeedVideo[];
  startLang: VideoLang;
  isDemo: boolean;
  saved: boolean;
  requested: boolean;
};

export type FeedQuery = {
  seed: string;
  cursor?: string | null;
  industry?: string | null;
  lang?: VideoLang | null;
  /** Experience band, e.g. "0-2", "3-5", "5-10", "10+". */
  exp?: string | null;
  /** A FEED_PLACES key, matched against the candidate's typed location. */
  place?: string | null;
  avail?: string | null;
  /** Job preferences: on-site / hybrid / remote, and full-time / part-time / … */
  mode?: string | null;
  jtype?: string | null;
  viewer: { kind: "visitor" } | { kind: "employer"; companyId: string; memberId: string };
  limit?: number;
};

/**
 * One page of the discovery feed. Order is a per-session shuffle (md5 of id + seed),
 * so nobody is ranked by views or popularity.
 */
export async function feedPage(q: FeedQuery): Promise<{ cards: FeedCard[]; nextCursor: string | null }> {
  const limit = Math.min(q.limit ?? FEED_PAGE_SIZE, 10);
  const seed = q.seed.slice(0, 40);
  const conds: Prisma.Sql[] = [
    Prisma.sql`cp."status" = 'PUBLISHED'`,
    Prisma.sql`cp."publishConsentAt" IS NOT NULL`,
    Prisma.sql`cp."searchPaused" = false`,
    Prisma.sql`cp."profileType" = 'VIDEO'`,
    Prisma.sql`u."suspendedAt" IS NULL`,
    q.lang
      ? Prisma.sql`EXISTS (SELECT 1 FROM "Video" v WHERE v."candidateId" = cp."id" AND v."archivedAt" IS NULL AND v."processing" = 'READY' AND v."moderation" = 'APPROVED' AND v."language" = ${q.lang}::"VideoLanguage")`
      : Prisma.sql`EXISTS (SELECT 1 FROM "Video" v WHERE v."candidateId" = cp."id" AND v."archivedAt" IS NULL AND v."processing" = 'READY' AND v."moderation" = 'APPROVED')`,
  ];
  if (q.viewer.kind === "visitor") conds.push(Prisma.sql`cp."visibility" = 'EVERYONE'`);
  else conds.push(Prisma.sql`NOT EXISTS (SELECT 1 FROM "Block" b WHERE b."candidateId" = cp."id" AND b."companyId" = ${q.viewer.companyId})`);
  if (q.industry) conds.push(Prisma.sql`cp."industry" = ${q.industry}`);
  const band = q.exp ? EXP_BANDS[q.exp] : null;
  if (band) conds.push(Prisma.sql`cp."yearsExperience" BETWEEN ${band[0]} AND ${band[1]}`);
  const terms = q.place ? FEED_PLACES[q.place] : null;
  // A place matches people who live there or said they'd move there.
  if (terms && q.place) conds.push(Prisma.sql`(${Prisma.join([...terms.map((w) => Prisma.sql`cp."location" ILIKE ${"%" + w + "%"}`), Prisma.sql`${q.place} = ANY(cp."relocateTo")`], " OR ")})`);
  if (q.mode) conds.push(Prisma.sql`${q.mode} = ANY(cp."workModes")`);
  if (q.jtype) conds.push(Prisma.sql`${q.jtype} = ANY(cp."jobTypes")`);
  if (q.avail) conds.push(Prisma.sql`cp."availability" = ${q.avail}`);
  if (q.cursor) conds.push(Prisma.sql`md5(cp."id" || ${seed}) > ${q.cursor}`);

  const rows = await prisma.$queryRaw<{ id: string; h: string }[]>`
    SELECT cp."id", md5(cp."id" || ${seed}) AS h
    FROM "CandidateProfile" cp JOIN "user" u ON u."id" = cp."userId"
    WHERE ${Prisma.join(conds, " AND ")}
    ORDER BY h ASC
    LIMIT ${limit + 1}`;

  const page = rows.slice(0, limit);
  const nextCursor = rows.length > limit ? page[page.length - 1].h : null;
  const cards = await loadCards(page.map((r) => r.id), q);
  return { cards, nextCursor };
}

async function loadCards(ids: string[], q: Pick<FeedQuery, "lang" | "viewer">): Promise<FeedCard[]> {
  if (!ids.length) return [];
  const memberId = q.viewer.kind === "employer" ? q.viewer.memberId : null;
  const companyId = q.viewer.kind === "employer" ? q.viewer.companyId : null;
  const profiles = await prisma.candidateProfile.findMany({
    where: { id: { in: ids } },
    include: {
      skills: { include: { skill: true } },
      videos: { where: { archivedAt: null, processing: "READY", moderation: "APPROVED" }, orderBy: { createdAt: "asc" } },
      saves: memberId ? { where: { memberId } } : false,
      requests: companyId ? { where: { companyId, status: { in: ["PENDING", "ACCEPTED"] } }, select: { id: true } } : false,
    },
  });
  const byId = new Map(profiles.map((p) => [p.id, p]));
  const out: FeedCard[] = [];
  for (const id of ids) {
    const p = byId.get(id);
    if (!p || !p.videos.length) continue;
    const videos: FeedVideo[] = await Promise.all(
      p.videos.map(async (v) => {
        const play = await signedPlayback(v);
        return {
          id: v.id,
          lang: v.language,
          primary: v.isPrimary,
          views: publicViewCount(v.viewCount),
          hls: play?.hls ?? null,
          poster: play?.poster ?? null,
          landscape: Boolean(v.width && v.height && v.width > v.height),
        };
      }),
    );
    const primary = videos.find((v) => v.primary) ?? videos[0];
    const startLang = (q.lang && videos.find((v) => v.lang === q.lang)?.lang) || primary.lang;
    out.push({
      id: p.id,
      name: p.fullName,
      headline: p.headline,
      years: p.yearsExperience,
      location: p.location,
      industry: p.industry,
      availability: p.availability,
      skills: p.skills.map((s) => s.skill.name).slice(0, 5),
      prefs: { roles: p.desiredRoles, jobTypes: p.jobTypes, workModes: p.workModes, relocateTo: p.relocateTo },
      about: q.viewer.kind === "employer" ? p.about : null,
      photo: photoUrl(p),
      videos,
      startLang,
      isDemo: p.isDemo,
      saved: Array.isArray(p.saves) && p.saves.length > 0,
      requested: Array.isArray(p.requests) && p.requests.length > 0,
    });
  }
  return out;
}
