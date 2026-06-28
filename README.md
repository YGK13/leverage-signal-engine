# Leverage Signal Engine

> **Operators, founders, fractional execs: start at [PROTOCOL.md](./PROTOCOL.md).**
> That is the canonical, ICP-facing doc: what the Signal is, who it is for,
> the Beehiiv MCP path, install in 25 minutes, the morning flow.
>
> **Engineers: you are in the right place.** README is the architecture map.
> [SETUP.md](./SETUP.md) is the click-by-click install. [TEACH.md](./TEACH.md)
> is the deep teach.

---

Daily publishing automation for **The Leverage Signal** newsletter.

Notion research catalog → Claude drafting → Beehiiv draft post → notification with review link.

You press Send. The system does the rest.

---

## What it does

Every weekday at 06:30 IDT:

1. Pulls today's auto-scanned research from the Notion catalog.
2. Picks THE single signal of the day (operator implication, stakes, specificity, asymmetry, mode fit).
3. Drafts a full Leverage Signal issue in Yuri's voice:
   - 6-9 word subject line
   - Preheader
   - Two-line display headline (white + gold split, per brand)
   - 250-450 word body
   - "The Move" prescriptive close
   - Tweetable pull quote
   - 3 backup subject lines
4. Scores virality 0-10 across 8 dimensions; flags weak spots.
5. Generates LinkedIn post + X thread for after-send distribution.
6. Posts the draft to Beehiiv (status: draft, never auto-sends).
7. Emails you the review link, virality score, alternate subjects, and the social variants.
8. Saves all intermediate artifacts to `runs/YYYY-MM-DD/` for audit.

You open the email, click the Beehiiv link, review, press Send. ~5-10 min/day.

---

## Architecture

```
                ┌─────────────────────────────────────────────────┐
                │             scheduler.js / Vercel Cron          │
                │       fires `node run-daily.js` Mon-Fri 6:30    │
                └────────────────────────┬────────────────────────┘
                                         ▼
                          ┌──────────────────────────┐
                          │       run-daily.js        │  ← orchestrator
                          └────┬──────┬───────┬──────┘
                ┌──────────────┘      │       └──────────────────┐
                ▼                     ▼                          ▼
        ┌───────────────┐    ┌────────────────┐         ┌────────────────┐
        │  lib/notion   │    │ lib/anthropic  │         │  lib/beehiiv   │
        │ fetch catalog │    │  4 prompts:    │         │ create draft   │
        │   parse day   │    │  pick · draft  │         │   post via API │
        └───────────────┘    │ score · social │         └────────────────┘
                             └────────────────┘
                                      │
                                      ▼
                          ┌──────────────────────────┐
                          │  lib/html-template.js     │  ← brand-matching email HTML
                          └─────────────┬────────────┘
                                        ▼
                          ┌──────────────────────────┐
                          │  lib/notify.js            │  ← Resend / Slack / console
                          └──────────────────────────┘
```

---

## File map

```
leverage-signal-engine/
├── README.md                    ← you are here
├── SETUP.md                     ← step-by-step install (read this first)
├── package.json
├── env.example.txt              ← copy to .env, fill in keys
├── .gitignore
├── config.js                    ← brand, schedule, style rules, gates
├── run-daily.js                 ← main orchestrator (this is what cron runs)
├── scheduler.js                 ← local node-cron wrapper
│
├── lib/
│   ├── notion.js                ← fetch + parse the research catalog
│   ├── anthropic.js             ← Claude API calls (pick, draft, score, amplify)
│   ├── beehiiv.js               ← Beehiiv REST API wrapper (create draft only)
│   ├── html-template.js         ← brand-matching email body HTML
│   └── notify.js                ← review-ready notifications (Resend / Slack)
│
├── prompts/
│   ├── 01-pick-signal.md        ← selects THE signal of the day
│   ├── 02-draft-issue.md        ← writes the full issue (Yuri's voice + rules)
│   ├── 03-virality-score.md     ← scores 0-10 across 8 dimensions
│   └── 04-social-amplify.md     ← LinkedIn post + X thread
│
├── runs/                        ← daily artifacts (gitignored)
│   └── YYYY-MM-DD/
│       ├── 01-research.json
│       ├── 02-signal-picked.json
│       ├── 03-draft.json
│       ├── 04-virality.json
│       ├── 05-amplifiers.json
│       ├── 06-body.html
│       └── 07-beehiiv-result.json
│
└── vercel/                      ← optional: cloud deployment path
    ├── vercel.json
    └── api/cron/daily.js
```

---

## Quick start

```bash
cd C:/Users/yurik/Downloads/leverage-signal-engine
npm install
cp env.example.txt .env
# fill in .env, then:
npm run test-anthropic
npm run test-notion
npm run test-beehiiv
npm run test-full-dry   # full pipeline, skips Beehiiv post
npm run daily           # full pipeline, posts real draft
```

Schedule via Windows Task Scheduler (recommended), `npm start` (node-cron), or Vercel Cron.

Full setup: see [SETUP.md](./SETUP.md).

---

## Editorial knobs

All behavior tuning lives in two places:

1. **`config.js`** — schedule, brand, style rules, virality gate, mode rotation (Mon/Wed/Fri = SIGNAL, Tue = BUILD, Thu = READ), word count targets.
2. **`prompts/*.md`** — the actual instructions Claude follows. Edit these directly to push voice, format, or virality criteria. Changes take effect on the next run.

The virality gate is `7.0` by default. Drafts scoring below still post (so you can revise in Beehiiv), but get flagged red in the notification.

---

## Style rules (encoded everywhere)

- No em dashes. Use colons or rewrites.
- No Oxford comma.
- No AI tells ("certainly", "delve", "robust", "in today's fast-paced world").
- Every issue ends in a decision, never a question.
- Specific numbers in ¶1. Named companies and people throughout.
- Name the trap before the move.

---

## Operating cost

Per daily issue:
- Claude Opus 4.7: ~$0.08-0.15 (4 calls totaling ~10k input / 4k output tokens)
- Notion API: free
- Beehiiv API: free (included with paid plan)
- Resend: free (under 100/day)
- Vercel Cron (optional): free on Hobby plan

Monthly cost: ~$2-4 in Claude API. Everything else is free.

---

## What this is NOT

- It is not a "post and forget" system. Drafts always wait for your review.
- It is not a distribution tool. After-send social posts are written for you but you post them manually.
- It is not a subscriber management tool. List sync between Brief and Signal is a one-time manual step (see SETUP.md §8).

---

## Roadmap (post-V1)

- Auto-A/B test subject lines via Beehiiv's split-send feature
- Pull historical open-rate data from Beehiiv into the virality scorer (close the loop)
- Add an "issue archive" website at portlev.com/signal that mirrors past Signal issues
- Wire the LinkedIn + X amplifiers to actually post via API (after a few weeks of manual quality checks)

---

© 2026 Grand Kru Ventures
