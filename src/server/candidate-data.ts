import "server-only";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import type { CandidateProfile } from "@/generated/prisma/client";
import { requireCandidate } from "./session";
import { candidateStatus, signedPlayback } from "./videos";

/** Candidate pages: signed in as a candidate, and onboarding finished. */
export async function requireOnboardedCandidate() {
  const c = await requireCandidate();
  if (c.profile.onboardingStep < 5) redirect("/candidate/onboarding");
  return c;
}

export async function pendingRequestCount(candidateId: string) {
  return prisma.introRequest.count({ where: { candidateId, status: "PENDING", company: { status: { not: "SUSPENDED" } } } });
}

export type StudioVideo = {
  id: string;
  lang: "EN" | "AR" | "FR";
  primary: boolean;
  status: ReturnType<typeof candidateStatus>;
  reason: string | null;
  views: number;
  hls: string | null;
  poster: string | null;
  landscape: boolean;
  isDemo: boolean;
  replacement: { id: string; status: ReturnType<typeof candidateStatus>; reason: string | null } | null;
};

/** Up to two slots, each with its current video and any pending replacement. */
export async function studioVideos(candidateId: string): Promise<StudioVideo[]> {
  const all = await prisma.video.findMany({ where: { candidateId, archivedAt: null }, orderBy: { createdAt: "asc" } });
  const current = all.filter((v) => !v.replacesVideoId);
  return Promise.all(
    current.map(async (v) => {
      const rep = all.filter((r) => r.replacesVideoId === v.id).at(-1);
      const play = v.processing === "READY" ? await signedPlayback(v) : null;
      return {
        id: v.id,
        lang: v.language,
        primary: v.isPrimary,
        status: candidateStatus(v),
        reason: v.rejectionReason,
        views: v.viewCount,
        hls: play?.hls ?? null,
        poster: play?.poster ?? null,
        landscape: Boolean(v.width && v.height && v.width > v.height),
        isDemo: v.isDemo,
        replacement: rep ? { id: rep.id, status: candidateStatus(rep), reason: rep.rejectionReason } : null,
      };
    }),
  );
}

export function completion(p: CandidateProfile, skills: number, hasLiveVideo: boolean) {
  const steps = [
    { key: "basics", done: Boolean(p.headline && p.location), weight: 25 },
    { key: "experience", done: Boolean(p.currentTitle && skills > 0), weight: 25 },
    { key: "video", done: p.profileType === "TEXT_ONLY" ? p.about.trim().length >= 40 : hasLiveVideo, weight: 25 },
    { key: "publish", done: p.status === "PUBLISHED", weight: 15 },
    { key: "about", done: p.about.trim().length >= 40 || Boolean(p.workHistory), weight: 10 },
  ];
  const pct = steps.reduce((s, x) => s + (x.done ? x.weight : 0), 0);
  const next = steps.find((s) => !s.done)?.key ?? null;
  return { pct, next };
}

export type InterestedCompany = {
  id: string; name: string; logoUpdatedAt: Date | null; industry: string; verified: boolean;
  savedAt: Date | null; viewedAt: Date | null; views: number; lastAt: Date;
};

/**
 * Companies that opened or saved this candidate's profile, most recent first.
 * Suspended and blocked companies are left out.
 */
export async function interestedCompanies(candidateId: string, limit = 100): Promise<InterestedCompany[]> {
  const hidden = { OR: [{ status: "SUSPENDED" as const }, { blocks: { some: { candidateId } } }] };
  const [views, saves] = await Promise.all([
    prisma.profileView.groupBy({ by: ["companyId"], where: { candidateId, company: { NOT: hidden } }, _max: { viewedAt: true }, _count: true }),
    prisma.savedCandidate.findMany({ where: { candidateId, member: { company: { NOT: hidden } } }, select: { createdAt: true, member: { select: { companyId: true } } } }),
  ]);
  const map = new Map<string, { savedAt: Date | null; viewedAt: Date | null; views: number }>();
  for (const v of views) map.set(v.companyId, { savedAt: null, viewedAt: v._max.viewedAt, views: v._count });
  for (const s of saves) {
    const e = map.get(s.member.companyId) ?? { savedAt: null, viewedAt: null, views: 0 };
    if (!e.savedAt || s.createdAt > e.savedAt) e.savedAt = s.createdAt;
    map.set(s.member.companyId, e);
  }
  const companies = await prisma.company.findMany({ where: { id: { in: [...map.keys()] } }, select: { id: true, name: true, logoUpdatedAt: true, industry: true, status: true } });
  return companies
    .map((c) => {
      const e = map.get(c.id)!;
      const lastAt = new Date(Math.max(e.savedAt?.getTime() ?? 0, e.viewedAt?.getTime() ?? 0));
      return { id: c.id, name: c.name, logoUpdatedAt: c.logoUpdatedAt, industry: c.industry, verified: c.status === "VERIFIED", ...e, lastAt };
    })
    .sort((a, b) => b.lastAt.getTime() - a.lastAt.getTime())
    .slice(0, limit);
}
