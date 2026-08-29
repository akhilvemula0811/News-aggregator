import dotenv from 'dotenv';
import app from './app';
import { initScheduler } from './services/scheduler';
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
