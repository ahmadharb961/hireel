import { getTranslations } from "next-intl/server";
import { categoryOptions, categoryOptionsWith } from "@/server/categories";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { getViewer, homeFor } from "@/server/session";
import { SignUpForm } from "./SignUpForm";

export async function generateMetadata() {
  return { title: (await getTranslations("signup"))("title") };
}

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const viewer = await getViewer();
  if (viewer) redirect(homeFor(viewer.role));
  const { role } = await searchParams;
  return (
    <div className="shell">
      <div className="scr">
        <Header back="/" />
        <main className="main">
          <SignUpForm categories={await categoryOptions()} initialRole={role === "employer" ? "employer" : "candidate"} />
        </main>
      </div>
    </div>
  );
}
