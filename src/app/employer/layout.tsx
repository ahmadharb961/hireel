import { ToastProvider } from "@/components/Toast";

export const metadata = { robots: { index: false, follow: false } };

export default function EmployerLayout({ children }: { children: React.ReactNode }) {
  return <div className="shell"><ToastProvider>{children}</ToastProvider></div>;
}
