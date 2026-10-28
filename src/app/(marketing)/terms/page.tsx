import { getLocale } from "next-intl/server";
import { termsAr } from "@/content/terms.ar";
import { termsEn } from "@/content/terms.en";
import { LegalPage } from "../LegalPage";

export async function generateMetadata() {
  const doc = (await getLocale()) === "ar" ? termsAr : termsEn;
  return { title: doc.title, alternates: { canonical: "/terms" } };
}

export default async function Terms() {
  return <LegalPage doc={(await getLocale()) === "ar" ? termsAr : termsEn} />;
}
