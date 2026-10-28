import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/Logo";

export async function SiteFooter() {
  const t = await getTranslations("landing");
  return (
    <footer className="sitefoot">
      <div className="wrapx sitefoot-in">
        <div><Logo height={28} /><p>{t("footer.tagline")}</p></div>
        <nav aria-label={t("footer.product")}><b>{t("footer.product")}</b><Link href="/feed">{t("nav.browse")}</Link><Link href="/signup?role=candidate">{t("nav.forCandidates")}</Link><Link href="/signup?role=employer">{t("nav.forEmployers")}</Link><Link href="/#plans">{t("plans.pill")}</Link></nav>
        <nav aria-label={t("footer.legal")}><b>{t("footer.legal")}</b><Link href="/privacy">{t("footer.privacy")}</Link><Link href="/terms">{t("footer.terms")}</Link></nav>
      </div>
      <p className="wrapx sitefoot-copy">© {new Date().getFullYear()} LYVE · Hireel</p>
    </footer>
  );
}
