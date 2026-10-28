"use client";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/Toast";
import { resolveReport } from "../safe-actions";

export function ReportControls({ id }: { id: string }) {
  const t = useTranslations("admin");
  const router = useRouter();
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  async function run(suspend: boolean) { await resolveReport(id, suspend); toast(suspend ? t("suspendedDone") : t("resolved")); router.refresh(); }
  return confirm ? (
    <div className="card" style={{ background: "var(--badbg)", borderColor: "transparent", marginTop: 10 }}>
      <p className="p" style={{ color: "var(--tx)" }}>{t("suspendConfirm")}</p>
      <div className="row" style={{ marginTop: 10 }}>
        <button type="button" className="btn sm g" onClick={() => setConfirm(false)}>{t("cancel")}</button>
        <button type="button" className="btn sm bad" onClick={() => run(true)}>{t("suspend")}</button>
      </div>
    </div>
  ) : (
    <div className="row" style={{ marginTop: 10 }}>
      <button type="button" className="btn sm g" onClick={() => run(false)}>{t("dismissReport")}</button>
      <button type="button" className="btn sm bad" onClick={() => setConfirm(true)}>{t("suspend")}</button>
    </div>
  );
}
