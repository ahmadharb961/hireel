/** Line icons for the landing page (24px grid, stroke follows currentColor). */
const P: Record<string, React.ReactNode> = {
  all: <><rect x="4" y="4" width="6" height="6" rx="1.5" /><rect x="14" y="4" width="6" height="6" rx="1.5" /><rect x="4" y="14" width="6" height="6" rx="1.5" /><rect x="14" y="14" width="6" height="6" rx="1.5" /></>,
  marketing: <><path d="M4 10v4l3 .5L9 19h2l-1-4.5 8 3V6.5l-8 3z" /><path d="M20 10v4" /></>,
  sales: <><path d="M4 20h16" /><rect x="5" y="13" width="3" height="5" /><rect x="10.5" y="9" width="3" height="9" /><rect x="16" y="5" width="3" height="13" /></>,
  technology: <><path d="M8 7l-5 5 5 5" /><path d="M16 7l5 5-5 5" /><path d="M14 4l-4 16" /></>,
  design: <><path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.5-.8 1.5-1.5 0-1.3-1-1.6-1-2.7 0-.8.7-1.3 1.5-1.3H16a5 5 0 0 0 5-5C21 6.6 17 3 12 3z" /><circle cx="7.5" cy="11" r="1" /><circle cx="10" cy="7" r="1" /><circle cx="15" cy="7" r="1" /></>,
  finance: <><ellipse cx="12" cy="6" rx="7" ry="3" /><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6" /><path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" /></>,
  hr: <><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.5 2.7-5.5 6-5.5s6 2 6 5.5" /><circle cx="17" cy="9" r="2.5" /><path d="M16 14.6c2.8.2 5 2 5 5.4" /></>,
  hospitality: <><path d="M4 17h16" /><path d="M6 17a6 6 0 0 1 12 0" /><path d="M12 8V6" /><path d="M3 20h18" /></>,
  engineering: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" /></>,
  healthcare: <><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /><path d="M12 9v5M9.5 11.5h5" /></>,
  education: <><path d="M2 9l10-5 10 5-10 5z" /><path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5" /></>,
  logistics: <><rect x="2" y="7" width="12" height="9" rx="1" /><path d="M14 10h4l3 3v3h-7" /><circle cx="6.5" cy="17.5" r="1.8" /><circle cx="17.5" cy="17.5" r="1.8" /></>,
  retail: <><path d="M5 8h14l-1 12H6z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></>,
  video: <><rect x="6" y="2.5" width="12" height="19" rx="3" /><path d="M10.5 9.5l4 2.5-4 2.5z" /></>,
  discover: <><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.4-4.4" /><path d="M8.5 11a2.5 2.5 0 0 1 2.5-2.5" /></>,
  connect: <><path d="M4 5h16v11H9l-5 4z" /><path d="M8 9.5h8M8 12.5h5" /></>,
  bolt: <path d="M13 2L4 14h7l-1 8 9-12h-7z" />,
  people: <><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.5 2.7-5.5 6-5.5s6 2 6 5.5" /><circle cx="17" cy="9" r="2.5" /><path d="M16 14.6c2.8.2 5 2 5 5.4" /></>,
  lock: <><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /><circle cx="12" cy="15" r="1.2" /></>,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  play: <path d="M8 5.5v13l11-6.5z" />,
  bookmark: <path d="M6 3h12v18l-6-4-6 4z" />,
  pin: <><path d="M12 21s-6-5.6-6-11a6 6 0 0 1 12 0c0 5.4-6 11-6 11z" /><circle cx="12" cy="10" r="2.2" /></>,
  briefcase: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5h6v2" /><path d="M3 12h18" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></>,
  menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  chevron: <path d="M9 6l6 6-6 6" />,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z" /></>,
};

export function LIcon({ name, size = 22, fill = false, className }: { name: string; size?: number; fill?: boolean; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill={fill ? "currentColor" : "none"} stroke={fill ? "none" : "currentColor"} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {P[name] ?? P.all}
    </svg>
  );
}
