import { getTranslations } from "next-intl/server";
import { AccountMenu } from "@/components/AccountMenu";
import { Header } from "@/components/Header";
import { getViewer } from "@/server/session";

export async function CandidateHeader({ candidateId, back }: { candidateId: string; back?: string }) {
  const t = await getTranslations("candidate");
  const tn = await getTranslations("nav");
  // New requests and messages are on "Messages" in the menu (with a count), so the header stays simple.
  const viewer = await getViewer();
  return (
    <Header
      home="/candidate"
      back={back}
      right={
        <>
          <AccountMenu
            name={viewer?.name ?? ""}
            email={viewer?.email ?? ""}
            links={[
              { href: "/candidate/profile", label: tn("profile") },
              { href: "/candidate/edit", label: t("editProfile") },
              { href: "/candidate/share", label: tn("share") },
              { href: "/feed", label: tn("reels") },
              { href: "/", label: tn("homepage") },
            ]}
          />
        </>
      }
    />
  );
}
