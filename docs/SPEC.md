Below is a complete, developer-ready master prompt for VYBE, designed to generate a full-stack, mobile-first video recruitment marketplace with three separate dashboards, a Reels-style candidate discovery experience, and a scalable video infrastructure.

VYBE — Full-Stack Video Talent Marketplace

Master Product, UI/UX, Frontend & Backend Development Prompt

1. Project Overview

Build VYBE, a premium, mobile-first, video-based talent discovery marketplace connecting job seekers with employers.

Core concept: Job seekers create professional profiles and upload short introduction videos presenting their experience, skills, achievements, and career aspirations. Employers discover candidates through an immersive, fast, vertical video feed similar to Instagram Reels or TikTok, but designed specifically for professional recruitment.

VYBE is NOT a traditional job board.

The primary experience is employer-led talent discovery, where companies find candidates rather than candidates applying to vacancies.

The application must be a fully functional, production-oriented web platform, not a static prototype, mockup, or collection of disconnected UI screens.

Build the frontend, backend, database, authentication, role-based dashboards, video infrastructure, notifications, administration tools, and subscription architecture.

Initial market: Lebanon.

Future markets: UAE, Saudi Arabia, Qatar, Kuwait, and other GCC countries.

Languages: English initially, with architecture ready for Arabic and RTL support.

Platform: Responsive web application and installable Progressive Web App (PWA).

⸻

2. Brand Identity and Design Direction

Brand name: VYBE

Brand personality:

* Modern, premium, innovative, and trustworthy.
* Professional enough for corporate recruiters.
* Fresh and engaging enough for younger job seekers.
* Inspired by the ease of TikTok and Instagram Reels, combined with the credibility of LinkedIn.
* Avoid traditional, outdated HR software aesthetics.

Color Palette

* Primary dark green: #195C48
* Secondary green: #235443
* Soft mint: #B3E2CD
* Cream background: #FAF9F6
* White: #FFFFFF
* Primary text: #182722
* Secondary text: #69766F
* Borders: #E4EAE5

Use dark green for primary actions and navigation, cream and white for backgrounds, and mint as a subtle accent.

Typography: Inter or Plus Jakarta Sans.

Design requirements:

* Mobile-first layouts, designed initially for 375–430px screens.
* Desktop layouts should be spacious and optimized for recruiter productivity.
* Rounded cards, clean typography, restrained shadows, subtle transitions.
* Professional candidate photography and portrait video thumbnails.
* Excellent contrast, accessibility, and visual hierarchy.
* Sticky navigation and intuitive bottom navigation on mobile.
* Avoid excessive gradients, decorative illustrations, or crowded dashboards.
* Provide polished loading, empty, error, and success states.

The result should feel like a globally competitive technology startup, not a generic recruitment template.

⸻

3. User Roles and Permissions

Implement three primary roles:

1. Candidate
2. Employer
3. Super Admin

Each role must have its own dashboard, navigation, capabilities, and server-enforced permissions.

Use secure role-based access control (RBAC). Users must never access another role’s private data or protected endpoints by manipulating URLs or API requests.

⸻

4. Public Website

Create the following public-facing pages.

Homepage

Hero headline:

Your Experience Deserves to Be Seen.

Supporting text:

“Show who you are beyond your CV. Discover opportunities through video, or find exceptional talent in seconds.”

Primary buttons:

* Create Your Video Profile
* Discover Talent

Homepage sections:

1. Hero section with realistic vertical candidate video previews.
2. How VYBE Works — For Candidates.
3. How VYBE Works — For Employers.
4. Featured Candidates.
5. Industries and Career Categories.
6. Why Video Makes a Difference.
7. Employer Pricing.
8. Frequently Asked Questions.
9. Final registration CTA.
10. Footer with privacy, terms, support, and company information.

The hero should communicate the video-first concept immediately.

Other Public Pages

* About VYBE
* How It Works
* For Candidates
* For Employers
* Pricing
* Contact Us
* FAQ
* Privacy Policy
* Terms and Conditions
* Cookie Policy
* Login
* Registration
* Forgot Password
* Reset Password
* Email Verification

Do not expose private candidate contact details publicly.

⸻

5. Candidate Dashboard

Candidates must have a dedicated, mobile-first dashboard where they can manage their professional identity and employer interactions.

5.1 Candidate Registration

