import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { unreadChatsForCandidate, unreadChatsForMember } from "@/server/chat";
import { getViewer } from "@/server/session";

/** How many chats have unread messages, for the badge on the menu. */
export async function GET() {
  const v = await getViewer();
  let n = 0;
  if (v?.role === "EMPLOYER") {
    const m = await prisma.companyMember.findUnique({ where: { userId: v.id }, select: { id: true } });
    if (m) n = await unreadChatsForMember(m.id);
  } else if (v?.role === "CANDIDATE") {
    const c = await prisma.candidateProfile.findUnique({ where: { userId: v.id }, select: { id: true } });
    if (c) n = await unreadChatsForCandidate(c.id);
  }
  return NextResponse.json({ n }, { headers: { "Cache-Control": "no-store" } });
}
