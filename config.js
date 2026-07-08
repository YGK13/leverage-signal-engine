// ============================================================
// config.js — Editorial rules, brand constants, schedule.
// Single source of truth for all behavior knobs.
// ============================================================

import { config as loadEnv } from 'dotenv';
loadEnv({ override: true }); // override: true so process env blanks don't block .env values

export const CONFIG = {
  // --- API keys (from .env) ---
  anthropicKey: process.env.ANTHROPIC_API_KEY,
  anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-opus-4-7',
  notionKey: process.env.NOTION_API_KEY,
  notionPageId: process.env.NOTION_PAGE_ID,
  beehiivKey: process.env.BEEHIIV_API_KEY,
  beehiivPublicationId: process.env.BEEHIIV_PUBLICATION_ID,
  resendKey: process.env.RESEND_API_KEY,
  notifyFrom: process.env.NOTIFY_EMAIL_FROM,
  notifyTo: process.env.NOTIFY_EMAIL_TO,
  slackWebhook: process.env.SLACK_WEBHOOK_URL,

  // --- CTA system (rebuilt 2026-07-08 on the performance playbook) ---
  // The data: 74.7% open, 0.49% click-to-open. Opens are elite, clicks are the
  // bottleneck. Founding editions that ran ONE argument + ONE move clicked at
  // 3 to 7%. The multi-link roundup collapsed that to 0.5% (paradox of choice).
  //
  // Rule: exactly ONE primary CTA per issue, rotated daily to test which offer
  // converts. A low-friction "book a 15-min call" is ALWAYS present as the
  // secondary option, so there is always a way to reach Yuri with zero commitment.
  // No competing links anywhere else in the body.
  //
  // Order below is the rotation order (by day-of-year). Override any single
  // issue with --cta=<id>.
  ctaRotation: [
    {
      id: 'ai-org-audit',
      label: 'Get your AI Org Audit',
      url: 'https://portlev.com/ai-org-audit',
      // SMB-owner framing: concrete, outcome-first, no jargon, no enterprise-speak.
      blurb:
        'Book the AI Org Audit. One working session, one scorecard, a ranked fix list showing exactly where AI is adding margin and where it is quietly bleeding it. Built for owner-operators, not enterprises.',
    },
    {
      id: 'executive-ai-cohort',
      label: 'Join the Executive AI Cohort',
      url: 'https://forwardshare.co/executive-ai-cohort-forward-achieve-forward-share-ventures',
      blurb:
        'A cohort for executives and owners who want to run AI, not get run over by it. Hands-on, peer-driven, built around your real P&L. Limited seats per cohort.',
    },
    {
      id: 'authority-stack',
      label: 'Build your Authority Stack',
      url: 'https://learn.portlev.com/authority-stack',
      blurb:
        'Turn your expertise into inbound. The Authority Stack shows owner-operators how to compound reputation into pipeline without becoming a full-time content machine.',
    },
    {
      id: 'caio-course',
      label: 'Start the CAIO course',
      // TODO(yuri): confirm the exact CAIO course URL; learn.portlev.com is a placeholder.
      url: 'https://learn.portlev.com',
      blurb:
        'Become the Chief AI Officer your company already needs. The CAIO course is the operator playbook for owning AI strategy end to end.',
    },
  ],

  // Always present in EVERY issue, regardless of the rotated primary CTA.
  // The lowest-friction "just talk to me" path. 15 minutes, no pitch.
  bookCall: {
    label: 'Book a 15-min call',
    url: 'https://calendly.com/masterthetalk/15-minute-orchestration-check?back=1',
  },

  // CTA placement for the beginning-vs-end test. 'bottom' is the proven default
  // (every founding edition closed on the move). 'top' and 'both' are for testing.
  // Override per-issue with --cta-position=top|bottom|both.
  ctaPosition: process.env.CTA_POSITION || 'bottom',

  // UTM tagging so every click is attributable to the edition + offer that drove
  // it. Playbook instrumentation gap: without this you cannot tie revenue to a
  // topic, only clicks. Campaign slug is set per-issue in run-daily.js.
  utmSource: 'leverage_signal',

  // --- Research source toggle ---
  // 'page' = original lib/notion.js reader (long-form Research Hub page)
  // 'db'   = lib/notion-db.js reader (Daily AI Signal database written by the
  //          upstream `leverage-brief-daily-research` dispatcher)
  // The DB id is sourced from env or the hardcoded default in lib/notion-db.js.
  researchSource: (process.env.RESEARCH_SOURCE || 'page'),
  dailyResearchDsId: process.env.DAILY_RESEARCH_NOTION_DS_ID || 'fc49c2b2-ea33-43e1-af59-20cfe89060fa',

  // --- Schedule ---
  dailyCron: process.env.DAILY_CRON || '0 7 * * 1-5',
  timezone: process.env.TIMEZONE || 'Asia/Jerusalem',

  // --- Behavior ---
  draftOnly: (process.env.DRAFT_ONLY || 'true') === 'true',
  logRetentionDays: parseInt(process.env.LOG_RETENTION_DAYS || '30', 10),

  // --- Brand ---
  brand: {
    publication: 'The Leverage Signal',
    subtitle: 'Daily AI economy intelligence for operators: one signal, one move, every weekday.',
    author: 'Yuri Kruman',
    authorTitle: '3x CHRO/CLO · AI trainer (Meta, Microsoft, OpenAI) · Founder, Portfolio Leverage Co.',
    url: 'https://leveragesignal.beehiiv.com',
    // Home destination for the logo click and the brand wordmark.
    homeUrl: 'https://portlev.com',
    // Hosted PNG for the logo in the email header. Email clients cannot render
    // local files or inline SVG reliably, so this must be a public URL.
    // Empty string = fall back to a gold "PortLev" text wordmark (always clickable).
    logoUrl: process.env.BRAND_LOGO_URL || '',
    reply: 'Reply to this email; I read every one.',
    colors: {
      ink: '#0A0A0A',
      gold: '#C9A451',
      white: '#F8F8F5',
      muted: '#8A8A8A',
    },
  },

  // --- Editorial: rotating daily modes ---
  // Monday/Wednesday/Friday: THE SIGNAL (pattern + implication)
  // Tuesday: THE BUILD (a tool/playbook with setup path)
  // Thursday: THE READ (one piece of content with two sentences on why)
  modes: {
    1: 'SIGNAL', // Monday
    2: 'BUILD',  // Tuesday
    3: 'SIGNAL', // Wednesday
    4: 'READ',   // Thursday
    5: 'SIGNAL', // Friday
  },

  // --- Word count targets per mode ---
  // All modes match SIGNAL length — subscribers expect consistent depth every day.
  wordCounts: {
    SIGNAL: { min: 320, target: 380, max: 450 },
    BUILD:  { min: 320, target: 380, max: 450 },
    READ:   { min: 320, target: 380, max: 450 },
  },

  // --- Quality gates ---
  // Minimum virality score (0-10) below which the system still posts draft
  // but flags it red in the notification for heavier revision.
  viralityGate: 7.0,

  // --- Style rules (encoded into prompts) ---
  styleRules: [
    'NO em dashes. Use colons, commas or rewrite the sentence.',
    'NO Oxford comma. "A, B and C" not "A, B, and C".',
    'No "certainly", "great question", "I would suggest" or other AI tells.',
    'Every section ends in a decision or action, never a question.',
    'Specific numbers in the first paragraph. Named companies and people.',
    'Operator language: margin, headcount, cycle time, P&L, win rate.',
    'No analyst hedging. Pick a side. Defend it.',
    'One contrarian read per issue: name the trap, then name the move.',
    'Length matches mode target (see wordCounts).',
    'Subject line: name a real authority or company, a concrete action, and "you/your".',
  ],
};

