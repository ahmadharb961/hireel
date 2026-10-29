type Fmt = { dateTime: (d: Date, o: { timeStyle?: "short"; weekday?: "short"; day?: "numeric"; month?: "short" }) => string };

/** Short time for message lists: "9:41 AM" today, "Mon" this week, otherwise "12 Oct". */
export function listTime(d: Date | null, fmt: Fmt, now = new Date()) {
  if (!d) return "";
  if (d.toDateString() === now.toDateString()) return fmt.dateTime(d, { timeStyle: "short" });
  if (now.getTime() - d.getTime() < 6 * 86400000) return fmt.dateTime(d, { weekday: "short" });
  return fmt.dateTime(d, { day: "numeric", month: "short" });
}
