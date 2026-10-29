"use client";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/Toast";
import { reorderFeatured, setFeatured } from "../safe-actions";

/** Add/remove buttons for "Top employers"; arrows change the order on the homepage. */
export function FeaturedControls({ id, featured, first, last, full }: { id: string; featured: boolean; first?: boolean; last?: boolean; full: boolean }) {
  const t = useTranslations("adminFeat");
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  async function run(p: Promise<{ ok: boolean; error?: string }>, msg: string) {
    setBusy(true);
    const r = await p;
    setBusy(false);
    toast(r.ok ? msg : r.error === "featured_full" ? t("full") : r.error === "suspended" ? t("cantSuspended") : t("failed"));
    router.refresh();
  }
  if (!featured) {
    return <div className="frow-btns"><button type="button" className="btn sm" disabled={busy || full} onClick={() => run(setFeatured(id, true), t("addedDone"))}>{t("add")}</button></div>;
  }
  return (
    <div className="frow-btns">
      {first !== undefined ? <button type="button" className="btn sm g" disabled={busy || first} onClick={() => run(reorderFeatured(id, -1), t("moved"))} aria-label={t("earlier")}>↑</button> : null}
      {last !== undefined ? <button type="button" className="btn sm g" disabled={busy || last} onClick={() => run(reorderFeatured(id, 1), t("moved"))} aria-label={t("later")}>↓</button> : null}
      <button type="button" className="btn sm bad" disabled={busy} onClick={() => run(setFeatured(id, false), t("removedDone"))}>{t("remove")}</button>
    </div>
  );
}
