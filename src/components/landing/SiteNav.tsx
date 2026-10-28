"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { LangSwitch } from "@/components/LangSwitch";
import { Logo } from "@/components/Logo";
import { LIcon } from "./icons";

/** Top bar of the public site. On phones the links fold into a menu. */
export function SiteNav({ account }: { account?: string | null }) {
  const t = useTranslations("landing.nav");
  const [open, setOpen] = useState(false);
  const links = [
    { href: "/#for-candidates", label: t("forCandidates") },
    { href: "/#for-employers", label: t("forEmployers") },
    { href: "/#how", label: t("howItWorks") },
    { href: "/feed", label: t("browse") },
  ];
  return (
    <header className="sitenav">
      <div className="wrapx sitenav-in">
        <Link href="/" className="sitenav-logo" aria-label="Hireel"><Logo height={32} /></Link>
        <nav className="sitenav-links" aria-label="Hireel">
          {links.map((l) => <Link key={l.href} href={l.href}>{l.label}</Link>)}
        </nav>
        <div className="sitenav-actions">
          <Link href="/search" className="sitenav-search"><LIcon name="search" size={18} /><span>{t("search")}</span></Link>
          <LangSwitch />
          {account ? (
            <Link href={account} className="btn sm sitenav-signup">{t("account")}</Link>
          ) : (
            <>
              <Link href="/login" className="sitenav-login">{t("login")}</Link>
              <Link href="/signup" className="btn sm sitenav-signup">{t("signup")}</Link>
            </>
          )}
          <button type="button" className="ib sitenav-burger" aria-expanded={open} aria-label={open ? t("close") : t("menu")} onClick={() => setOpen(!open)}>
            <LIcon name={open ? "x" : "menu"} size={24} />
          </button>
        </div>
      </div>
      {open ? (
        <div className="sitenav-sheet">
          {links.map((l) => <Link key={l.href} href={l.href} onClick={() => setOpen(false)}>{l.label}</Link>)}
          <Link href="/search" onClick={() => setOpen(false)}>{t("search")}</Link>
          <div className="row" style={{ marginTop: 8 }}>
            {account ? <Link href={account} className="btn">{t("account")}</Link> : (
              <>
                <Link href="/login" className="btn o">{t("login")}</Link>
                <Link href="/signup" className="btn">{t("signup")}</Link>
              </>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
