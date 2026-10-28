"use client";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setLocale } from "@/app/actions/locale";
import { Icon } from "./Icons";

/** Switches between English and Arabic. Shows the *other* language's name, written in that language. */
export function LangSwitch({ variant = "icon" }: { variant?: "icon" | "button" }) {
  const locale = useLocale();
  const t = useTranslations("common");
  const router = useRouter();
  const [pending, start] = useTransition();
  const next = locale === "ar" ? "en" : "ar";
  const label = next === "ar" ? "العربية" : "English";
  const onClick = () => start(async () => { await setLocale(next); router.refresh(); });
  if (variant === "button") {
    return (
      <button type="button" className="btn g w" onClick={onClick} disabled={pending} lang={next}>
        {t("switchLanguage")}: {label}
      </button>
    );
  }
  return (
    <button type="button" className="ib" onClick={onClick} disabled={pending} aria-label={`${t("switchLanguage")}: ${label}`} title={label}>
      <Icon name="globe" />
    </button>
  );
}
