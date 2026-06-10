// ============================================================
// lib/notion-db.js — DB-mode research reader for The Leverage Signal
//
// Reads structured rows from the "Daily AI Signal (Leverage Brief)" Notion
// database written by the upstream `leverage-brief-daily-research` dispatcher
// routine, and FLATTENS them into the exact same in-memory shape that
// `lib/notion.js` returns. The orchestrator (run-daily.js) and downstream
// prompts (lib/anthropic.js) are unchanged.
//
// Output contract (matches fetchTodayUpdate()):
//   {
//     date:         'YYYY-MM-DD',
//     dailyUpdate:  '...markdown for today\'s signals, in the same shape
//                    the existing page-mode parser produces...',
//     weeklyMeta:   '...latest week\'s meta-trends as markdown, or null...',
//     raw:          '...debug copy of the flattened markdown...',
//     sourcePageId: '<the DB id, for traceability>',
//   }
//
// Toggle: set CONFIG.researchSource = 'db' (or env RESEARCH_SOURCE=db) to use
// this reader. Default stays 'page' so behavior does not change for anyone
// who has not opted in.
// ============================================================

import { Client } from '@notionhq/client'
import { CONFIG } from '../config.js'

const notion = new Client({ auth: CONFIG.notionKey })

// The data source id (Notion v2 collection id) we write rows to from the
// upstream dispatcher. Sourced from growth-os/config.json key
// dailyResearchNotionDsId, mirrored here for the engine's standalone use.
// Override with env DAILY_RESEARCH_NOTION_DS_ID if you ever rotate the DB.
const DEFAULT_DS_ID = 'fc49c2b2-ea33-43e1-af59-20cfe89060fa'

// ----- Public API -----------------------------------------------------------

/**
 * Same contract as fetchTodayUpdate() in lib/notion.js, just sourced from the DB.
 * Returns the most recent dated row(s) up to today, flattened to the markdown
 * shape the orchestrator and prompts already know how to read.
 */
export async function fetchTodayUpdateFromDB({ today = new Date() } = {}) {
  const dataSourceId = process.env.DAILY_RESEARCH_NOTION_DS_ID || DEFAULT_DS_ID

  const todayYMD = ymd(today)
  const last14 = ymd(addDays(today, -14))

  // 1) Pull today's rows. If today is empty (e.g. dispatcher has not fired yet),
  //    fall back to the most recent date that does have rows.
  const todayRows = await queryRowsByDate(dataSourceId, todayYMD, todayYMD)

  let pickedDate = todayYMD
  let dailyRows = todayRows

  if (dailyRows.length === 0) {
    const recent = await queryRowsByDate(dataSourceId, last14, todayYMD, /*limit=*/30)
    if (recent.length > 0) {
      // Use whichever date has the freshest non-empty batch
      recent.sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      pickedDate = recent[0].date
      dailyRows = recent.filter(r => r.date === pickedDate)
    }
  }

  // 2) Pull last 7 days for the "weekly meta" context (a tight rollup).
  const weekStart = ymd(addDays(parseYMD(pickedDate), -6))
  const weekRows = await queryRowsByDate(dataSourceId, weekStart, pickedDate, /*limit=*/100)

  const dailyUpdate = formatDailyMarkdown(pickedDate, dailyRows)
  const weeklyMeta = formatWeeklyMetaMarkdown(weekStart, pickedDate, weekRows)

  return {
    date: pickedDate,
    dailyUpdate: dailyUpdate || null,
    weeklyMeta: weeklyMeta || null,
    raw: [dailyUpdate, '', weeklyMeta].filter(Boolean).join('\n\n'),
    sourcePageId: dataSourceId,
  }
}

// ----- Notion query ---------------------------------------------------------

/**
 * Query the data source for rows whose `Date` property falls in [start, end]
 * inclusive. Returns a normalized array of row objects.
 */
async function queryRowsByDate(dataSourceId, startYMD, endYMD, limit = 50) {
  const filter = {
    and: [
      { property: 'Date', date: { on_or_after: startYMD } },
      { property: 'Date', date: { on_or_before: endYMD } },
    ],
  }

  const out = []
  let cursor = undefined

  do {
    let res
    try {
      res = await notion.dataSources.query({
        data_source_id: dataSourceId,
        filter,
        sorts: [{ property: 'Date', direction: 'descending' }],
        start_cursor: cursor,
        page_size: Math.min(100, limit - out.length),
      })
    } catch (err) {
      // Older SDKs / pre-2025 workspaces still expose dataSources via the
      // databases endpoint; fall back transparently so the reader works on
      // both code paths.
      res = await notion.databases.query({
        database_id: dataSourceId,
        filter,
        sorts: [{ property: 'Date', direction: 'descending' }],
        start_cursor: cursor,
        page_size: Math.min(100, limit - out.length),
      })
    }

    for (const page of res.results) {
      out.push(normalizeRow(page))
      if (out.length >= limit) break
    }
    cursor = res.has_more && out.length < limit ? res.next_cursor : undefined
  } while (cursor)

  return out
}

/**
 * Normalize a Notion page (DB row) into a flat record we can render to markdown.
 * Properties referenced here MUST match the DB schema written by the dispatcher.
 */
function normalizeRow(page) {
  const p = page.properties || {}
  return {
    id: page.id,
    date: dateOf(p['Date']),
    signal: titleText(p['Signal']),
    status: selectName(p['Status']),
    modeFit: multiNames(p['Mode fit']),
    rung: selectName(p['Rung']),
    domain: multiNames(p['Domain']),
    strength: selectName(p['Strength']),
    brandFrame: multiNames(p['Brand frame']),
    operatorImplication: richText(p['Operator implication']),
    theMove: richText(p['The move']),
    sourceUrl: urlVal(p['Source URL']),
    sourceName: richText(p['Source name']),
    sourceDate: dateOf(p['Source date']),
    specificNumbers: richText(p['Specific numbers']),
    namedEntities: multiNames(p['Named entities']),
    asymmetryNote: richText(p['Asymmetry note']),
    stakes: selectName(p['Stakes']),
    notes: richText(p['Notes']),
  }
}

