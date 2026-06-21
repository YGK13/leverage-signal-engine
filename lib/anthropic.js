// ============================================================
// lib/anthropic.js — Claude API wrapper for picking, drafting, scoring
// Keeps all model calls in one place. Heavy use of system prompts.
// ============================================================

import Anthropic from '@anthropic-ai/sdk';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONFIG } from '../config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPTS_DIR = join(__dirname, '..', 'prompts');

const client = new Anthropic({ apiKey: CONFIG.anthropicKey });

async function loadPrompt(name) {
  return readFile(join(PROMPTS_DIR, name), 'utf8');
}

async function call({ system, user, maxTokens = 4096 }) {
  // temperature is deprecated for claude-opus-4-7 and newer models — omit entirely
  const res = await client.messages.create({
    model: CONFIG.anthropicModel,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: user }],
  });
  // Concatenate text blocks
  return res.content.map((b) => b.text || '').join('').trim();
}

/**
 * Step 1: Pick THE signal of the day from the day's research catalog.
 * Returns JSON: { selectedSignal, headline, rationale, alternates: [...] }
 */
export async function pickSignal({ dailyUpdate, weeklyMeta, mode, date }) {
  const system = await loadPrompt('01-pick-signal.md');
  const user = [
    `MODE TODAY: ${mode}`,
    `DATE: ${date}`,
    '',
    '=== TODAY\'S RESEARCH CATALOG (DAILY UPDATE) ===',
    dailyUpdate || '(no daily update available; use weekly meta only)',
    '',
    '=== THIS WEEK\'S META-TRENDS (FOR CONTEXT) ===',
    weeklyMeta || '(none available)',
    '',
    'Return ONLY valid JSON, no prose before or after.',
  ].join('\n');

  const raw = await call({ system, user, temperature: 0.5, maxTokens: 2048 });
  return parseJSON(raw, 'pickSignal');
}

/**
 * Step 2: Draft the full Leverage Signal issue.
 * Input: signal selection from step 1.
 * Returns JSON: { subjectLine, preheader, eyebrow, headlineWhite, headlineGold, bodyHtml, theMove, pullQuote, alternateSubjects: [...] }
 */
export async function draftIssue({ selection, mode, date, dailyUpdate }) {
  const system = await loadPrompt('02-draft-issue.md');
  const user = [
    `MODE: ${mode}`,
    `DATE: ${date}`,
    `STYLE RULES:`,
    CONFIG.styleRules.map((r, i) => `${i + 1}. ${r}`).join('\n'),
    '',
    `WORD COUNT TARGET (body only): ${CONFIG.wordCounts[mode].target} words (min ${CONFIG.wordCounts[mode].min}, max ${CONFIG.wordCounts[mode].max})`,
    '',
    `PUBLICATION: ${CONFIG.brand.publication}`,
    `AUTHOR: ${CONFIG.brand.author}`,
    `CTA_DEFAULT_URL: ${CONFIG.ctaDefaultUrl}`,
    `CTA_DEFAULT_LABEL: ${CONFIG.ctaDefaultLabel}`,
    '',
    '=== SIGNAL SELECTION (from step 1) ===',
    JSON.stringify(selection, null, 2),
    '',
    '=== SOURCE RESEARCH (today\'s daily update) ===',
    dailyUpdate || '(see selection above)',
    '',
    'Return ONLY valid JSON. No prose, no markdown fences, no commentary.',
  ].join('\n');

  const raw = await call({ system, user, temperature: 0.65, maxTokens: 4096 });
  return parseJSON(raw, 'draftIssue');
}

/**
 * Step 3: Score the draft for virality (0-10) with diagnostic feedback.
 * Returns JSON: { score, breakdown: {...}, weakSpots: [...], suggestions: [...] }
 */
export async function scoreVirality({ draft, mode }) {
  const system = await loadPrompt('03-virality-score.md');
  const user = [
    `MODE: ${mode}`,
    '',
    '=== DRAFT TO SCORE ===',
    JSON.stringify(draft, null, 2),
    '',
    'Return ONLY valid JSON.',
  ].join('\n');

  const raw = await call({ system, user, temperature: 0.3, maxTokens: 1500 });
  return parseJSON(raw, 'scoreVirality');
}

/**
 * Step 4: Generate distribution amplifiers (LinkedIn post + X thread).
 * Returns JSON: { linkedinPost, xThread: [...], linkedinHook, xHook }
 */
export async function generateAmplifiers({ draft, mode }) {
  const system = await loadPrompt('04-social-amplify.md');
  const user = [
    `MODE: ${mode}`,
    `AUTHOR: ${CONFIG.brand.author}`,
    '',
    '=== DRAFT (source material) ===',
    JSON.stringify(draft, null, 2),
    '',
    'Return ONLY valid JSON.',
  ].join('\n');

  const raw = await call({ system, user, temperature: 0.7, maxTokens: 2048 });
  return parseJSON(raw, 'generateAmplifiers');
}

// ----- Helpers --------------------------------------------------------------

function parseJSON(raw, step) {
  // Defensive: strip markdown fences if model included them.
  let s = raw.trim();
  if (s.startsWith('```')) {
    s = s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  }
  try {
    return JSON.parse(s);
  } catch (e) {
    throw new Error(`[${step}] Model did not return valid JSON.\nRaw output:\n${raw.slice(0, 2000)}\n\nParse error: ${e.message}`);
  }
}

/** Smoke test: confirm credentials work. */
export async function testCall() {
  const res = await client.messages.create({
    model: CONFIG.anthropicModel,
    max_tokens: 50,
    messages: [{ role: 'user', content: 'Reply with just the word: OK' }],
  });
  return { ok: true, model: CONFIG.anthropicModel, response: res.content[0].text };
}
