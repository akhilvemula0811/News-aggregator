import cron from 'node-cron';
import { ingestion } from './ingestion';
import { aiPipeline } from './ai-pipeline';

let isJobRunning = false;

/**
 * Execute the complete refresh cycle
 * 1. Aggregates articles from APIs and RSS.
 * 2. Runs the AI pipeline to cluster, summarize, and extract claims.
 * 3. Cleans up raw articles older than 7 days.
 */
export async function executeRefreshCycle(): Promise<{ inserted: number; status: string }> {
  if (isJobRunning) {
    console.log('[Scheduler] Job already running. Skipping trigger.');
    return { inserted: 0, status: 'already_running' };
  }

  isJobRunning = true;
  console.log('[Scheduler] Starting 24h refresh cycle...');
  try {
    // 1. Fetch raw articles
    const insertedCount = await ingestion.run();

    // 2. Process articles (embeddings, clustering, summaries, claims, lineage)
    await aiPipeline.run();

    // 3. Purge old database entries (archive data older than 7 days)
    await ingestion.purgeOldArticles(7);

    console.log('[Scheduler] 24h refresh cycle finished successfully.');
    return { inserted: insertedCount, status: 'success' };
  } catch (error: any) {
    console.error('[Scheduler] Error during refresh cycle:', error.message);
    throw error;
  } finally {
    isJobRunning = false;
  }
}

/**
 * Initialize background cron schedules
 */
export function initScheduler() {
  console.log('[Scheduler] Initializing cron job...');

  // Daily 5:00 AM IST refresh schedule
  const cronExpr = '0 5 * * *'; 

  cron.schedule(cronExpr, async () => {
    console.log('[Scheduler] Daily 5:00 AM IST refresh triggered.');
    try {
      await executeRefreshCycle();
    } catch (err: any) {
      console.error('[Scheduler] Cron job failed:', err.message);
    }
  }, {
    timezone: 'Asia/Kolkata'
  });

  console.log('[Scheduler] Daily cron set for 05:00 AM Asia/Kolkata (IST).');
}
