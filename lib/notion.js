// ============================================================
// lib/notion.js — Fetch + parse the Leverage Brief Research Catalog
// The catalog is updated daily by Yuri's auto-scan; we extract today's
// (or most recent) DAILY UPDATE block plus the latest Sunday reshuffle.
// ============================================================

import { Client } from '@notionhq/client';
import { CONFIG } from '../config.js';

const notion = new Client({ auth: CONFIG.notionKey });

// ----- Public API -----------------------------------------------------------

/**
 * Fetch the research catalog and return today's signal candidates.
 * Returns: {
 *   date: 'YYYY-MM-DD',
 *   dailyUpdate: '...markdown for today\'s daily update section...',
 *   weeklyMeta: '...markdown for the most recent Sunday reshuffle meta-trends...',
 *   raw: '...full page text...',
 * }
 */
export async function fetchTodayUpdate() {
  const pageText = await fetchPageAsMarkdown(CONFIG.notionPageId);

  const today = new Date();
  const todayUpdate = extractDailyUpdate(pageText, today);
  const weeklyMeta = extractWeeklyMeta(pageText);

  return {
    date: today.toISOString().slice(0, 10),
    dailyUpdate: todayUpdate || extractMostRecentDailyUpdate(pageText),
    weeklyMeta,
    raw: pageText,
    sourcePageId: CONFIG.notionPageId,
  };
}

// ----- Internals ------------------------------------------------------------

/**
 * Fetch full page content as a flat markdown-ish string.
 * Notion API returns blocks; we serialize the ones we care about.
 */
async function fetchPageAsMarkdown(pageId) {
  const blocks = await getAllBlocks(pageId);
  return blocks.map(blockToText).filter(Boolean).join('\n');
}

async function getAllBlocks(blockId) {
  const all = [];
  let cursor = undefined;
  do {
    const res = await notion.blocks.children.list({
      block_id: blockId,
      start_cursor: cursor,
      page_size: 100,
    });
    all.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);

  // Recursively expand children for blocks that contain them (toggles, columns, etc.)
  for (const b of all) {
    if (b.has_children) {
      b._children = await getAllBlocks(b.id);
    }
  }
  return all;
}

function blockToText(block) {
  const type = block.type;
  const data = block[type];
  if (!data) return '';

  const richTextToString = (rt) =>
    Array.isArray(rt) ? rt.map((r) => r.plain_text || '').join('') : '';

  let out = '';
  switch (type) {
    case 'heading_1':
      out = `\n# ${richTextToString(data.rich_text)}\n`;
      break;
    case 'heading_2':
      out = `\n## ${richTextToString(data.rich_text)}\n`;
      break;
    case 'heading_3':
      out = `\n### ${richTextToString(data.rich_text)}\n`;
      break;
    case 'paragraph':
      out = `${richTextToString(data.rich_text)}\n`;
      break;
    case 'bulleted_list_item':
      out = `- ${richTextToString(data.rich_text)}\n`;
      break;
    case 'numbered_list_item':
      out = `1. ${richTextToString(data.rich_text)}\n`;
      break;
    case 'to_do':
      out = `- [${data.checked ? 'x' : ' '}] ${richTextToString(data.rich_text)}\n`;
      break;
    case 'quote':
      out = `> ${richTextToString(data.rich_text)}\n`;
      break;
    case 'callout':
      out = `> ${richTextToString(data.rich_text)}\n`;
      break;
    case 'divider':
      out = `\n---\n`;
      break;
    case 'code':
      out = `\n\`\`\`\n${richTextToString(data.rich_text)}\n\`\`\`\n`;
      break;
    case 'table':
    case 'table_row':
      // Simplified table handling; full tables would require traversing cells.
      out = data.cells
        ? data.cells.map((c) => c.map((rt) => rt.plain_text).join('')).join(' | ') + '\n'
        : '';
      break;
    default:
      out = '';
  }

  if (block._children && block._children.length > 0) {
    out += block._children.map(blockToText).filter(Boolean).join('\n');
  }
  return out;
}

/**
 * Extract today's DAILY UPDATE section using date-based matching.
 * The catalog uses headers like: "# 📅 MAY 19, 2026 — DAILY UPDATE"
 */
function extractDailyUpdate(pageText, date) {
  const monthName = date.toLocaleString('en-US', { month: 'long' }).toUpperCase();
  const day = date.getDate();
  const year = date.getFullYear();

  // Match variations: "MAY 19, 2026" or "MAY 19–21, 2026" or "MAY 19-21, 2026"
  const patterns = [
    new RegExp(`#\\s*[^\\n]*${monthName}\\s+${day},\\s+${year}[^\\n]*DAILY UPDATE[^\\n]*\\n([\\s\\S]*?)(?=\\n#\\s|\\n---\\s*\\n##|$)`, 'i'),
    new RegExp(`#\\s*[^\\n]*${monthName}\\s+\\d+[–-]?${day}[^\\n]*${year}[^\\n]*DAILY UPDATE[^\\n]*\\n([\\s\\S]*?)(?=\\n#\\s|$)`, 'i'),
    new RegExp(`#\\s*[^\\n]*${monthName}\\s+${day}[–-]?\\d*[^\\n]*${year}[^\\n]*DAILY UPDATE[^\\n]*\\n([\\s\\S]*?)(?=\\n#\\s|$)`, 'i'),
  ];

  for (const re of patterns) {
    const m = pageText.match(re);
    if (m) return m[1].trim();
  }
  return null;
}

/**
 * Fallback: extract the most recent DAILY UPDATE block in the page.
 * Used if today's specific entry isn't yet present (catalog scan hasn't run).
 */
function extractMostRecentDailyUpdate(pageText) {
  const re = /#\s*[^\n]*DAILY UPDATE[^\n]*\n([\s\S]*?)(?=\n#\s|$)/gi;
  const matches = [...pageText.matchAll(re)];
  if (matches.length === 0) return null;
  return matches[matches.length - 1][1].trim();
}

/**
 * Extract the most recent Sunday reshuffle (weekly meta-trend summary).
 */
function extractWeeklyMeta(pageText) {
  const re = /##?\s*🔄?\s*SUNDAY RESHUFFLE[^\n]*\n([\s\S]*?)(?=\n#\s|$)/i;
  const m = pageText.match(re);
  if (m) return m[1].trim();
  // Fallback: first block of META-TRENDS ANALYSIS
  const re2 = /##?\s*[📌🧠]*\s*WEEKLY META-TRENDS[^\n]*\n([\s\S]*?)(?=\n##\s|\n#\s|$)/i;
  const m2 = pageText.match(re2);
  return m2 ? m2[1].trim() : null;
}
