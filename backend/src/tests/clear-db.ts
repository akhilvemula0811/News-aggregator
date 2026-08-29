import { prisma } from '../config/db';

async function main() {
  console.log('🧹 Clearing existing articles, stories, and claims...');
  await prisma.claim.deleteMany();
  await prisma.article.deleteMany();
  await prisma.story.deleteMany();
  console.log('✅ Database cleared!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
