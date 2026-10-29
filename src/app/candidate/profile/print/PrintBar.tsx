"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { setShareLink } from "../../safe-actions";

/** Buttons above the page (not printed): back, save as PDF, and turning on the share link for the QR code. */
export function PrintBar({ shareOn }: { shareOn: boolean }) {
  const t = useTranslations("printProfile");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <div className="cvp-bar">
      <div className="cvp-bar-in">
        <Link className="btn sm g" href="/candidate/profile">← {t("back")}</Link>
        <button type="button" className="btn sm" onClick={() => window.print()}>{t("save")}</button>
      </div>
      <p className="note">{t("howTo")}</p>
      {!shareOn ? (
        <div className="cvp-warn">
          <p>{t("noLink")}</p>
          <button type="button" className="btn sm" disabled={busy} onClick={async () => { setBusy(true); await setShareLink("on"); setBusy(false); router.refresh(); }}>{t("turnOnLink")}</button>
        </div>
      ) : null}
    </div>
  );
}
