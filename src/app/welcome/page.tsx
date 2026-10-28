import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getViewer, homeFor } from "@/server/session";

/** Where people land after verifying their email or signing in. */
export default async function Welcome() {
  const v = await getViewer();
  if (!v) redirect("/login");
  if (v.role === "CANDIDATE") {
    const p = await prisma.candidateProfile.findUnique({ where: { userId: v.id }, select: { onboardingStep: true } });
    if (p && p.onboardingStep < 5) redirect("/candidate/onboarding");
  }
  redirect(homeFor(v.role));
}
