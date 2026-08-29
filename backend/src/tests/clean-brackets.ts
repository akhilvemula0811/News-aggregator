import { prisma } from '../config/db';

async function main() {
  console.log('🔄 Cleaning up bracketed channel names from database titles...');

  // Clean Articles
  const articles = await prisma.article.findMany({
    where: {
      title: { contains: '[' }
    }
  });

  console.log(`Found ${articles.length} articles with potential brackets.`);
  let cleanArticlesCount = 0;
  for (const art of articles) {
    const cleanedTitle = art.title.replace(/^\[[^\]]+\]\s*/, '');
    if (cleanedTitle !== art.title) {
      await prisma.article.update({
        where: { id: art.id },
        data: { title: cleanedTitle }
      });
      cleanArticlesCount++;
    }
  }
  console.log(`Cleaned ${cleanArticlesCount} article titles.`);

  // Clean Stories
  const stories = await prisma.story.findMany({
    where: {
      title: { contains: '[' }
    }
  });

  console.log(`Found ${stories.length} stories with potential brackets.`);
  let cleanStoriesCount = 0;
  for (const story of stories) {
    const cleanedTitle = story.title.replace(/^\[[^\]]+\]\s*/, '');
    if (cleanedTitle !== story.title) {
      await prisma.story.update({
        where: { id: story.id },
        data: { title: cleanedTitle }
      });
      cleanStoriesCount++;
    }
  }
  console.log(`Cleaned ${cleanStoriesCount} story titles.`);
  console.log('✅ Clean-up complete!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
