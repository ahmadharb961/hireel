import { randomBytes } from "node:crypto";
import { getLocale, getTranslations } from "next-intl/server";
import { INDUSTRIES, VIDEO_LANGUAGES, type VideoLang } from "@/lib/constants";
import { feedPage } from "@/server/feed";
import { quotaFor, savedCount } from "@/server/employer-data";
import { clientIp, rateLimit } from "@/server/ratelimit";
import { employerOrNull, getViewer } from "@/server/session";
import { redirect } from "next/navigation";
import { ToastProvider } from "@/components/Toast";
import { Feed } from "./Feed";

export async function generateMetadata() {
  return { title: (await getTranslations("feed"))("title"), robots: { index: false, follow: false } };
}

/** Discover: open to everyone (like TikTok). Acting on a reel requires an employer account. */
export default async function FeedPage({ searchParams }: { searchParams: Promise<{ industry?: string; lang?: string }> }) {
  const viewer = await getViewer();
  if (viewer && viewer.role === "ADMIN") redirect("/admin");
  const emp = await employerOrNull();
  const sp = await searchParams;
  const industry = sp.industry && (INDUSTRIES as readonly string[]).includes(sp.industry) ? sp.industry : null;
  const lang = sp.lang && (VIDEO_LANGUAGES as readonly string[]).includes(sp.lang) ? (sp.lang as VideoLang) : null;
  const seed = randomBytes(8).toString("hex");
  const allowed = await rateLimit(emp ? `feed:u:${emp.viewer.id}` : `feed:ip:${await clientIp()}`, emp ? 240 : 60, 600);
  const page = allowed
    ? await feedPage({ seed, industry, lang, viewer: emp ? { kind: "employer", companyId: emp.company.id, memberId: emp.member.id } : { kind: "visitor" } })
    : { cards: [], nextCursor: null };
  const locale = await getLocale();
  const quota = emp ? await quotaFor(emp, locale) : null;
  return (
    <div className="shell wide">
      <ToastProvider>
        <Feed
          key={`${industry}-${lang}-${seed}`}
          initial={page.cards}
          nextCursor={page.nextCursor}
          seed={seed}
          industry={industry}
          lang={lang}
          employer={emp && quota ? { quota: { introLeft: quota.introLeft, cvLeft: quota.cvLeft, planName: quota.planName, isPremium: quota.isPremium }, saved: await savedCount(emp.member.id), maxSaved: emp.company.plan.maxSaved } : null}
          candidateViewer={viewer?.role === "CANDIDATE"}
          limited={!allowed}
        />
      </ToastProvider>
    </div>
  );
}
