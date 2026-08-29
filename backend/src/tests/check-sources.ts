import { prisma } from '../config/db';

async function main() {
  const sources = await prisma.source.findMany({
    include: {
      _count: {
        select: { articles: true }
      }
    }
  });
  console.log('Sources in database:');
  sources.forEach(s => {
    console.log(`- ${s.name} (${s.type}, category: ${s.category}): ${s._count.articles} articles`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
