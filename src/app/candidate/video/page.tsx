import { CandidateNav } from "@/components/Nav";
import { streamConfigured } from "@/lib/env";
import { requireOnboardedCandidate, studioVideos } from "@/server/candidate-data";
import { CandidateHeader } from "../CandidateHeader";
import { Studio } from "./Studio";

export default async function VideoPage() {
  const { profile } = await requireOnboardedCandidate();
  const videos = await studioVideos(profile.id);
  return (
    <div className="scr">
      <CandidateHeader candidateId={profile.id} />
      <main className="main">
        <Studio videos={videos} uploadsEnabled={streamConfigured()} textOnly={profile.profileType === "TEXT_ONLY"} aboutOk={profile.about.trim().length >= 40} />
      </main>
      <CandidateNav />
    </div>
  );
}
