import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AccountMenu } from "@/components/AccountMenu";
import { Header } from "@/components/Header";
import { Icon } from "@/components/Icons";
import { pendingRequestCount } from "@/server/candidate-data";
import { getViewer } from "@/server/session";

export async function CandidateHeader({ candidateId, back }: { candidateId: string; back?: string }) {
  const t = await getTranslations("candidate");
  const tn = await getTranslations("nav");
  const [n, viewer] = await Promise.all([pendingRequestCount(candidateId), getViewer()]);
  return (
    <Header
      home="/candidate"
      back={back}
      right={
        <>
          <Link className="ib" href="/candidate/requests" aria-label={t("requestsBell", { n })}>
            <Icon name="bell" />
            {n ? <span className="dot">{n}</span> : null}
          </Link>
          <AccountMenu
            name={viewer?.name ?? ""}
            email={viewer?.email ?? ""}
            links={[
              { href: "/candidate/profile", label: tn("profile") },
              { href: "/candidate/edit", label: t("editProfile") },
              { href: "/feed", label: tn("reels") },
              { href: "/", label: tn("homepage") },
            ]}
          />
        </>
      }
    />
  );
}
