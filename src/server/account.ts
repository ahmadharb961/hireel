import "server-only";
import { prisma } from "@/lib/db";
import { deleteStreamVideo } from "./stream";

/**
 * "Delete my account" and "Download my data" (Privacy Policy: right to erasure and access).
 */

export type DeleteResult = { ok: true } | { ok: false; error: "not_found" | "admin" };

/**
 * Removes the account and everything that belongs to it, for good:
 * - candidate: profile, videos (also from Cloudflare Stream), CV, photo, requests and chats;
 * - company member: their seat; the company itself too if nobody else is left in it.
 * Admin accounts are removed by changing ADMIN_EMAIL, not from here.
 */
export async function deleteAccount(userId: string): Promise<DeleteResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { candidate: { include: { videos: { select: { streamUid: true } } } }, member: true },
  });
  if (!user) return { ok: false, error: "not_found" };
  if (user.role === "ADMIN") return { ok: false, error: "admin" };

  // Videos live at Cloudflare; remove them there first. A failure is logged, not shown: the
  // database rows go regardless, and the daily clean-up can't find them again, so keep trying hard.
  for (const v of user.candidate?.videos ?? []) {
    if (!v.streamUid) continue;
    await deleteStreamVideo(v.streamUid).catch((e) => console.error("account delete: stream video", v.streamUid, e));
  }

  await prisma.$transaction(async (tx) => {
    const companyId = user.member?.companyId;
    await tx.user.delete({ where: { id: userId } });
    if (companyId && (await tx.companyMember.count({ where: { companyId } })) === 0) {
      await tx.company.delete({ where: { id: companyId } });
    }
  });
  console.log(`account deleted: ${user.role} ${userId}`);
  return { ok: true };
}

const iso = (d: Date | null | undefined) => d?.toISOString() ?? null;

/** Everything Hireel keeps about this person, as plain data they can save. Files (video, CV, photo) are listed, not embedded. */
export async function exportData(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, emailVerified: true, role: true, locale: true, createdAt: true },
  });
  if (!user) return null;
  const sentMessages = await prisma.message.findMany({ where: { senderId: userId }, select: { requestId: true } });
  const base = { exportedAt: new Date().toISOString(), account: { ...user, createdAt: iso(user.createdAt) } };

  const chatOf = async (requestIds: string[]) => {
    const msgs = await prisma.message.findMany({ where: { requestId: { in: [...new Set([...requestIds, ...sentMessages.map((m) => m.requestId)])] } }, orderBy: { createdAt: "asc" } });
    return msgs.map((m) => ({ requestId: m.requestId, fromYou: m.senderId === userId, text: m.body, at: iso(m.createdAt) }));
  };

  if (user.role === "CANDIDATE") {
    const p = await prisma.candidateProfile.findUnique({
      where: { userId },
      include: {
        skills: { include: { skill: true } }, videos: true, cvFile: { select: { fileName: true, size: true, createdAt: true } }, shareLink: true,
        requests: { include: { company: { select: { name: true } } } },
        profileViews: { include: { company: { select: { name: true } } } },
        saves: { include: { member: { include: { company: { select: { name: true } } } } } },
      },
    });
    if (!p) return base;
    return {
      ...base,
      profile: {
        fullName: p.fullName, headline: p.headline, location: p.location, currentTitle: p.currentTitle, industry: p.industry,
        yearsExperience: p.yearsExperience, availability: p.availability, about: p.about, phone: p.phone, contactEmail: p.contactEmail,
        workHistory: p.workHistory, education: p.education, status: p.status, visibility: p.visibility, searchPaused: p.searchPaused,
        publishConsentAt: iso(p.publishConsentAt), hasPhoto: Boolean(p.photoUpdatedAt), skills: p.skills.map((s) => s.skill.name),
        createdAt: iso(p.createdAt), updatedAt: iso(p.updatedAt),
      },
      videos: p.videos.map((v) => ({ language: v.language, primary: v.isPrimary, moderation: v.moderation, durationSec: v.durationSec, views: v.viewCount, consentAt: iso(v.consentAt), uploadedAt: iso(v.createdAt), archivedAt: iso(v.archivedAt) })),
      cvFile: p.cvFile ? { ...p.cvFile, createdAt: iso(p.cvFile.createdAt) } : null,
      shareLink: p.shareLink ? { enabled: p.shareLink.enabled } : null,
      introRequests: p.requests.map((r) => ({ id: r.id, company: r.company.name, role: r.roleTitle, message: r.message, status: r.status, sharedEmail: r.shareEmail, sharedPhone: r.sharePhone, sharedCv: r.shareCv, receivedAt: iso(r.createdAt), answeredAt: iso(r.respondedAt) })),
      companiesThatViewedYou: p.profileViews.map((v) => ({ company: v.company.name, at: iso(v.viewedAt) })),
      companiesThatSavedYou: p.saves.map((s) => ({ company: s.member.company.name, at: iso(s.createdAt) })),
      messages: await chatOf(p.requests.map((r) => r.id)),
    };
  }

  if (user.role === "EMPLOYER") {
    const m = await prisma.companyMember.findUnique({
      where: { userId },
      include: {
        company: true,
        saved: { include: { candidate: { select: { fullName: true } } } },
        requests: { include: { candidate: { select: { fullName: true } } } },
      },
    });
    if (!m) return base;
    const c = m.company;
    return {
      ...base,
      position: m.position,
      company: { name: c.name, website: c.website, phone: c.phone, industry: c.industry, size: c.size, country: c.country, description: c.description, linkedin: c.linkedinUrl, instagram: c.instagramUrl, facebook: c.facebookUrl, status: c.status, createdAt: iso(c.createdAt) },
      savedCandidates: m.saved.map((s) => ({ candidate: s.candidate.fullName, at: iso(s.createdAt) })),
      introRequestsSent: m.requests.map((r) => ({ id: r.id, candidate: r.candidate.fullName, role: r.roleTitle, message: r.message, status: r.status, sentAt: iso(r.createdAt), answeredAt: iso(r.respondedAt) })),
      messages: await chatOf(m.requests.map((r) => r.id)),
    };
  }
  return base;
}
