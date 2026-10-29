// Finds every translation key used in src/ (static keys only) so tests can check
// that English and Arabic both have them. Dynamic keys are listed in DYNAMIC below.
import fs from "node:fs";
import path from "node:path";

const SRC = path.join(__dirname, "..", "src");

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === "generated" ? [] : walk(p);
    return /\.(tsx?|mts)$/.test(e.name) ? [p] : [];
  });
}

export function usedKeys(): { keys: Set<string>; files: number } {
  const keys = new Set<string>();
  const files = walk(SRC);
  for (const f of files) {
    const src = fs.readFileSync(f, "utf8");
    const vars = new Map<string, string>();
    for (const m of src.matchAll(/const\s+(\w+)\s*=\s*(?:await\s+)?(?:useTranslations|getTranslations)\("([\w]+)"\)/g)) vars.set(m[1], m[2]);
    for (const [v, ns] of vars) {
      const re = new RegExp(`\\b${v}(?:\\.rich|\\.raw)?\\(\\s*"([\\w.]+)"`, "g");
      for (const m of src.matchAll(re)) keys.add(`${ns}.${m[1]}`);
    }
  }
  return { keys, files: files.length };
}

/** Keys built at runtime (e.g. t(`next.${step}`)) that must also exist. */
export const DYNAMIC: string[] = [
  ...["basics", "experience", "video", "publish", "about", "done"].map((k) => `candidate.next.${k}`),
  ...["uploading", "processing", "review", "live", "rejected", "failed"].map((k) => `videoStatus.${k}`),
  ...["uploading", "processing", "review", "live"].map((k) => `studio.statusMsg.${k}`),
  ...["marketing", "technology", "finance", "sales", "design", "hospitality", "engineering", "healthcare", "education", "logistics", "retail", "hr", "other"].map((k) => `industries.${k}`),
  ...["AVAILABLE_NOW", "TWO_WEEKS", "ONE_MONTH", "TWO_MONTHS", "OPEN_TO_OFFERS"].map((k) => `availability.${k}`),
  ...["EN", "AR", "FR"].map((k) => `languages.${k}`),
  ...["FULL_TIME", "PART_TIME", "CONTRACT", "FREELANCE"].map((k) => `employment.${k}`),
  ...["Lebanon", "United_Arab_Emirates", "Saudi_Arabia", "Qatar", "Kuwait", "Bahrain", "Oman", "Other"].map((k) => `signup.countries.${k}`),
  ...["save", "prof", "req", "saved", "inbox", "account", "row"].map((k) => `gate.actions.${k}`),
  ...["fake", "money", "harassment", "other"].map((k) => `requests.reasons.${k}`),
  ...["fake", "money", "harassment", "other"].map((k) => `chat.reasons.${k}`),
  ...["chat_closed", "message_empty", "too_long"].map((k) => `chat.err.${k}`),
  "push.ctaMessage", "push.ctaInbox", "notifyGuard.why.candidate", "notifyGuard.why.employer",
  ...["fake", "inappropriate", "contact_in_video", "other"].map((k) => `report.reasons.${k}`),
  ...["quiet_audio", "not_intro", "contact_details", "inappropriate", "poor_quality", "custom"].map((k) => `rejection.${k}`),
  ...["PENDING", "ACCEPTED", "DECLINED", "WITHDRAWN"].map((k) => `inbox.status.${k}`),
  ...["UNVERIFIED", "VERIFIED", "SUSPENDED"].map((k) => `admin.companyStatus.${k}`),
  ...["COMPANY", "CANDIDATE"].map((k) => `admin.target.${k}`),
  ...["PUBLISHED", "DRAFT", "UNPUBLISHED"].map((k) => `adminC.status.${k}`),
  ...["candidate", "employer", "admin"].map((k) => `pushCard.why.${k}`),
  ...["PENDING", "APPROVED", "REJECTED"].map((k) => `adminC.mod.${k}`),
  ...["UPLOADING", "PROCESSING", "READY", "FAILED"].map((k) => `adminC.proc.${k}`),
  ...[1, 2, 3].flatMap((n) => [`home.cand${n}`, `home.cand${n}Sub`, `home.emp${n}`, `home.emp${n}Sub`]),
  ...["why1", "why2", "why3"].flatMap((k) => [`home.${k}`, `home.${k}Sub`]),
  ...[1, 2, 3, 4, 5, 6].flatMap((n) => [`home.faq${n}`, `home.faq${n}A`]),
  // server action error codes shown through errors.*
  ...["required", "too_long", "email", "password_short", "agree", "url", "phone", "years", "skills_min", "skills_max", "message_short", "invalid",
    "generic", "rate_limited", "email_taken", "consent", "incomplete", "about_short", "not_found", "stream_not_configured", "video_consent",
    "lang_taken", "max_videos", "signup_required", "saved_limit", "suspended", "blocked", "duplicate", "cooldown", "intro_limit", "cv_limit",
    "reason_required", "plan_invalid", "UNAUTHORIZED", "network", "cv_too_big", "cv_type", "cv_missing", "photo_type", "photo_too_big", "social_url"].map((k) => `errors.${k}`),
];

export function hasKey(messages: Record<string, unknown>, key: string) {
  let cur: unknown = messages;
  for (const part of key.split(".")) {
    if (cur && typeof cur === "object" && part in (cur as object)) cur = (cur as Record<string, unknown>)[part];
    else return false;
  }
  return cur !== undefined;
}

if (process.argv[1]?.endsWith("message-keys.ts")) {
  const { keys } = usedKeys();
  const all = [...keys, ...DYNAMIC].sort();
  for (const locale of ["en", "ar"]) {
    const msgs = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "messages", `${locale}.json`), "utf8"));
    const missing = all.filter((k) => !hasKey(msgs, k));
    console.log(`${locale}: ${missing.length} missing`);
    if (missing.length) console.log(missing.join("\n"));
  }
}