Required information:

* First name
* Last name
* Email address
* Password
* Country
* Agreement to Terms and Privacy Policy

Support email verification, secure password reset, and optional Google authentication.

After registration, launch an onboarding wizard.

5.2 Candidate Onboarding

Step 1 — Personal Information:

* Full name
* Profile photo
* Professional headline
* Location
* Nationality (optional, private, and only where legally appropriate)
* Phone number (private)
* LinkedIn URL (optional)

Step 2 — Professional Experience:

* Current or most recent position
* Industry
* Total years of experience
* Skills
* Previous positions
* Education
* Certifications
* Languages
* Professional achievements
* Optional CV upload (PDF)

Step 3 — Career Preferences:

* Desired job titles
* Preferred industries
* Preferred countries
* Remote, hybrid, or on-site preference
* Full-time, part-time, contract, or freelance
* Expected salary (optional, private)
* Notice period
* Employment availability

Step 4 — Video Introduction.

Step 5 — Profile Review and Publication.

Display a progress indicator and save incomplete onboarding automatically.

5.3 Video Introduction Studio

This is one of the most important parts of VYBE.

Allow candidates to:

* Record videos directly using their phone camera.
* Upload videos from their gallery or desktop.
* Preview videos before publishing.
* Trim the beginning and end.
* Choose a cover frame.
* Re-record or replace videos.
* Add captions or subtitles.
* Save videos as drafts.
* Publish or unpublish videos.

Video specifications:

* Preferred aspect ratio: 9:16.
* Recommended length: 30–90 seconds.
* Maximum duration: 120 seconds.
* Supported inputs: MP4, MOV, WebM, and common mobile formats.
* Recommended upload limit: 250 MB, configurable.
* Convert uploaded videos into standardized streaming formats.

Provide a guided recording experience.

Show three questions:

1. Who are you, and what do you specialize in?
2. What professional experience and achievements make you stand out?
3. What type of opportunity are you looking for?

Display a timer, recording tips, and a progress indicator.

Do not require candidates to use artificial backgrounds, beauty filters, or appearance-enhancing effects.

5.4 Candidate Dashboard Overview

Display:

* Profile completion percentage.
* Video processing or publication status.
* Profile visibility status.
* Number of profile views.
* Number of employer saves.
* Number of contact requests.
* Pending contact requests.
* Recent activity.
* Suggested profile improvements.

Use real database-driven statistics, not hardcoded demo numbers.

5.5 My Profile

Candidates can edit their professional information and preview their employer-facing profile.

Profile sections:

* Video introduction.
* Professional headline.
* About me.
* Skills.
* Work experience.
* Education.
* Certifications.
* Languages.
* Career preferences.
* Availability.

5.6 Employer Requests

Create a dedicated inbox for employer contact requests.

Each request should show:

* Company name and verification status.
* Employer representative.
* Company description.
* Position or opportunity being discussed.
* Message.
* Date.
* Status.

Candidate actions:

* Accept request.
* Decline request.
* Block employer.
* Report suspicious activity.

An employer must not receive private contact details before the candidate grants permission.

5.7 Privacy and Visibility

Candidates must be able to:

* Make their profile visible or hidden.
* Pause their job search.
* Hide their profile from specific employers.
* Control who can access their CV.
* Control contact information sharing.
* Delete or replace videos.
* Export their personal data.
* Request permanent account deletion.

Support a private profile preview without making the profile searchable.

5.8 Candidate Notifications

Notify candidates when:

* An employer requests contact.
* An employer sends a message.
* A video finishes processing.
* A video is rejected.
* A profile is approved.
* An account security event occurs.

Support in-app and email notifications with user-configurable preferences.

⸻

6. Employer Dashboard

The employer dashboard is the commercial core of VYBE.

Its main objective is to help recruiters discover, evaluate, shortlist, and contact relevant candidates efficiently.

6.1 Employer Registration

Collect:

* Company name
* Business email
* Password
* Country
* Industry
* Company website
* Company size
* Contact person
* Contact person’s position

Require email verification.

Implement company verification with administrative review.

An unverified company must have restricted access to private candidate information and contact requests.

6.2 Employer Dashboard Overview

Display:

* Total candidate profiles viewed.
* Saved candidates.
* Contact requests sent.
* Accepted contact requests.
* Remaining monthly contact credits.
* Subscription status.
* Recent activity.

