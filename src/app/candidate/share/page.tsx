import { CandidateNav } from "@/components/Nav";
import { LangSwitch } from "@/components/LangSwitch";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { requireOnboardedCandidate } from "@/server/candidate-data";
import { CandidateHeader } from "../CandidateHeader";
import { ShareSettings } from "./ShareSettings";
import { HiddenCompanies } from "./HiddenCompanies";
import { hiddenList } from "@/server/hiding";
import { logoUrl } from "@/lib/logo";
import { SignOut } from "@/components/SignOut";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function SharePage() {
  const { profile } = await requireOnboardedCandidate();
  const [link, hidden] = await Promise.all([prisma.shareLink.findUnique({ where: { candidateId: profile.id } }), hiddenList(profile.id)]);
  const t = await getTranslations("candidate");
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
          <Link className="btn o w" href="/candidate/profile/print">📄 {t("downloadPdf")}</Link>
          <HiddenCompanies
            hidden={hidden.blocks.map((b) => ({ companyId: b.companyId, name: b.company.name, logo: logoUrl(b.company), source: b.source }))}
            rules={hidden.names.map((n) => ({ id: n.id, term: n.term }))}
          />
          <LangSwitch variant="button" />
          <SignOut />
        </div>
      </main>
      <CandidateNav />
    </div>
  );
}
