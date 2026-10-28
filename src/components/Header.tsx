import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Icon } from "./Icons";
import { LangSwitch } from "./LangSwitch";

export async function Header({ back, home = "/", title = "Hireel", right, lang = true }: { back?: string; home?: string; title?: string; right?: React.ReactNode; lang?: boolean }) {
  const t = await getTranslations("common");
  return (
    <header className="hd">
      <div className="l">
        {back ? (
          <Link className="ib flip" href={back} aria-label={t("back")}>
            <Icon name="back" />
          </Link>
        ) : null}
        <Link className="logo" href={home}>{title}</Link>
      </div>
      <div className="l">
        {right}
        {lang ? <LangSwitch /> : null}
      </div>
    </header>
  );
}
