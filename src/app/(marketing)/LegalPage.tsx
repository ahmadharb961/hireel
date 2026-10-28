import { getTranslations } from "next-intl/server";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteNav } from "@/components/landing/SiteNav";
import type { LegalBlock, LegalDoc } from "@/content/legal";

/** Turns plain web addresses inside legal text into links. */
function linkify(text: string) {
  return text.split(/(https:\/\/hireel\.app\S*?)(?=[.,)]?(?:\s|$))/).map((part, i) =>
    part.startsWith("https://hireel.app") ? <a key={i} href={part}>{part.replace("https://", "")}</a> : part,
  );
}

function Block({ b }: { b: LegalBlock }) {
  if (Array.isArray(b)) return <ul>{b.map((li) => <li key={li}>{linkify(li)}</li>)}</ul>;
  if (typeof b === "object") return <h3>{b.h}</h3>;
  return <p>{linkify(b)}</p>;
}

/** Long legal document: numbered sections, a contents list that stays in view on computers, and the site footer. */
export async function LegalPage({ doc }: { doc: LegalDoc }) {
  const t = await getTranslations("legal");
  return (
    <div className="site2">
      <SiteNav />
      <main>
        <header className="lg-hero" id="top">
          <div className="wrapx">
            <span className="pillx">Hireel · LYVE</span>
            <h1>{doc.title}</h1>
            {doc.effective || doc.updated ? (
              <p className="lg-dates">
                {doc.effective ? <span>{t("effective")}: <b>{doc.effective}</b></span> : null}
                {doc.updated ? <span>{t("updated")}: <b>{doc.updated}</b></span> : null}
              </p>
            ) : null}
            {doc.note ? <p className="lg-note">{doc.note}</p> : null}
          </div>
        </header>

        <div className="wrapx lg-grid">
          <nav className="lg-toc" aria-label={t("contents")}>
            {/* Folded on phones, always open beside the text on computers. */}
            <details className="lg-toc-m">
              <summary>{t("contents")}</summary>
              <ol>{doc.sections.map((s) => <li key={s.id}><a href={`#${s.id}`}>{s.h}</a></li>)}</ol>
            </details>
            <div className="lg-toc-d">
              <b>{t("contents")}</b>
              <ol>{doc.sections.map((s) => <li key={s.id}><a href={`#${s.id}`}>{s.h}</a></li>)}</ol>
            </div>
          </nav>

          <article className="lg-doc">
            {doc.facts ? (
              <dl className="lg-facts">
                {doc.facts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{linkify(v)}</dd></div>)}
              </dl>
            ) : null}
            {doc.sections.map((s, i) => (
              <section key={s.id} id={s.id} className="lg-sec">
                <h2><span className="lg-n">{i + 1}</span>{s.h}</h2>
                {s.body.map((b, j) => <Block key={j} b={b} />)}
              </section>
            ))}
            {doc.closing ? <footer className="lg-closing">{doc.closing.map((l, i) => <p key={i}>{l}</p>)}</footer> : null}
            <a className="lg-top" href="#top">↑ {t("backTop")}</a>
          </article>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
