# Hireel — Build Plan

Hireel is a video-first talent marketplace. Employers discover candidates through a vertical, Reels-style video feed. Candidates upload short intro videos. Launch market: Lebanon, later the GCC.

> **Status:** Phase 0 approved. Phase 1 built and tested; waiting for deployment and real-phone testing.
> **Inputs:** the build brief, `SPEC.md` (written as "VYBE"; we use **Hireel** everywhere), and the approved prototypes `hireel-feed.html` + `hireel-candidate.html`. When the brief and the SPEC disagree, **the brief and the approved prototypes win** (see section 7).

---

## 1. Architecture (in plain English)

Think of Hireel as five parts that talk to each other:

| Part | What it does | Tool we use |
|---|---|---|
| **The app** (website + server logic) | Every screen, plus the "brain" that checks who you are and what you're allowed to do | Next.js (App Router) + TypeScript + Tailwind |
| **The database** | Stores users, profiles, companies, requests, view counts | PostgreSQL, accessed through Prisma |
| **Video service** | Receives uploads, converts them for all phones, streams them | Cloudflare Stream |
| **Email service** | Sends verification, password-reset and notification emails | **Your Hostinger mailbox** (e.g. `no-reply@yourdomain`) over SMTP. The code sends email through one small "mailer" module, so switching to Resend later is a one-line setting, not a rewrite |
| **Hosting** | Puts the app on the internet with HTTPS | **Your Hostinger account** (exact setup depends on your plan; see section 6). Free SSL from Hostinger gives us the HTTPS the PWA needs |
| **Domain** | hireel.something | Bought at **GoDaddy**, pointed at Hostinger (I'll give you click-by-click steps) |

**Background jobs without extra services:** the SPEC suggests Redis and BullMQ (a separate queue server). To keep things simple and cheap on Hostinger, we'll use PostgreSQL for rate limits and a small job table. A scheduled task (cron) will run things like the 30-day video cleanup. We can add Redis later if traffic needs it.

How a video gets from a candidate to an employer:

1. The candidate records or picks a video in the browser.
2. Our server asks Cloudflare for a **one-time upload link** (so our API key never reaches the browser) and caps the length at 120 seconds.
3. The browser uploads straight to Cloudflare. Large files resume if the connection drops.
4. Cloudflare processes the video and calls our server (a "webhook") when it's ready. The candidate sees: *Uploading → Processing → Waiting for review → Live* (or *Rejected, with the reason*).
5. An admin approves it. Only then can it appear in the feed.
6. Employers watch through **short-lived signed links**, so videos can't be bulk-downloaded or hot-linked.

**Security principles**
- Every permission check happens **on the server**, never only in the browser.
- Passwords are hashed with a slow algorithm (argon2) and are never stored in plain text.
- All secrets live in `.env`, never in the code. A `.env.example` lists what's needed.
- Candidate contact details (phone, email, CV) are only shown to a company after the candidate **accepts** that company's intro request.
- Rate limits apply to login, feed, search, view counting and intro requests. Anti-scraping measures: small paginated feed pages, signed video URLs, no public listing API, `noindex` on all private and shared pages.

**Key libraries (all free and open source)**
- **Better Auth**: sign-up, login, email verification, password reset and sessions, stored in our own database
- **Zod**: checks every form and API input
- **next-intl**: translations (English now, Arabic/RTL ready)
- **Serwist**: service worker for the installable PWA
- **Vitest** (logic tests) + **Playwright** (clicks through the real app in a browser)

---

## 2. Folder structure

```
hireel/
├─ PLAN.md, PROGRESS.md, README.md, .env.example
├─ prisma/
│  ├─ schema.prisma          # database tables
│  ├─ migrations/            # history of database changes
│  └─ seed-demo.ts           # DEMO data only, clearly labeled, removable with one command
├─ public/
│  ├─ icons/                 # PWA icons: 72→512px, maskable, Apple touch icon
│  └─ manifest.webmanifest
├─ src/
│  ├─ app/
│  │  ├─ (marketing)/        # homepage, about, legal pages
│  │  ├─ (auth)/             # sign-up, login, verify email, reset password
│  │  ├─ candidate/          # Home, My Video, Profile, Share tabs + onboarding
│  │  ├─ employer/           # Discover feed, Search, Saved, Requests (sent), Account
│  │  ├─ admin/              # employer approvals, video moderation, overview
│  │  ├─ p/[token]/          # public share-link profile page (noindex)
│  │  ├─ api/                # server endpoints (uploads, webhooks, view counting…)
│  │  └─ sw.ts               # service worker
│  ├─ components/            # shared UI: VideoCard, BottomNav, FilterPanel, InstallBanner…
│  ├─ server/                # server-only logic: permissions, feed, views, moderation, email
│  ├─ lib/                   # helpers: validation schemas, rate limiter, i18n setup
│  ├─ messages/              # en.json (ar.json added in Phase 3)
│  └─ styles/                # brand tokens (colors, Inter font)
├─ design/                   # Phase 0 clickable prototype screens (sample data)
└─ tests/
   ├─ unit/                  # Vitest
   └─ e2e/                   # Playwright
```

---

## 3. Database tables

Every table that can hold sample data has an **`isDemo`** flag. Demo rows are never mixed into real statistics, and one command deletes them all.

### Phase 1 (core)
| Table | Purpose | Key fields |
|---|---|---|
| **User** | One per person | email, role (`CANDIDATE` / `EMPLOYER` / `ADMIN`), emailVerified, locale, deletedAt |
| **Session / Account / Verification** | Login sessions, password hashes, email + reset tokens (managed by Better Auth) | — |
| **CandidateProfile** | The candidate's profile | fullName, headline, location, yearsExperience, availability, bio, profileType (`VIDEO` / `TEXT_ONLY`), status (`DRAFT` / `PUBLISHED` / `UNPUBLISHED`), publishConsentAt. **Private:** phone, contactEmail, cvFileKey, salaryExpectation |
| **Skill / CandidateSkill** | Skill list and which candidate has which | name, slug |
| **Video** | Up to 2 active per candidate, each a different language | language (`EN` / `AR` / `FR`), isPrimary, streamUid, processingStatus, moderationStatus (`PENDING` / `APPROVED` / `REJECTED`), rejectionReason, durationSec, width/height, consentAt, archivedAt, deleteAfter, viewCount |
| **VideoView** | One row per counted view | videoId, employerUserId, viewedAt. Used to enforce "once per employer per video per 24h" |
| **ShareLink** | The optional public profile link | candidateId, token (random, 32+ chars), enabled (default **off**), revokedAt |
| **Company** | Employer organisation | name, website, industry, size, country, verificationStatus (`PENDING` / `APPROVED` / `REJECTED`), rejectionReason |
| **CompanyMember** | Links employer users to a company | companyId, userId, role (`OWNER` in Phase 1; more in Phase 2) |
| **SavedCandidate** | Employer's saved list | companyMemberId, candidateId |
| **Plan** | Freemium / Premium, **editable by the Super Admin** (no code changes) | name, price (display only until Phase 3), monthlyIntroRequests, monthlyCvContactUnlocks, maxSaved, isActive |
| **CompanyPlan** | Which plan a company is on | companyId, planId, periodStart, periodEnd, assignedBy (admin, until payments exist) |
| **UsageLedger** | Every credit used, counted safely so limits can't be bypassed | companyId, kind (`INTRO_REQUEST` / `CV_CONTACT_REQUEST`), periodStart, candidateId, createdAt |
| **IntroRequest** | "Request intro" | companyId, senderId, candidateId, roleTitle, message, status (`PENDING` / `ACCEPTED` / `DECLINED` / `WITHDRAWN`), respondedAt |
| **Block** | A candidate blocks a company | candidateId, companyId |
| **AuditLog** | Admin actions (approvals, rejections, reasons) | actorId, action, targetType, targetId, reason |
| **RateLimitHit** | Simple rate limiting inside Postgres (no extra account needed) | key, windowStart, count |

### Phase 2
**Conversation**, **Message** (only after an accepted request), **Shortlist**, **ShortlistEntry**, **PrivateNote**, **Notification** (in-app + email log), **TeamInvite**, plus more roles on CompanyMember (`OWNER` / `ADMIN` / `RECRUITER` / `VIEWER`).

### Phase 3
**Subscription**, **PaymentEvent** (sandbox first, connects payments to the Phase 1 plans), **ContentPage** (admin-editable text), **Transcript** (optional AI module), **DataExportRequest**, **DeletionRequest**.

### Rules the database and server enforce
- At most **2 active (not archived) videos** per candidate, **one per language**, exactly one primary.
- When a video is replaced, the old one is archived privately and **deleted from Cloudflare and the database after 30 days** (a daily cleanup job).
- A video only appears in the feed if: the profile is published, the candidate gave publish consent, the video is approved, and the company isn't blocked.
- Feed order **never** uses view counts. It's a shuffle that stays the same for each employer within a session, then filters, then newest-first as a tie-breaker.
- Filters allow only job-related fields: skills, experience, location, availability, video language. No ethnicity, religion, appearance, age, gender or photo-based filters.

### View-count rules (in code, with tests)
A view counts only when **all** of these are true: the viewer is a logged-in employer, they watched ≥3 seconds (reported by the player), they're not the candidate themselves, they don't look like a bot (user-agent check + rate limit), and they haven't viewed that video in the last 24 hours. The public number is hidden until it reaches **10**. The candidate always sees their own exact count.

---

## 4. Phases (checklist)

After **every** phase: run the app → run automated tests → fix problems → explain in plain English what works and how to try it → **wait for approval**.

### Phase 1 (core)
| Table | Purpose | Key fields |
|---|---|---|
| **User** | One per person | email, role (`CANDIDATE` / `EMPLOYER` / `ADMIN`), emailVerified, locale, deletedAt |
| **Session / Account / Verification** | Login sessions, password hashes, email + reset tokens (managed by Better Auth) | — |
| **CandidateProfile** | The candidate's profile | fullName, headline, location, yearsExperience, availability, bio, profileType (`VIDEO` / `TEXT_ONLY`), status (`DRAFT` / `PUBLISHED` / `UNPUBLISHED`), publishConsentAt. **Private:** phone, contactEmail, cvFileKey, salaryExpectation |
| **Skill / CandidateSkill** | Skill list and which candidate has which | name, slug |
| **Video** | Up to 2 active per candidate, each a different language | language (`EN` / `AR` / `FR`), isPrimary, streamUid, processingStatus, moderationStatus (`PENDING` / `APPROVED` / `REJECTED`), rejectionReason, durationSec, width/height, consentAt, archivedAt, deleteAfter, viewCount |
| **VideoView** | One row per counted view | videoId, employerUserId, viewedAt. Used to enforce "once per employer per video per 24h" |
| **ShareLink** | The optional public profile link | candidateId, token (random, 32+ chars), enabled (default **off**), revokedAt |
| **Company** | Employer organisation | name, website, industry, size, country, verificationStatus (`PENDING` / `APPROVED` / `REJECTED`), rejectionReason |
| **CompanyMember** | Links employer users to a company | companyId, userId, role (`OWNER` in Phase 1; more in Phase 2) |
| **SavedCandidate** | Employer's saved list | companyMemberId, candidateId |
| **Plan** | Freemium / Premium, **editable by the Super Admin** (no code changes) | name, price (display only until Phase 3), monthlyIntroRequests, monthlyCvContactUnlocks, maxSaved, isActive |
| **CompanyPlan** | Which plan a company is on | companyId, planId, periodStart, periodEnd, assignedBy (admin, until payments exist) |
| **UsageLedger** | Every credit used, counted safely so limits can't be bypassed | companyId, kind (`INTRO_REQUEST` / `CV_CONTACT_REQUEST`), periodStart, candidateId, createdAt |
| **IntroRequest** | "Request intro" | companyId, senderId, candidateId, roleTitle, message, status (`PENDING` / `ACCEPTED` / `DECLINED` / `WITHDRAWN`), respondedAt |
| **Block** | A candidate blocks a company | candidateId, companyId |
| **AuditLog** | Admin actions (approvals, rejections, reasons) | actorId, action, targetType, targetId, reason |
| **RateLimitHit** | Simple rate limiting inside Postgres (no extra account needed) | key, windowStart, count |

### Phase 2
**Conversation**, **Message** (only after an accepted request), **Shortlist**, **ShortlistEntry**, **PrivateNote**, **Notification** (in-app + email log), **TeamInvite**, plus more roles on CompanyMember (`OWNER` / `ADMIN` / `RECRUITER` / `VIEWER`).

### Phase 3
**Subscription**, **PaymentEvent** (sandbox first, connects payments to the Phase 1 plans), **ContentPage** (admin-editable text), **Transcript** (optional AI module), **DataExportRequest**, **DeletionRequest**.

### Rules the database and server enforce
- At most **2 active (not archived) videos** per candidate, **one per language**, exactly one primary.
- When a video is replaced, the old one is archived privately and **deleted from Cloudflare and the database after 30 days** (a daily cleanup job).
- A video only appears in the feed if: the profile is published, the candidate gave publish consent, the video is approved, and the company isn't blocked.
- Feed order **never** uses view counts. It's a shuffle that stays the same for each employer within a session, then filters, then newest-first as a tie-breaker.
- Filters allow only job-related fields: skills, experience, location, availability, video language. No ethnicity, religion, appearance, age, gender or photo-based filters.

### View-count rules (in code, with tests)
A view counts only when **all** of these are true: the viewer is a logged-in employer, they watched ≥3 seconds (reported by the player), they're not the candidate themselves, they don't look like a bot (user-agent check + rate limit), and they haven't viewed that video in the last 24 hours. The public number is hidden until it reaches **10**. The candidate always sees their own exact count.

---

## 4. Phases (checklist)

After **every** phase: run the app → run automated tests → fix problems → explain in plain English what works and how to try it → **wait for approval**.

### Phase 0: Clickable design (no backend)
- [ ] Set up project, brand colors (#195C48, #235443, #B3E2CD, #FAF9F6, #182722, #69766F, #E4EAE5) and the Inter font, plus the automatic dark mode the prototypes already have
- [ ] Rebuild the two approved prototypes as app screens, matching their look exactly (full-bleed feed, gradient header, solid Filters panel, translucent nav with mint icons, bottom-sheet Profile / Request intro forms, 20px rounded cards, toggles, "Video 1 / Video 2" language slots)
- [ ] Homepage
- [ ] Sign-up (choose Candidate or Employer)
- [ ] Candidate onboarding (name, headline, location, skills, experience)
- [ ] Video studio (record/upload mock, language picker, primary toggle, consent checkbox, status states)
- [ ] Employer feed (full-screen 9:16, floating logo, Filters panel, translucent bottom nav, card details, Save / Profile / Request intro, language switch, public view count)
- [ ] Candidate dashboard tabs: Home, My Video, Profile (employer preview), Share
- [ ] Candidate profile (employer view) + public share page
- [ ] Request inbox (accept / decline / block)
- [ ] Admin overview (employer approvals, video moderation)
- [ ] Landscape video shown whole on a blurred background (never stretched)
- [ ] Every sample item labeled **"Sample data"**
- [ ] Publish a private link you can open on your phone
- [ ] **Wait for your written approval** (after that, design changes are small tweaks only)

### Phase 1: MVP core loop
- [x] **Arabic + right-to-left, the whole app** (moved here from Phase 3 at your request); emails too
- Changed during the build: the "full CV" is the candidate's typed work history and education. **CV file (PDF) upload moves to Phase 2** (it needs private file storage).
- [x] Database + Prisma schema + migrations; demo seed kept separate
- [x] Sign up, login, logout, email verification, password reset (Hostinger SMTP; real sending needs your mailbox password)
- [x] Roles enforced on the server (Candidate / Employer / Admin)
- [x] Two-step login (authenticator app) **required for admins**, as the SPEC asks
- [x] Candidate onboarding saved to the database
- [~] Video recording/upload to Cloudflare Stream, processing status, webhook: **built and unit-tested; needs your Cloudflare account to try for real**
- [x] Up to 2 videos in different languages, primary choice, replace + 30-day archive cleanup
- [x] Text-only profile option
- [x] Publish/unpublish with consent; profile preview
- [x] Share link: off by default, random token, regenerate, switch off, noindex, safe fields only
- [x] **Open feed:** anyone, even without an account, can watch the Reels feed and use filters. Save, Profile details, Request intro and the CV/contact request show a "Sign up as an employer" prompt
- [x] Visitor safeguards: rate limits, no full profile/CV/contact for visitors, feed pages hidden from Google, visitor views don't count toward view counts
- [x] Company registration. Employers can send requests **right away** after verifying their email. The admin can verify companies (shows a "Verified" badge) and suspend bad actors at any time
- [x] **Candidate visibility choice** when publishing: "Everyone" (default) or "Signed-in employers only". Reels marked "employers only" never appear to visitors
- [x] **Plans (Freemium + Premium):** Super Admin sets each plan's monthly limits for intro requests and CV/contact requests. The server checks the limit before every request. Admin assigns Premium manually until payments arrive in Phase 3
- [x] "Show full CV and contact details" request: uses one credit, and the candidate still has to approve before anything is revealed
- [x] Employer feed with filters, language-matched video, one card per candidate. Only the visible video and its neighbours load, videos play muted by default with tap to unmute, and the feed respects data-saver and reduced-motion settings
- [x] Desktop layout for the feed: filters on the left, video in the middle, profile on the right (SPEC 6.3)
- [x] Candidate "Report suspicious activity" button on requests (stored for admin review)
- [x] View counting (3s / 24h / employer-only / no self / no bots / show from 10)
- [x] Save candidate, view profile, Request Introduction
- [x] Candidate inbox: accept, decline, block; contact details revealed only on accept
- [x] Admin: verify/suspend employers, assign plans, approve/reject videos with a reason the candidate sees
- [x] Rate limits + anti-scraping on feed, search and requests
- [x] **PWA**: manifest, all icon sizes, maskable icon, service worker, install banner (Android Install button / iOS + iPadOS "Share → Add to Home Screen" popup, hidden when installed, shown from the 2nd page view, 30-day snooze)
- [x] Automated tests for every rule above
- [ ] **WAITING ON YOU:** Deploy to a real HTTPS address; you test on a real iPhone and a real Android phone (see docs/SETUP.md)

### Phase 2: Conversations and teams
- [x] CV file (PDF or Word) upload, shared only on accepted requests
- [x] Profile photo
- [ ] In-app chat, only between a company and a candidate after the candidate accepts its intro request;
      phone numbers stay private, block and report work inside the chat, with new-message notifications
- [ ] Shortlists with private notes
- [x] Phone notifications (new request, request answered, video approved/rejected, admin review queue), on/off per device
- [ ] Email notifications (with per-user settings)
- [ ] Employer team members, invites and roles

### Phase 3: Business, admin and reach
- [ ] Online payment for Premium, **sandbox mode** until real payment details exist (plans and limits already exist from Phase 1)
- [ ] Full admin dashboard + content editing
- [ ] Optional modules: AI search and transcripts (no AI judging of faces, voice or personality)
- [ ] Privacy tools: data export, account deletion

---

## 5. Rules that never change
- No likes, public comments, follower counts or popularity rankings.
- No discriminatory filters. No AI judging of faces, voice or personality.
- Candidates must consent before a video is published.
- Rate limits and anti-scraping on search, feed and contact requests.
- Nothing faked: no fake stats, uploads or payments. Demo data is labeled and kept separate.

---

## 6. Decisions

**Already decided by you**
- Hosting: **Hostinger Cloud Startup** (existing account, already running a Node.js project). Hireel is added as a **separate website**, and your existing project is not touched
- Database: **PostgreSQL on Neon** (free tier to start), because Cloud plans only include MySQL
- Background tasks (like the 30-day video cleanup): Hostinger's built-in **Cron Jobs** in hPanel
- Email: **Hostinger mailbox** via SMTP (replaces Resend)
- Domain: **GoDaddy**

**Still open**
1. ~~Hostinger plan~~: Cloud Startup ✓
2. ~~GitHub~~: you have an account ✓ (I'll ask you to create the repository when Phase 0 is done)
   **Save the work (needed before we start building).** This workspace is temporary and gets wiped after a while. I need a free **GitHub repository** to save the code in, and Hostinger can also deploy from it. Do you have a GitHub account?
3. **Video.** Cloudflare Stream is **paid**: roughly $5 per 1,000 minutes stored + $1 per 1,000 minutes watched, with a ~$5/month minimum. Needed in Phase 1. Hostinger can't stream video to phones well, so this stays.
4. ~~Employer access~~: **decided.** Like TikTok, anyone can browse the reels. Saving, viewing full profiles and sending requests require an employer account. Freemium + Premium plans with admin-controlled limits.
5. **Email limits (heads-up).** Hostinger mailboxes cap how many emails you can send per day. That's fine for launch. If emails start landing in spam or hitting the cap, we switch the mailer setting to Resend.
6. **Payments (Phase 3).** Stripe doesn't support businesses registered in Lebanon. We'll choose later between a non-Lebanese company entity, Paddle, or a local gateway.

For **Phase 0 no accounts are needed**: I'll publish the clickable design as a private link you can open on your phone.

---

## 7. Where the brief and the SPEC differ (how I'm resolving it)

| Topic | SPEC says | We do (brief + approved designs) |
|---|---|---|
| Name | VYBE | **Hireel** |
| Candidate tabs | Home, My Video, Requests, Profile, Settings | **Home, My Video, Profile, Share** (as in the prototype). Requests are reached from a "Pending requests" card on Home and a bell icon in the header |
| Candidate onboarding | 5 long steps | **Short:** name, headline, location, skills, experience (as the SPEC's own advice says). Experience history, education, CV and preferences can be added later from Profile |
| View counts | not mentioned | **Public view count from 10 views up**, with strict counting rules. The prototype's sample numbers (128, 86…) become clearly labeled sample data |
| Videos per candidate | 1 | **Up to 2**, different languages, one primary, language switch on the card |
| Email | Resend | **Hostinger SMTP** (switchable) |
| Queues | Redis + BullMQ | **PostgreSQL jobs + cron** for now |
| Pricing on homepage | Free / $49 / $149 / Enterprise | Shown in Phase 0 as **"Sample pricing, not final"**. Real, admin-editable plans arrive in Phase 3 |
