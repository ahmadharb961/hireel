"use client";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

/** Call before a navigation started from code (router.push/replace) so the bar shows too. */
export function startNavProgress() {
  window.dispatchEvent(new Event("hireel:nav-start"));
}

function isInternalNav(e: MouseEvent) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
  const a = (e.target as HTMLElement | null)?.closest?.("a");
  if (!a || !a.href || a.target === "_blank" || a.hasAttribute("download")) return false;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin) return false;
  // Same page (or just a #section jump): nothing to wait for.
  return url.pathname !== location.pathname || url.search !== location.search;
}

function Bar() {
  const key = `${usePathname()}?${useSearchParams().toString()}`;
  // Address shown when the tap happened; once the address changes, the new page is on screen.
  const [from, setFrom] = useState<string | null>(null);
  const keyRef = useRef(key);
  useEffect(() => { keyRef.current = key; }, [key]);

  useEffect(() => {
    let safety = 0;
    const start = () => {
      setFrom(keyRef.current);
      clearTimeout(safety);
      safety = window.setTimeout(() => setFrom(null), 15000);
    };
    const onClick = (e: MouseEvent) => { if (isInternalNav(e)) start(); };
    const onSubmit = (e: SubmitEvent) => {
      const f = e.target as HTMLFormElement;
      if (!e.defaultPrevented && f.method === "get" && new URL(f.action, location.href).origin === location.origin) start();
    };
    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit);
    window.addEventListener("hireel:nav-start", start);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit);
      window.removeEventListener("hireel:nav-start", start);
      clearTimeout(safety);
    };
  }, []);

  const state = from === null ? "idle" : from === key ? "busy" : "done";
  return <div className={`navbar-progress ${state}`} aria-hidden="true" />;
}

/** Thin bar at the top of the screen that starts the moment a link is tapped. */
export function NavProgress() {
  return <Suspense fallback={null}><Bar /></Suspense>;
}
