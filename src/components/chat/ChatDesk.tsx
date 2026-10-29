import Link from "next/link";
import { Icon, type IconName } from "@/components/Icons";
import { Logo } from "@/components/Logo";
import { ChatDeskLive } from "./ChatDeskLive";
import { ConversationRow, type Conversation } from "./ConversationRow";

export type DeskNavItem = { href: string; icon: IconName; label: string; on?: boolean };

/**
 * Chat on computers: the menu and the other chats on the left, the conversation in the middle,
 * and who you're talking to on the right (from 1280px). On phones only the conversation shows.
 */
export function ChatDesk({ nav, list, details, labels, children }: {
  nav: DeskNavItem[]; list: Conversation[]; details: React.ReactNode;
  labels: { chats: string; you: string; start: string; ended: string; unread: string; menu: string }; children: React.ReactNode;
}) {
  return (
    <div className="chatdesk">
      <aside className="cd-left">
        <Link className="cd-logo" href={nav[0]?.href ?? "/"} aria-label="Hireel"><Logo height={26} /></Link>
        <nav className="cd-nav" aria-label={labels.menu}>
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className={n.on ? "on" : ""} aria-current={n.on ? "page" : undefined}><Icon name={n.icon} /><span>{n.label}</span></Link>
          ))}
        </nav>
        <h2 className="cd-h">{labels.chats}</h2>
        <div className="cd-list">{list.map((c) => <ConversationRow key={c.href} c={c} labels={labels} />)}</div>
      </aside>
      <div className="cd-main">{children}</div>
      <aside className="cd-right">{details}</aside>
      <ChatDeskLive />
    </div>
  );
}
