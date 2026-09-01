import dotenv from 'dotenv';
import app from './app';
import { initScheduler, executeRefreshCycle } from './services/scheduler';
import { prisma } from './config/db';

dotenv.config();

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Verify database connection
    console.log('[Server] Connecting to database...');
    await prisma.$connect();
    console.log('[Server] Database connection verified.');

    // Start background cron jobs
    initScheduler();

    // Startup check: trigger refresh cycle if database stories are stale or sparse
    setTimeout(async () => {
      try {
        const count = await prisma.story.count();
        const cutoff = new Date(Date.now() - 12 * 60 * 60 * 1000);
        const freshCount = await prisma.story.count({ where: { createdAt: { gte: cutoff } } });
        console.log(`[Server] Database health check: Total stories = ${count}, Fresh (<12h) = ${freshCount}`);
        if (freshCount < 50) {
          console.log('[Server] Database needs refresh. Triggering background refresh cycle...');
          executeRefreshCycle()
            .then((res) => console.log('[Server] Startup refresh cycle finished:', res))
            .catch((err) => console.error('[Server] Startup refresh error:', err.message));
        }
      } catch (err: any) {
        console.error('[Server] Startup refresh check failed:', err.message);
      }
    }, 4000);

    // Start listening
    app.listen(PORT, () => {
      console.log(`===============================================`);
      console.log(`🚀 AI News Aggregator backend is running!`);
      console.log(`📡 Port: ${PORT}`);
      console.log(`🔗 Health Check: http://localhost:${PORT}/health`);
      console.log(`===============================================`);
    });
  } catch (error: any) {
    console.error('[Server] Critical error starting backend server:', error.message);
    process.exit(1);
  }
}

// Handle termination gracefully
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  console.log('[Server] Disconnected database. Exiting.');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  console.log('[Server] Disconnected database. Exiting.');
  process.exit(0);
});

startServer();
