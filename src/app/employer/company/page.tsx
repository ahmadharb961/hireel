import { getTranslations } from "next-intl/server";
import { Header } from "@/components/Header";
import { EmployerNav } from "@/components/Nav";
import { PhotoUpload } from "@/components/PhotoUpload";
import { logoUrl } from "@/lib/logo";
import { savedCount } from "@/server/employer-data";
import { requireEmployer } from "@/server/session";
import { CompanyForm } from "./CompanyForm";

/** Company profile: what candidates see on every intro request. */
export default async function CompanyEditPage() {
  const { company, member } = await requireEmployer();
  const t = await getTranslations("companyEdit");
  return (
    <div className="scr">
      <Header back="/employer/account" home="/feed" />
      <main className="main"><div className="stack">
        <div><h1 className="h2">{t("title")}</h1><p className="p">{t("sub")}</p></div>
        <section className="card"><PhotoUpload kind="logo" initialUrl={logoUrl(company)} name={company.name} /></section>
        <section className="card">
          <CompanyForm name={company.name} initial={{ description: company.description, website: company.website, industry: company.industry || "other", size: company.size || "1-10", country: company.country || "Lebanon" }} />
        </section>
      </div></main>
      <EmployerNav savedCount={await savedCount(member.id)} />
    </div>
  );
}
