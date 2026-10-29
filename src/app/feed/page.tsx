import { randomBytes } from "node:crypto";
import { allCategories, categoryOptions } from "@/server/categories";
import { getLocale, getTranslations } from "next-intl/server";
import { FILTER_KEYS, parseFeedFilters } from "@/lib/feed-filters";
import { logoUrl } from "@/lib/logo";
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
export default async function FeedPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const viewer = await getViewer();
  if (viewer && viewer.role === "ADMIN") redirect("/admin");
  const emp = await employerOrNull();
  const sp = await searchParams;
  const filters = parseFeedFilters((k) => sp[k]);
  const seed = randomBytes(8).toString("hex");
  const allowed = await rateLimit(emp ? `feed:u:${emp.viewer.id}` : `feed:ip:${await clientIp()}`, emp ? 240 : 60, 600);
  const page = allowed
    ? await feedPage({ seed, ...filters, viewer: emp ? { kind: "employer", companyId: emp.company.id, memberId: emp.member.id } : { kind: "visitor" } })
    : { cards: [], nextCursor: null };
  const locale = await getLocale();
  const quota = emp ? await quotaFor(emp, locale) : null;
  const categories = await categoryOptions();
  return (
    <div className="shell wide feedshell">
      <ToastProvider>
        <Feed
          key={`${FILTER_KEYS.map((k) => filters[k]).join("-")}-${seed}`}
          initial={page.cards}
          nextCursor={page.nextCursor}
          seed={seed}
          filters={filters}
          employer={emp && quota ? { quota: { introLeft: quota.introLeft, cvLeft: quota.cvLeft, planName: quota.planName, isPremium: quota.isPremium }, saved: await savedCount(emp.member.id), maxSaved: emp.company.plan.maxSaved, company: emp.company.name, userName: emp.viewer.name, logo: logoUrl(emp.company) } : null}
          candidateViewer={viewer?.role === "CANDIDATE"}
          limited={!allowed}
          categories={categories}
          catNames={Object.fromEntries((await allCategories()).map((c) => [c.key, locale === "ar" ? c.nameAr : c.nameEn]))}
        />
      </ToastProvider>
    </div>
  );
}