Provide quick links to Discover Talent, Saved Candidates, and Contact Requests.

6.3 Discover Talent — Reels-Style Feed

This is the signature feature of VYBE.

Create a vertical video discovery experience inspired by Instagram Reels, optimized for professional hiring.

Mobile Experience

* Full-height portrait video cards.
* One active video at a time.
* Swipe upward to view the next candidate.
* Swipe downward to view the previous candidate.
* Smooth transitions.
* Video automatically plays muted when active.
* Tap to mute or unmute.
* Pause or resume playback.
* Visible playback progress.
* Candidate information overlay.
* Clear actions without obscuring the candidate’s face.

Each card should show:

* Candidate’s professional name.
* Job title.
* Years of experience.
* Location.
* Key skills.
* Availability.
* Save Candidate button.
* View Full Profile button.
* Request Introduction button.

Do not include social-media likes, public comments, follower counts, or popularity rankings.

Desktop Experience

Create a split-screen recruiter interface.

Left:

* Search and filters.
* Candidate results.
* Saved search options.

Center:

* Large 9:16 video player.
* Next and previous candidate controls.

Right:

* Candidate professional summary.
* Skills and experience.
* Save and shortlist.
* Request introduction.

Support keyboard navigation and accessible playback controls.

6.4 Candidate Search and Filters

Search by:

* Job title
* Keywords
* Skills
* Industry
* Country
* City
* Years of experience
* Education
* Languages
* Employment type
* Work arrangement
* Availability
* Salary expectations, only when shared for recruitment purposes
* Verified profile status

Support multiple filters simultaneously.

Add:

* Clear filters.
* Save search.
* Recently viewed candidates.
* Search result count.
* Sort by relevance or recently updated.

Avoid sensitive or discriminatory filtering such as ethnicity, religion, appearance, or inferred personal characteristics.

6.5 Candidate Profile

Display:

* Introduction video.
* Professional headline.
* Location.
* Experience.
* Skills.
* Employment history.
* Education.
* Languages.
* Certifications.
* Career preferences.
* Availability.
* Candidate-approved downloadable CV.

Actions:

* Save Candidate.
* Add to Shortlist.
* Request Introduction.
* Report Profile.

6.6 Shortlists

Employers can create named shortlists such as:

* Marketing Managers
* Sales Executives
* Finance Candidates
* Senior Developers

Features:

* Create shortlist.
* Add or remove candidates.
* Add private recruiter notes.
* Track contact request status.
* Archive shortlist.
* Search within saved candidates.

6.7 Contact Request Workflow

Employer clicks Request Introduction.

A form opens with:

* Opportunity title.
* Company name.
* Work location.
* Employment type.
* Short personalized message.
* Optional compensation range.

Request is submitted to the candidate.

Candidate accepts or declines.

On acceptance:

* Employer receives a notification.
* A secure conversation becomes available.
* Contact details are shared only if the candidate explicitly approves.

Prevent repeated unsolicited requests, scraping, and spam.

6.8 Employer Messaging

Implement a secure messaging system.

Features:

* One-to-one conversations after accepted requests.
* Read/unread status.
* Message timestamps.
* In-app notifications.
* Email notifications.
* Block and report.
* Message history.

Real-time updates should use WebSockets or a managed real-time service, with a reliable fallback.

6.9 Employer Team Management

Support company accounts with multiple authorized team members.

Roles:

* Company Owner
* Recruiter
* Viewer

Company Owners can:

* Invite team members.
* Remove members.
* Assign permissions.
* Manage billing.

All access must be restricted to the correct company organization.

6.10 Employer Billing

Implement a configurable subscription architecture.

Suggested launch plans:

Free

* Limited candidate previews.
* Basic search.
* Limited saved profiles.

Starter — $49/month

* 30 candidate profile unlocks.
* Advanced filters.
* Shortlists.
* Contact requests.

Business — $149/month

* 150 candidate profile unlocks.
* Multiple recruiters.
* Advanced discovery.
* Saved searches.
* Priority support.

Enterprise

* Custom limits.
* Additional team permissions.
* Custom billing.
* Advanced administration.

The Super Admin must be able to change plan names, prices, limits, and features without editing code.

Implement server-side subscription entitlement checks and atomic usage accounting.

