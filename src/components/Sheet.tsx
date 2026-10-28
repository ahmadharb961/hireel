"use client";
import { useEffect } from "react";

/** Bottom sheet dialog (from the approved feed design). */
export function Sheet({ open, onClose, children, label }: { open: boolean; onClose: () => void; children: React.ReactNode; label: string }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="sheet" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="panel" role="dialog" aria-modal="true" aria-label={label}>{children}</div>
    </div>
  );
}
