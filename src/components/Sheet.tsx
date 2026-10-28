"use client";
import { useEffect } from "react";
import { createPortal } from "react-dom";

/**
 * Bottom sheet dialog (from the approved feed design). It is placed at the end of the page,
 * outside every scrolling area, so menus can never sit on top of its buttons (iPhone Safari).
 */
export function Sheet({ open, onClose, children, label }: { open: boolean; onClose: () => void; children: React.ReactNode; label: string }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="sheet" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="panel" role="dialog" aria-modal="true" aria-label={label}>{children}</div>
    </div>,
    document.body,
  );
}