Do not treat opening a video as equivalent to unlocking private contact information.

Integrate a supported payment provider using hosted checkout and verified webhooks. If payment credentials are unavailable, implement a clearly marked sandbox mode without pretending payments are live.

⸻

7. Super Admin Dashboard

Build a comprehensive, secure Super Admin dashboard for operating the entire VYBE platform.

The dashboard must be accessible only to authorized administrators.

7.1 Main Admin Overview

Show real-time or recently refreshed platform metrics:

* Total registered candidates.
* Published candidate profiles.
* Total registered employers.
* Verified employers.
* Pending employer approvals.
* Total uploaded videos.
* Videos awaiting moderation.
* Total contact requests.
* Accepted contact requests.
* Active subscriptions.
* Monthly recurring revenue.
* Subscription cancellations.
* Storage usage.
* Video streaming usage.
* User growth.

Include interactive charts and selectable date ranges.

7.2 Candidate Management

Admin capabilities:

* Search all candidates.
* View candidate profiles.
* Review video status.
* Approve or reject reported content.
* Suspend accounts.
* Reactivate accounts.
* Handle deletion requests.
* Review abuse reports.
* View account creation and last activity dates.

Never expose private candidate information to unnecessary admin roles.

7.3 Employer Management

Admin capabilities:

* View registered companies.
* Review verification submissions.
* Approve or reject verification.
* Suspend employers.
* Manage employer subscription status.
* Review reported companies.
* Review suspicious contact activity.
* View company team members.

7.4 Video Moderation

Create a moderation queue.

Video statuses:

* Draft
* Uploading
* Processing
* Pending Review
* Published
* Rejected
* Failed
* Removed

Admin actions:

* Preview video.
* Approve publication.
* Reject with reason.
* Remove prohibited content.
* Review reports.
* Restore content when appropriate.

Candidates must receive an explanation when their video is rejected.

Support configurable automated moderation assistance, but retain human review for consequential decisions.

7.5 Subscription and Revenue Management

Super Admin can:

* Create pricing plans.
* Edit prices.
* Set usage limits.
* Enable or disable features.
* Review subscriptions.
* View successful and failed payments.
* Review refunds.
* Apply promotional codes.
* Grant authorized promotional credits.
* View revenue reports.

Financial records must be auditable.

7.6 Content Management System

Allow Super Admin to edit:

* Homepage headline.
* Homepage descriptions.
* Featured sections.
* FAQs.
* About page.
* Pricing descriptions.
* Footer.
* SEO metadata.
* Terms and Privacy Policy.

Provide draft and publish workflows for important content.

7.7 Categories and Taxonomy

Manage:

* Industries.
* Job titles.
* Skills.
* Countries.
* Cities.
* Education levels.
* Experience ranges.
* Employment types.

Avoid duplicate categories through normalized records and validation.

7.8 Notifications and Email Templates

Admin can manage:

* Welcome emails.
* Email verification.
* Employer verification.
* Contact request notifications.
* Request acceptance.
* Video approval or rejection.
* Subscription reminders.
* Payment failure notifications.

Use editable templates with secure variable substitution.

7.9 Reports and Analytics

Reports should include:

* Candidate acquisition.
* Employer acquisition.
* Active users.
* Profile completion rates.
* Video publication rates.
* Video engagement.
* Search activity.
* Contact request conversion.
* Subscription revenue.
* Churn.
* Storage and streaming costs.

Allow CSV export for authorized administrators.

7.10 Admin Security and Audit Logs

Include:

* Mandatory administrator MFA.
* Secure administrator sessions.
* Role-based administrative permissions.
* Audit logs for sensitive actions.
* Suspicious login monitoring.
* Account suspension controls.
* Secure configuration management.

Do not allow the frontend to grant itself administrator privileges.

⸻

8. Video Infrastructure — Critical Requirement

VYBE must have a genuinely fast, mobile-optimized video system.

Do NOT simply store large MP4 files and load them directly into every feed card.

Build an asynchronous video processing and adaptive streaming architecture.

Upload Pipeline

1. Candidate requests a secure upload session.
2. Backend authenticates and authorizes the candidate.
3. Backend generates a short-lived signed upload URL.
4. Browser uploads video directly to private object storage or a managed video provider.
5. Upload completion is verified.
6. A processing job is created.
7. Video is validated and transcoded.
8. Multiple streaming renditions are generated.
9. A poster thumbnail is generated.
10. Video passes moderation checks.
11. Video is published only after successful processing and approval.

