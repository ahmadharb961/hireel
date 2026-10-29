<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Testing rule from the owner (always, without being asked)

Every change must be checked on phone, tablet (portrait and landscape) and desktop, in every browser available: Chrome, Edge, Safari and Firefox. Chrome and Edge share the Chromium engine. Safari (WebKit) and Firefox need Playwright's browser downloads (`cdn.playwright.dev`); if the network blocks them, say so plainly and never claim they were tested. Look at screenshots for each size, not just pass/fail checks.
