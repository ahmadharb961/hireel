import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { requireAdmin } from "@/server/session";
import { Setup2fa } from "./Setup2fa";

export default async function Setup2faPage() {
  const v = await requireAdmin({ allowWithout2fa: true });
  if (v.twoFactorEnabled) redirect("/admin");
  return (
    <div className="scr">
      <Header home="/admin/setup-2fa" />
      <main className="main"><Setup2fa /></main>
    </div>
  );
}