Support resumable uploads and mobile network interruptions.

Video Processing

Preferred output:

* HLS adaptive streaming.
* H.264/AAC compatibility baseline.
* Multiple renditions such as 360p, 540p, and 720p.
* Optional higher resolution where justified.
* Portrait 9:16 output where appropriate.
* Thumbnail/poster generation.
* Audio normalization.
* Caption track support.

Do not distort landscape uploads; use an appropriate contain/crop strategy.

Video Delivery

Use a CDN-backed video delivery provider.

Acceptable architectures:

* Cloudflare Stream.
* Mux.
* Or object storage + FFmpeg processing workers + HLS + CDN.

Choose one primary architecture and implement it consistently.

Reels Feed Performance

Requirements:

* Load only the active video and a limited number of adjacent items.
* Preload the next video’s metadata, poster, and a small playable buffer.
* Avoid downloading every video in the feed.
* Pause inactive videos immediately.
* Release unnecessary player resources.
* Use Intersection Observer to detect active feed items.
* Use a bounded player pool.
* Support touch gestures.
* Respect browser autoplay restrictions.
* Respect reduced-motion and data-saver preferences.
* Show skeleton loading states.
* Provide retry controls for playback errors.
* Use cursor-based pagination.
* Support smooth transitions on mobile Safari and Chrome.

Optimize for mid-range smartphones and inconsistent mobile internet.

Video Security

* Secure direct uploads.
* Validate MIME type and actual file signatures.
* Enforce duration and size limits.
* Scan uploaded content where supported.
* Store originals privately.
* Use signed playback access for protected videos.
* Restrict unauthorized downloads where technically possible.
* Implement rate limits and anti-abuse controls.
* Automatically clean abandoned uploads.

Do not claim that browser video playback can be made impossible to record or download.

Performance Targets

Set measurable initial targets:

* Lighthouse mobile performance score of 90+ on key non-video pages under defined test conditions.
* Responsive interaction during feed scrolling.
* Fast first-frame playback on typical 4G connections.
* Minimal layout shifts.
* No excessive background video downloads.
* Graceful degradation on slow connections.

Measure real playback start time, buffering ratio, and error rates after launch.

⸻

9. AI Features

Implement AI features as optional, independently configurable modules.

AI Transcription

Generate a transcript from candidate videos, subject to candidate consent.

Allow candidates to review and correct transcripts.

AI Professional Summary

Generate an editable summary from:

* Candidate-submitted professional information.
* Approved video transcript.

Never invent experience, qualifications, certifications, or achievements.

AI Skills Extraction

Suggest skills from candidate-provided information.

Candidates must confirm skills before publication.

Semantic Search

Allow employers to search using natural-language queries such as:

“Find an experienced digital marketing manager in Beirut with Meta Ads and team leadership experience.”

Search must prioritize job-relevant qualifications.

Do not infer protected characteristics, personality, honesty, emotional stability, or professional competence from facial expressions, voice, accent, or appearance.

Do not automatically reject candidates using AI.

⸻

10. Recommended Technology Stack

Use a modern, scalable TypeScript-based architecture.

Frontend

* Next.js with App Router.
* React.
* TypeScript.
* Tailwind CSS.
* shadcn/ui.
* TanStack Query where beneficial.
* React Hook Form.
* Zod validation.
* Accessible video player with HLS support.
* PWA support.

Backend

* Node.js and TypeScript.
* NestJS or a well-structured Next.js backend with clear service boundaries.
* REST API documented with OpenAPI.
* Background processing workers.
* Redis for queues, caching, and rate limiting.
* BullMQ for asynchronous tasks.

Database

* PostgreSQL.
* Prisma ORM.
* Proper indexes.
* Database migrations.
* Transactional operations for billing and contact credits.

Authentication

* Secure session-based authentication or a reputable managed authentication provider.
* Role-based permissions.
* Email verification.
* Password reset.
* MFA for administrators.
* Secure HTTP-only cookies.

Video

* Cloudflare Stream or Mux.
* Signed direct uploads.
* Adaptive playback.
* CDN distribution.
* Processing webhooks.

Payments

