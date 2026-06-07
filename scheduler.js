// ============================================================
// scheduler.js — Local cron loop. Runs run-daily.js on schedule.
//
// Use this for local-machine scheduling. For cloud/serverless, deploy
// the vercel/api/cron/daily.js handler instead.
//
// Start with: `node scheduler.js`
// Or run as Windows service: see SETUP.md "Option A: Local always-on".
// ============================================================

import cron from 'node-cron';
import { spawn } from 'node:child_process';
import { CONFIG, validateConfig } from './config.js';

validateConfig();

console.log(`[scheduler] starting...`);
console.log(`  cron: ${CONFIG.dailyCron}`);
console.log(`  tz:   ${CONFIG.timezone}`);
console.log(`  Press Ctrl+C to stop.\n`);

cron.schedule(
  CONFIG.dailyCron,
  () => {
    console.log(`\n[scheduler] firing at ${new Date().toISOString()}`);
    const proc = spawn('node', ['run-daily.js'], { stdio: 'inherit' });
    proc.on('exit', (code) => {
      console.log(`[scheduler] run-daily exited with code ${code}`);
    });
  },
  {
    timezone: CONFIG.timezone,
    scheduled: true,
  }
);

// Keep the process alive
setInterval(() => {}, 1 << 30);
