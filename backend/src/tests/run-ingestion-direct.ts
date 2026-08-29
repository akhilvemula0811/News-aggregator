import { executeRefreshCycle } from '../services/scheduler';
import { prisma } from '../config/db';

async function main() {
  console.log('🚀 Starting ingestion directly in the script...');
  try {
    const result = await executeRefreshCycle();
    console.log('✅ Ingestion completed! Result:', result);
  } catch (e: any) {
    console.error('❌ Ingestion failed:', e.message);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
