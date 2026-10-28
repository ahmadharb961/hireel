import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { getViewer, homeFor } from "@/server/session";
import { LoginForm } from "./LoginForm";

export async function generateMetadata() {
  return { title: (await getTranslations("login"))("title") };
}

export default async function LoginPage() {
  const viewer = await getViewer();
  if (viewer) redirect(homeFor(viewer.role));
  return (
    <div className="shell">
      <div className="scr">
        <Header back="/" />
        <main className="main"><LoginForm /></main>
      </div>
    </div>
  );
}
