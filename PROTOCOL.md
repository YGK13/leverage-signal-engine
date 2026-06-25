# The Leverage Signal Protocol

**Canonical, version-controlled. This is the document the repo ships against.**
Author: Yuri Kruman, Grand Kru Ventures.
Maintained at: `github.com/YGK13/leverage-signal-engine/blob/main/PROTOCOL.md`.
Last updated: 2026-06-25.

---

## Read this first

If you are an operator, founder or fractional exec, this is the document you actually read. Skip `README.md` if you want the engineering map. Skip `SETUP.md` if you want the click-by-click install. This protocol is the operating model: what the system is, who it is for, why the pieces are arranged the way they are, and how to run it without being a developer.

Twelve minutes of reading. The system itself buys you back four hours a week of newsletter writing, every week, from week one.

---

## 1. Who this is for (the ICP, in plain language)

The Leverage Signal Protocol is built for one kind of reader-operator. If three of the five below describe you, this protocol is for you. If fewer, the system still works but the ROI is smaller.

1. You run something. A consultancy, a fund, a portfolio company, a founder-led B2B firm, an HR or finance or compliance practice, a fractional engagement, a PE platform. Your day is judgment calls, not throughput.
2. You already publish. A LinkedIn newsletter, a Beehiiv list, a Substack, an email cadence to clients. You know publishing is leverage. You also know it eats Wednesday mornings.
3. You have a point of view. You can name the trap your audience is in. You can name the move they should be making. You are not trying to be a generalist tech blogger. You are trying to be the specific voice for a specific buyer.
4. You are tech-fluent but not a developer. You can paste an API key, run a command in PowerShell or Terminal once, and follow numbered steps. You do not want to sit in VS Code for two hours debugging axios timeouts.
5. You value your editorial judgment, not your typing. You want a system that drafts in your voice well enough that your only job in the morning is to read, tighten, press Send. Five to ten minutes.

The Signal Protocol gives you back the writing hours and keeps the judgment in your hands. It does not autopilot your voice. It does the staging. You do the final ten percent that makes it sound like you.

If you are a content team head at a 200-person company, this still works. You become the editor and your one writer becomes the editor's editor. The cost goes from one full-time hire to four dollars a month in API calls.

---

## 2. What the Signal actually is

The Leverage Signal is the daily companion to The Leverage Brief. The Brief is the weekly long read. The Signal is one move, every weekday, before the day starts. Both ladder up to the same brand: AI-economy intelligence for operators.

The discipline of the Signal:

- One signal per issue. Not three, not five.
- One move per issue. Prescriptive. Specific. Named.
- 250 to 450 words. Read in ninety seconds. Forwarded in two.
- A weekly mode rotation. Monday, Wednesday, Friday are SIGNAL issues. Tuesday is BUILD. Thursday is READ. The rhythm itself is part of the brand.
- A virality gate. Issues are scored 0 to 10 across eight dimensions. Below 7 gets flagged red in your review email. You decide whether to ship anyway.

The reader walks away with a single decision they can make today. That is the contract.

---

## 3. The engine, one paragraph at a time

The engine is a small Node.js project that runs five minutes a day. Here is what happens between 06:30 and 06:35 IDT, every Sunday through Thursday morning, while you are still asleep or davening shacharit.

A Vercel cron fires the function at `/api/cron/daily`. The function reads your Notion research catalog. Anthropic Claude does four calls in sequence: pick the signal of the day, draft the issue in your voice, score it for virality, write a LinkedIn variant and an X thread. The drafted issue is posted to your Beehiiv publication as a draft, never a send. Resend emails you a single review link, the headline, the pull quote, the virality score and the social variants. You open the email, click through to Beehiiv, read for five minutes, edit if your taste says edit, press Send.

Total cost: two to four dollars a month in Anthropic API. Everything else is free.

Total daily time from your fingers: five to ten minutes.

The whole pipeline is designed so that any single step can fail and the operator still ships. If Notion is down, the engine uses yesterday's research. If Claude returns malformed JSON, the engine retries with a tightened prompt. If Beehiiv's API call fails, the engine still saves the full HTML body to `runs/YYYY-MM-DD/06-body.html` and the review email tells you to paste it manually. The protocol is fault-tolerant on purpose. Operators do not have time to debug pipelines before coffee.

