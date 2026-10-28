"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Icon } from "./Icons";

/** Profile icon in the top bar: shows who is signed in, quick links, and Sign out. */
export function AccountMenu({ name, email, links }: { name: string; email: string; links: { href: string; label: string }[] }) {
  const t = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", close); };
  }, [open]);
  async function signOut() {
    setBusy(true);
    await authClient.signOut().catch(() => null);
    window.location.href = "/";
  }
  return (
    <div className="amenu" ref={box}>
      <button type="button" className="ib" aria-expanded={open} aria-haspopup="menu" aria-label={t("accountMenu")} onClick={() => setOpen(!open)}>
        <Icon name="account" />
      </button>
      {open ? (
        <div className="amenu-pop" role="menu">
          <div className="amenu-who"><b>{name}</b><span>{email}</span></div>
          {links.map((l) => <Link key={l.href} role="menuitem" href={l.href} onClick={() => setOpen(false)}>{l.label}</Link>)}
          <button type="button" role="menuitem" className="amenu-out" disabled={busy} onClick={signOut}>{busy ? "…" : t("signOut")}</button>
        </div>
      ) : null}
    </div>
  );
}
