"use server";
import { notifyUsers } from "@/server/push";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { MAX_VIDEOS, slugify } from "@/lib/constants";
import { streamConfigured } from "@/lib/env";
import { firstError, profilePrefsSchema, profileAboutSchema, profileBasicsSchema, profileExperienceSchema, videoLanguageSchema } from "@/lib/validation";
import { candidateOrNull } from "@/server/session";
import { newShareToken } from "@/server/rules/share";
import { rateLimit } from "@/server/ratelimit";
import { activeVideoWhere, archiveData, ensurePrimary } from "@/server/videos";
import { isCategory } from "@/server/categories";
import { FEED_PLACES } from "@/lib/feed-filters";
import { hideFromCompany, hideFromName, unhideCompany, unhideName } from "@/server/hiding";

type Result = { ok: true } | { ok: false; error: string; field?: string };
const fail = (error: string, field?: string): Result => ({ ok: false, error, field });

async function me() {
  const c = await candidateOrNull();
  if (!c) throw new Error("UNAUTHORIZED");
  return c;
}

async function setSkills(candidateId: string, names: string[]) {
  const unique = Array.from(new Map(names.map((n) => [slugify(n), n.trim()])).entries()).filter(([slug]) => slug);
  await prisma.$transaction(async (tx) => {
    await tx.candidateSkill.deleteMany({ where: { candidateId } });
    for (const [slug, name] of unique) {
      const skill = await tx.skill.upsert({ where: { slug }, update: {}, create: { slug, name } });
      await tx.candidateSkill.create({ data: { candidateId, skillId: skill.id } });
    }
  });
}

export async function saveBasics(input: unknown, nextStep?: number): Promise<Result> {
  const { profile } = await me();
  const p = profileBasicsSchema.safeParse(input);
  if (!p.success) { const e = firstError(p.error); return fail(e.code, e.field); }
  await prisma.candidateProfile.update({
    where: { id: profile.id },
    data: { ...p.data, onboardingStep: nextStep ? Math.max(profile.onboardingStep, nextStep) : profile.onboardingStep },
  });
  revalidatePath("/candidate", "layout");
  return { ok: true };
}

export async function saveExperience(input: unknown, nextStep?: number): Promise<Result> {
  const { profile } = await me();
  const p = profileExperienceSchema.safeParse(input);
  if (!p.success) { const e = firstError(p.error); return fail(e.code, e.field); }
  if (p.data.industry !== profile.industry && !(await isCategory(p.data.industry))) return fail("required", "industry");
  const { skills, ...rest } = p.data;
  await prisma.candidateProfile.update({
    where: { id: profile.id },
    data: { ...rest, onboardingStep: nextStep ? Math.max(profile.onboardingStep, nextStep) : profile.onboardingStep },
  });
  await setSkills(profile.id, skills);
  revalidatePath("/candidate", "layout");
  return { ok: true };
}

export async function saveAbout(input: unknown): Promise<Result> {
  const { profile } = await me();
  const p = profileAboutSchema.safeParse(input);
  if (!p.success) { const e = firstError(p.error); return fail(e.code, e.field); }
  await prisma.candidateProfile.update({ where: { id: profile.id }, data: p.data });
  revalidatePath("/candidate", "layout");
  return { ok: true };
}

/** Onboarding step 3: video or text-only. */
export async function chooseProfileType(type: "VIDEO" | "TEXT_ONLY", about: string): Promise<Result> {
  const { profile } = await me();
  if (type === "TEXT_ONLY" && about.trim().length < 40) return fail("about_short", "about");
  await prisma.candidateProfile.update({
    where: { id: profile.id },
    data: { profileType: type, about: type === "TEXT_ONLY" ? about.trim().slice(0, 1200) : profile.about, onboardingStep: Math.max(profile.onboardingStep, 4) },
  });
  revalidatePath("/candidate", "layout");
  return { ok: true };
}

