import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { getViewer, homeFor } from "@/server/session";
import { LoginForm } from "./LoginForm";
import { safeNext } from "@/lib/safe-next";

export async function generateMetadata() {
  return { title: (await getTranslations("login"))("title") };
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  const viewer = await getViewer();
  if (viewer) redirect(next ?? homeFor(viewer.role));
  return (
    <div className="shell">
      <div className="scr">
        <Header back="/" />
        <main className="main"><LoginForm next={next} /></main>
      </div>
    </div>
  );
}
