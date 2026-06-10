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

  // --- Research source toggle ---
  // 'page' = original lib/notion.js reader (long-form Research Hub page)
  // 'db'   = lib/notion-db.js reader (Daily AI Signal database written by the
  //          upstream `leverage-brief-daily-research` dispatcher)
  // The DB id is sourced from env or the hardcoded default in lib/notion-db.js.
  researchSource: (process.env.RESEARCH_SOURCE || 'page'),
  dailyResearchDsId: process.env.DAILY_RESEARCH_NOTION_DS_ID || 'fc49c2b2-ea33-43e1-af59-20cfe89060fa',

  // --- Schedule ---
  dailyCron: process.env.DAILY_CRON || '30 6 * * 1-5',
  timezone: process.env.TIMEZONE || 'Asia/Jerusalem',

  // --- Behavior ---
  draftOnly: (process.env.DRAFT_ONLY || 'true') === 'true',
  logRetentionDays: parseInt(process.env.LOG_RETENTION_DAYS || '30', 10),

  // --- Brand ---
  brand: {
    publication: 'The Leverage Signal',
    subtitle: 'Daily AI economy intelligence for operators — one signal, one move, every weekday.',
    author: 'Yuri Kruman',
    authorTitle: '3x CHRO/CLO · AI trainer (Meta, Microsoft, OpenAI) · Founder, Portfolio Leverage Co.',
    url: 'https://leveragesignal.beehiiv.com',
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
  wordCounts: {
    SIGNAL: { min: 280, target: 350, max: 420 },
    BUILD:  { min: 350, target: 450, max: 550 },
    READ:   { min: 200, target: 260, max: 320 },
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
    'Subject line: 6-9 words, curiosity gap or contradiction.',
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
