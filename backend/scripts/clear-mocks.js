const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('[Cleanup] Starting mock data removal...');
  try {
    // 1. Find all articles with mock URLs
    const mockArticles = await prisma.article.findMany({
      where: {
        url: {
          startsWith: 'https://mock-news-source.com/'
        }
      },
      select: {
        id: true,
        storyId: true
      }
    });

    console.log(`[Cleanup] Found ${mockArticles.length} mock articles.`);

    if (mockArticles.length === 0) {
      console.log('[Cleanup] No mock articles found. Database is clean.');
      return;
    }

    const storyIds = [...new Set(mockArticles.map(a => a.storyId).filter(Boolean))];
    console.log(`[Cleanup] Associated with ${storyIds.length} stories.`);

    // 2. Delete mock articles
    const deleteArticles = await prisma.article.deleteMany({
      where: {
        url: {
          startsWith: 'https://mock-news-source.com/'
        }
      }
    });
    console.log(`[Cleanup] Deleted ${deleteArticles.count} mock articles.`);

    // 3. Delete associated stories (cascades to claims, timelines, and diffs)
    if (storyIds.length > 0) {
      const deleteStories = await prisma.story.deleteMany({
        where: {
          id: {
            in: storyIds
          }
        }
      });
      console.log(`[Cleanup] Deleted ${deleteStories.count} associated stories.`);
    }

    console.log('[Cleanup] Mock data removal finished successfully.');
  } catch (err) {
    console.error('[Cleanup] Error during mock data removal:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
