import { CandidateNav } from "@/components/Nav";
import { LangSwitch } from "@/components/LangSwitch";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { requireOnboardedCandidate } from "@/server/candidate-data";
import { CandidateHeader } from "../CandidateHeader";
import { ShareSettings } from "./ShareSettings";
import { SignOut } from "@/components/SignOut";

export default async function SharePage() {
  const { profile } = await requireOnboardedCandidate();
  const link = await prisma.shareLink.findUnique({ where: { candidateId: profile.id } });
  return (
    <div className="scr">
      <CandidateHeader candidateId={profile.id} back="/candidate/profile" />
      <main className="main">
        <ShareSettings
          shareOn={Boolean(link?.enabled)}
          shareUrl={link?.enabled ? `${env.appUrl}/p/${link.token}` : ""}
          visibility={profile.visibility}
          published={profile.status === "PUBLISHED"}
          paused={profile.searchPaused}
        />
        <div className="stack" style={{ marginTop: 12 }}>
          <LangSwitch variant="button" />
          <SignOut />
        </div>
      </main>
      <CandidateNav />
    </div>
  );
}
