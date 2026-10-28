import { getLocale, getTranslations } from "next-intl/server";
import { privacyAr } from "@/content/privacy.ar";
import { privacyEn } from "@/content/privacy.en";
import { LegalPage } from "../LegalPage";

export async function generateMetadata() {
  const doc = (await getLocale()) === "ar" ? privacyAr : privacyEn;
  return { title: doc.title, description: (await getTranslations("meta"))("description"), alternates: { canonical: "/privacy" } };
}

export default async function Privacy() {
  return <LegalPage doc={(await getLocale()) === "ar" ? privacyAr : privacyEn} />;
}
