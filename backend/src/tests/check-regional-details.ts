import { prisma } from '../config/db';

async function main() {
  const stories = await prisma.story.findMany({
    where: {
      primaryCategory: 'Local + Regional Pulse'
    },
    include: {
      articles: {
        include: {
          source: true
        }
      }
    },
    take: 10
  });

  console.log(`Checking ${stories.length} regional stories for detailed text and images...`);
  stories.forEach((story, idx) => {
    console.log(`\n=================== Story #${idx + 1} ===================`);
    console.log(`Title: ${story.title}`);
    console.log(`Summary: ${story.summary.substring(0, 150)}...`);
    console.log(`Number of articles in cluster: ${story.articles.length}`);
    
    story.articles.forEach((art, aIdx) => {
      console.log(`\n  Article ${aIdx + 1}: "${art.title}"`);
      console.log(`  Source: ${art.source?.name} (${art.source?.category})`);
      console.log(`  URL: ${art.url}`);
      console.log(`  Image URL: ${art.urlToImage}`);
      console.log(`  Content Length: ${art.content ? art.content.length : 0}`);
      if (art.content) {
        console.log(`  Content Preview:\n---\n${art.content.substring(0, 400)}...\n---`);
      } else {
        console.log(`  No content available!`);
      }
    });
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