* A payment provider supported by the registered business’s jurisdiction.
* Hosted checkout.
* Secure billing portal.
* Verified webhooks.
* Idempotent payment event processing.

Email

* Resend, Postmark, or equivalent transactional email service.

Hosting

* Vercel for frontend where appropriate.
* Managed backend infrastructure.
* Managed PostgreSQL.
* Redis service.
* Managed video delivery.

Use environment variables and secret management for all credentials.

⸻

11. Database Architecture

Design normalized database tables for:

* Users
* User Sessions
* Roles
* Permissions
* Candidate Profiles
* Candidate Experience
* Candidate Education
* Candidate Skills
* Candidate Preferences
* Candidate Videos
* Video Processing Jobs
* Video Captions
* Employer Organizations
* Employer Team Members
* Employer Verification
* Candidate Views
* Saved Candidates
* Shortlists
* Shortlist Members
* Contact Requests
* Conversations
* Messages
* Notifications
* Notification Preferences
* Subscription Plans
* Subscriptions
* Payments
* Usage Credits
* Billing Events
* Reports
* Moderation Actions
* Audit Logs
* CMS Pages
* Platform Settings

Include proper foreign keys, unique constraints, indexes, timestamps, and soft deletion where appropriate.

Design deletion and retention policies for video files, personal information, messages, and audit records.

⸻

12. Essential API Endpoints

Build secure APIs for:

Authentication

* Register.
* Login.
* Logout.
* Verify email.
* Reset password.
* Refresh or validate session.

Candidates

* Create and update profile.
* Retrieve own dashboard.
* Upload video.
* Check processing status.
* Publish or unpublish profile.
* Update privacy preferences.
* Manage contact requests.

Employers

* Register organization.
* Manage team.
* Search candidates.
* Retrieve candidate feed.
* Save candidates.
* Create shortlists.
* Send contact requests.
* Manage conversations.
* Retrieve billing and usage.

Super Admin

* Retrieve platform statistics.
* Manage candidates.
* Manage employers.
* Moderate videos.
* Manage subscriptions.
* Manage pricing.
* Manage CMS content.
* Review reports.
* Review audit logs.

Enforce authorization on every protected endpoint.

⸻

13. Mobile-First Navigation

Candidate Mobile Navigation

* Home
* My Video
* Requests
* Profile
* Settings

Employer Mobile Navigation

* Discover
* Search
* Saved
* Inbox
* Account

Super Admin Mobile Navigation

Use a responsive dashboard with a collapsible menu, accessible navigation, and mobile-friendly data tables.

On desktop, use a persistent sidebar for dashboards and a spacious content area.

Respect mobile safe areas and ensure controls remain accessible above browser navigation bars.

⸻

14. Notifications and Communication

Use an event-driven notification architecture.

Support:

* In-app notifications.
* Email notifications.
* Read/unread states.
* Notification preferences.
* Delivery status.
* Retries for transient failures.

Do not expose private contact information through notification previews.

⸻

15. Privacy, Compliance, and Trust

Because VYBE handles professional identity, employment history, videos, and personal information, implement privacy and security from the beginning.

Requirements:

* Explicit privacy disclosures.
* Clear candidate consent for video publication.
* Candidate-controlled visibility.
* Private-by-default contact details.
* Employer verification.
* Secure data storage.
* Encryption in transit.
* Appropriate encryption at rest.
* Data export and deletion workflows.
* Abuse reporting.
* Anti-scraping protections.
* Rate limiting.
* Secure file uploads.
* Privacy-preserving analytics.
* Cookie consent where required.
* Applicable Lebanese data protection requirements and future GCC market requirements.

Use accessibility standards aligned with WCAG 2.2 AA.

Avoid discrimination in recruitment workflows and provide a text-based alternative for candidates who cannot or prefer not to record video.

⸻

16. SEO and Growth

Public pages should support:

* SEO-friendly metadata.
* Open Graph previews.
* Structured data where appropriate.
* Sitemap.
* Robots.txt.
* Canonical URLs.
* Fast page loading.

Candidate profiles should be indexed by search engines only when candidates explicitly opt into public indexing.

Support referral links and track registrations through privacy-conscious attribution.

⸻

17. Testing and Quality Assurance

Provide automated tests for critical workflows.

Candidate Tests

* Registration.
* Email verification.
* Login.
* Profile creation.
* Video upload.
* Video processing state changes.
* Profile publishing.
* Privacy settings.
* Contact request acceptance.
* Account deletion.

