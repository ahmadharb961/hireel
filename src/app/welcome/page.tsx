import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getViewer, homeFor } from "@/server/session";
import { loginTo, safeNext } from "@/lib/safe-next";

/** Where people land after verifying their email or signing in. */
export default async function Welcome({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  const v = await getViewer();
  if (!v) redirect(next ? loginTo(next) : "/login");
  if (v.role === "CANDIDATE") {
    const p = await prisma.candidateProfile.findUnique({ where: { userId: v.id }, select: { onboardingStep: true } });
    if (p && p.onboardingStep < 5) redirect("/candidate/onboarding");
  }
  // Back to the page they came for (e.g. the chat a notification opened), otherwise their home.
  redirect(next ?? homeFor(v.role));
}
