import "server-only";
import { prisma } from "@/lib/db";
import { FEATURED_MAX } from "@/lib/categories";
import { liveVideoWhere, signedPlayback } from "./videos";

export type FeaturedCandidate = {
  id: string; name: string; headline: string; years: number; city: string;
  skills: string[]; poster: string | null; duration: number | null; isDemo: boolean;
};

/** Real, public candidates with an approved video, newest first. Never ranked by views. */
export async function featuredCandidates(limit = 6): Promise<FeaturedCandidate[]> {
  const rows = await prisma.candidateProfile.findMany({
    where: { status: "PUBLISHED", visibility: "EVERYONE", searchPaused: false, profileType: "VIDEO", user: { suspendedAt: null }, videos: { some: liveVideoWhere } },
    include: { skills: { include: { skill: true } }, videos: { where: liveVideoWhere, orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }], take: 1 } },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });
  return Promise.all(rows.map(async (c) => {
    const v = c.videos[0];
    const play = v ? await signedPlayback(v) : null;
    return {
      id: c.id, name: c.fullName, headline: c.headline, years: c.yearsExperience, city: c.location.split(",")[0],
      skills: c.skills.map((s) => s.skill.name), poster: play?.poster ?? null, duration: v?.durationSec ?? null, isDemo: c.isDemo,
    };
  }));
}

/** Companies the Hireel team chose for "Top employers", in their order. Suspended ones drop out. */
export async function featuredCompanies() {
  return prisma.company.findMany({
    where: { featuredRank: { not: null }, status: { not: "SUSPENDED" } },
    orderBy: { featuredRank: "asc" },
    take: FEATURED_MAX,
    select: { id: true, name: true, industry: true, country: true, status: true, logoUpdatedAt: true, bannerUpdatedAt: true, isDemo: true },
  });
}