---

## 4. Why Beehiiv, and the MCP path (the new way to wire it)

Beehiiv was chosen for three reasons. It has a real API for programmatic draft creation, which Substack does not. It has the best growth tooling in its class: a referral engine, recommendations, automations, paywalls. The editor is clean enough that the five-minute review is actually five minutes, not twenty.

There are now two ways for the engine to talk to Beehiiv. You should understand both.

### 4a. The REST path (what the repo ships with today)

`lib/beehiiv.js` calls `POST /v2/publications/{id}/posts` with your API key in the Authorization header. The body has `status: 'draft'` hard-wired, and the `DRAFT_ONLY` flag in `.env` is a second safety belt that refuses to send under any condition.

Pros: simple, well documented, works on any plan that exposes the Posts API.
Cons: the Posts API is gated to the Enterprise plan. On Launch (free) or Scale, the API returns 403 or 422 and the engine writes the HTML body to disk for manual paste. The engine handles this gracefully but you do trade five minutes back to copy-paste.

### 4b. The MCP path (the new and recommended way)

MCP stands for Model Context Protocol. It is the open standard from Anthropic for letting AI assistants talk to external systems through a uniform interface. Beehiiv now ships an official MCP server. It exposes the same Beehiiv API as a set of tools that Claude (and any MCP-aware client like Claude Code, Claude Desktop, Cursor or Zed) can call directly.

In plain English: instead of writing axios calls in JavaScript and shipping them to Vercel, you let Claude itself talk to Beehiiv through the MCP. The engine still runs unattended on a schedule. The difference is what is doing the lifting.

Why this matters for the Signal Protocol:

1. You stop writing API wrappers. The wrapper is replaced by a tool call. Less code, fewer bugs, easier to maintain.
2. You unlock the full Beehiiv surface, not just `createDraft`. The Beehiiv MCP exposes about a hundred operations: save post, edit post, save subscribe form, save segment, save automation, list subscriptions, get post stats, save image, save audio. You can now write features into the Signal protocol that the REST wrapper would have taken three weekends to build.
3. You can run the whole pipeline interactively. When something looks off in the morning's draft, you can ask Claude inside your editor: "Pull the last five issue stats from Beehiiv, tell me which headline pattern is winning, rewrite this morning's draft to that pattern." That conversation is the protocol after V1.

#### Setting up the Beehiiv MCP

The Beehiiv MCP installs into any client that supports the standard. The two most common for operators are Claude Desktop (for daily editorial work) and Claude Code (for the engine itself).

The pattern is the same in both places. Add the Beehiiv MCP server to your client configuration with two pieces of information: your Beehiiv API key and your publication ID. The client handles the connection and exposes the Beehiiv operations as callable tools.

For Claude Desktop, the configuration lives in `~/.config/Claude/claude_desktop_config.json` on Mac/Linux or `%APPDATA%\Claude\claude_desktop_config.json` on Windows. Add an entry under `mcpServers` for `beehiiv` with the official server URL, your API key as a header and your publication ID as a default argument.

For Claude Code, the configuration lives in `.claude/settings.json` at the project root, or in the user-level settings file. Same structure. Same two pieces of information. Same result.

Once installed, restart the client. Open a new conversation. Ask: "List my Beehiiv publications." If the tools are wired correctly, you get a structured response. From there every operation in the Beehiiv API is one tool call away.

#### When to use which path

| Situation | Use REST (`lib/beehiiv.js`) | Use MCP |
|---|---|---|
| Production cron, hands-off | Yes. The engine is already wired. | Optional. Convert when you want richer features. |
| Interactive editorial work in the morning | No, too much friction. | Yes. Ask Claude inside your editor, get answers. |
| Building new features (segments, automations, paywalls) | Painful. Each new endpoint is new axios code. | Yes. The MCP exposes the full surface. |
| Reading stats and learning what's working | Painful. | Yes. "Pull last 20 issue stats and tell me the open-rate pattern." |
| You are on the free Beehiiv plan | REST returns 403 on draft creation, falls back to manual paste. | MCP requires the same underlying API access. Same limitation. |

