# The Leverage Signal — Setup Guide

End-to-end install. Follow in order. Total time: 25-40 minutes (first time).

---

## 0. Prerequisites

- Node.js 20+ (`node --version`)
- npm (`npm --version`)
- Git Bash or PowerShell

---

## 1. Install dependencies

```bash
cd C:/Users/yurik/Downloads/leverage-signal-engine
npm install
```

---

## 2. Get API keys

### a) Anthropic
Already set up. Copy `ANTHROPIC_API_KEY` from your existing `.env_1`.

### b) Notion
1. Open https://www.notion.so/profile/integrations
2. Click "New integration". Name it "Leverage Signal Engine". Workspace: hrtalentsys.
3. Capabilities: Read content. Submit.
4. Copy the "Internal Integration Token" (starts with `secret_`).
5. Go to your Research Catalog page in Notion.
6. Click `...` (top right) → "Connections" → add "Leverage Signal Engine".

The page ID is already in `env.example.txt`:
`3643bb412ed481478d6ef71dea3f0f1d`

### c) Beehiiv — create the publication first
1. Log in to Beehiiv: https://app.beehiiv.com
2. Top-left publication dropdown → "Create new publication".
3. Name: **The Leverage Signal**
4. Subtitle: *Daily AI economy intelligence for operators — one signal, one move, every weekday.*
5. Upload logo: `C:/Users/yurik/Downloads/Beehiiv files/leverage-signal-brand/04-icon-mark-dark.png`
6. Header banner: `01-primary-horizontal-dark.png`
7. Once created, go to **Settings → Integrations → API** and copy the publication ID (`pub_xxx`).
8. If you don't have a Beehiiv API key yet: same page → "API Keys" → "Create new key".

### d) Resend (for the review notification email)
1. https://resend.com → free account.
2. Verify a sending domain (use yurikruman.com or grandkruventures.com).
3. Copy the API key (starts with `re_`).

If you don't want to set up Resend, skip it and the script will print the notification to console instead. (Or use Slack — set `SLACK_WEBHOOK_URL` instead.)

---

## 3. Configure `.env`

```bash
cp env.example.txt .env
```

Open `.env` and fill in:
- `ANTHROPIC_API_KEY`
- `NOTION_API_KEY`
- `BEEHIIV_API_KEY`
- `BEEHIIV_PUBLICATION_ID` ← the NEW Signal publication, not Brief
- `RESEND_API_KEY` + `NOTIFY_EMAIL_FROM` + `NOTIFY_EMAIL_TO`

---

## 4. Verify each connection (smoke tests)

```bash
npm run test-anthropic   # Should print: { ok: true, model: 'claude-opus-4-7', response: 'OK' }
npm run test-notion      # Should print today's daily update from the catalog
npm run test-beehiiv     # Should print: { ok: true, publicationName: 'The Leverage Signal' }
```

If any test fails: fix the env var or the integration connection and rerun.

---

## 5. Dry-run the full pipeline (no Beehiiv post)

```bash
npm run test-full-dry
```

This runs every step end-to-end EXCEPT the actual Beehiiv post. Inspect:
- `runs/YYYY-MM-DD/01-research.json` — what was pulled from Notion
- `runs/YYYY-MM-DD/02-signal-picked.json` — what signal was chosen + alternates
- `runs/YYYY-MM-DD/03-draft.json` — full drafted issue
- `runs/YYYY-MM-DD/04-virality.json` — score + weak spots
- `runs/YYYY-MM-DD/05-amplifiers.json` — LinkedIn + X variants
- `runs/YYYY-MM-DD/06-body.html` — final HTML that would post to Beehiiv

Open `06-body.html` in a browser to see how it'll render. Adjust prompts if needed.

---

## 6. First real run

```bash
npm run daily
```

This posts a real draft to Beehiiv and sends you the notification. Open the dashboard link in the notification, review, edit if needed, then press Send in Beehiiv when ready.

---

## 7. Schedule it (pick ONE)

### Option A: Local always-on (Windows Task Scheduler) — RECOMMENDED for V1

1. Open Task Scheduler.
2. Action → Create Basic Task.
3. Name: "Leverage Signal Daily"
4. Trigger: Daily, time = 06:30 IDT (account for your local time).
5. Days: Mon, Tue, Wed, Thu, Fri (set after creation in "Triggers" tab).
6. Action: Start a program.
   - Program: `C:\Program Files\nodejs\node.exe`
   - Arguments: `run-daily.js`
   - Start in: `C:\Users\yurik\Downloads\leverage-signal-engine`
7. Finish.

Test it: right-click the task → Run.

### Option B: node-cron (run a long-lived process)

```bash
npm start
```

Keep this running in a terminal. Less reliable than Task Scheduler if your machine sleeps.

### Option C: Vercel Cron (cloud, always-on)

1. `cd vercel && vercel link` (link to a new Vercel project)
2. Set all env vars in Vercel dashboard.
3. Generate a `CRON_SECRET` (any random string) and add it as env var.
4. `vercel deploy --prod`

Vercel Cron will fire `/api/cron/daily` Mon-Fri at 06:30 UTC (note: UTC, not Israel time — adjust the cron in `vercel/vercel.json` if you want a different time).

---

## 8. Migrating the Leverage Brief subscriber list

Beehiiv treats each publication as its own list. To get your Brief subscribers reading the Signal:

**Option 1 (recommended): Bulk import**
1. In the Brief publication: Subscribers → Export → CSV.
2. In the Signal publication: Subscribers → Import → upload the CSV.
3. In the Signal welcome flow, send a brief "We launched the daily Signal alongside the weekly Brief" intro email.

**Option 2: Cross-Publication Recommendations (Beehiiv Scale plan and above)**
Set the Brief to recommend the Signal at signup, and run a one-time issue in the Brief promoting the Signal launch.

**Option 3: Single publication, separate cadence**
Don't create a new publication. Use the existing Brief publication with two categories ("Weekly Brief" and "Daily Signal"). Subscribers can opt into either. Simplest but conflates the brands.

You said you want option 1 (separate publications, shared list). Do the export/import after the first issue is ready.

---

## 9. Daily flow once everything's set up

```
06:30 IDT  → cron fires
06:30-31   → pipeline runs (Notion → Claude → Beehiiv draft)
06:31      → you get the review email with virality score + headline + pull quote
~07:00     → you open the dashboard link, review, edit if needed, press Send
post-send  → you grab the LinkedIn + X variants from the same email and post
```

Total time from your fingers: 5-10 minutes per day.

---

## 10. Troubleshooting

- **`Beehiiv createDraft failed (status 401)`** — API key is wrong or revoked. Regenerate in Beehiiv settings.
- **`Beehiiv createDraft failed (status 422)`** — Body content failed validation. Check `runs/YYYY-MM-DD/06-body.html` for malformed HTML.
- **`object_not_found` from Notion** — The integration isn't shared with the page. Reopen the Connections panel on the Research Catalog page and add it.
- **Virality score consistently below 7** — The prompt is being too defensive. Edit `prompts/02-draft-issue.md` to push harder on contrarian framing.
- **Pipeline runs but Claude returns malformed JSON** — Lower temperature in `lib/anthropic.js` for the offending step, or add explicit "no markdown fence" reminders to the prompt.

---

## 11. Iterating on quality

After the first 5 issues:
1. Read `runs/*/04-virality.json` and look at weak-spot patterns.
2. Refine the relevant prompt in `prompts/`.
3. Re-run any past day with: `node run-daily.js --force-rerun` (writes to today's folder — copy artifacts you want to keep).

The prompts are designed to be edited. They are the highest-leverage place to invest time.