// --- Helpers ---
export function modeForToday(date = new Date()) {
  const day = date.getDay(); // 0=Sun, 1=Mon, ... 5=Fri
  return CONFIG.modes[day] || 'SIGNAL';
}

export function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

// Pick the single CTA for a given day. Rotates through ctaRotation by day-of-year
// so the whole set cycles regardless of weekday. Pass overrideId (from --cta=)
// to force a specific offer for one issue.
export function ctaForToday(date = new Date(), overrideId = null) {
  const list = CONFIG.ctaRotation;
  if (overrideId) {
    const found = list.find((c) => c.id === overrideId);
    if (found) return found;
    // Unknown id: fall through to rotation rather than shipping no CTA.
  }
  const start = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date - start) / 86400000);
  return list[dayOfYear % list.length];
}

// Append UTM params so every click is attributable to the edition + offer.
// Safe against URLs that already carry a query string (e.g. the Calendly ?back=1).
export function withUtm(url, campaign) {
  if (!url) return url;
  const sep = url.includes('?') ? '&' : '?';
  const c = encodeURIComponent(campaign || 'daily');
  return `${url}${sep}utm_source=${CONFIG.utmSource}&utm_medium=newsletter&utm_campaign=${c}`;
}

export function validateConfig() {
  // In 'db' mode the page id is not used, so drop it from the required list.
  const required = [
    'anthropicKey',
    'notionKey',
    'beehiivKey',
    'beehiivPublicationId',
  ]
  if (CONFIG.researchSource === 'page') required.push('notionPageId')
  if (CONFIG.researchSource === 'db')   required.push('dailyResearchDsId')

  const missing = required.filter((k) => !CONFIG[k]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required env vars: ${missing.join(', ')}. See .env.example.`
    );
  }

  if (!['page', 'db'].includes(CONFIG.researchSource)) {
    throw new Error(
      `Invalid RESEARCH_SOURCE='${CONFIG.researchSource}'. Use 'page' or 'db'.`
    );
  }
}
