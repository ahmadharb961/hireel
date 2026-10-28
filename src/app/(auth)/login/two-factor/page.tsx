import { Header } from "@/components/Header";
import { TwoFactorForm } from "./TwoFactorForm";

export default function TwoFactorPage() {
  return (
    <div className="shell">
      <div className="scr">
        <Header back="/login" />
        <main className="main"><TwoFactorForm /></main>
      </div>
    </div>
  );
}
