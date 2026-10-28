import { getTranslations } from "next-intl/server";
import { Header } from "@/components/Header";

/** Plain legal page. The text is a starting draft and is labeled as such until a lawyer reviews it. */
export async function LegalPage({ ns }: { ns: "privacy" | "terms" }) {
  const t = await getTranslations(ns);
  const tl = await getTranslations("legal");
  const sections = t.raw("sections") as { h: string; p: string }[];
  return (
    <div className="shell"><div className="scr">
      <Header back="/" />
      <main className="main prose">
        <h1 className="h2">{t("title")}</h1>
        <p className="tag warn" style={{ marginTop: 8, whiteSpace: "normal" }}>{tl("draft")}</p>
        <div className="stack" style={{ marginTop: 16 }}>
          {sections.map((s, i) => (
            <section key={i} id={i === sections.length - 1 ? "contact" : undefined}>
              <h2 className="h3">{s.h}</h2>
              <p className="p" style={{ marginTop: 4, whiteSpace: "pre-wrap" }}>{s.p}</p>
            </section>
          ))}
        </div>
      </main>
    </div></div>
  );
}
