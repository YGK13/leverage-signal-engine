// ============================================================
// api/cron/daily.js — Vercel cron endpoint
//
// Triggered by the schedule in vercel/vercel.json. Calls the same
// orchestrator as `npm run daily`, but as a serverless handler.
//
// Auth: Vercel cron requests include the secret header
//   `Authorization: Bearer ${process.env.CRON_SECRET}`
// (set CRON_SECRET on the Vercel project). We reject anything else.
// ============================================================

// IMPORTANT: this route is intentionally Node.js (not Edge). The orchestrator
// uses Node fs, Anthropic SDK and the Notion SDK, none of which run on Edge.
export const config = { runtime: 'nodejs', maxDuration: 300 }

export default async function handler(req, res) {
  const expected = process.env.CRON_SECRET
  const auth = req.headers?.authorization || ''
  if (!expected || auth !== `Bearer ${expected}`) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  // Late-import so a misconfigured environment cannot crash the handler boot.
  let orchestrator
  try {
    orchestrator = await import('../../run-daily.js')
  } catch (err) {
    return res.status(500).json({ error: 'failed to load orchestrator', detail: String(err?.message || err) })
  }

  try {
    // run-daily.js runs its pipeline on module load (top-level IIFE), so the
    // import above already triggers a run. Surface a structured response.
    return res.status(200).json({
      ok: true,
      ranAt: new Date().toISOString(),
      note: 'Pipeline started. See Vercel function logs and the runs/ artifacts for details.',
    })
  } catch (err) {
    return res.status(500).json({ error: 'pipeline failed', detail: String(err?.message || err) })
  }
}
