import { notFound, redirect } from "next/navigation";
import { companyHref, loginTo } from "@/lib/safe-next";
import { getViewer } from "@/server/session";
import { getFormatter, getTranslations } from "next-intl/server";
import { bannerUrl, logoUrl } from "@/lib/logo";
import { categoryNamer } from "@/server/categories";
import { hasUnread, listMessages, markRead, openChat } from "@/server/chat";
import Link from "next/link";
import { ChatDesk } from "@/components/chat/ChatDesk";
import { listTime } from "@/lib/chat-time";
import { prisma } from "@/lib/db";
import { siteLink } from "@/lib/social";
import { requireOnboardedCandidate } from "@/server/candidate-data";
import { CandidateChat } from "./CandidateChat";

export default async function CandidateChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await getViewer())) redirect(loginTo(`/candidate/chat/${id}`));
  const { viewer } = await requireOnboardedCandidate();
  const chat = await openChat(viewer.id, id);
  if (!chat || chat.side !== "candidate") notFound();
  const { r } = chat;
  const [messages, fmt, catName, t, tn, tc, td, others] = await Promise.all([
    listMessages(id, viewer.id), getFormatter(), categoryNamer(), getTranslations("requests"),
    getTranslations("nav"), getTranslations("chat"), getTranslations("chatDesk"),
    prisma.introRequest.findMany({
      where: { candidateId: r.candidateId, status: "ACCEPTED", company: { status: { not: "SUSPENDED" }, blocks: { none: { candidateId: r.candidateId } } } },
      include: { company: true, sender: { include: { user: { select: { name: true } } } }, messages: { orderBy: { createdAt: "desc" }, take: 1 } },
      orderBy: [{ lastMessageAt: { sort: "desc", nulls: "last" } }, { respondedAt: "desc" }],
      take: 100,
    }),
  ]);
  await markRead(id, "candidate");
  const c = r.company;
  const shared = [r.shareEmail && t("shareEmail"), r.sharePhone && t("sharePhone"), r.shareCv && t("shareCv")].filter(Boolean).join(", ") || t("nothing");
  const site = siteLink(c.website);
  const details = (
    <div>
      <div className="cd-who">
        <div className="cd-av logo">{logoUrl(c) ? <img src={logoUrl(c)!} alt="" /> : c.name.slice(0, 1)}</div>
        <h2>{c.name} {c.status === "VERIFIED" ? <span className="tag">✓ {t("verified")}</span> : null}</h2>
        <p>{[catName(c.industry), c.country].filter(Boolean).join(" · ")}</p>
      </div>
      <div className="cd-btns"><Link className="btn" href={companyHref(c.id, `/candidate/chat/${id}`)}>{td("viewCompany")}</Link></div>
      <div className="cd-sec">
        <h3>{td("request")}</h3>
        <div className="kv"><span>{td("role")}</span><b>{r.roleTitle}</b></div>
        <div className="kv"><span>{td("from")}</span><b>{r.sender.user.name}{r.sender.position ? `, ${r.sender.position}` : ""}</b></div>
        <div className="kv"><span>{td("youShared")}</span><b>{shared}</b></div>
      </div>
      <div className="cd-sec">
        <h3>{td("contact")}</h3>
        <div className="kv"><span>{t("website")}</span><b>{site ? <a href={site.href} target="_blank" rel="noopener noreferrer nofollow">{site.label} ↗</a> : "—"}</b></div>
        {c.phone ? <div className="kv"><span>{t("phone")}</span><b dir="ltr"><a href={`tel:${c.phone.replace(/[^+0-9]/g, "")}`}>{c.phone}</a></b></div> : null}
      </div>
      <p className="note" style={{ marginTop: 16 }}>{t("safetyTip")}</p>
    </div>
  );
  return (
    <ChatDesk
      who="candidate"
      nav={[
        { href: "/candidate", icon: "home", label: tn("home") },
        { href: "/candidate/requests", icon: "chat", label: tn("inbox"), on: true },
        { href: "/candidate/video", icon: "video", label: tn("myVideo") },
        { href: "/candidate/profile", icon: "account", label: tn("profile") },
        { href: "/feed", icon: "discover", label: tn("reels") },
      ]}
      list={others.map((o) => ({
        href: `/candidate/chat/${o.id}`, name: o.company.name, avatar: logoUrl(o.company), verified: o.company.status === "VERIFIED", sub: o.roleTitle,
        last: o.messages[0] ? { body: o.messages[0].body, mine: o.messages[0].senderId === viewer.id } : null,
        time: listTime(o.lastMessageAt ?? o.respondedAt, fmt), unread: o.id !== id && hasUnread(o, "candidate"), ended: Boolean(o.chatClosedAt), active: o.id === id,
      }))}
      details={details}
      labels={{ chats: td("chats"), you: tc("you"), start: tc("startChat"), ended: tc("ended"), unread: tc("new"), menu: td("menu") }}
    >
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
    </ChatDesk>
  );
}