The protocol's V1 ships REST in production and uses MCP for editorial work. Over time the cron handler can be swapped to invoke a small Claude subagent that uses the MCP to create the draft, which retires `lib/beehiiv.js` and unlocks every other Beehiiv feature for free. That is V2 of the protocol, not V1. Do not rush it.

---

## 5. Install in twenty-five minutes

If you have never installed anything from GitHub before, this is the section. Read it once top to bottom, then start. Do not skip steps.

### Prerequisites

- Node.js 20 or later. Check with `node --version`. If it is below 20, install from `nodejs.org`.
- Git. Check with `git --version`. If you do not have it, install from `git-scm.com`.
- A terminal you are comfortable in. Windows: PowerShell or Git Bash. Mac: Terminal or iTerm.

### Step 1: clone and install

```bash
git clone https://github.com/YGK13/leverage-signal-engine.git
cd leverage-signal-engine
npm install
```

If `npm install` finishes without red errors, you are good. Warnings are fine.

### Step 2: get four keys

You need four credentials. Each takes two to four minutes.

1. **Anthropic API key.** Sign in at `console.anthropic.com`. Click API Keys. Create a new key. Copy it. Format: `sk-ant-...`.
2. **Notion integration token.** Sign in at `notion.so/profile/integrations`. New integration. Name it "Leverage Signal Engine". Workspace: yours. Capabilities: Read content only. Submit. Copy the Internal Integration Token. Format: `ntn_...`. **Then go to your research catalog page in Notion, click the three dots top-right, Connections, add Leverage Signal Engine.** This step is the single most common install failure. Do not skip it.
3. **Beehiiv API key and publication ID.** Sign in at `app.beehiiv.com`. Top-left, switch into your Signal publication (create one first if you do not have it: name it "The Leverage Signal", subtitle "Daily AI economy intelligence for operators"). Settings, Integrations, API. Create a new key, scope Read + Write. Copy it. The publication ID is on the same page or in the URL when you are in the publication dashboard. Format: `pub_...` or a bare UUID.
4. **Resend API key.** Sign in at `resend.com`. Verify a domain you control (use one you already own, do not buy a new domain for this). Copy the API key. Format: `re_...`. If you do not want to set up Resend, skip it. The engine prints the notification to console instead, and you can manually check Beehiiv for the draft.

### Step 3: fill in `.env`

```bash
cp env.example.txt .env
```

Open `.env` in your editor. Paste each key into the right slot. Save.

### Step 4: smoke test each connection

```bash
npm run test-anthropic
npm run test-notion
npm run test-beehiiv
```

Each command should print `{ ok: true, ... }`. If any prints an error, fix the corresponding key or integration and rerun. Do not move on until all three are green.

### Step 5: dry-run the full pipeline

```bash
npm run test-full-dry
```

This runs every step end-to-end except the actual Beehiiv post. It writes seven JSON files into `runs/YYYY-MM-DD/`. Open `06-body.html` in a browser. That is what your readers would see. Spend three minutes reading it. If the voice is wrong, the prompts in `prompts/` are where you tune it.

### Step 6: first live run

```bash
npm run daily
```

This posts a real draft to Beehiiv (status: draft, never auto-sent) and sends you the review email. Open the dashboard link in the email. Read. Edit. Press Send. Done.

You have just published your first Signal issue. Total active time: about ten minutes for the first run, five from issue two onward.

---

## 6. Schedule it (pick one)

You have three options for making the engine run every weekday morning without you starting it. Pick one. Do not run two.

### Option A: Vercel Cron (recommended for V1)

This is what the production deploy already uses.

```bash
cd vercel
vercel link    # link to a new or existing Vercel project
# Set every .env key in the Vercel dashboard
# Add CRON_SECRET (any long random string) to env vars
vercel deploy --prod
```

