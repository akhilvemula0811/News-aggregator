import dotenv from 'dotenv';
import app from './app';
import { initScheduler, executeRefreshCycle } from './services/scheduler';
import { importSeedData } from './services/seed-importer';
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

    // Startup check: sync database from seed_data.json if stories are missing or outdated
    setTimeout(async () => {
      try {
        const count = await prisma.story.count();
        const cutoff = new Date(Date.now() - 12 * 60 * 60 * 1000);
        const freshCount = await prisma.story.count({ where: { createdAt: { gte: cutoff } } });
        console.log(`[Server] Database health check: Total stories = ${count}, Fresh (<12h) = ${freshCount}`);
        
        if (freshCount < 500) {
          console.log('[Server] Synchronizing database with fresh seed data...');
          await importSeedData();
        }
      } catch (err: any) {
        console.error('[Server] Startup database sync failed:', err.message);
      }
    }, 3000);

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
