import Link from "next/link";
import { getTranslations } from "next-intl/server";

/** On computers: brand panel beside the form. On phones: just the form, as approved. */
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("home");
  return (
    <div className="authwrap">
      <aside className="authside" aria-hidden="true">
        <Link className="logo" href="/" tabIndex={-1}>Hireel</Link>
        <div>
          <h2>{t("headline")}</h2>
          <p>{t("lead")}</p>
        </div>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 14, maxWidth: 480 }}>
          {(["why1", "why2", "why3"] as const).map((k) => (
            <li key={k} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <span style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(179,226,205,.2)", color: "#B3E2CD", display: "flex", alignItems: "center", justifyContent: "center", flex: "none", fontWeight: 700 }}>✓</span>
              <span><b style={{ display: "block" }}>{t(k)}</b><span style={{ color: "#d6ebe2", fontSize: 14 }}>{t(`${k}Sub`)}</span></span>
            </li>
          ))}
        </ul>
      </aside>
      <div className="authmain">{children}</div>
    </div>
  );
}
