import { prisma } from '../config/db';

async function main() {
  const stories = await prisma.story.findMany({
    include: {
      articles: true
    },
    take: 10
  });

  console.log(`=== Inspecting Stories and their Articles' Image URLs ===`);
  for (const s of stories) {
    console.log(`\nStory ID: ${s.id}`);
    console.log(`Title: ${s.title}`);
    console.log(`Primary Category: ${s.primaryCategory}`);
    console.log(`Story Articles count: ${s.articles.length}`);
    for (const a of s.articles) {
      console.log(`  - Article Title: ${a.title}`);
      console.log(`    Article urlToImage: ${a.urlToImage}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
