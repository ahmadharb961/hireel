"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { MessageAlerts } from "./chat/MessageAlerts";
import { useUnread } from "@/lib/unread-client";
import { Icon, type IconName } from "./Icons";

type Item = { href: string; icon: IconName; label: string; gate?: boolean; exact?: boolean; badge?: number };

function NavBar({ items, floating, onGate }: { items: Item[]; floating?: boolean; onGate?: () => void }) {
  const path = usePathname();
  return (
    <nav className={floating ? "fn" : "bn"}>
      {items.map((it) => {
        const on = it.exact ? path === it.href : path === it.href || path.startsWith(it.href + "/");
        if (it.gate && onGate) {
          return (
            <button key={it.href} type="button" className={on ? "on" : ""} onClick={onGate}>
              <i><Icon name={it.icon} /></i><span>{it.label}</span>
            </button>
          );
        }
        return (
          <Link key={it.href} href={it.href} className={on ? "on" : ""} aria-current={on ? "page" : undefined}>
            <i><Icon name={it.icon} />{it.badge ? <b className="nb" aria-label={String(it.badge)}>{it.badge > 9 ? "9+" : it.badge}</b> : null}</i><span>{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function CandidateNav() {
  const t = useTranslations("nav");
  const unread = useUnread().n;
  return (
    <>
      <NavBar
        items={[
          { href: "/candidate", icon: "home", label: t("home"), exact: true },
          { href: "/candidate/requests", icon: "chat", label: t("inbox"), badge: unread },
          { href: "/candidate/video", icon: "video", label: t("myVideo") },
          { href: "/candidate/profile", icon: "account", label: t("profile") },
          { href: "/feed", icon: "discover", label: t("reels") },
        ]}
      />
      <MessageAlerts />
    </>
  );
}

/** Menu for a signed-in candidate who is browsing reels or search: a way back to their own area. */
export function CandidateBrowseNav({ floating }: { floating?: boolean }) {
  const t = useTranslations("nav");
  const unread = useUnread().n;
  return (
    <>
      <NavBar
        floating={floating}
        items={[
          { href: "/feed", icon: "discover", label: t("discover") },
          { href: "/search", icon: "search", label: t("search") },
          { href: "/candidate/requests", icon: "chat", label: t("inbox"), badge: unread },
          { href: "/candidate", icon: "account", label: t("myArea") },
        ]}
      />
      <MessageAlerts />
    </>
  );
}

/** Employer nav. Visitors (not signed in) get a sign-up prompt for Saved, Inbox and Account. */
export function EmployerNav({ floating, savedCount, visitor, onGate }: { floating?: boolean; savedCount?: number; visitor?: boolean; onGate?: () => void }) {
  const t = useTranslations("nav");
  const unread = useUnread(!visitor).n;
  const gate = visitor ? onGate ?? (() => { window.location.href = "/signup?role=employer"; }) : undefined;
  return (
    <>
      <NavBar
        floating={floating}
        onGate={gate}
        items={[
          { href: "/feed", icon: "discover", label: t("discover") },
          { href: "/search", icon: "search", label: t("search") },
          { href: "/employer/saved", icon: "saved", label: visitor ? t("saved") : t("savedCount", { n: savedCount ?? 0 }), gate: visitor },
          { href: "/employer/inbox", icon: "chat", label: t("inbox"), gate: visitor, badge: unread },
          { href: "/employer/account", icon: "account", label: t("account"), gate: visitor },
        ]}
      />
      {visitor ? null : <MessageAlerts />}
    </>
  );
}