/** Publishing always requires explicit consent. */
export async function publishProfile(opts: { consent: boolean; visibility: "EVERYONE" | "EMPLOYERS_ONLY" }): Promise<Result> {
  const { profile } = await me();
  if (!opts.consent) return fail("consent");
  if (!profile.headline || !profile.fullName) return fail("incomplete");
  if (profile.profileType === "TEXT_ONLY" && profile.about.trim().length < 40) return fail("about_short");
  await prisma.candidateProfile.update({
    where: { id: profile.id },
    data: {
      status: "PUBLISHED",
      visibility: opts.visibility === "EMPLOYERS_ONLY" ? "EMPLOYERS_ONLY" : "EVERYONE",
      publishConsentAt: new Date(),
      onboardingStep: 5,
    },
  });
  revalidatePath("/candidate", "layout");
  return { ok: true };
}

export async function setPublished(on: boolean): Promise<Result> {
  const { profile } = await me();
  if (on && !profile.publishConsentAt) return fail("consent");
  await prisma.candidateProfile.update({ where: { id: profile.id }, data: { status: on ? "PUBLISHED" : "UNPUBLISHED" } });
  revalidatePath("/candidate", "layout");
  return { ok: true };
}

export async function setVisibility(v: "EVERYONE" | "EMPLOYERS_ONLY"): Promise<Result> {
  const { profile } = await me();
  await prisma.candidateProfile.update({ where: { id: profile.id }, data: { visibility: v === "EMPLOYERS_ONLY" ? "EMPLOYERS_ONLY" : "EVERYONE" } });
  revalidatePath("/candidate", "layout");
  return { ok: true };
}

export async function setPaused(paused: boolean): Promise<Result> {
  const { profile } = await me();
  await prisma.candidateProfile.update({ where: { id: profile.id }, data: { searchPaused: paused } });
  revalidatePath("/candidate", "layout");
  return { ok: true };
}

export async function setTextOnly(on: boolean): Promise<Result> {
  const { profile } = await me();
  if (on && profile.about.trim().length < 40) return fail("about_short");
  await prisma.candidateProfile.update({ where: { id: profile.id }, data: { profileType: on ? "TEXT_ONLY" : "VIDEO" } });
  revalidatePath("/candidate", "layout");
  return { ok: true };
}

/** Share link: off by default; turning it on or regenerating creates a fresh random token. */
export async function setShareLink(op: "on" | "off" | "regenerate"): Promise<Result> {
  const { profile } = await me();
  const data = op === "off" ? { enabled: false } : op === "on" ? { enabled: true } : { enabled: true, token: newShareToken() };
  await prisma.shareLink.upsert({
    where: { candidateId: profile.id },
    update: data,
    create: { candidateId: profile.id, token: newShareToken(), enabled: op !== "off" },
  });
  revalidatePath("/candidate/share");
  return { ok: true };
}

// ---------- intro requests ----------

export async function respondToRequest(id: string, decision: "accept" | "decline", share?: { email: boolean; phone: boolean; cv: boolean; salary?: boolean }): Promise<Result> {
  const { profile } = await me();
  const req = await prisma.introRequest.findFirst({ where: { id, candidateId: profile.id, status: "PENDING" } });
  if (!req) return fail("not_found");
  await prisma.introRequest.update({
    where: { id },
    data: decision === "accept"
      ? { status: "ACCEPTED", respondedAt: new Date(), shareEmail: Boolean(share?.email), sharePhone: Boolean(share?.phone), shareCv: Boolean(share?.cv), shareSalary: Boolean(share?.salary && profile.salaryMin) }
      : { status: "DECLINED", respondedAt: new Date() },
  });
  const members = await prisma.companyMember.findMany({ where: { companyId: req.companyId }, select: { id: true, userId: true } });
  const name = profile.fullName.split(" ")[0] || profile.fullName;
  const accepted = decision === "accept";
  // The person who sent the request goes straight into the new chat; teammates see Messages.
  const sender = members.filter((m) => m.id === req.senderId).map((m) => m.userId);
  const others = members.filter((m) => m.id !== req.senderId).map((m) => m.userId);
  for (const [to, url] of [[sender, accepted ? `/employer/chat/${req.id}` : "/employer/inbox"], [others, "/employer/inbox"]] as const) {
    void notifyUsers([...to], (t) => ({
      title: t(accepted ? "push.acceptedTitle" : "push.declinedTitle"),
      body: t(accepted ? "push.acceptedBody" : "push.declinedBody", { name, role: req.roleTitle }),
      url,
      tag: `req-${req.id}`,
      cta: t(url.includes("/chat/") ? "push.ctaMessage" : "push.ctaInbox"),
      lines: accepted ? [t("push.lineShared", { what: [share?.email && t("push.shareEmail"), share?.phone && t("push.sharePhone"), share?.cv && t("push.shareCv")].filter(Boolean).join(", ") || "—" }), t("push.lineChatOpen")] : [],
    }));
  }
  revalidatePath("/candidate", "layout");
  return { ok: true };
}

