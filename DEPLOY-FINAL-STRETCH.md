# Final Stretch: 4 Secrets + 1 Notion Share

The engine is **deployed and live** on Vercel: `https://leverage-signal-engine.vercel.app`.
The `api/cron/daily` Lambda is registered and gated by `CRON_SECRET` (verified: returns
401 on unauth, 401 on wrong bearer). The cron schedule in `vercel/vercel.json` is set
to `30 3 * * 0,1,2,3,4` (06:30 IDT, Sun-Thu, Shabbat-aware).

Six env vars are already set on production. The four below are Sensitive: paste them
once and the cron starts producing drafts on the next 06:30 IDT weekday.

> Note: until the four secrets below are set, the Lambda will start, fail
> `validateConfig()`, return 500 to the cron, and write nothing. No drafts go out,
> nothing breaks. The first **clean** run is the one after you paste these.

---

## 1) Set the four Sensitive env vars on Vercel (~2 min)

From `C:/Users/yurik/Downloads/leverage-signal-engine`:

```bash
# Anthropic key from console.anthropic.com → API Keys
printf "sk-ant-..." | vercel env add ANTHROPIC_API_KEY production

# Notion integration token. Use the same "Leverage Signal Engine"
# integration the .env already has, from notion.so/profile/integrations
printf "ntn_..." | vercel env add NOTION_API_KEY production

# beehiiv API key + publication id (same values learn-portlev already uses,
# Sensitive so they cannot be auto-mirrored)
printf "REPLACE_ME" | vercel env add BEEHIIV_API_KEY production
printf "pub_..."   | vercel env add BEEHIIV_PUBLICATION_ID production
```

Optional but recommended (so a failed draft pings you instead of being
silent):

```bash
# Resend.com free tier. Lets the engine email you the review link.
printf "re_..."             | vercel env add RESEND_API_KEY production
printf "signal@yourdomain"  | vercel env add NOTIFY_EMAIL_FROM production
printf "you@yourdomain"     | vercel env add NOTIFY_EMAIL_TO production
```

If you want page-mode for the first deploy (read from the long-form
Research Hub page instead of the DB), also set `NOTION_PAGE_ID`. The DB
toggle is already set to safe default `RESEARCH_SOURCE=page`, so the
engine looks at the page first and the DB only when you flip the switch.

---

## 2) Share the Daily AI Signal DB with the engine integration (~30 sec)

The DB was created by a separate Notion integration. The engine's
integration cannot see it yet, so the DB reader 404s.

1. Open the **Daily AI Signal (Leverage Brief)** DB in Notion.
2. Top-right ••• → **Connections** → **Add connections**.
3. Search **"Leverage Signal Engine"** → Confirm.

Then test from the engine repo:

```bash
RESEARCH_SOURCE=db npm run test-notion-db
```

A clean JSON return means you can flip the toggle in production:

```bash
vercel env rm RESEARCH_SOURCE production --yes
printf "db" | vercel env add RESEARCH_SOURCE production
```

---

## 3) Deploy (already done)

The first production deploy is live (`dpl_9YLAuZbZgVNYGZA1kdUuLxsGbbtK`,
aliased to `leverage-signal-engine.vercel.app`). Future env-only changes
do not require a redeploy: Vercel rebuilds automatically on every push
to `master`, and env updates take effect on the next cron fire.

To redeploy manually any time:
```bash
cd C:/Users/yurik/Downloads/leverage-signal-engine && vercel --prod
```

PowerShell users: ignore the red "node.exe : Vercel CLI 54.x" banner.
That is PowerShell rendering Vercel's stderr in red even though the
command succeeded. Look at the `status: ok` JSON at the bottom of the
output for the real outcome.

---

## What is already done (no action needed)

- `lib/notion-db.js` reader built and flattens to the same shape `lib/notion.js` returns. No orchestrator or prompt changes.
- `CONFIG.researchSource` toggle in `config.js` + `validateConfig()` adjusted per mode.
- `api/cron/daily.js` endpoint created (was missing entirely, so the deployed cron could never fire).
- `vercel/vercel.json` schedule fixed from a wrong `0 10 * * 1-5` to `30 3 * * 0,1,2,3,4` (06:30 IDT, Sun-Thu, Shabbat-aware).
- New env keys added to `env.example.txt` and `.env`.
- GitHub repo pushed (`origin/master` now at `fe8cb80`).
- Vercel project `leverage-signal-engine` linked to GitHub.
- Six env vars set on Vercel production: `CRON_SECRET` (generated, 32 random bytes base64url), `RESEARCH_SOURCE=page`, `DAILY_RESEARCH_NOTION_DS_ID`, `DRAFT_ONLY=true`, `TIMEZONE=Asia/Jerusalem`, `ANTHROPIC_MODEL=claude-opus-4-7`.
- `npm run test-notion-db` script added for local smoke testing.

Total time from "yes do it" to "live cron firing" is now the four secret pastes plus one deploy command.
