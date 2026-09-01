import { prisma } from '../config/db';

async function main() {
  console.log('Testing Story and Article Images in DB...');
  const stories = await prisma.story.findMany({
    take: 30,
    orderBy: { createdAt: 'desc' },
    include: {
      articles: {
        include: { source: true }
      }
    }
  });

  console.log(`Fetched ${stories.length} recent stories:`);
  for (const s of stories) {
    const articleImages = s.articles.map(a => a.urlToImage).filter(Boolean);
    console.log(`- Story: "${s.title.substring(0, 60)}..."`);
    console.log(`  Sources: ${s.articles.map(a => a.source?.name).join(', ')}`);
    console.log(`  Images (${articleImages.length}): ${articleImages[0] ? articleImages[0].substring(0, 80) + '...' : 'NONE'}`);
  }

  // Check if any articles have raw escaped '&amp;' in urlToImage
  const ampImages = await prisma.article.findMany({
    where: {
      urlToImage: {
        contains: '&amp;'
      }
    },
    take: 10
  });

  console.log(`Articles with uncleaned '&amp;' in urlToImage: ${ampImages.length}`);
  if (ampImages.length > 0) {
    console.log('Sample ampersand image:', ampImages[0].urlToImage);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