/** Blocking hides the candidate from that company and closes its pending requests. */
export async function blockCompany(requestId: string): Promise<Result> {
  const { profile } = await me();
  const req = await prisma.introRequest.findFirst({ where: { id: requestId, candidateId: profile.id } });
  if (!req) return fail("not_found");
  await prisma.$transaction([
    prisma.block.upsert({ where: { candidateId_companyId: { candidateId: profile.id, companyId: req.companyId } }, update: {}, create: { candidateId: profile.id, companyId: req.companyId } }),
    prisma.introRequest.updateMany({ where: { candidateId: profile.id, companyId: req.companyId, status: "PENDING" }, data: { status: "DECLINED", respondedAt: new Date() } }),
  ]);
  revalidatePath("/candidate", "layout");
  return { ok: true };
}

/** `fromChat` lets the Hireel team read that request's chat while handling the report. */
export async function reportCompany(requestId: string, reason: string, details: string, fromChat = false): Promise<Result> {
  const { viewer, profile } = await me();
  if (!(await rateLimit(`report:${viewer.id}`, 10, 3600))) return fail("rate_limited");
  const req = await prisma.introRequest.findFirst({ where: { id: requestId, candidateId: profile.id } });
  if (!req) return fail("not_found");
  await prisma.report.create({ data: { reporterId: viewer.id, targetType: "COMPANY", targetId: req.companyId, reason: reason.slice(0, 60), details: details.slice(0, 1000), requestId: fromChat ? req.id : null } });
  return { ok: true };
}

// ---------- videos ----------

/**
 * Reserves a video slot before the upload starts. Records consent.
 * `replaceId` = the video this upload will replace once approved.
 */
export async function startVideo(opts: { language: string; consent: boolean; replaceId?: string | null }): Promise<{ ok: true; videoId: string } | { ok: false; error: string }> {
  const { viewer, profile } = await me();
  if (!streamConfigured()) return { ok: false, error: "stream_not_configured" };
  if (!opts.consent) return { ok: false, error: "video_consent" };
  if (!(await rateLimit(`upload:${viewer.id}`, 10, 3600))) return { ok: false, error: "rate_limited" };
  const lang = videoLanguageSchema.safeParse(opts.language);
  if (!lang.success) return { ok: false, error: "invalid" };

  const active = await prisma.video.findMany({ where: activeVideoWhere(profile.id) });
  // Drop any earlier unfinished upload for the same slot.
  await prisma.video.deleteMany({ where: { candidateId: profile.id, processing: "UPLOADING", streamUid: null } });

  if (opts.replaceId) {
    const old = active.find((v) => v.id === opts.replaceId);
    if (!old) return { ok: false, error: "not_found" };
    if (active.some((v) => v.id !== old.id && v.language === lang.data)) return { ok: false, error: "lang_taken" };
    // Only one pending replacement per video.
    await prisma.video.updateMany({ where: { replacesVideoId: old.id, moderation: { not: "APPROVED" } }, data: archiveData() });
    const v = await prisma.video.create({ data: { candidateId: profile.id, language: lang.data, consentAt: new Date(), replacesVideoId: old.id } });
    return { ok: true, videoId: v.id };
  }
  if (active.length >= MAX_VIDEOS) return { ok: false, error: "max_videos" };
  if (active.some((v) => v.language === lang.data)) return { ok: false, error: "lang_taken" };
  const v = await prisma.video.create({ data: { candidateId: profile.id, language: lang.data, consentAt: new Date(), isPrimary: active.length === 0 } });
  return { ok: true, videoId: v.id };
}

