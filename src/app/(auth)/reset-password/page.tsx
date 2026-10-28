import { Header } from "@/components/Header";
import { ResetForm } from "./ResetForm";

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const { token, error } = await searchParams;
  return (
    <div className="shell">
      <div className="scr">
        <Header back="/login" />
        <main className="main"><ResetForm token={token ?? ""} invalid={Boolean(error) || !token} /></main>
      </div>
    </div>
  );
}
