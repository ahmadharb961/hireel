import Link from "next/link";
import { logoUrl } from "@/lib/logo";
import type { InterestedCompany } from "@/server/candidate-data";

/** Companies that viewed or saved the candidate: logo, name, what they did and when. Opens the company page. */
export function InterestList({ rows, label, when, category }: { rows: InterestedCompany[]; label: (c: InterestedCompany) => string; when: (d: Date) => string; category: (k: string) => string }) {
  return (
    <div className="convs">
      {rows.map((c) => (
        <Link key={c.id} href={`/companies/${c.id}`} className="conv">
          <span className="conv-av">{logoUrl(c) ? <img src={logoUrl(c)!} alt="" /> : c.name.slice(0, 1)}</span>
          <span className="conv-main">
            <span className="conv-top">
              <b className="conv-nm">{c.name}</b>
              {c.verified ? <span className="conv-ok" aria-hidden="true">✓</span> : null}
              <time className="conv-time">{when(c.lastAt)}</time>
            </span>
            <span className="conv-sub">{category(c.industry)}</span>
            <span className="conv-last"><em>{label(c)}</em></span>
          </span>
        </Link>
      ))}
    </div>
  );
}
