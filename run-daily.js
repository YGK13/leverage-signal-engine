// ============================================================
// run-daily.js — Main orchestrator. Runs the full pipeline once.
//
// Pipeline:
//   1. fetch today's research from Notion catalog
//   2. Claude picks THE signal
//   3. Claude drafts the full issue
//   4. Claude scores virality
//   5. Claude generates LinkedIn + X amplifiers
//   6. Post draft to Beehiiv
//   7. Notify Yuri via email/Slack with review link
//   8. Write all intermediate artifacts to runs/YYYY-MM-DD/
//
// All steps are idempotent per-day; re-runs overwrite that day's artifacts.
// ============================================================

import { writeFile, mkdir, readdir, stat, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { CONFIG, modeForToday, todayStamp, validateConfig } from './config.js';
import { fetchTodayUpdate as fetchFromPage } from './lib/notion.js';
import { fetchTodayUpdateFromDB } from './lib/notion-db.js';
import { pickSignal, draftIssue, scoreVirality, generateAmplifiers } from './lib/anthropic.js';

// Pick the research reader based on CONFIG.researchSource ('page' default, 'db' opt-in).
// Same contract either way: { date, dailyUpdate, weeklyMeta, raw, sourcePageId }.
const fetchTodayUpdate = CONFIG.researchSource === 'db'
  ? fetchTodayUpdateFromDB
  : fetchFromPage;
import { createDraft } from './lib/beehiiv.js';
import { buildIssueHtml } from './lib/html-template.js';
import { notifyReviewReady } from './lib/notify.js';

const FLAGS = parseFlags(process.argv);

(async () => {
  const startedAt = new Date();
  const date = todayStamp();
  const mode = modeForToday(startedAt);
  const runDir = join('runs', date);

  log(`[${date}] Mode: ${mode}. Starting pipeline. dryRun=${FLAGS.dryRun}`);

  try {
    validateConfig();
    await mkdir(runDir, { recursive: true });

    // ----- Step 1: Notion -----
    log('Step 1/6  fetching Notion research catalog...');
    const research = await fetchTodayUpdate();
    await writeJson(runDir, '01-research.json', research);
    if (!research.dailyUpdate) {
      log('  WARN: no daily update for today found; using most recent.');
    }
    log(`  ✓ research pulled (${(research.dailyUpdate || '').length} chars today)`);

    // ----- Step 2: Pick the signal -----
    log('Step 2/6  picking signal of the day with Claude...');
    const selection = await pickSignal({
      dailyUpdate: research.dailyUpdate,
      weeklyMeta: research.weeklyMeta,
      mode,
      date,
    });
    await writeJson(runDir, '02-signal-picked.json', selection);
    log(`  ✓ signal: "${selection.selectedSignal?.title}"`);

    // ----- Step 3: Draft the issue -----
    log('Step 3/6  drafting full issue with Claude...');
    const draft = await draftIssue({
      selection,
      mode,
      date,
      dailyUpdate: research.dailyUpdate,
    });
    await writeJson(runDir, '03-draft.json', draft);
    log(`  ✓ draft headline: "${draft.headlineWhite} ${draft.headlineGold || ''}"`);

    // ----- Step 4: Score virality -----
    log('Step 4/6  scoring virality...');
    const virality = await scoreVirality({ draft, mode });
    await writeJson(runDir, '04-virality.json', virality);
    const flagged = virality.score < CONFIG.viralityGate;
    log(`  ${flagged ? '⚠' : '✓'} virality: ${virality.score}/10 ${flagged ? '(below gate)' : ''}`);

    // ----- Step 5: Generate amplifiers -----
    log('Step 5/6  generating social amplifiers...');
    const amplifiers = await generateAmplifiers({ draft, mode });
    await writeJson(runDir, '05-amplifiers.json', amplifiers);
    log('  ✓ LinkedIn + X variants generated');

    // ----- Step 6: Beehiiv draft -----
    log('Step 6/6  posting draft to Beehiiv...');
    const issueNumber = await getIssueNumber();
    const bodyHtml = buildIssueHtml(draft, { date, mode, issueNumber });
    await writeFile(join(runDir, '06-body.html'), bodyHtml, 'utf8');

    let beehiivResult = null;
    if (FLAGS.dryRun) {
      log('  ⤳ DRY RUN: skipping Beehiiv post. Artifact written to runs/.');
      beehiivResult = {
        ok: true,
        postId: 'dry-run',
        dashboardUrl: 'https://app.beehiiv.com/posts/DRY-RUN/edit',
      };
    } else {
      try {
        beehiivResult = await createDraft({
          title: draft.subjectLine,
          subtitle: draft.preheader,
          bodyHtml,
          contentTags: ['daily-signal', `mode-${mode.toLowerCase()}`],
        });
        log(`  ✓ Beehiiv draft created: ${beehiivResult.dashboardUrl}`);
      } catch (e) {
        // Non-fatal: Enterprise plan required for API posting.
        // Pipeline still succeeds — notification includes full draft for manual paste.
        log(`  ⚠ Beehiiv API skipped (${e.message.slice(0, 80)})`);
        log('    → Draft saved locally. Open Beehiiv and paste manually.');
        beehiivResult = {
          ok: false,
          error: e.message,
          dashboardUrl: 'https://app.beehiiv.com/posts/new',
          manualPost: true,
        };
      }
    }
    await writeJson(runDir, '07-beehiiv-result.json', beehiivResult);

    // ----- Notify -----
    log('Notify  pinging review channel...');
    await notifyReviewReady({
      subjectLine: draft.subjectLine,
      preheader: draft.preheader,
      eyebrow: draft.eyebrow,
      headline: `${draft.headlineWhite} ${draft.headlineGold || ''}`.trim(),
      theMove: draft.theMove,
      pullQuote: draft.pullQuote,
      viralityScore: virality.score,
      viralityBreakdown: virality.breakdown,
      viralityReason: virality.oneLineVerdict,
      weakSpots: virality.weakSpots || [],
      alternateSubjects: draft.alternateSubjects || [],
      dashboardUrl: beehiivResult?.dashboardUrl,
      manualPost: beehiivResult?.manualPost || false,
      bodyHtml,
      linkedinPost: amplifiers.linkedinPost,
      xThread: amplifiers.xThread,
      mode,
      date,
    });

    // ----- Cleanup old runs -----
    await pruneOldRuns(CONFIG.logRetentionDays);

    const elapsedSec = ((Date.now() - startedAt.getTime()) / 1000).toFixed(1);
    log(`\n✅ DONE in ${elapsedSec}s. Draft awaiting your review at:\n   ${beehiivResult?.dashboardUrl}\n`);
    process.exit(0);
  } catch (e) {
    log(`\n❌ FAILED: ${e.message}`);
    if (e.stack) log(e.stack);
    // Attempt to notify of failure
    try {
      await notifyReviewReady({
        subjectLine: '[FAILED] Daily run errored',
        eyebrow: 'PIPELINE FAILURE',
        headline: e.message.slice(0, 120),
        pullQuote: '',
        viralityScore: 0,
        viralityReason: e.message,
        alternateSubjects: [],
        dashboardUrl: '#',
        linkedinPost: '',
        xThread: [],
        mode,
        date,
      });
    } catch {}
    process.exit(1);
  }
})();

// ----- Helpers --------------------------------------------------------------

function parseFlags(argv) {
  return {
    dryRun: argv.includes('--dry-run'),
    forceRerun: argv.includes('--force-rerun'),
  };
}

function log(msg) {
  const ts = new Date().toISOString().replace('T', ' ').slice(0, 19);
  console.log(`[${ts}] ${msg}`);
}

async function writeJson(dir, name, data) {
  await writeFile(join(dir, name), JSON.stringify(data, null, 2), 'utf8');
}

async function getIssueNumber() {
  try {
    const all = await readdir('runs');
    return all.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).length;
  } catch {
    return 1;
  }
}

async function pruneOldRuns(maxDays) {
  try {
    const all = await readdir('runs');
    const cutoff = Date.now() - maxDays * 24 * 60 * 60 * 1000;
    for (const d of all) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) continue;
      const path = join('runs', d);
      const s = await stat(path);
      if (s.mtimeMs < cutoff) {
        await rm(path, { recursive: true, force: true });
      }
    }
  } catch {
    // best-effort
  }
}
