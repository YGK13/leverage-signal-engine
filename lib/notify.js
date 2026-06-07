// ============================================================
// lib/notify.js — Ping Yuri when the day's draft is ready
// Supports: Resend (email) and Slack webhook. Falls back to console.
// ============================================================

import axios from 'axios';
import { CONFIG } from '../config.js';

/**
 * Send the daily review notification.
 *
 * @param {object} args
 * @param {string} args.subjectLine — final email subject
 * @param {string} args.eyebrow — section label
 * @param {string} args.headline — combined headline (white + gold concatenated)
 * @param {string} args.pullQuote — tweetable line
 * @param {number} args.viralityScore — 0-10
 * @param {string} args.viralityReason — one-sentence explanation
 * @param {string[]} args.alternateSubjects — backup subject lines
 * @param {string} args.dashboardUrl — Beehiiv draft edit URL
 * @param {string} args.linkedinPost — pre-baked LinkedIn variant
 * @param {string[]} args.xThread — pre-baked X thread tweets
 * @param {string} args.mode — SIGNAL / BUILD / READ
 * @param {string} args.date — YYYY-MM-DD
 */
export async function notifyReviewReady(args) {
  const html = buildEmailHtml(args);
  const text = buildPlainText(args);

  let sent = false;

  if (CONFIG.resendKey && CONFIG.notifyFrom && CONFIG.notifyTo) {
    try {
      await sendResend({ html, text, subject: `[Leverage Signal] Draft ready for review · ${args.date}` });
      sent = true;
      console.log(`[notify] Email sent to ${CONFIG.notifyTo}`);
    } catch (e) {
      console.error(`[notify] Resend failed: ${e.message}`);
    }
  }

  if (CONFIG.slackWebhook && !sent) {
    try {
      await sendSlack(text);
      sent = true;
      console.log('[notify] Slack message sent.');
    } catch (e) {
      console.error(`[notify] Slack failed: ${e.message}`);
    }
  }

  if (!sent) {
    console.log('\n========== [notify] No channel configured. Console output: ==========');
    console.log(text);
    console.log('=====================================================================\n');
  }
}

