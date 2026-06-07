// ============================================================
// vercel/api/cron/daily.js — Serverless handler for daily pipeline run
//
// Deploys to Vercel and is invoked by Vercel Cron per vercel.json.
// Vercel cron schedule is UTC; we still write a friendly date stamp.
//
// IMPORTANT: Vercel Cron only fires in production deployments, not previews.
// Authenticate the route via CRON_SECRET (set in Vercel env vars).
// ============================================================

import { spawn } from 'node:child_process';

export const config = {
  runtime: 'nodejs',
  maxDuration: 300, // 5 min ceiling; full pipeline typically completes in 30-60s
};

export default async function handler(req, res) {
  // Vercel Cron sends a Bearer token from CRON_SECRET env var
  const auth = req.headers.authorization || '';
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }

  try {
    // Lazy-load the pipeline so cold start is fast
    const { runPipeline } = await import('../../run-pipeline-fn.js');
    const result = await runPipeline({ dryRun: req.query.dryRun === '1' });
    return res.status(200).json({ ok: true, result });
  } catch (e) {
    console.error('cron failed:', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
