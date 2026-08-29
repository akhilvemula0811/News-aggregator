import { prisma } from '../config/db';

async function main() {
  const totalStories = await prisma.story.count();
  const totalArticles = await prisma.article.count();
  console.log(`Total stories: ${totalStories}`);
  console.log(`Total articles: ${totalArticles}`);

  const primaryCategories = await prisma.story.groupBy({
    by: ['primaryCategory'],
    _count: {
      id: true
    }
  });

  console.log('\nStories by Primary Category:');
  primaryCategories.forEach(c => {
    console.log(`- ${c.primaryCategory}: ${c._count.id}`);
  });

  const secondaryCategories = await prisma.story.groupBy({
    by: ['secondaryCategory'],
    _count: {
      id: true
    }
  });

  console.log('\nStories by Secondary Category:');
  secondaryCategories.forEach(c => {
    console.log(`- ${c.secondaryCategory}: ${c._count.id}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
