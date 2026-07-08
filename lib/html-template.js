// ============================================================
// lib/html-template.js — Email HTML matching The Leverage Signal brand
// Builds the body_content for Beehiiv: dark mode, gold accent, Inter type.
// Beehiiv injects its own header/footer; we control the body.
//
// CTA model (2026-07-08 playbook): exactly ONE primary CTA per issue, placed
// top / bottom / both per d.ctaPosition, plus an always-present low-friction
// "book a 15-min call" line. The PortLev logo sits at the top, hyperlinked home.
// ============================================================

import { CONFIG } from '../config.js';

const C = CONFIG.brand.colors;

/**
 * Build the full HTML body for a Signal issue.
 *
 * @param {object} d — drafted issue
 * @param {string} d.eyebrow — small uppercase label, e.g. "THE SIGNAL · AI LABOR DATA"
 * @param {string} d.headlineWhite — first headline line (renders white)
 * @param {string} d.headlineGold — second headline line (renders gold). Optional.
 * @param {string} d.bodyHtml — main body HTML (paragraphs, lists, blockquotes)
 * @param {string} d.theMove — the prescriptive action (1-2 sentences)
 * @param {string} d.pullQuote — tweetable line for the shareable callout
 * @param {string} d.ctaLabel — button text for the single primary CTA
 * @param {string} d.ctaUrl — destination for the single primary CTA (UTM-tagged)
 * @param {string} d.bookCallLabel — text for the always-present call link
 * @param {string} d.bookCallUrl — destination for the always-present call link
 * @param {string} d.ctaPosition — 'top' | 'bottom' | 'both'
 * @param {object} meta — { date, mode, issueNumber }
 */