The cron is configured in `vercel/vercel.json` to fire `/api/cron/daily` at 06:30 UTC Sunday through Thursday. **Adjust the cron expression if you are not in Israel.** UTC 06:30 = IDT 09:30 in summer. To get IDT 06:30 in summer you want UTC 03:30, which is `30 3 * * 0,1,2,3,4`. To get IDT 06:30 in winter (no DST in Israel) you want UTC 04:30, which is `30 4 * * 0,1,2,3,4`. The DEPLOY-FINAL-STRETCH.md notes this trade-off.

Cost: $0 on the Vercel Hobby plan if you stay under the monthly invocation limit, which you will.

### Option B: Windows Task Scheduler

If your workstation runs from morning to night and you do not want a cloud deploy, use Task Scheduler.

Task Scheduler, Create Basic Task, name it "Leverage Signal Daily", trigger Daily at 06:30, Action Start a program, Program `C:\Program Files\nodejs\node.exe`, Arguments `run-daily.js`, Start in `C:\Users\yurik\Downloads\leverage-signal-engine`. After creation, edit the trigger to fire only on weekdays. Right-click the task and run it once to test.

Reliability is a function of whether your machine is awake at 06:30. If you sleep your machine overnight, this option does not work for you.

### Option C: node-cron (local long-lived process)

```bash
npm start
```

Keeps a Node process running, fires `run-daily.js` at 06:30 weekdays. Works on Mac or Linux desktops that stay on. Same caveat as Task Scheduler.

---

## 7. Editorial system (the parts you tune)

The engine has two tuning knobs. Use them.

### `config.js`

This file holds the schedule, the brand strings, the virality gate (default 7.0), the word-count band (default 250 to 450), the mode rotation (SIGNAL on Mon, Wed, Fri; BUILD on Tue; READ on Thu), the style rules ("no em dashes", "no Oxford comma", forbidden AI phrases). Read it once top to bottom. Change anything that is wrong for your brand.

### `prompts/*.md`

Four prompts drive the four Claude calls. Each prompt is plain markdown. Read them. Edit them. They are the highest-leverage place to invest time.

1. `01-pick-signal.md` selects THE signal of the day. Score the candidates yourself on the five criteria for a week, then push the prompt toward your taste.
2. `02-draft-issue.md` writes the issue. This is where voice lives. The first two weeks, expect to edit twenty percent of every draft. After ten edits, take the patterns you find yourself making and push them back into this prompt. By week three, you should be editing five percent.
3. `03-virality-score.md` scores 0 to 10 across eight dimensions. If your virality scores are stuck below 7, the prompt is being too defensive. Push it harder on contrarian framing.
4. `04-social-amplify.md` writes the LinkedIn post and X thread. The LinkedIn post should hook in line one, name a number in line two, and call out a named company by line three. If yours does not, tune this prompt.

Changes take effect on the next run. No deploy needed if you are running locally. On Vercel, a `git push` to the linked branch redeploys automatically.

---

## 8. Daily flow once it is running

```
05:30 your phone alarm   You wake up
06:30 IDT                Cron fires. Engine runs. Three to five minutes.
06:33                    Review email lands in your inbox.
07:30                    You open the email after davening / first coffee.
                         Click "Review and send in Beehiiv".
                         Read the draft. Edit two lines. Press Send.
                         Copy the LinkedIn variant from the email.
                         Paste it into LinkedIn. Post.
                         Copy the X thread. Post.
07:45                    Done. Move to the rest of your day.
```

Active time from your fingers: fifteen minutes, including the social posts. The Signal issue itself: five to ten of those.

If you are observing Shabbat, the cron is set to fire Sunday through Thursday only. There is no Friday issue and no Saturday issue. The mode rotation accounts for it.

---

## 9. What this protocol is not

To prevent scope drift, name what this is not.

