"use client";
import { useTranslations } from "next-intl";
import { LIcon } from "./icons";

const PLACES = ["Lebanon", "Beirut", "UAE", "Dubai", "Saudi Arabia", "Qatar", "Kuwait", "Remote"];

/** Working search bar inside the employer banner: sends people to real search results. */
export function EmployerSearch() {
  const t = useTranslations("landing.emp");
  return (
    <form className="esearch" action="/search" method="get" role="search">
      <label className="esearch-f">
        <LIcon name="search" size={18} />
        <span className="sr">{t("role")}</span>
        <input name="q" placeholder={t("rolePh")} aria-label={t("role")} />
      </label>
      <label className="esearch-f">
        <LIcon name="pin" size={18} />
        <span className="sr">{t("location")}</span>
        <select name="loc" aria-label={t("location")} defaultValue="">
          <option value="">{t("anyLocation")}</option>
          {PLACES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </label>
      <label className="esearch-f">
        <LIcon name="briefcase" size={18} />
        <span className="sr">{t("years")}</span>
        <select name="minYears" aria-label={t("years")} defaultValue="">
          <option value="">{t("anyYears")}</option>
          {[1, 3, 5, 8, 10].map((y) => <option key={y} value={y}>{t("yearsPlus", { n: y })}</option>)}
        </select>
      </label>
      <button className="btn m esearch-go" type="submit">{t("search")}</button>
    </form>
  );
}
