# The Leverage Signal Engine: Complete Build Guide

**Written by Yuri Kruman. For operators, founders and executives who want to run an automated, AI-drafted newsletter without hiring a content team.**

This document covers every step to replicate this exact system from scratch: Notion research catalog to Claude AI drafting to Beehiiv draft post, with a review notification landing in your inbox before 7am. Your only job is a 5-minute review and pressing Send.

Total cost: $2-4/month. Total daily time from your fingers: 5-10 minutes.

---

## Table of Contents

1. [System Overview](#part-1-system-overview)
2. [Beehiiv Setup](#part-2-beehiiv-setup)
3. [Notion Setup](#part-3-notion-setup)
4. [Claude / Anthropic API Setup](#part-4-claude--anthropic-api-setup)
5. [Resend Setup (Notification Email)](#part-5-resend-setup)
6. [Local Setup and First Run](#part-6-local-setup-and-first-run)
7. [Scheduling](#part-7-scheduling)
8. [Editorial System](#part-8-editorial-system)
9. [Adapting to Your Own Newsletter](#part-9-adapting-to-your-own-newsletter)
10. [Common Errors and Fixes](#part-10-common-errors-and-fixes)

---

## Part 1: System Overview

### What This System Does

Every weekday morning, the engine wakes up, reads your research notes in Notion, drafts a complete newsletter issue using four Claude API calls, scores the draft for virality, generates social posts, creates a draft in Beehiiv and emails you a review notification with a single link. You open the link, spend 5 minutes reading, edit if needed, press Send. That's it.

```
NOTION RESEARCH CATALOG
  (you write notes here during the week)
         |
         v
[Step 1] FETCH TODAY'S RESEARCH
  lib/notion.js pulls the daily update block
  and the weekly meta-trends section
         |
         v
[Step 2] PICK THE SIGNAL (Claude prompt 1)
  01-pick-signal.md
  Reads catalog, scores candidates on 5 criteria,
  returns JSON: selectedSignal, rationale, trap, contrarianRead
         |
         v
[Step 3] DRAFT THE ISSUE (Claude prompt 2)
  02-draft-issue.md
  Writes subjectLine, preheader, eyebrow, headline,
  bodyHtml (4 paragraphs), theMove, pullQuote
         |
         v
[Step 4] SCORE VIRALITY (Claude prompt 3)
  03-virality-score.md
  Scores 8 dimensions 0-10, returns composite score,
  weakSpots, suggestions
         |
         v
[Step 5] GENERATE SOCIAL POSTS (Claude prompt 4)
  04-social-amplify.md
  Writes LinkedIn post + X (Twitter) thread, in your voice
         |
         v
[Step 6] POST DRAFT TO BEEHIIV
  lib/beehiiv.js creates a draft post (never sends)
  If API plan not Enterprise: saves HTML locally for manual paste
         |
         v
[Step 7] NOTIFY YOU
  lib/notify.js emails you via Resend
  Subject line, headline, pull quote, virality score,
  weak spots, social posts, Beehiiv dashboard link
         |
         v
[YOU] 5-MINUTE REVIEW
  Open Beehiiv link from email
  Read, edit if needed, press Send
  Copy LinkedIn + X variants from same email, post
```

All intermediate artifacts save to `runs/YYYY-MM-DD/` for later review.

---

### Why Each Component Was Chosen

| Choice | Why | Alternative |
|--------|-----|-------------|
| **Notion** for research | You already live there. Blocks API is fast and stable. Free tier covers it. | Airtable: more structure but slower to write in; adds friction to daily research capture |
| **Claude** for drafting | Superior voice fidelity, better at following style rules, JSON output is more reliable | GPT-4o: cheaper but more likely to hallucinate forbidden phrases and ignore no-em-dash rules |
| **Beehiiv** for newsletter | Best growth tools in class, clean editor, subscriber analytics, built-in referral engine | Substack: no API for programmatic draft creation at any plan level |
| **Resend** for notifications | 100 emails/day free tier, dead-simple API, domain verification works in 5 minutes | SendGrid: heavier setup; Mailgun: requires credit card at free tier |
| **node-cron / Task Scheduler** for scheduling | Your machine, your control, no cloud bill | Vercel Cron: included in this repo if you prefer cloud-always-on |

---

### Total Cost Breakdown

| Service | Tier Needed | Monthly Cost |
|---------|-------------|-------------|
| Anthropic API (Claude Opus) | Pay-per-use | ~$3-4/month (20 runs × $0.15) |
| Anthropic API (Claude Sonnet) | Pay-per-use | ~$0.80/month (20 runs × $0.04) |
| Notion | Free | $0 |
| Beehiiv | Launch (free) or Scale ($39/mo) | $0-39 (API posting requires Enterprise; manual paste works on free) |
| Resend | Free (100/day) | $0 |
| Node.js / local machine | Already have it | $0 |
| **Total with Opus + manual Beehiiv paste** | | **~$3-4/month** |
| **Total with Sonnet + manual paste** | | **~$1/month** |

> **The only real cost is the Anthropic API.** Everything else is free or already paid for.

---

### The 5-Minutes-a-Day Commitment

The pipeline runs while you sleep (06:30 IDT by default). When you wake up:

1. Open the review email in your inbox (30 seconds)
2. Check the virality score: below 7.0 means revise before sending (flagged red)
3. Click "Review and send in Beehiiv" (30 seconds)
4. Read the draft, make any edits (2-3 minutes)
5. Press Send in Beehiiv (10 seconds)
6. Paste the LinkedIn variant from the same email (1 minute)

That's it. No writing. No research. No formatting. Just editorial judgment.

---

## Part 2: Beehiiv Setup

### Create a New Beehiiv Publication

1. Go to https://app.beehiiv.com and log in (or create a free account).
2. Click the publication name in the top-left dropdown.
3. Select **"Create new publication"**.
4. Fill in:
   - **Publication name:** The Leverage Signal (or your newsletter name)
   - **Subtitle:** Daily AI economy intelligence for operators — one signal, one move, every weekday.
5. Click Create.

---

### Brand Setup

After creation, go to **Settings → Publication Details**:

- **Publication name:** The Leverage Signal
- **Subtitle:** Daily AI economy intelligence for operators — one signal, one move, every weekday.
- **Logo:** Upload your icon mark (square format, 400×400px minimum, PNG with transparent background preferred)
- **Header banner:** Upload horizontal logo, dark background, 1200×300px recommended
- **Author name:** Your name
- **Sender name:** The Leverage Signal (what subscribers see in the From field)
- **Reply-to email:** your@email.com

---

### API Setup: Finding the Keys You Need

#### Your Beehiiv API Key

1. In your publication, go to **Settings → Integrations → API**.
2. Under "API Keys", click **"Create new key"**.
3. Name it "Leverage Signal Engine". Set scope to Read + Write.
4. Copy the key immediately. It starts with a long alphanumeric string. You cannot retrieve it again.

#### Your Publication ID

On the same Settings → Integrations → API page, your publication ID appears as `pub_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`. Copy it.

Alternatively: look at the URL when you are in your publication dashboard. It contains the publication ID in the path.

> **Publication ID format note:** The `env.example.txt` shows a UUID format (`965f16e6-c996-4a36-8e3a-ae5f4834e281`). Older publications may show `pub_` prefix. Use whatever the Settings page shows verbatim.

---

### Plan Requirements for the Posts API

**The Beehiiv Posts API (programmatic draft creation) requires the Enterprise plan.**

On free (Launch) or Scale plans, the `createDraft` call returns a 403 or 422. The engine handles this gracefully: it still runs every step, saves the full HTML to `runs/YYYY-MM-DD/06-body.html` and the notification email includes a **"Full HTML body (copy into Beehiiv editor)"** section so you can paste manually.

**Practical guidance:**
- Start on the free plan. The system works perfectly — you just paste instead of having it auto-create.
- Upgrade to Enterprise when the friction of manual paste outweighs the $99-299/month cost.
- The `DRAFT_ONLY=true` flag in `.env` prevents any accidental auto-sends regardless of plan.

---

### Content Tags Setup

Beehiiv content tags let subscribers filter what they receive. This engine auto-tags posts as:
- `daily-signal`
- `mode-signal`, `mode-build` or `mode-read` (depending on the day)

To pre-create these tags in Beehiiv: go to **Content → Tags** and add them manually. The API creates them on-the-fly if they don't exist (on Enterprise plans).

---

### Subscriber Migration from Another Beehiiv Publication

If you already run a newsletter on Beehiiv (say, a weekly brief) and want the same subscribers on the new daily publication:

**Option 1: CSV export/import (recommended)**
1. In your existing publication: **Subscribers → Export → Download CSV**.
2. In the new Signal publication: **Subscribers → Import → upload the CSV**.
3. In the Signal welcome automation, send a one-time intro email: "You're subscribed to The Leverage Signal, the daily version of [X]. Unsubscribe anytime."

**Option 2: Cross-publication recommendations (Scale plan and above)**
Set the existing publication to recommend the new one at signup. Run one issue in the existing publication announcing the new daily.

**Option 3: Single publication, dual categories**
Don't create a new publication. Use one publication with two content categories ("Weekly" and "Daily Signal"). Subscribers opt into each. Simplest technically but conflates the brands over time.

---

## Part 3: Notion Setup

### Research Catalog Page Structure

The engine reads one Notion page. You update it daily (or as often as you research). The parser looks for two sections:

**1. Daily update blocks** — dated headers like:
```
# 📅 MAY 19, 2026 — DAILY UPDATE
```
Under this header, write bullet points of signals, data, named companies, quotes, numbers.

**2. Weekly meta-trends** — a section starting with:
```
## 🔄 SUNDAY RESHUFFLE
```
or:
```
## 📌 WEEKLY META-TRENDS ANALYSIS
```
Under this header, write the week's overarching patterns in 2-4 bullet points.

#### Exact Date Format the Parser Expects

The parser matches these patterns (case insensitive):
- `MAY 19, 2026 — DAILY UPDATE` (single day)
- `MAY 19-21, 2026 — DAILY UPDATE` (date range with hyphen)
- `MAY 19–21, 2026 — DAILY UPDATE` (date range with en dash)

**Critical:** the word "DAILY UPDATE" must appear in the header. If it is missing, the parser falls back to the most recent daily update it can find in the page. That is fine as a fallback but you will get yesterday's research if you forget to add today's header.

#### Sample Notion Page Structure

```
# Leverage Brief Research Catalog

## 🔄 SUNDAY RESHUFFLE — WEEK OF MAY 19, 2026
- AI labor substitution accelerating in white-collar mid-market (PE portfolio)
- Claude 4 API adoption 3x faster than GPT-4 among enterprise HR tech vendors
- Headcount freeze at Fortune 500s masking covert AI-backfill (2 confirmed sources)

---

# 📅 MAY 19, 2026 — DAILY UPDATE
- Microsoft internal memo: all Copilot M365 seats now bundled into E5. No opt-out for new renewals. ~400K affected seats.
- Workday Q1 earnings: AI "skills graph" feature saw 41% adoption among enterprise customers. Churn -18% in cohort.
- Anthropic + Salesforce partnership announcement: Claude embedded in Einstein AI. Deal value undisclosed.

# 📅 MAY 20, 2026 — DAILY UPDATE
- LinkedIn "AI Career Coach" exits beta. 40M users eligible on Premium. Job-prep market disruption accelerates.
- ServiceNow raises full-year guidance: cites AI workflow automation as primary demand driver. Stock +7%.
- McKinsey Global Institute report: 30% of current CHRO tasks automatable by Q4 2026. 12% already replaced.
```

---

### Creating a Notion Integration

1. Go to https://www.notion.so/profile/integrations
2. Click **"New integration"**.
3. Name it: "Leverage Signal Engine" (or any descriptive name).
4. Select your workspace.
5. Under Capabilities, check **"Read content"** only. The engine does not write to Notion.
6. Click **"Submit"**.
7. Copy the **"Internal Integration Token"**. It now starts with `ntn_` (as of 2025). Older integrations started with `secret_`. Both formats work with the `@notionhq/client` SDK.

> **Token format note:** Notion changed the token prefix from `secret_` to `ntn_` in 2025. If you see `ntn_160265...` in the example, that is correct. If your token shows `secret_`, it still works.

---

### The Connections Step Everyone Misses

Creating the integration is not enough. You must explicitly share the Research Catalog page with it.

1. Open your Research Catalog page in Notion.
2. Click the **"..."** menu (top right).
3. Click **"Connections"**.
4. Find your integration in the list ("Leverage Signal Engine").
5. Click to enable it.

Without this step, the API returns `object_not_found` (404) even with a valid token. This is the single most common setup failure.

---

### Getting the Page ID

Open your Research Catalog page in Notion. Look at the URL:

```
https://www.notion.so/Leverage-Brief-Research-Catalog-3643bb412ed481478d6ef71dea3f0f1d
```

The page ID is the trailing hex string: `3643bb412ed481478d6ef71dea3f0f1d`.

If your URL shows dashes in the ID (`3643bb41-2ed4-8147-8d6e-f71dea3f0f1d`), you can use either format. The Notion SDK accepts both.

---

## Part 4: Claude / Anthropic API Setup

### Getting an API Key

1. Go to https://console.anthropic.com
2. Sign in or create an account.
3. Navigate to **Settings → API Keys**.
4. Click **"Create Key"**.
5. Name it "Leverage Signal Engine".
6. Copy the key. It starts with `sk-ant-`. You cannot retrieve it again after closing the dialog.
7. Add credits under **Settings → Billing**. The free tier is $5 at signup. Monthly runs will cost $3-4 (Opus) or under $1 (Sonnet).

---

### Model Choice

Set `ANTHROPIC_MODEL` in your `.env`:

| Model | Speed | Cost per run | Quality | Use case |
|-------|-------|-------------|---------|----------|
| `claude-opus-4-7` | Slower (~30s) | ~$0.10-0.15 | Best | Production daily runs |
| `claude-sonnet-4-5` | Faster (~10s) | ~$0.02-0.04 | Very good | Iteration, testing, budget runs |
| `claude-haiku-3-5` | Fastest (<5s) | ~$0.005 | Good for picking only | Not recommended for full drafts |

**Recommendation:** use `claude-opus-4-7` for production. Use `claude-sonnet-4-5` while you are calibrating prompts to avoid burning credits on test runs.

---

### The 4-Prompt Architecture

The pipeline makes four separate API calls. Each is a single-turn conversation with a system prompt loaded from `prompts/`.

#### Prompt 1: Pick the Signal (`prompts/01-pick-signal.md`)

**What it does:** Reads the raw Notion research dump. Scores signal candidates on 5 weighted criteria (operator implication 35%, stakes 20%, specificity 15%, asymmetry 15%, mode fit 15%). Returns one winner plus two alternates with explanations.

**What you get back (JSON):**
```json
{
  "selectedSignal": {
    "title": "short label",
    "summary": "2-3 sentences",
    "operatorImplication": "one sentence: what changes for the reader",
    "sourceCitations": ["source 1", "source 2"],
    "numbers": ["$10.9B", "41% adoption", "Q2 2026"],
    "namedEntities": ["Workday", "Microsoft", "ServiceNow"]
  },
  "rationale": "why this beat the alternates",
  "modeFit": "why this fits SIGNAL/BUILD/READ",
  "alternates": [
    { "title": "...", "whyNot": "..." }
  ],
  "trap": "the obvious read most operators will take",
  "contrarianRead": "the sharper angle for the issue"
}
```

#### Prompt 2: Draft the Issue (`prompts/02-draft-issue.md`)

**What it does:** Takes the signal selection and writes the full newsletter issue in your voice. Enforces word count targets, style rules and structural format per editorial mode.

**What you get back (JSON):**
```json
{
  "subjectLine": "The CHRO budget freeze nobody is talking about",
  "preheader": "Microsoft just locked 400K seats into Copilot. Here is what that means for your renewal.",
  "eyebrow": "THE SIGNAL · AI LABOR DATA",
  "headlineWhite": "Your next headcount decision",
  "headlineGold": "is already made.",
  "bodyHtml": "<p>...</p><p>...</p><p>...</p><p>...</p>",
  "theMove": "Before your next renewal call, pull the Copilot utilization report...",
  "pullQuote": "The freeze isn't caution. It's substitution in progress.",
  "alternateSubjects": ["...", "...", "..."]
}
```

#### Prompt 3: Score Virality (`prompts/03-virality-score.md`)

**What it does:** Reviews the drafted issue and scores it on 8 dimensions, 0-10 each. Hard scoring: it quotes actual text when citing weak spots. The composite score gates the notification color (green above 7.0, orange-red below).

**8 dimensions:**
1. Hook strength (subject line + headline curiosity gap)
2. Specificity (numbers, names, dates in paragraph 1)
3. Stakes (margin, headcount, competition named explicitly)
4. Asymmetry (does it say something other AI newsletters aren't saying)
5. Move clarity (is "The Move" a specific scoped action or generic advice)
6. Shareability (pull quote screenshot-worthy standalone under 220 chars)
7. Voice fidelity (sounds like Yuri Kruman or like generic AI prose)
8. Style compliance (em dashes, Oxford commas, forbidden phrases: hard deductions)

**What you get back (JSON):**
```json
{
  "score": 8.1,
  "breakdown": {
    "hookStrength": 9,
    "specificity": 9,
    "stakes": 8,
    "asymmetry": 8,
    "moveClarity": 9,
    "shareability": 7,
    "voiceFidelity": 8,
    "styleCompliance": 7
  },
  "weakSpots": [
    "Pull quote 'The freeze isn't caution' is strong but 228 chars — over the 220 limit",
    "Paragraph 3 uses 'it's worth noting' — forbidden phrase"
  ],
  "suggestions": ["Trim the pull quote by 10 chars", "Rewrite 'it's worth noting' as a direct statement"],
  "oneLineVerdict": "Strong hook and specificity; shareability and style compliance drag the score"
}
```

#### Prompt 4: Generate Social Posts (`prompts/04-social-amplify.md`)

**What it does:** Writes a LinkedIn post (150-220 words) and a 4-6 tweet X thread, both in your voice, both with a subscribe link at the close.

**What you get back (JSON):**
```json
{
  "linkedinPost": "Microsoft just bundled 400K Copilot seats...\n\n...",
  "linkedinHook": "First 2 lines that appear above 'see more'",
  "xThread": [
    "Microsoft locked 400K seats into Copilot M365. No opt-out for new E5 renewals.",
    "The conventional read: this is a growth play for Microsoft.",
    "The actual read: every CHRO whose renewal is Q3 2026 just lost negotiating leverage.",
    "Here's what to do before your next renewal call...",
    "Full breakdown: https://leveragesignal.beehiiv.com"
  ],
  "xHook": "Microsoft locked 400K seats into Copilot M365. No opt-out for new E5 renewals."
}
```

---

### How to Edit the Prompts for Your Voice and Niche

All prompts live in `prompts/`. They are plain markdown files. Edit them directly.

**The highest-leverage edits in each prompt:**

`01-pick-signal.md` — Change the reader description and the 5 scoring criteria weights. If your audience is CFOs not CHROs, update "headcount" stakes to "cost of capital" stakes.

`02-draft-issue.md` — Change the style rules section and the READER description. Add your own forbidden words. Change the structural format (currently 4-paragraph SIGNAL, BUILD, READ modes).

`03-virality-score.md` — Change "viral means" definition. For a B2B SaaS newsletter, shareability might weight less than move clarity.

`04-social-amplify.md` — Change the subscribe URL. Change the author voice block at the top. Remove X thread if you don't post on X.

---

### Cost Expectations

A single full pipeline run makes 4 API calls:
- Prompt 1 (pick signal): ~600 input tokens, ~500 output tokens
- Prompt 2 (draft issue): ~1,200 input tokens, ~1,500 output tokens
- Prompt 3 (virality score): ~1,800 input tokens, ~600 output tokens
- Prompt 4 (social posts): ~1,400 input tokens, ~800 output tokens

**With claude-opus-4-7 (as of June 2026):**
- Input: ~$15/M tokens
- Output: ~$75/M tokens
- Per run: approximately $0.10-0.15
- Per month (20 runs): approximately $2.50-3.50

**With claude-sonnet-4-5:**
- Per run: approximately $0.02-0.04
- Per month: approximately $0.50-1.00

---

### Important: `temperature` Is Deprecated on claude-opus-4-7

The `temperature` parameter is not accepted by `claude-opus-4-7` or newer Anthropic models. Passing it causes a 400 error.

The `lib/anthropic.js` `call()` function correctly omits `temperature`. If you add your own API calls elsewhere in the codebase, do not include `temperature`. The `pickSignal` and `draftIssue` functions in the original source have `temperature` in their call sites but the wrapper strips it — this is intentional.

---

### The `override: true` dotenv Fix

`config.js` loads `.env` with:

```js
import { config as loadEnv } from 'dotenv';
loadEnv({ override: true });
```

The `override: true` flag is required when running under Claude Code or any environment that pre-sets environment variables. Without it, dotenv skips values that already exist in `process.env` even if the actual value is an empty string `""`. With `override: true`, your `.env` file wins regardless. This solves the "ANTHROPIC_API_KEY reads as empty even though I set it in .env" problem.

---

## Part 5: Resend Setup

### Create a Free Resend Account

1. Go to https://resend.com
2. Sign up (free tier: 100 emails/day, 3,000/month).
3. Verify your email address.

---

### Domain Verification

You need a sending domain (e.g. `yurikruman.com` or `yourdomain.com`). Resend will not let you send from `@gmail.com` or other public domains.

1. In the Resend dashboard, go to **Domains → Add Domain**.
2. Enter your domain (e.g. `yurikruman.com`).
3. Resend provides DNS records: two TXT records (SPF/DKIM) and one MX record.
4. Add these records in your DNS provider (Namecheap, Cloudflare, GoDaddy, etc.).
5. Click **Verify**. DNS propagation typically takes 5-30 minutes.
6. Once verified, the domain shows a green "Verified" status.

> **Tip:** If you already send email from your domain (you use Gmail with a custom domain, or have Mailchimp/ConvertKit set up), the SPF record may already exist. In that case, add `include:amazonses.com` to your existing SPF TXT record rather than replacing it.

---

### Getting the API Key

In Resend dashboard: **API Keys → Create API Key**. Name it "Leverage Signal Engine". Copy it immediately (starts with `re_`).

---

### What the Notification Email Contains

The review email you receive has:

1. **Virality score** — large number (0-10) color-coded green (7+) or orange/red (below 7)
2. **One-line verdict** — Claude's diagnostic summary of why the score landed where it did
3. **Subject line** — the exact subject the issue will send with
4. **Eyebrow and headline** — rendered at readable size for fast scanning
5. **Pull quote** — the tweetable line in a styled blockquote
6. **"Review and send" button** — links directly to the Beehiiv draft edit page
7. **Alternate subject lines** — 3 backup subjects ranked by strength
8. **Virality weak spots** — specific quoted text from the draft that dragged the score
9. **The Move** — the prescriptive close, for quick sanity check
10. **LinkedIn post** — ready to paste after you send
11. **X thread** — 4-6 tweets ready to go
12. **Full HTML body** — collapsible section (visible only if Beehiiv API was skipped) for manual paste

If you skip Resend and use Slack instead, set `SLACK_WEBHOOK_URL` in `.env` and leave the Resend vars empty. The notification goes to your Slack channel as plain text. If both are empty, the notification prints to console (useful for debugging).

---

## Part 6: Local Setup and First Run

### Prerequisites

```bash
node --version   # Must be 20.0.0 or higher
npm --version    # Must be 8+ (comes with Node 20)
```

If you need to upgrade Node: https://nodejs.org/en/download (use the LTS installer for Windows).

---

### Clone or Download the Repo

```bash
# If you have git:
git clone https://github.com/yourusername/leverage-signal-engine.git
cd leverage-signal-engine

# Or download the ZIP and extract it, then:
cd C:/Users/yurik/Downloads/leverage-signal-engine
```

---

### Install Dependencies

```bash
npm install
```

This installs: `@anthropic-ai/sdk`, `@notionhq/client`, `axios`, `dotenv` and `node-cron`. Takes 20-30 seconds.

---

### Create Your `.env` File

**Every variable the system uses:**

```env
# Anthropic
ANTHROPIC_API_KEY=sk-ant-REPLACE_ME
ANTHROPIC_MODEL=claude-opus-4-7

# Notion
NOTION_API_KEY=ntn_REPLACE_ME
NOTION_PAGE_ID=your32hexcharpageid

# Beehiiv
BEEHIIV_API_KEY=REPLACE_ME
BEEHIIV_PUBLICATION_ID=pub_REPLACE_ME

# Notifications — Option A: Email via Resend
RESEND_API_KEY=re_REPLACE_ME
NOTIFY_EMAIL_FROM=signal@yourdomain.com
NOTIFY_EMAIL_TO=you@youremail.com

# Notifications — Option B: Slack (uncomment if using Slack instead of Resend)
# SLACK_WEBHOOK_URL=https://hooks.slack.com/services/REPLACE_ME

# Schedule
DAILY_CRON=30 6 * * 1-5
TIMEZONE=Asia/Jerusalem

# Behavior
DRAFT_ONLY=true
LOG_RETENTION_DAYS=30
```

**Creating the `.env` file on Windows (the right way):**

Do NOT use Notepad to create `.env` — Windows Notepad adds a BOM (Byte Order Mark) to UTF-8 files that breaks `dotenv` parsing.

Use one of these methods:

**Method 1: Git Bash**
```bash
cp env.example.txt .env
# Then open .env in VS Code and fill in values
```

**Method 2: PowerShell (BOM-safe)**
```powershell
# Copy the file first using Git Bash, then fill values in VS Code.
# If you must write it fresh in PowerShell, use this exact syntax:
$content = @"
ANTHROPIC_API_KEY=sk-ant-yourkey
NOTION_API_KEY=ntn_yourkey
NOTION_PAGE_ID=yourpageid
BEEHIIV_API_KEY=yourkey
BEEHIIV_PUBLICATION_ID=yourpubid
RESEND_API_KEY=re_yourkey
NOTIFY_EMAIL_FROM=signal@yourdomain.com
NOTIFY_EMAIL_TO=you@youremail.com
DAILY_CRON=30 6 * * 1-5
TIMEZONE=Asia/Jerusalem
DRAFT_ONLY=true
LOG_RETENTION_DAYS=30
"@
# CRITICAL: use this exact method — NOT Out-File, which adds UTF-16 BOM
[System.IO.File]::WriteAllText(
    "C:\Users\yurik\Downloads\leverage-signal-engine\.env",
    $content,
    [System.Text.UTF8Encoding]::new($false)
)
```

The `[System.Text.UTF8Encoding]::new($false)` argument is the critical part: the `$false` disables the BOM. `Out-File` with `-Encoding utf8` in Windows PowerShell 5.1 still adds a BOM. Use `[System.IO.File]::WriteAllText` instead.

**Method 3: VS Code**
Copy `env.example.txt` to `.env` in Windows Explorer, then open `.env` in VS Code. VS Code saves UTF-8 without BOM by default. Fill in your values and save.

---

### Smoke Tests

Run these three commands in order. Each should return `ok: true`.

```bash
npm run test-anthropic
```
Expected:
```json
{ "ok": true, "model": "claude-opus-4-7", "response": "OK" }
```
If you get `401 Unauthorized`: the API key is wrong or has a leading space. Check your `.env`.

```bash
npm run test-notion
```
Expected: JSON with `dailyUpdate` and `weeklyMeta` fields containing your Notion content.

If you get `object_not_found`: the Connections step was not done. Go back to Part 3 and share the page with your integration.

If `dailyUpdate` is null but `weeklyMeta` has content: the parser could not find a header matching today's date. Add a header with the exact format `# 📅 JUNE 7, 2026 — DAILY UPDATE` (today's date, current month spelled out, full year).

```bash
npm run test-beehiiv
```
Expected:
```json
{ "ok": true, "publicationName": "The Leverage Signal", "publicationId": "pub_..." }
```
If you get `401`: Beehiiv API key is wrong. Regenerate it in Beehiiv Settings.

If you get `404`: publication ID is wrong. Double-check Settings → Integrations → API.

---

### First Dry Run

```bash
npm run test-full-dry
```

This runs the entire pipeline — Notion fetch, all 4 Claude calls, HTML generation — but skips the actual Beehiiv API post and marks the result as `dry-run`. Takes 30-90 seconds depending on model.

After it completes, inspect the artifacts:

```
runs/YYYY-MM-DD/
  01-research.json       ← what was pulled from Notion (check: is dailyUpdate populated?)
  02-signal-picked.json  ← which signal was chosen and why (check: does it match your intent?)
  03-draft.json          ← full drafted issue (check: subject line, headline, pull quote quality)
  04-virality.json       ← score + weak spots (check: what's dragging the score?)
  05-amplifiers.json     ← LinkedIn post + X thread
  06-body.html           ← final HTML (open in browser to preview the rendered email)
  07-beehiiv-result.json ← { "ok": true, "postId": "dry-run" }
```

Open `06-body.html` in your browser. You should see the branded email with gold accents, dark background, eyebrow label, split headline, body paragraphs, pull quote block and "The Move" section.

**Iterate on the dry run before your first real run.** If the signal picked is wrong, if the voice is off, or if virality consistently scores below 7, edit the prompts in `prompts/` now. Each dry run costs ~$0.10-0.15 with Opus.

---

### First Real Run

```bash
npm run daily
```

This runs the full pipeline including the Beehiiv API post (or saves locally if not on Enterprise plan) and sends the review notification.

Within 30-90 seconds, you should:
1. See the pipeline logs in your terminal completing all 6 steps
2. Receive the review email in your inbox
3. If on Enterprise Beehiiv: see a new draft in your Beehiiv posts list

Click the dashboard link in the email. Review the draft. If the virality score is above 7.0 and you are satisfied with the headline and pull quote, press Send.

---

## Part 7: Scheduling

### Option A: Windows Task Scheduler (Recommended for Local Runs)

Task Scheduler is the most reliable option on Windows. It fires even if no terminal window is open, and restarts after machine reboots.

**Step-by-step:**

1. Press Win+S, search "Task Scheduler", open it.
2. In the right panel, click **"Create Basic Task"**.
3. **Name:** Leverage Signal Daily
4. **Description:** Daily newsletter pipeline for The Leverage Signal
5. Click Next.
6. **Trigger:** Daily
7. Click Next.
8. **Start time:** Set to 06:30 AM adjusted for your timezone. Task Scheduler uses your system local time. If your system clock is UTC and you want 06:30 IDT (UTC+3), set the time to 03:30 AM.
9. Click Next.
10. **Action:** Start a program
11. Click Next.
12. **Program/script:** `C:\Program Files\nodejs\node.exe`
    (confirm this path with `where node` in PowerShell)
13. **Add arguments:** `run-daily.js`
14. **Start in:** `C:\Users\yurik\Downloads\leverage-signal-engine`
15. Click Next, then Finish.
16. Find the task in the library, right-click → **Properties**.
17. Under the **Triggers** tab: edit the trigger and change "Daily" recurrence to specific weekdays. Uncheck Saturday and Sunday.
18. Under the **General** tab: check **"Run whether user is logged on or not"** and **"Run with highest privileges"**.
19. Click OK.

**Test it immediately:** Right-click the task → **Run**. Watch for a Node.js process in Task Manager, or check `runs/YYYY-MM-DD/` for fresh artifacts.

> **Time zone tip:** Task Scheduler runs in local machine time, not the `TIMEZONE` variable in `.env`. The `TIMEZONE` variable controls node-cron (Option B) only. If your machine is set to UTC, and you want 06:30 IDT, schedule Task Scheduler for 03:30 local.

---

### Option B: node-cron (Long-Lived Process)

```bash
npm start
```

This runs `scheduler.js`, which uses `node-cron` to fire `run-daily.js` on the `DAILY_CRON` schedule in `config.js`. The `TIMEZONE` variable in `.env` is respected: `Asia/Jerusalem` means 06:30 IDT.

**When to use this:** Useful for testing the schedule locally or running on a Linux VPS. Not recommended as your primary scheduler on Windows because the process dies when you close the terminal or the machine sleeps. Use Task Scheduler instead.

```bash
# To keep it running in the background on Windows via Git Bash:
nohup npm start &
# Or use Windows Task Scheduler to launch npm start at startup.
```

---

### Option C: Vercel Cron (Cloud, Always-On)

The `vercel/` directory contains a serverless deployment ready to go.

**Setup:**

1. Install Vercel CLI: `npm install -g vercel`
2. In the project root: `cd vercel && vercel link`
3. In Vercel dashboard for the new project, go to **Settings → Environment Variables**.
4. Add every variable from your `.env` file.
5. Add a new variable: `CRON_SECRET` = any random 32-character string (e.g. output of `node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"`)
6. Deploy: `vercel --prod`

The cron schedule in `vercel/vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/daily",
      "schedule": "0 10 * * 1-5"
    }
  ]
}
```

**Critical:** Vercel Cron uses UTC. `0 10 * * 1-5` = 10:00 AM UTC = 13:00 IDT / 06:00 ET. Adjust this for your target delivery time. To deliver at 06:30 IDT (03:30 UTC): set schedule to `"30 3 * * 1-5"`.

**Cron is production-only:** Vercel Cron does not fire on preview deployments. Always deploy to production (`--prod`).

---

## Part 8: Editorial System

### The 5 Editorial Modes

The mode for any given day is set in `config.js`:

```js
modes: {
  1: 'SIGNAL', // Monday
  2: 'BUILD',  // Tuesday
  3: 'SIGNAL', // Wednesday
  4: 'READ',   // Thursday
  5: 'SIGNAL', // Friday
},
```

| Mode | Day | Format | Word Count | Purpose |
|------|-----|--------|-----------|---------|
| **SIGNAL** | Mon/Wed/Fri | 4-paragraph: signal, trap, contrarian read, consequence | 280-420 words | Pattern recognition + operator implication |
| **BUILD** | Tuesday | 4-paragraph: gap, tool/playbook, proof, deployment path | 350-550 words | Actionable setup guide for a specific tool or method |
| **READ** | Thursday | 2-paragraph: what it is + why it matters | 200-320 words | One curated piece of content with sharp commentary |

You can change these in `config.js`. If you want SIGNAL every day, set all 5 weekdays to `'SIGNAL'`. If you want to add a FEATURE mode for deep dives on Wednesdays, add it to the `modes` object and add corresponding word counts and structural instructions to `prompts/02-draft-issue.md`.

---

### The Virality Scoring System

Scores are averages of 8 dimensions, each 0-10. The composite score gates the notification:

- **7.0 and above:** green notification, "Review and send" CTA
- **Below 7.0:** orange notification, "Below gate" warning, weak spots highlighted prominently

The 7.0 gate is set in `config.js`:
```js
viralityGate: 7.0,
```

**What pulls scores down most often:**
- Style compliance: one em dash costs roughly 0.5-1.0 points across the dimension
- Move clarity: generic advice ("start thinking about AI") vs. scoped action ("pull the Copilot utilization report from Teams admin before your Q3 renewal call")
- Asymmetry: if the signal already trended on LinkedIn that morning, the score drops
- Shareability: pull quote over 220 characters or requiring context to make sense

**What to do when you consistently score below 7:** See Part 9.

---

### The `runs/` Artifact Folder

Every pipeline run writes to `runs/YYYY-MM-DD/`. Files:

| File | Contents | When to look at it |
|------|----------|-------------------|
| `01-research.json` | Raw Notion pull: dailyUpdate, weeklyMeta | When you suspect the research parse failed |
| `02-signal-picked.json` | Signal selection with rationale and alternates | When the topic feels wrong |
| `03-draft.json` | Full drafted issue JSON | When you want to see the raw output before HTML rendering |
| `04-virality.json` | Score, breakdown, weakSpots, suggestions | After every run — this is your feedback loop |
| `05-amplifiers.json` | LinkedIn post + X thread | Reference when posting to social |
| `06-body.html` | Rendered HTML for Beehiiv | Open in browser to preview; paste manually if not on Enterprise |
| `07-beehiiv-result.json` | Beehiiv API response or error | When the post does not appear in Beehiiv |

Artifacts older than `LOG_RETENTION_DAYS` (default 30) are auto-deleted on each run.

---

### Style Rules Encoded in the Prompts

The following rules are injected into prompt 2 on every run. They live in `config.js` as `styleRules` and are numbered in the user message to Claude:

1. NO em dashes. Use colons, commas or rewrite.
2. NO Oxford comma.
3. No "certainly", "great question", "I would suggest", "it's worth noting", AI filler.
4. Every section ends in a decision or action, never a question.
5. Specific numbers in the first paragraph. Named companies and people throughout.
6. Name the trap before you name the move.
7. Operator language only: margin, headcount, cycle time, P&L, win rate, ICP, runway.
8. No analyst hedging. Pick a side. Defend it.
9. One contrarian read per issue.
10. Subject line: 6-9 words, curiosity gap or contradiction.

Virality prompt 3 has a separate style compliance dimension that deducts points for em dashes, Oxford commas and forbidden phrases. This creates a double enforcement: the draft tries to avoid them, and the scoring step catches any that slipped through.

---

## Part 9: Adapting to Your Own Newsletter

### Changing the Niche

Two places to edit:

**1. `config.js` — brand block:**
```js
brand: {
  publication: 'Your Newsletter Name',
  subtitle: 'Your subtitle here.',
  author: 'Your Name',
  authorTitle: 'Your title / company.',
  url: 'https://yournewsletter.beehiiv.com',
  reply: 'Reply to this email; I read every one.',
},
```

**2. Reader description in each prompt file:**

In `prompts/01-pick-signal.md` and `prompts/02-draft-issue.md`, find the reader description block at the top. Replace "sitting and fractional CHROs, founders, PE operating partners" with your actual reader profile. The more specific this is, the better Claude's signal selection and voice fidelity.

For example, for a CFO-focused newsletter:
```
Your readers are CFOs and VP Finance at Series B-D companies.
They are managing runway, treasury, FX exposure and board reporting.
They need pattern recognition around macro signals that hit their P&L, not startup hype.
```

---

### Changing the Notion Research Format

The parser in `lib/notion.js` looks for two patterns:

1. Daily update headers: `# 📅 [MONTH] [DAY], [YEAR] — DAILY UPDATE`
2. Weekly meta headers: `## 🔄 SUNDAY RESHUFFLE` or `## 📌 WEEKLY META-TRENDS ANALYSIS`

If you want a different format, edit the regular expressions in `extractDailyUpdate()` and `extractWeeklyMeta()` in `lib/notion.js`. The regex patterns are:

```js
// Daily update: matches "MAY 19, 2026" variations
new RegExp(
  `#\\s*[^\\n]*${monthName}\\s+${day},\\s+${year}[^\\n]*DAILY UPDATE[^\\n]*\\n([\\s\\S]*?)(?=\\n#\\s|\\n---\\s*\\n##|$)`,
  'i'
)

// Weekly meta: matches "SUNDAY RESHUFFLE" section
/#\s*[^\n]*SUNDAY RESHUFFLE[^\n]*\n([\s\S]*?)(?=\n#\s|$)/i
```

Common adaptation: if your Notion catalog uses a table instead of bullet lists, you will need to extend the `blockToText()` function in `lib/notion.js` to serialize table cells properly (currently simplified).

---

### Adding a Different Notification Channel

**Slack webhook (already built in):** Set `SLACK_WEBHOOK_URL` in `.env`. If Resend is not configured, the engine automatically falls back to Slack.

**Discord webhook:** Discord uses the same HTTP format as Slack for basic text posts. Set your Discord webhook URL as `SLACK_WEBHOOK_URL` and the existing Slack sender will work for plain text notifications.

**Custom integration:** Edit `lib/notify.js`. The function `notifyReviewReady()` is the entry point. Add a new block after the Slack block:

```js
if (CONFIG.yourNewChannel) {
  try {
    await sendYourChannel(text);
    sent = true;
  } catch (e) {
    console.error(`[notify] YourChannel failed: ${e.message}`);
  }
}
```

Then add `sendYourChannel()` as a function below, following the same pattern as `sendSlack()`.

---

### What to Do When Virality Consistently Scores Below 7

If your scores are consistently 6-7 after 5+ runs, the issue is in the prompts, not the model. Diagnose by reading `04-virality.json` across multiple runs and looking for patterns in `weakSpots`.

**The most common causes and fixes:**

| Pattern in weak spots | Root cause | Fix |
|----------------------|-----------|-----|
| "Move is too generic" | Prompt 2 does not constrain The Move to a specific action | In `02-draft-issue.md`, add: "The Move must include a named tool, service, or step. Never 'consider', always 'do X by [date]'." |
| "Subject line lacks specificity" | Prompt 2 subject line instruction is too loose | Add to the subject line rule: "Must include either a company name, a number or a contradiction." |
| "Pull quote requires context" | The pull quote references something from the body | Add to pull quote rule: "Must stand alone. A stranger reading only this line must understand the stakes." |
| "Em dash in paragraph 3" | Model slipping past the style rule | Add "DO NOT USE EM DASHES (—)" in all caps to the top of `02-draft-issue.md` |
| "Asymmetry is low — sounds like standard AI newsletter" | Research catalog is thin or derivative | The problem is your research, not the prompt. Add more contrarian sources, analyst notes and data points to your Notion catalog. |
| "Voice fidelity weak" | The author description is not specific enough | Add 3-4 example phrases or sentences in your actual voice to the AUTHOR VOICE section of prompt 2 |

---

## Part 10: Common Errors and Fixes

### `API token is invalid` (401 from Anthropic)

**Cause:** The API key in `.env` is wrong, has a leading/trailing space, or the `.env` file has a BOM.

**Fix:**
1. Open `.env` in VS Code. Check that `ANTHROPIC_API_KEY=sk-ant-...` has no space before `sk-`.
2. In VS Code bottom bar, check the encoding shows "UTF-8" not "UTF-8 with BOM". If it shows BOM: click it, select "Reopen with Encoding" → "UTF-8".
3. Regenerate the API key at https://console.anthropic.com/settings/keys if still failing.

---

### `object_not_found` (404 from Notion)

**Cause:** The Notion integration has not been shared with your Research Catalog page.

**Fix:** Open the page in Notion → `...` menu → Connections → add your integration. This step must be repeated any time you create a new page you want the engine to read.

---

### `temperature deprecated` Error on claude-opus-4-7

**Cause:** You added a `temperature` parameter to a `client.messages.create()` call. The parameter is not accepted by claude-opus-4-7 and newer models.

**Fix:** Remove `temperature` from the call. The `lib/anthropic.js` `call()` wrapper already omits it. If you are calling the SDK directly elsewhere, remove the temperature field.

---

### Beehiiv API Returns 403 or 422

**Cause (403):** The Beehiiv API key does not have write permissions, or you are not on an Enterprise plan and the Posts API requires it.

**Cause (422):** The HTML body content failed Beehiiv's validation (malformed HTML, unsupported tags).

**Fix (403):** The pipeline handles this gracefully. Check `07-beehiiv-result.json`. If `manualPost: true`, open `06-body.html`, copy the HTML and paste it into a new Beehiiv post manually. The notification email includes a full HTML textarea for this exact scenario.

**Fix (422):** Open `runs/YYYY-MM-DD/06-body.html` in a browser. Look for malformed HTML: unclosed tags, `<script>` blocks or `<h1-h6>` tags (Beehiiv strips these). The `lib/html-template.js` only uses `<p>`, `<strong>`, `<em>`, `<a>`, `<ul>`, `<li>`, `<blockquote>` and `<div>` — but if the Claude draft included disallowed tags in `bodyHtml`, they will appear in the output. Edit the draft in Beehiiv's editor directly.

---

### `ANTHROPIC_API_KEY reads as empty` Even Though It Is in `.env`

**Two causes:**

**Cause A: BOM in the `.env` file.** Windows Notepad and PowerShell's `Out-File -Encoding utf8` add a UTF-8 BOM (byte order mark) to the file. The BOM character (`﻿`) gets prepended to the first variable name. The key appears as `﻿ANTHROPIC_API_KEY` internally, which does not match `ANTHROPIC_API_KEY`. Result: reads as empty.

**Fix A:** Recreate `.env` using the PowerShell method in Part 6 (`[System.IO.File]::WriteAllText` with `UTF8Encoding($false)`) or copy from Git Bash and edit in VS Code.

**Cause B: Environment variable already set to empty string in the host environment.** This happens inside Claude Code sessions where the harness pre-sets variables. `dotenv` by default skips variables already in `process.env`, even if their value is `""`.

**Fix B:** Already handled by `loadEnv({ override: true })` in `config.js`. If you are calling dotenv yourself elsewhere in a custom script, always pass `{ override: true }`.

---

### Resend 403 Error

**Cause:** The sending domain in `NOTIFY_EMAIL_FROM` is not verified in Resend.

**Fix:**
1. Log into https://resend.com → Domains.
2. Find your domain. If status is "Pending", the DNS records have not propagated yet. Wait 30 minutes and retry.
3. If verification failed, re-check the DNS records. Common mistakes: TXT record value was pasted with extra quotes, or the MX record was added on top of an existing MX record (use your host's "add record" not "replace existing").

---

### Pipeline Runs But Claude Returns Malformed JSON

**Cause:** The model returned prose or markdown fences around the JSON. This happens most often with Sonnet on prompt 2 (long structured output).

**The `parseJSON()` function in `lib/anthropic.js` already strips markdown fences.** If it still fails, the model returned partial JSON (truncated) or mixed prose and JSON.

**Fixes in order:**
1. Increase `maxTokens` in the `call()` invocation for the failing step (prompt 2 is already at 4096 — if truncated, increase to 8192).
2. Add "IMPORTANT: Return ONLY the raw JSON object. Start with `{`. End with `}`. No markdown. No explanation." to the end of the offending prompt file.
3. Switch to `claude-opus-4-7` if using Sonnet — Opus is significantly more reliable on structured JSON output.

---

### Virality Score Consistently Below 7 Despite Good Research

This is not an error — it is a calibration signal. See the troubleshooting table in Part 9.

---

## Quick Reference

### Environment Variables Checklist

```
ANTHROPIC_API_KEY          ← from console.anthropic.com (starts with sk-ant-)
ANTHROPIC_MODEL            ← claude-opus-4-7 (production) or claude-sonnet-4-5 (testing)
NOTION_API_KEY             ← from notion.so/profile/integrations (starts with ntn_)
NOTION_PAGE_ID             ← 32-char hex from your Research Catalog page URL
BEEHIIV_API_KEY            ← from Beehiiv Settings → Integrations → API
BEEHIIV_PUBLICATION_ID     ← pub_xxx from same settings page
RESEND_API_KEY             ← from resend.com API Keys (starts with re_)
NOTIFY_EMAIL_FROM          ← verified sending domain email (e.g. signal@yourdomain.com)
NOTIFY_EMAIL_TO            ← your personal email where review notifications go
SLACK_WEBHOOK_URL          ← optional; alternative to Resend
DAILY_CRON                 ← cron expression (default: 30 6 * * 1-5)
TIMEZONE                   ← IANA timezone (default: Asia/Jerusalem)
DRAFT_ONLY                 ← always true; never auto-send
LOG_RETENTION_DAYS         ← default 30
```

### Commands Cheat Sheet

```bash
npm install                 # install dependencies (first time)
npm run test-anthropic      # smoke test: Claude API credentials
npm run test-notion         # smoke test: Notion page pull
npm run test-beehiiv        # smoke test: Beehiiv publication connection
npm run test-full-dry       # full pipeline, no Beehiiv post (safe to run anytime)
npm run daily               # full real run
npm start                   # start node-cron scheduler (long-lived process)
npm run rerun               # re-run today's pipeline (overwrites today's artifacts)
```

### File Map

```
leverage-signal-engine/
  config.js              ← single source of truth: API keys, modes, style rules, schedule
  run-daily.js           ← main orchestrator pipeline
  scheduler.js           ← node-cron wrapper for local scheduling
  package.json           ← dependencies and npm scripts
  env.example.txt        ← copy this to .env and fill in values
  prompts/
    01-pick-signal.md    ← Claude system prompt: signal selection
    02-draft-issue.md    ← Claude system prompt: full draft
    03-virality-score.md ← Claude system prompt: virality scoring
    04-social-amplify.md ← Claude system prompt: LinkedIn + X posts
  lib/
    anthropic.js         ← Claude API wrapper (4 exported functions)
    notion.js            ← Notion API wrapper + page parser
    beehiiv.js           ← Beehiiv REST API wrapper
    notify.js            ← Resend + Slack notification builder
    html-template.js     ← branded email HTML builder
  runs/
    YYYY-MM-DD/          ← one folder per run, 7 artifact files
  vercel/
    vercel.json          ← Vercel Cron config (UTC schedule)
    api/cron/daily.js    ← serverless handler for cloud deployment
```

---

*Built by Yuri Kruman. The Leverage Signal runs daily at 06:30 IDT.*
*Subscribe at https://leveragesignal.beehiiv.com*
