import Link from "next/link";

export type Conversation = {
  href: string; name: string; avatar: string | null; verified?: boolean; sub: string;
  last: { body: string; mine: boolean } | null; time: string; unread: boolean; ended: boolean;
  /** Shown instead of the last message (e.g. "Wants to meet you"). */
  hint?: string;
  /** The chat open right now (desktop list). */
  active?: boolean;
};

/** One chat in the Messages list: who, what it's about, the last message and whether it's new. Like a phone's messages app. */
export function ConversationRow({ c, labels }: { c: Conversation; labels: { you: string; start: string; ended: string; unread: string } }) {
  return (
    <Link href={c.href} className={`conv${c.unread ? " new" : ""}${c.active ? " on" : ""}`} aria-current={c.active ? "page" : undefined}>
      <span className="conv-av">{c.avatar ? <img src={c.avatar} alt="" /> : c.name.slice(0, 1)}</span>
      <span className="conv-main">
        <span className="conv-top">
          <b className="conv-nm">{c.name}</b>
          {c.verified ? <span className="conv-ok" aria-hidden="true">✓</span> : null}
          <time className="conv-time">{c.time}</time>
        </span>
        <span className="conv-sub">{c.sub}</span>
        <span className="conv-last" dir="auto">
          {c.hint ? <em>{c.hint}</em> : c.last ? <>{c.last.mine ? `${labels.you}: ` : ""}{c.last.body}</> : <em>{c.ended ? labels.ended : labels.start}</em>}
        </span>
      </span>
      {c.unread ? <span className="conv-dot" aria-label={labels.unread} /> : null}
    </Link>
  );
}