- It is not a "post and forget" system. Every draft waits for your review. There is no path to auto-send. The `DRAFT_ONLY` flag in `.env` makes it impossible.
- It is not a distribution platform. The LinkedIn and X variants are written for you, but you post them. That is intentional. Owning the publish click is part of the discipline.
- It is not a subscriber management tool. List migration between publications (say, from The Leverage Brief to The Leverage Signal) is a one-time manual CSV export and import. Section 8 of `SETUP.md` walks through it.
- It is not an analytics dashboard. The Beehiiv UI is your dashboard. The MCP path lets you ask Claude about stats interactively but does not build you a graph.
- It is not generic. The voice rules in `prompts/02-draft-issue.md` are Yuri's. If you fork the engine, you fork the voice. Tune the prompts to your own.

---

## 10. Operating cost

Per daily issue: about eight to fifteen cents in Anthropic API. Four Claude Opus calls, totaling roughly 10,000 input tokens and 4,000 output tokens.

Monthly total: two to four dollars. That is the entire bill if you are on free tiers for Notion, Beehiiv Launch, Resend, Vercel Hobby.

If you upgrade Beehiiv to Scale ($39/mo) or Enterprise ($99-299/mo), that is a Beehiiv cost, not an engine cost. Upgrade when subscriber count or the friction of manual paste justifies it. Not before.

---

## 11. Troubleshooting (the five real failures)

Most issues are one of five. In order of frequency:

1. **Notion `object_not_found` (404).** The integration is not shared with the page. Open the research catalog page in Notion, three dots, Connections, add Leverage Signal Engine. Rerun.
2. **Beehiiv 401.** API key is wrong or revoked. Regenerate the key in Beehiiv settings, paste into `.env`, rerun.
3. **Beehiiv 403 on createDraft.** You are on a plan that does not expose the Posts API. The engine catches this and saves the HTML body to `runs/YYYY-MM-DD/06-body.html`. The review email tells you to paste manually. Either upgrade Beehiiv or paste.
4. **Virality score stuck below 7.** The drafting prompt is being too safe. Edit `prompts/02-draft-issue.md` and push it harder on contrarian framing, named companies, specific numbers in paragraph one. Rerun.
5. **Claude returns malformed JSON.** Lower the temperature in `lib/anthropic.js` for the offending step, or add an explicit "no markdown code fences" reminder to the prompt. Rerun.

If you hit a sixth: open an issue at `github.com/YGK13/leverage-signal-engine/issues` with the `runs/YYYY-MM-DD/` artifacts attached.

---

## 12. Iteration roadmap

After your first ten issues, run this protocol on yourself.

- Open `runs/*/04-virality.json`. Look for the weak-spot pattern. The same dimension scoring low across five days is a prompt problem, not a day problem. Fix the prompt.
- Open Beehiiv. Look at open rates per subject line and click rates per "The Move" line. The subject-line patterns that beat your baseline by ten points become the seed examples in `prompts/02-draft-issue.md`.
- Talk to three readers who forward your Signal often. Ask what they would pay for. The answer is V2 of the Signal: a paid tier, a private slack, a monthly briefing call. Build it next.

Post-V1 roadmap shipped in the repo:

- Auto-A/B test subject lines via Beehiiv's split-send feature.
- Pull historical open-rate data from Beehiiv into the virality scorer to close the feedback loop.
- Wire the LinkedIn and X amplifiers to post via API after the first six weeks of manual quality checks.
- Add an issue archive at `portlev.com/signal` that mirrors past Signal issues, indexed for search.
- Convert the cron handler to an MCP-driven subagent, retire `lib/beehiiv.js`, unlock the full Beehiiv surface for the engine itself.

---

## 13. The contract with your reader

Every issue ends in a decision, never a question. Specific numbers in paragraph one. Named companies and people throughout. Name the trap before the move. No em dashes. No Oxford comma. No AI tells ("certainly", "delve", "robust", "in today's fast-paced world").

These rules are encoded in `config.js`, in every prompt, in this protocol. They are not preferences. They are the discipline that separates the Signal from the noise.

If you fork the engine, change the surface details (brand, schedule, voice), keep the discipline. The discipline is what makes any daily newsletter worth showing up for.

---

*The Leverage Signal Protocol. Maintained by Yuri Kruman and Grand Kru Ventures. Published under Portfolio Leverage Co. PRs welcome at `github.com/YGK13/leverage-signal-engine`.*