export async function makePrimary(videoId: string): Promise<Result> {
  const { profile } = await me();
  const v = await prisma.video.findFirst({ where: { id: videoId, ...activeVideoWhere(profile.id) } });
  if (!v) return fail("not_found");
  await prisma.$transaction([
    prisma.video.updateMany({ where: { candidateId: profile.id }, data: { isPrimary: false } }),
    prisma.video.update({ where: { id: v.id }, data: { isPrimary: true } }),
  ]);
  revalidatePath("/candidate", "layout");
  return { ok: true };
}

export async function changeVideoLanguage(videoId: string, language: string): Promise<Result> {
  const { profile } = await me();
  const lang = videoLanguageSchema.safeParse(language);
  if (!lang.success) return fail("invalid");
  const active = await prisma.video.findMany({ where: activeVideoWhere(profile.id) });
  const v = active.find((x) => x.id === videoId);
  if (!v) return fail("not_found");
  if (active.some((x) => x.id !== videoId && x.language === lang.data)) return fail("lang_taken");
  await prisma.video.update({ where: { id: v.id }, data: { language: lang.data } });
  revalidatePath("/candidate", "layout");
  return { ok: true };
}

/** Removing a video archives it privately; it is deleted for good after 30 days. */
export async function removeVideo(videoId: string): Promise<Result> {
  const { profile } = await me();
  const v = await prisma.video.findFirst({ where: { id: videoId, candidateId: profile.id, archivedAt: null } });
  if (!v) return fail("not_found");
  await prisma.$transaction(async (tx) => {
    await tx.video.update({ where: { id: v.id }, data: archiveData() });
    await tx.video.updateMany({ where: { replacesVideoId: v.id, archivedAt: null }, data: archiveData() });
    await ensurePrimary(tx, profile.id);
  });
  revalidatePath("/candidate", "layout");
  return { ok: true };
}

// ---------- hide my profile from companies ----------

export async function hideCompany(companyId: string): Promise<Result> {
  const { profile, viewer } = await me();
  if (!(await rateLimit(`hide:${viewer.id}`, 60, 3600))) return fail("rate_limited");
  const r = await hideFromCompany(profile.id, String(companyId));
  revalidatePath("/candidate", "layout");
  return r.ok ? { ok: true } : fail(r.error);
}

export async function hideName(term: string): Promise<Result> {
  const { profile, viewer } = await me();
  if (!(await rateLimit(`hide:${viewer.id}`, 60, 3600))) return fail("rate_limited");
  const r = await hideFromName(profile.id, String(term));
  revalidatePath("/candidate", "layout");
  return r.ok ? { ok: true } : fail(r.error);
}

export async function showToCompany(companyId: string): Promise<Result> {
  const { profile } = await me();
  await unhideCompany(profile.id, String(companyId));
  revalidatePath("/candidate", "layout");
  return { ok: true };
}

export async function removeHiddenName(id: string): Promise<Result> {
  const { profile } = await me();
  await unhideName(profile.id, String(id));
  revalidatePath("/candidate", "layout");
  return { ok: true };
}

// ---------- job preferences ----------

export async function savePreferences(input: unknown): Promise<Result> {
  const { profile } = await me();
  const p = profilePrefsSchema.safeParse(input);
  if (!p.success) { const e = firstError(p.error); return fail(e.code, e.field); }
  const roles = Array.from(new Map(p.data.desiredRoles.map((r) => [r.toLowerCase(), r])).values());
  await prisma.candidateProfile.update({
    where: { id: profile.id },
    data: { ...p.data, desiredRoles: roles, relocateTo: p.data.relocateTo.filter((k) => k in FEED_PLACES) },
  });
  revalidatePath("/candidate", "layout");
  return { ok: true };
}
