import { prisma } from '../config/db';

async function main() {
  console.log("=== Starting Database Cleanup for Regional Pulse ===");
  
  // 1. Delete articles of regional source
  const deletedArticles = await prisma.article.deleteMany({
    where: {
      source: {
        category: 'Local + Regional Pulse'
      }
    }
  });
  console.log(`Deleted ${deletedArticles.count} regional articles.`);

  // 2. Delete stories with primaryCategory === 'Local + Regional Pulse'
  const deletedStories = await prisma.story.deleteMany({
    where: {
      primaryCategory: 'Local + Regional Pulse'
    }
  });
  console.log(`Deleted ${deletedStories.count} regional stories.`);
  
  console.log("=== Database Cleanup Complete! ===");
}

main().catch(console.error).finally(() => prisma.$disconnect());