async function sendResend({ html, text, subject }) {
  await axios.post(
    'https://api.resend.com/emails',
    {
      from: CONFIG.notifyFrom,
      to: CONFIG.notifyTo,
      subject,
      html,
      text,
    },
    {
      headers: {
        Authorization: `Bearer ${CONFIG.resendKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    }
  );
}

async function sendSlack(text) {
  await axios.post(CONFIG.slackWebhook, { text }, { timeout: 10000 });
}

function buildPlainText(a) {
  const score = typeof a.viralityScore === 'number' ? a.viralityScore.toFixed(1) : '?';
  const flag = a.viralityScore != null && a.viralityScore < CONFIG.viralityGate ? '⚠️ BELOW GATE' : '✓';

  const lines = [
    `LEVERAGE SIGNAL — ${a.date} (${a.mode})`,
    `Virality: ${score}/10 ${flag}`,
    `  ${a.viralityReason || ''}`,
    '',
    `Subject: ${a.subjectLine}`,
    `Preheader: ${a.preheader || ''}`,
    `Eyebrow: ${a.eyebrow}`,
    `Headline: ${a.headline}`,
    '',
    `Pull quote:`,
    `  "${a.pullQuote}"`,
    '',
    a.manualPost
      ? `⚠ MANUAL POST REQUIRED → Open Beehiiv and paste: ${a.dashboardUrl}`
      : `Review + send → ${a.dashboardUrl}`,
    '',
    `Alt subject lines:`,
    ...(a.alternateSubjects || []).map((s, i) => `  ${i + 1}. ${s}`),
  ];

  if (a.theMove) {
    lines.push('', '--- THE MOVE ---', a.theMove);
  }

  lines.push(
    '',
    '--- LinkedIn variant ---',
    a.linkedinPost || '(none)',
    '',
    '--- X thread ---',
    ...((a.xThread || []).map((t, i) => `${i + 1}/${(a.xThread || []).length}  ${t}`)),
  );

  return lines.join('\n');
}

function buildEmailHtml(a) {
  const C = CONFIG.brand.colors;
  const score = typeof a.viralityScore === 'number' ? a.viralityScore.toFixed(1) : '?';
  const gateColor = a.viralityScore >= CONFIG.viralityGate ? C.gold : '#d97a4a';
  const alts = (a.alternateSubjects || [])
    .map((s, i) => `<li style="margin:6px 0;">${escape(s)}</li>`)
    .join('');
  const xt = (a.xThread || [])
    .map((t, i) => `<div style="padding:10px 0;border-bottom:1px solid #eee;font-size:14px;">${i + 1}/${a.xThread.length} &mdash; ${escape(t)}</div>`)
    .join('');

  return `
<div style="font-family:system-ui,-apple-system,'Helvetica Neue',sans-serif;max-width:680px;margin:0 auto;padding:24px;color:#1a1a1a;">
  <div style="font-size:11px;letter-spacing:0.18em;color:#888;text-transform:uppercase;">LEVERAGE SIGNAL · ${a.date} · ${a.mode}</div>
  <h1 style="font-size:24px;margin:8px 0 16px;">Draft ready for review</h1>

  <div style="background:#fafaf7;padding:16px;border-left:3px solid ${gateColor};margin-bottom:20px;">
    <div style="font-size:13px;color:#666;">Virality score</div>
    <div style="font-size:28px;font-weight:700;color:${gateColor};">${score} / 10</div>
    <div style="font-size:13px;color:#444;margin-top:4px;">${escape(a.viralityReason || '')}</div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
    <tr><td style="padding:6px 0;font-size:12px;color:#888;width:90px;">Subject</td><td style="padding:6px 0;font-weight:600;">${escape(a.subjectLine)}</td></tr>
    <tr><td style="padding:6px 0;font-size:12px;color:#888;">Eyebrow</td><td style="padding:6px 0;">${escape(a.eyebrow)}</td></tr>
    <tr><td style="padding:6px 0;font-size:12px;color:#888;">Headline</td><td style="padding:6px 0;font-weight:600;">${escape(a.headline)}</td></tr>
  </table>

  <blockquote style="margin:0 0 24px;padding:14px 18px;border-left:3px solid #C9A451;background:#fafaf7;font-style:italic;">
    "${escape(a.pullQuote || '')}"
  </blockquote>

  ${a.manualPost
    ? `<div style="background:#fff8e6;border:1px solid #C9A451;border-radius:4px;padding:14px 16px;margin-bottom:20px;">
        <div style="font-weight:700;font-size:14px;color:#7a5c00;margin-bottom:6px;">⚠ Manual post required (Beehiiv API is Enterprise-only)</div>
        <div style="font-size:13px;color:#555;margin-bottom:10px;">Open Beehiiv, create a new post, and paste the draft below. All content is ready.</div>
        <a href="${escape(a.dashboardUrl)}" style="display:inline-block;padding:10px 18px;background:#C9A451;color:#fff;text-decoration:none;font-weight:600;font-size:14px;">Create new post in Beehiiv →</a>
      </div>`
    : `<a href="${escape(a.dashboardUrl)}" style="display:inline-block;padding:14px 22px;background:#0A0A0A;color:#F8F8F5;text-decoration:none;font-weight:600;font-size:15px;letter-spacing:0.05em;text-transform:uppercase;margin-bottom:28px;">Review &amp; send in Beehiiv →</a>`
  }

  <h3 style="font-size:15px;margin:24px 0 8px;color:#444;">Alternate subject lines</h3>
  <ul style="font-size:14px;color:#333;padding-left:18px;margin:0 0 24px;">${alts}</ul>

  ${a.theMove ? `
  <h3 style="font-size:15px;margin:24px 0 8px;color:#444;">The Move</h3>
  <div style="background:#fafaf7;padding:14px 16px;font-size:14px;border-left:3px solid #C9A451;white-space:pre-wrap;">${escape(a.theMove)}</div>
  ` : ''}

  ${(a.weakSpots || []).length > 0 ? `
  <h3 style="font-size:15px;margin:24px 0 8px;color:#d97a4a;">Virality weak spots</h3>
  <ul style="font-size:13px;color:#555;padding-left:18px;margin:0 0 24px;">
    ${(a.weakSpots || []).map(w => `<li style="margin:4px 0;">${escape(w)}</li>`).join('')}
  </ul>
  ` : ''}

  <h3 style="font-size:15px;margin:24px 0 8px;color:#444;">LinkedIn post (after send)</h3>
  <div style="background:#fafaf7;padding:14px 16px;font-size:14px;white-space:pre-wrap;border-left:3px solid #0077b5;">${escape(a.linkedinPost || '')}</div>

  <h3 style="font-size:15px;margin:24px 0 8px;color:#444;">X thread (after send)</h3>
  <div style="background:#fafaf7;padding:14px 16px;border-left:3px solid #000;">${xt}</div>

  ${a.manualPost && a.bodyHtml ? `
  <details style="margin-top:32px;">
    <summary style="cursor:pointer;font-weight:600;font-size:14px;color:#444;padding:10px 0;">
      📋 Full HTML body (copy into Beehiiv editor)
    </summary>
    <textarea style="width:100%;height:300px;font-size:12px;font-family:monospace;margin-top:10px;padding:10px;border:1px solid #ddd;box-sizing:border-box;" readonly>${escape(a.bodyHtml)}</textarea>
  </details>
  ` : ''}
</div>
`.trim();
}

function escape(s) {
  if (s == null) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
