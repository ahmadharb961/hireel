"use client";

export function Toggle({ on, onChange, label, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return <button type="button" className="tog" aria-pressed={on} aria-label={label} disabled={disabled} onClick={() => onChange(!on)} />;
}
