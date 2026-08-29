import { prisma } from '../config/db';
import { mockClassify } from '../services/ai-pipeline';

async function main() {
  console.log('🔄 Starting database category migration...');

  const generalStories = await prisma.story.findMany({
    include: {
      articles: {
        include: {
          source: true,
        },
      },
    },
  });

  console.log(`Found ${generalStories.length} stories to process.`);

  let count = 0;
  for (const story of generalStories) {
    // Collect title and description from articles
    const articleTitle = story.articles[0]?.title || story.title;
    const articleDesc = story.articles[0]?.description || story.summary;
    const sourceCategory = story.articles[0]?.source?.category || 'General';

    // Run classification
    const classification = mockClassify(articleTitle, articleDesc, sourceCategory);

    // Update story
    await prisma.story.update({
      where: { id: story.id },
      data: {
        primaryCategory: classification.primaryCategory,
        secondaryCategory: null,
      },
    });

    count++;
    if (count % 100 === 0) {
      console.log(`Updated ${count}/${generalStories.length} stories...`);
    }
  }

  console.log(`✅ Migration complete! Updated ${count} stories.`);
}

main()
  .catch((err) => console.error('❌ Error running migration:', err))
  .finally(() => prisma.$disconnect());
