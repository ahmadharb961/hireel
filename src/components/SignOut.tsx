"use client";
import { useTranslations } from "next-intl";
import { authClient } from "@/lib/auth-client";
import { forgetDevice } from "@/lib/push-client";

export function SignOut() {
  const t = useTranslations("common");
  return (
    <button type="button" className="btn o w" onClick={async () => { await forgetDevice(); await authClient.signOut(); window.location.href = "/"; }}>
      {t("signOut")}
    </button>
  );
}
