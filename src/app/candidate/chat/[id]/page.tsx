import { notFound, redirect } from "next/navigation";
import { loginTo } from "@/lib/safe-next";
import { getViewer } from "@/server/session";
import { getFormatter, getTranslations } from "next-intl/server";
import { bannerUrl, logoUrl } from "@/lib/logo";
import { categoryNamer } from "@/server/categories";
import { listMessages, markRead, openChat } from "@/server/chat";
import { requireOnboardedCandidate } from "@/server/candidate-data";
import { CandidateChat } from "./CandidateChat";

export default async function CandidateChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await getViewer())) redirect(loginTo(`/candidate/chat/${id}`));
  const { viewer } = await requireOnboardedCandidate();
  const chat = await openChat(viewer.id, id);
  if (!chat || chat.side !== "candidate") notFound();
  const { r } = chat;
  const [messages, fmt, catName, t] = await Promise.all([listMessages(id, viewer.id), getFormatter(), categoryNamer(), getTranslations("requests")]);
  await markRead(id, "candidate");
  const c = r.company;
  const shared = [r.shareEmail && t("shareEmail"), r.sharePhone && t("sharePhone"), r.shareCv && t("shareCv")].filter(Boolean).join(", ") || t("nothing");
  return (
    <CandidateChat
      id={id}
      side="candidate"
      state={chat.state}
      closedByMe={r.chatClosedBy === "candidate"}
      initial={messages}
      otherReadAt={r.employerReadAt?.toISOString() ?? null}
      back="/candidate/requests"
      other={{ name: c.name, sub: `${r.sender.user.name} · ${r.roleTitle}`, avatar: logoUrl(c) }}
      company={{
        company: c.name, verified: c.status === "VERIFIED", rep: `${r.sender.user.name}${r.sender.position ? `, ${r.sender.position}` : ""}`,
        description: c.description, industry: catName(c.industry), size: c.size, website: c.website, phone: c.phone, country: c.country,
        since: fmt.dateTime(c.createdAt, { month: "long", year: "numeric" }), logo: logoUrl(c), banner: bannerUrl(c),
        social: { linkedin: c.linkedinUrl, instagram: c.instagramUrl, facebook: c.facebookUrl }, shared,
      }}
    />
  );
}