export function buildIssueHtml(d, meta) {
  const issueLine = [
    CONFIG.brand.publication.toUpperCase(),
    `ISSUE #${meta.issueNumber || '—'}`,
    formatDate(meta.date),
  ].join('  ·  ');

  const pos = (d.ctaPosition || 'bottom').toLowerCase();
  const showTop = pos === 'top' || pos === 'both';
  const showBottom = pos === 'bottom' || pos === 'both';

  return `
<div style="background:${C.ink};color:${C.white};font-family:Inter,'Helvetica Neue',Arial,sans-serif;padding:0;margin:0;">

  <!-- PortLev logo, hyperlinked home -->
  <div style="padding:28px 36px 0;">
    <a href="${escapeHtml(CONFIG.brand.homeUrl)}" style="text-decoration:none;">
      ${CONFIG.brand.logoUrl
        ? `<img src="${escapeHtml(CONFIG.brand.logoUrl)}" alt="PortLev" width="120" style="display:block;border:0;outline:none;height:auto;max-width:120px;" />`
        : `<span style="font-size:18px;font-weight:900;letter-spacing:0.16em;color:${C.gold};text-transform:uppercase;">PortLev</span>`
      }
    </a>
  </div>

  <!-- Top utility bar -->
  <div style="padding:22px 36px 0;font-size:11px;letter-spacing:0.18em;color:${C.muted};text-transform:uppercase;">
    ${escapeHtml(issueLine)}
  </div>
  <div style="margin:18px 36px 28px;height:1px;background:${C.gold};opacity:0.45;"></div>

  <!-- Eyebrow label with mini pulse dot -->
  <div style="padding:0 36px;margin-bottom:18px;">
    <span style="display:inline-block;width:8px;height:8px;background:${C.gold};border-radius:50%;vertical-align:middle;margin-right:10px;"></span>
    <span style="font-size:12px;font-weight:700;letter-spacing:0.18em;color:${C.gold};text-transform:uppercase;vertical-align:middle;">
      ${escapeHtml(d.eyebrow || 'THE SIGNAL')}
    </span>
  </div>

  <!-- Display headline -->
  <div style="padding:0 36px 28px;">
    <div style="font-size:36px;line-height:1.05;font-weight:900;color:${C.white};letter-spacing:-0.01em;margin-bottom:6px;">
      ${escapeHtml(d.headlineWhite || '')}
    </div>
    ${d.headlineGold ? `<div style="font-size:36px;line-height:1.05;font-weight:900;color:${C.gold};letter-spacing:-0.01em;">${escapeHtml(d.headlineGold)}</div>` : ''}
  </div>

  <div style="margin:0 36px 28px;height:1px;background:${C.gold};opacity:0.25;"></div>

  ${showTop ? primaryCtaBlock(d) : ''}

  <!-- Body -->
  <div style="padding:0 36px;font-size:17px;line-height:1.62;color:${C.white};font-weight:400;">
    ${d.bodyHtml || ''}
  </div>

  <!-- Pull quote (shareable) -->
  ${d.pullQuote ? `
  <div style="margin:36px 36px;padding:24px 28px;border-left:3px solid ${C.gold};background:rgba(201,164,81,0.06);">
    <div style="font-size:11px;letter-spacing:0.18em;color:${C.gold};text-transform:uppercase;margin-bottom:10px;font-weight:700;">
      Pull quote
    </div>
    <div style="font-size:19px;line-height:1.45;color:${C.white};font-weight:700;">
      &ldquo;${escapeHtml(d.pullQuote)}&rdquo;
    </div>
  </div>` : ''}

  <!-- The Move -->
  ${d.theMove ? `
  <div style="margin:36px;padding:28px;background:#141414;border:1px solid rgba(201,164,81,0.35);">
    <div style="font-size:12px;letter-spacing:0.18em;color:${C.gold};text-transform:uppercase;margin-bottom:12px;font-weight:700;">
      The Move
    </div>
    <div style="font-size:17px;line-height:1.55;color:${C.white};">
      ${d.theMove}
    </div>
  </div>` : ''}

  ${showBottom ? primaryCtaBlock(d) : ''}

  <!-- Always-present low-friction call option -->
  ${bookCallLine(d)}

  <!-- Hairline -->
  <div style="margin:24px 36px 18px;height:1px;background:${C.gold};opacity:0.35;"></div>

  <!-- Sign-off -->
  <div style="padding:0 36px 12px;font-size:14px;line-height:1.6;color:${C.muted};">
    — ${escapeHtml(CONFIG.brand.author)}<br/>
    <span style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;">
      ${escapeHtml(CONFIG.brand.authorTitle)}
    </span>
  </div>

  <div style="padding:0 36px 12px;font-size:13px;line-height:1.55;color:${C.muted};">
    ${escapeHtml(CONFIG.brand.reply)}
  </div>

  <!-- Brand footer link -->
  <div style="padding:0 36px 36px;font-size:12px;line-height:1.5;color:${C.muted};">
    <a href="${escapeHtml(CONFIG.brand.homeUrl)}" style="color:${C.gold};text-decoration:none;font-weight:600;letter-spacing:0.06em;">Portfolio Leverage Co. · portlev.com</a>
  </div>

</div>
`.trim();
}

// ----- CTA render helpers ---------------------------------------------------

// The single primary CTA: a full-width gold button. Rendered at top, bottom or
// both per d.ctaPosition. This is the ONLY money link in the issue.
function primaryCtaBlock(d) {
  if (!d.ctaUrl) return '';
  return `
  <div style="margin:0 36px 16px;">
    <a href="${escapeHtml(d.ctaUrl)}" style="display:block;padding:22px 24px;background:${C.gold};color:${C.ink};text-decoration:none;font-weight:800;font-size:16px;letter-spacing:0.08em;text-transform:uppercase;text-align:center;">
      ${escapeHtml(d.ctaLabel || 'Take the next step')} &rarr;
    </a>
  </div>`;
}

// The always-present, zero-commitment path to reach Yuri. Secondary to the
// primary CTA in weight, but present in every single issue.
function bookCallLine(d) {
  if (!d.bookCallUrl) return '';
  return `
  <div style="margin:0 36px 12px;text-align:center;font-size:14px;color:${C.muted};">
    Prefer to talk it through?
    <a href="${escapeHtml(d.bookCallUrl)}" style="color:${C.gold};text-decoration:underline;font-weight:600;">${escapeHtml(d.bookCallLabel || 'Book a 15-min call')}</a>
  </div>`;
}

// ----- Helpers --------------------------------------------------------------

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(d) {
  const date = d instanceof Date ? d : new Date(d);
  return date
    .toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    .toUpperCase();
}
