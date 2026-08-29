import { prisma } from '../config/db';

async function main() {
  const articles = await prisma.article.findMany({
    orderBy: {
      createdAt: 'desc'
    },
    take: 10,
    include: {
      source: true
    }
  });

  console.log('Latest 10 articles:');
  articles.forEach(art => {
    console.log(`- ${art.title} (Source: ${art.source?.name || 'Unknown'}, Category: ${art.source?.category || 'Unknown'}, Created: ${art.createdAt})`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
