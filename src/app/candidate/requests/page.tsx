import { getFormatter, getTranslations } from "next-intl/server";
import { bannerUrl, logoUrl } from "@/lib/logo";
import { CandidateNav } from "@/components/Nav";
import { prisma } from "@/lib/db";
import { requireOnboardedCandidate } from "@/server/candidate-data";
import { hasUnread } from "@/server/chat";
import { CandidateHeader } from "../CandidateHeader";
import { RequestCard } from "./RequestCard";

export default async function RequestsPage() {
  const { profile, viewer } = await requireOnboardedCandidate();
  const t = await getTranslations("requests");
  const fmt = await getFormatter();
  const reqs = await prisma.introRequest.findMany({
    where: { candidateId: profile.id, company: { status: { not: "SUSPENDED" } } },
    orderBy: { createdAt: "desc" },
    include: { company: true, sender: { include: { user: { select: { name: true } } } }, messages: { orderBy: { createdAt: "desc" }, take: 1 } },
    take: 100,
  });
  const blocked = new Set((await prisma.block.findMany({ where: { candidateId: profile.id }, select: { companyId: true } })).map((b) => b.companyId));
  return (
    <div className="scr">
      <CandidateHeader candidateId={profile.id} back="/candidate" />
      <main className="main">
        <div className="stack">
          <div><h1 className="h2">{t("title")}</h1><p className="p">{t("subtitle")}</p></div>
          {reqs.length === 0 ? <div className="empty">{t("empty")}</div> : null}
          <div className="stack cards2">
          {reqs.map((r) => (
            <RequestCard
              key={r.id}
              r={{
                id: r.id,
                company: r.company.name,
                verified: r.company.status === "VERIFIED",
                rep: `${r.sender.user.name}${r.sender.position ? `, ${r.sender.position}` : ""}`,
                description: r.company.description,
                industry: r.company.industry,
                size: r.company.size,
                website: r.company.website,
                logo: logoUrl(r.company),
                banner: bannerUrl(r.company),
                social: { linkedin: r.company.linkedinUrl, instagram: r.company.instagramUrl, facebook: r.company.facebookUrl },
                country: r.company.country,
                since: fmt.dateTime(r.company.createdAt, { month: "long", year: "numeric" }),
                roleTitle: r.roleTitle,
                employment: r.employment,
                workLocation: r.workLocation,
                payRange: r.payRange,
                message: r.message,
                wantsCv: r.wantsCv,
                status: blocked.has(r.companyId) ? "BLOCKED" : r.status,
                date: fmt.relativeTime(r.createdAt, new Date()),
                shared: { email: r.shareEmail, phone: r.sharePhone, cv: r.shareCv },
                isDemo: r.isDemo,
                chat: {
                  unread: hasUnread(r, "candidate"),
                  last: r.messages[0] ? { body: r.messages[0].body, mine: r.messages[0].senderId === viewer.id } : null,
                  ended: Boolean(r.chatClosedAt),
                },
              }}
            />
          ))}
          </div>
        </div>
      </main>
      <CandidateNav />
    </div>
  );
}
