# Putting Hireel online: step-by-step

This guide is written for non-developers. Do the parts in order. Each part says what it's for, roughly how long it takes, and what it costs.

When a step says **"send me"**, paste the value into our chat, *except* passwords, API tokens and secrets. Those go **only** into Hostinger's environment-variable screen (Part 6), never into chat, email or code.

---

## Part 1: GitHub (where the code is saved): 5 minutes, free

You already have an account.

1. Go to **github.com** and log in.
2. Click the **+** at the top right → **New repository**.
3. Repository name: `hireel`.
4. Choose **Private**.
5. Don't tick any of the "Add a README / .gitignore / license" boxes.
6. Click **Create repository**.
7. **Send me** your GitHub username. I'll connect this workspace and upload the code.

---

## Part 2: The domain (GoDaddy): 10 minutes + waiting time

1. Buy your domain at **godaddy.com** (for example `hireel.com` or `hireel.app`).
2. Log in to **hPanel** (hpanel.hostinger.com) → **Websites** → **Add website**. Add your new domain to your Cloud Startup plan. Hostinger will show you **two nameservers**. They usually look like `ns1.dns-parking.com` and `ns2.dns-parking.com`. Use exactly what hPanel shows you.
3. In GoDaddy: **My Products** → your domain → **DNS** → **Nameservers** → **Change** → **I'll use my own nameservers**. Paste Hostinger's two nameservers and click **Save**.
4. Wait. It can take from 30 minutes up to 24 hours. hPanel will show the domain as connected when it's ready.
5. In hPanel, turn on the free **SSL** for the domain (**Security → SSL**). The padlock (HTTPS) is required for the installable app.

---

## Part 3: The database (Neon): 5 minutes, free to start

1. Go to **neon.tech** → **Sign up** (you can use your GitHub account).
2. Create a project. Name: `hireel`. Region: pick **Europe (Frankfurt)**, the closest to Lebanon and the Gulf.
3. On the project page, click **Connect**. Copy the **connection string** (it starts with `postgresql://`).
4. Keep it for Part 6. It contains a password, so **don't send it to me in chat**.

---

## Part 4: Email (Hostinger mailbox): 5 minutes, included in your plan

1. hPanel → **Emails** → choose your domain → **Create email account**.
2. Address: `no-reply@yourdomain.com`. Choose a strong password and save it somewhere safe.
3. You'll use these settings in Part 6:
   - SMTP host: `smtp.hostinger.com`
   - Port: `465`
   - User: `no-reply@yourdomain.com`
   - Password: the one you just chose

---

## Part 5: Video (Cloudflare Stream): 15 minutes, about $5/month to start

1. Go to **dash.cloudflare.com** → sign up and verify your email.
2. In the left menu, open **Stream** → **Subscribe** (the starter plan; it needs a payment card).
3. **Account ID:** on the Cloudflare home page, on the right side under **Account ID**, click **copy**.
4. **API token:** top right profile icon → **My Profile** → **API Tokens** → **Create Token** → **Create Custom Token**.
   - Name: `Hireel Stream`
   - Permissions: **Account** → **Stream** → **Edit**
   - Click **Continue** → **Create Token**. Copy the token; Cloudflare shows it only once.
5. **Customer code:** in **Stream**, upload any short test video. Open it, then look at its link under **Embed**. It contains `customer-XXXXXXXX.cloudflarestream.com`. The `XXXXXXXX` part is your customer code.
6. Keep the Account ID, token and customer code for Part 6. I'll run the last Cloudflare step (signing key + webhook) for you once the site is online.

---

## Part 6: Put the app on Hostinger: 20 minutes

Hostinger names its buttons slightly differently from time to time. If something doesn't match, send me a screenshot.

1. hPanel → **Websites** → your domain → look for **Node.js** (or **Add website → Node.js Apps**).
2. Choose **Import Git repository** and connect your GitHub account. Pick the `hireel` repository and the `main` branch.
3. Settings:
   - Framework: **Next.js** (or "Other")
   - Node version: **22**
   - Install command: `npm install`
   - Build command: `npm run build`
   - Start command: `npm start`
4. **Environment variables:** add each line from the `.env.example` file in the project, with your real values:
   - `DATABASE_URL`: the Neon string from Part 3
   - `APP_URL` and `BETTER_AUTH_URL`: `https://yourdomain.com`
   - `BETTER_AUTH_SECRET`: a long random password (40+ characters). A password manager can make one.
   - `SMTP_…` and `MAIL_FROM`: from Part 4
   - `CLOUDFLARE_…`: from Part 5 (leave the three "signing/webhook" ones empty for now)
   - `CRON_SECRET`: another long random password
5. Click **Deploy**. When it's done, tell me and I'll do the first-time setup together with you:
   - create the database tables and the Freemium/Premium plans
   - create your Super Admin account
   - run the Cloudflare signing key + webhook step

---

## Part 7: Daily cleanup job: 3 minutes

This deletes replaced videos after 30 days and clears old counters.

1. hPanel → **Advanced** → **Cron Jobs** → **Create**.
2. Run it once a day (for example at 03:17).
3. Command (replace the two values):

```bash
curl -fsS -H "Authorization: Bearer YOUR_CRON_SECRET" https://yourdomain.com/api/cron/cleanup
```

---

## Part 8: Test on real phones

When the site is online:

1. **iPhone (Safari):** open the site, then open a second page. An **Install Hireel** banner appears. Tap **Install** and follow the steps (Share → Add to Home Screen). Open Hireel from the home screen icon.
2. **Android (Chrome):** open the site, then a second page. Tap **Install** on the banner. Chrome asks to confirm.
3. On both, sign up as a candidate and record a real video with the camera. Then sign in as the admin and approve it. Then watch it in the feed as an employer.
4. Tell me anything that looks or feels wrong, with a screenshot if possible.

---

## Costs at a glance

| Service | What for | Cost |
|---|---|---|
| Hostinger Cloud Startup | Runs the app + email | Already paid |
| GoDaddy domain | Your web address | ~$10–40 / year |
| Neon | Database | Free to start; ~$19/month when you grow |
| Cloudflare Stream | Video storage & streaming | ~$5/month minimum; ~$5 per 1,000 minutes stored + $1 per 1,000 minutes watched |
| GitHub | Saves the code | Free |
