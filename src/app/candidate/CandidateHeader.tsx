import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Header } from "@/components/Header";
import { Icon } from "@/components/Icons";
import { pendingRequestCount } from "@/server/candidate-data";

export async function CandidateHeader({ candidateId, back }: { candidateId: string; back?: string }) {
  const t = await getTranslations("candidate");
  const n = await pendingRequestCount(candidateId);
  return (
    <Header
      home="/candidate"
      back={back}
      right={
        <Link className="ib" href="/candidate/requests" aria-label={t("requestsBell", { n })}>
          <Icon name="bell" />
          {n ? <span className="dot">{n}</span> : null}
        </Link>
      }
    />
  );
}
