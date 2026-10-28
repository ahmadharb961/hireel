"use client";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { setCompanyPlan, setCompanyStatus } from "../safe-actions";

export function CompanyControls({ id, status, planId, plans }: { id: string; status: "UNVERIFIED" | "VERIFIED" | "SUSPENDED"; planId: string; plans: { id: string; name: string }[] }) {
  const t = useTranslations("admin");
  const router = useRouter();
  const toast = useToast();
  async function run(p: Promise<{ ok: boolean }>, msg: string) { const r = await p; toast(r.ok ? msg : t("failed")); router.refresh(); }
  return (
    <>
      <label className="lbl" htmlFor={`plan-${id}`}>{t("plan")}</label>
      <select className="i" id={`plan-${id}`} defaultValue={planId} onChange={(e) => run(setCompanyPlan(id, e.target.value), t("planChanged"))}>
        {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <div className="row" style={{ marginTop: 10 }}>
        {status === "UNVERIFIED" ? <button type="button" className="btn sm" onClick={() => run(setCompanyStatus(id, "VERIFIED"), t("verifiedDone"))}>{t("verify")}</button> : null}
        {status === "VERIFIED" ? <button type="button" className="btn sm g" onClick={() => run(setCompanyStatus(id, "UNVERIFIED"), t("unverifiedDone"))}>{t("unverify")}</button> : null}
        {status === "SUSPENDED"
          ? <button type="button" className="btn sm g" onClick={() => run(setCompanyStatus(id, "UNVERIFIED"), t("reactivated"))}>{t("reactivate")}</button>
          : <button type="button" className="btn sm bad" onClick={() => run(setCompanyStatus(id, "SUSPENDED"), t("suspendedDone"))}>{t("suspend")}</button>}
      </div>
    </>
  );
}
