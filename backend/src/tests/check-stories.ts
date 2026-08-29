import { prisma } from '../config/db';

async function main() {
  const regionalStories = await prisma.story.findMany({
    where: {
      primaryCategory: 'Local + Regional Pulse'
    },
    include: {
      articles: {
        include: {
          source: true
        }
      }
    }
  });

  console.log(`Total Regional Stories found: ${regionalStories.length}`);
  
  if (regionalStories.length > 0) {
    console.log('\nSample Regional Stories:');
    regionalStories.slice(0, 10).forEach((story, idx) => {
      const sources = story.articles.map(a => a.source?.name).join(', ');
      console.log(`Story #${idx + 1}: "${story.title}"`);
      console.log(`- Category: ${story.primaryCategory} (Secondary: ${story.secondaryCategory})`);
      console.log(`- Sources: ${sources}`);
      console.log(`- Created At: ${story.createdAt}`);
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
