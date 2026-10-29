import { after, NextResponse } from "next/server";
import { maybeRunJobs } from "@/server/jobs";
import { prisma } from "@/lib/db";
import { latestUnread, unreadChatsForCandidate, unreadChatsForMember } from "@/server/chat";
import { getViewer } from "@/server/session";
import { pendingRequestCount } from "@/server/candidate-data";

/** How many chats have unread messages (menu badge) and the newest one (the "new message" alert). */
export async function GET() {
  // Signed-in pages ask this every 20 seconds, so it's a reliable heartbeat for the hourly jobs.
  after(() => maybeRunJobs());
  const v = await getViewer();
  let n = 0;
  if (v?.role === "EMPLOYER") {
    const m = await prisma.companyMember.findUnique({ where: { userId: v.id }, select: { id: true } });
    if (m) n = await unreadChatsForMember(m.id);
  } else if (v?.role === "CANDIDATE") {
    const c = await prisma.candidateProfile.findUnique({ where: { userId: v.id }, select: { id: true } });
    // For candidates the count also includes new requests waiting for an answer: both live in Messages.
    if (c) n = (await unreadChatsForCandidate(c.id)) + (await pendingRequestCount(c.id));
  }
  const latest = v && n ? await latestUnread(v.id) : null;
  return NextResponse.json({ n, latest }, { headers: { "Cache-Control": "no-store" } });
}
