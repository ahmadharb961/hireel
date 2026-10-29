import { getFormatter, getTranslations } from "next-intl/server";
import { CandidateNav } from "@/components/Nav";
import { InterestList } from "@/components/InterestList";
import { listTime } from "@/lib/chat-time";
import { interestedCompanies, requireOnboardedCandidate } from "@/server/candidate-data";
import { categoryNamer } from "@/server/categories";
import { CandidateHeader } from "../CandidateHeader";

/** Every company that opened or saved the candidate's profile. */
export default async function InterestPage() {
  const { profile } = await requireOnboardedCandidate();
  const [t, fmt, catName, rows] = await Promise.all([getTranslations("interest"), getFormatter(), categoryNamer(), interestedCompanies(profile.id)]);
  return (
    <div className="scr">
      <CandidateHeader candidateId={profile.id} back="/candidate" />
      <main className="main"><div className="stack">
        <div><h1 className="h2">{t("title")}</h1><p className="p">{t("sub")}</p></div>
        {rows.length ? (
          <InterestList back="/candidate/interest" rows={rows} category={catName} when={(d) => listTime(d, fmt)}
            label={(c) => (c.savedAt ? (c.views ? t("savedAndViewed", { n: c.views }) : t("saved")) : t("viewed", { n: c.views }))} />
        ) : <div className="mempty"><b>{t("emptyTitle")}</b>{t("empty")}</div>}
        <p className="note">{t("note")}</p>
      </div></main>
      <CandidateNav />
    </div>
  );
}
