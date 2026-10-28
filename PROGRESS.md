# Hireel — Progress Log

Use this file to pick up where we left off.

## Current status
- **Phase:** 1 (MVP) is **built and tested locally**. Not online yet.
- **Waiting on you:** the accounts in `docs/SETUP.md` (GitHub repo, domain, Neon, Hostinger mailbox, Cloudflare Stream), then deployment and real-phone testing.
- **Phase 0 design link:** https://claude.ai/artifact/MnyqVAKSSyTLcXeALBjZBN (file: `docs/design/hireel-phase0.html`)

## Done
- 2026-10-28: PLAN.md written; SPEC + prototypes received; hosting decisions made
- 2026-10-28: Phase 0 clickable design published; **approved**
- 2026-10-28: Phase 1 built:
  - Accounts: sign up (candidate / employer + company), email verification, login, password reset, sign-out; roles checked on the server; admins must use two-step sign-in (authenticator app)
  - Candidate: 4-step onboarding, Home (completion, real stats, per-video views), Video Studio (2 videos in different languages, primary, replace keeps old one live until approved, 30-day private archive, consent before upload, resumable uploads to Cloudflare), Profile preview, Edit profile, Share (share link off by default, regenerate, visibility Everyone / Employers only, publish, pause), Requests (accept with choice of what to share, decline, block, report)
  - Employer: public reels feed (visitors watch; acting needs an account), filters (industry, video language) that close after choosing, language switch on cards, view counting rules, Save, Profile sheet, full profile page, Request intro with optional CV & contact request, Search, Saved, Inbox, Account with plan usage; desktop three-column layout
  - Plans: Freemium + Premium in the database; Super Admin edits names, price labels and limits; limits enforced safely on the server
  - Admin: overview (real numbers only), video review with reasons the candidate reads in their own language, companies (verify, suspend, change plan), plans, reports; audit log
  - Arabic for the entire app (right-to-left), with a language switch on every screen
  - PWA: manifest, all icon sizes + maskable, service worker with offline page, install banner (Android button / iPhone+iPad steps, from 2nd page view, 30-day snooze, never on forms)
  - Safeguards: rate limits (login, sign-up, feed, search, profiles, requests, views, reports), noindex on private pages, security headers, signed short-lived video links
- Tests: **43 rule + database tests pass**, **10 browser tests pass** (sign-up → email link → onboarding → share link → employer request → candidate accepts → employer sees only shared email; permissions; admin 2FA + plans; Arabic RTL; PWA; install banner)

## Not yet verified (needs your accounts)
- Real video upload and playback through Cloudflare Stream
- Real email sending through the Hostinger mailbox
- Real iPhone and Android testing

## Decisions made
- Hosting: Hostinger Cloud Startup (Node.js; separate site from the existing project) · Database: Neon PostgreSQL · Email: Hostinger SMTP · Domain: GoDaddy
- Feed is public (like TikTok); interacting requires an employer account. Freemium + Premium plans, limits set by Super Admin (intro requests, CV/contact requests)
- Candidates choose visibility: Everyone (default) or Signed-in employers only
- Employers can send requests right after sign-up + email verification (admin can verify/suspend)
- Whole app in English (default) and Arabic
- "Full CV" in Phase 1 = typed work history + education; PDF upload in Phase 2

## Next
- ~~GitHub~~ done
- You: follow `docs/SETUP.md` Parts 2–5 (domain, Neon, mailbox, Cloudflare)
- Me: help with Hostinger deployment, first-time setup (tables, plans, your admin account, Cloudflare webhook)
- You: test on real phones and approve Phase 1 → then Phase 2

## Accounts you've created
- GitHub: code saved at https://github.com/ahmadharb961/hireel (private)
