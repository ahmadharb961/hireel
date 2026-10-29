"use client";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Toggle } from "@/components/Toggle";
import { useToast } from "@/components/Toast";
import { showTopEmployers } from "../safe-actions";

/** On/off switch for the whole Top employers section on the homepage. */
export function TopSwitch({ initial }: { initial: boolean }) {
  const t = useTranslations("adminFeat");
  const router = useRouter();
  const toast = useToast();
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);
  return (
    <div className="sw">
      <div><b>{t("switchTitle")}</b><p className="note" style={{ margin: 0 }}>{on ? t("switchOn") : t("switchOff")}</p></div>
      <Toggle on={on} disabled={busy} label={t("switchTitle")} onChange={async (v) => {
        setBusy(true); setOn(v);
        const r = await showTopEmployers(v);
        setBusy(false);
        if (!r.ok) { setOn(!v); toast(t("failed")); return; }
        toast(v ? t("shownDone") : t("hiddenDone"));
        router.refresh();
      }} />
    </div>
  );
}
