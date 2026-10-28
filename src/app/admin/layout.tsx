import { ToastProvider } from "@/components/Toast";

export const metadata = { robots: { index: false, follow: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="shell wide" style={{ maxWidth: 900 }}><ToastProvider>{children}</ToastProvider></div>;
}