Employer Tests

* Registration.
* Company verification.
* Candidate discovery.
* Filtering.
* Shortlisting.
* Contact requests.
* Messaging.
* Subscription limits.
* Team permissions.

Admin Tests

* Authentication and MFA.
* Employer approval.
* Video moderation.
* Account suspension.
* Pricing changes.
* Permission enforcement.
* Audit logging.

Security Tests

* Unauthorized API access.
* Cross-tenant data access.
* Upload validation.
* Rate limiting.
* Session security.
* Webhook signature verification.
* Payment replay protection.
* Subscription entitlement bypass attempts.

Video Tests

* iOS Safari.
* Android Chrome.
* Desktop browsers.
* Slow 4G.
* Interrupted uploads.
* Failed transcodes.
* Muted autoplay.
* Video preloading.
* Feed memory usage.

⸻

18. Implementation Requirements

Do not generate a design-only prototype.

Build the actual application with connected frontend and backend functionality.

Follow these rules:

1. Create the complete project structure.
2. Implement database schema and migrations.
3. Implement secure authentication and RBAC.
4. Build the three dashboards.
5. Implement real candidate profiles and search.
6. Implement the complete video upload and playback workflow.
7. Implement employer shortlists and contact requests.
8. Implement candidate-controlled contact approval.
9. Implement messaging and notifications.
10. Implement super admin management.
11. Implement configurable subscription plans.
12. Implement payment integration only when valid credentials and a supported provider are available.
13. Provide meaningful validation and error handling.
14. Never use fake statistics in production dashboards.
15. Never simulate successful uploads, messages, or payments.
16. Keep development demo data clearly separated from production data.
17. Provide environment configuration examples without exposing secrets.
18. Include a README with setup, deployment, and troubleshooting instructions.
19. Provide database seed scripts for local development.
20. Test critical workflows before declaring them complete.

Use modular, maintainable code with clear naming conventions and reusable components.

⸻

19. Deliverables

Deliver:

* Complete frontend source code.
* Complete backend source code.
* PostgreSQL database schema.
* Database migration files.
* Candidate dashboard.
* Employer dashboard.
* Super Admin dashboard.
* Reels-style candidate discovery feed.
* Video upload and streaming integration.
* Authentication and authorization.
* Contact request and messaging systems.
* Notification system.
* Subscription and billing architecture.
* Responsive public website.
* PWA configuration.
* API documentation.
* Test suite.
* Environment variable template.
* Deployment instructions.
* Admin setup instructions.

Where external services require accounts, API keys, payment onboarding, or domain verification, clearly identify those prerequisites.

Do not claim an integration is live until it has been configured and successfully tested.

⸻

20. Final Product Vision

VYBE should feel like a combination of:

* TikTok: Effortless vertical video discovery.
* LinkedIn: Professional credibility and structured career information.
* Modern SaaS: Efficient dashboards, search, and employer workflows.

However, VYBE must have its own original visual identity and interface.

The primary differentiator is simple:

Candidates show their professional story. Employers discover talent through video.

The platform must prioritize candidate privacy, job-relevant evaluation, fast mobile performance, and frictionless employer discovery.

Build VYBE as a premium, scalable, video-first recruitment marketplace, starting in Lebanon and architected for future GCC expansion.

Final instruction: Start by defining the architecture, database, routes, and design system. Then implement the application in working modules, validating each module before moving to the next. Do not stop at wireframes, screenshots, or static pages. Deliver a runnable full-stack application with clearly documented production dependencies.

My recommendations before building

Three product decisions will make the biggest difference:

1. Make video discovery the homepage for employers

After login, employers should land directly in the candidate video feed, not a traditional analytics dashboard. Search and filters should always be accessible.

2. Keep candidate onboarding extremely simple

Ask for essential professional information first. Let candidates complete their experience and education later. Long registration forms will discourage uploads.

3. Use managed video streaming from day one

I would start with Cloudflare Stream rather than building your own transcoding servers. It provides video processing and adaptive delivery, allowing you to concentrate on recruitment functionality.

One strategic consideration: do not monetize candidates at launch. You need a strong supply of high-quality candidate profiles before employers will see enough value to pay. The first commercial milestone should be getting employers to return regularly to discover talent.