// ----- Flatten to markdown --------------------------------------------------

/**
 * Render the day's rows as a markdown block whose shape matches what the
 * page-mode parser produces. The downstream Claude prompts already know how
 * to read this shape; we keep it identical so no prompt changes are needed.
 */
function formatDailyMarkdown(date, rows) {
  if (!rows || rows.length === 0) return null

  const monthName = parseYMD(date).toLocaleString('en-US', { month: 'long' }).toUpperCase()
  const day = parseYMD(date).getDate()
  const year = parseYMD(date).getFullYear()

  const header = `# ${monthName} ${day}, ${year}: DAILY UPDATE`

  // Group by Domain so the daily block has natural section breaks the prompt
  // can lean on. Rows without a Domain fall under "Other".
  const groups = new Map()
  for (const r of rows) {
    const tags = (r.domain && r.domain.length > 0) ? r.domain : ['Other']
    for (const t of tags) {
      if (!groups.has(t)) groups.set(t, [])
      groups.get(t).push(r)
    }
  }

  const sections = []
  for (const [domain, group] of groups) {
    sections.push(`## ${domain}`)
    for (const r of group) {
      const lines = []
      lines.push(`- **${r.signal || 'Untitled signal'}**`)
      if (r.operatorImplication) lines.push(`  - Operator implication: ${r.operatorImplication}`)
      if (r.specificNumbers)     lines.push(`  - Numbers: ${r.specificNumbers}`)
      if (r.asymmetryNote)       lines.push(`  - Asymmetry: ${r.asymmetryNote}`)
      if (r.theMove)             lines.push(`  - The move: ${r.theMove}`)
      const src = [
        r.sourceName,
        r.sourceUrl,
        r.sourceDate,
      ].filter(Boolean).join(' · ')
      if (src) lines.push(`  - Source: ${src}`)
      const meta = []
      if (r.rung)                meta.push(`Rung: ${r.rung}`)
      if (r.stakes)              meta.push(`Stakes: ${r.stakes}`)
      if (r.brandFrame && r.brandFrame.length) meta.push(`Frame: ${r.brandFrame.join(', ')}`)
      if (r.modeFit && r.modeFit.length)       meta.push(`Mode fit: ${r.modeFit.join(', ')}`)
      if (meta.length) lines.push(`  - ${meta.join(' · ')}`)
      sections.push(lines.join('\n'))
    }
    sections.push('') // blank line between domain groups
  }

  return [header, '', ...sections].join('\n').trim()
}

function formatWeeklyMetaMarkdown(startYMD, endYMD, rows) {
  if (!rows || rows.length === 0) return null

  // Pick a small, high-signal slice for the weekly rollup: top brand frames,
  // top domains, and any "Strength: Signal" rows. Cap at 12 lines.
  const signalsOnly = rows.filter(r => !r.strength || r.strength === 'Signal')

  const frameTally = tallyMulti(signalsOnly, r => r.brandFrame)
  const domainTally = tallyMulti(signalsOnly, r => r.domain)

  const topFrames = topN(frameTally, 5)
  const topDomains = topN(domainTally, 5)

  const headlines = signalsOnly
    .slice(0, 12)
    .map(r => `- ${r.signal}${r.sourceUrl ? ` (${r.sourceUrl})` : ''}`)

  return [
    `## SUNDAY RESHUFFLE: ${startYMD} to ${endYMD}`,
    '',
    `Brand frames this week: ${topFrames.join(', ') || 'none'}`,
    `Domains this week: ${topDomains.join(', ') || 'none'}`,
    '',
    'Top signal headlines:',
    ...headlines,
  ].join('\n').trim()
}

// ----- Property helpers -----------------------------------------------------

function titleText(prop) {
  if (!prop || prop.type !== 'title') return ''
  return (prop.title || []).map(r => r.plain_text || '').join('').trim()
}
function richText(prop) {
  if (!prop) return ''
  const arr = prop.rich_text || prop.title || []
  return arr.map(r => r.plain_text || '').join('').trim()
}
function selectName(prop) {
  if (!prop) return ''
  if (prop.type === 'select')   return prop.select?.name || ''
  if (prop.type === 'status')   return prop.status?.name || ''
  return ''
}
function multiNames(prop) {
  if (!prop || prop.type !== 'multi_select') return []
  return (prop.multi_select || []).map(o => o.name)
}
function urlVal(prop) {
  if (!prop) return ''
  if (prop.type === 'url') return prop.url || ''
  return ''
}
function dateOf(prop) {
  if (!prop || prop.type !== 'date') return ''
  return prop.date?.start ? prop.date.start.slice(0, 10) : ''
}

// ----- Date helpers ---------------------------------------------------------

function ymd(d) {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function parseYMD(s) {
  // Treat as UTC midnight; we are only using year/month/day downstream.
  return new Date(s + 'T00:00:00Z')
}
function addDays(d, n) {
  const x = new Date(d)
  x.setUTCDate(x.getUTCDate() + n)
  return x
}

// ----- Aggregation helpers --------------------------------------------------

function tallyMulti(rows, pick) {
  const t = new Map()
  for (const r of rows) {
    const vals = pick(r) || []
    for (const v of vals) {
      if (!v) continue
      t.set(v, (t.get(v) || 0) + 1)
    }
  }
  return t
}
function topN(tally, n) {
  return [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k)
}
