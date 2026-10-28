import { Header } from "@/components/Header";
import { ForgotForm } from "./ForgotForm";

export default function ForgotPage() {
  return (
    <div className="shell">
      <div className="scr">
        <Header back="/login" />
        <main className="main"><ForgotForm /></main>
      </div>
    </div>
  );
}
