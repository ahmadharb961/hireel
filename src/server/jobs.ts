import "server-only";
import { prisma } from "@/lib/db";
import { notifyUsers } from "./push";
import { cleanupVideos, refreshStuckVideos } from "./videos";

/**
 * Background jobs that need no Hostinger schedule: they run at most once an hour, started by
 * normal traffic (see /api/chat/unread). The daily cron URL still works and runs the same jobs.
 */
const KEY = "jobs.lastRun";
const EVERY_MS = 60 * 60 * 1000;

/** Takes the hourly turn if it's due; returns false when another request already took it. */
async function claim(now: Date) {
  await prisma.platformSetting.createMany({ data: [{ key: KEY, value: new Date(0).toISOString() }], skipDuplicates: true });
  const due = new Date(now.getTime() - EVERY_MS).toISOString();
  const r = await prisma.platformSetting.updateMany({ where: { key: KEY, value: { lt: due } }, data: { value: now.toISOString() } });
  return r.count === 1;
}

export async function maybeRunJobs(now = new Date()) {
  try {
    if (!(await claim(now))) return;
    await runJobs(now);
  } catch (e) {
    console.error("background jobs", e);
  }
}

export async function runJobs(now = new Date()) {
  const reminders = await sendProfileReminders(now);
  const refreshed = await refreshStuckVideos(50);
  const videos = await cleanupVideos(now);
  const old = new Date(now.getTime() - 2 * 86400000);
  const limits = await prisma.appRateLimit.deleteMany({ where: { windowStart: { lt: old } } });
  const views = await prisma.videoView.deleteMany({ where: { viewedAt: { lt: new Date(now.getTime() - 180 * 86400000) } } });
  return { reminders, refreshed, videos, rateLimitRowsRemoved: limits.count, oldViewRowsRemoved: views.count };
}

const DAY = 86400000;
export const MAX_REMINDERS = 2;

/**
 * Gentle reminders (phone notification + email) for candidates who stopped halfway:
 * - setup not finished or profile not published: "Finish your profile";
 * - published video profile with no video live or waiting for review: "Add your intro video".
 * The first comes a day after sign-up, the second three days later, then never again.
 */
export async function sendProfileReminders(now = new Date()) {
  const where = {
    isDemo: false,
    remindersSent: { lt: MAX_REMINDERS },
    createdAt: { lt: new Date(now.getTime() - DAY) },
    OR: [{ lastReminderAt: null }, { lastReminderAt: { lt: new Date(now.getTime() - 3 * DAY) } }],
    user: { emailVerified: true, suspendedAt: null, isDemo: false },
  };
  const rows = await prisma.candidateProfile.findMany({
    where: {
      ...where,
      AND: [{
        OR: [
          { onboardingStep: { lt: 5 } },
          { status: "DRAFT" },
          {
            status: "PUBLISHED", profileType: "VIDEO",
            // no video live, being processed or waiting for review
            videos: { none: { archivedAt: null, OR: [{ moderation: "APPROVED" }, { moderation: "PENDING", processing: { not: "FAILED" } }] } },
          },
        ],
      }],
    },
    select: { id: true, userId: true, fullName: true, onboardingStep: true, status: true, remindersSent: true },
    take: 50,
  });
  for (const c of rows) {
    // Mark first, so a slow or failed send never makes us remind twice.
    const claimed = await prisma.candidateProfile.updateMany({ where: { id: c.id, remindersSent: c.remindersSent }, data: { remindersSent: { increment: 1 }, lastReminderAt: now } });
    if (!claimed.count) continue;
    const finish = c.onboardingStep < 5 || c.status === "DRAFT";
    const name = c.fullName.split(" ")[0] || c.fullName;
    await notifyUsers([c.userId], (t) => ({
      title: t(finish ? "push.remindFinishTitle" : "push.remindVideoTitle"),
      body: t(finish ? "push.remindFinishBody" : "push.remindVideoBody", { name }),
      url: finish ? "/candidate/onboarding" : "/candidate/video",
      tag: "reminder",
      cta: t(finish ? "push.ctaFinish" : "push.ctaVideo"),
      lines: [t("push.remindWhy"), t("push.remindLast")],
    }));
  }
  return rows.length;
}
