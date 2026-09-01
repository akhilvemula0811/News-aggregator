import { prisma } from '../config/db';

async function main() {
  const stories = await prisma.story.findMany({
    where: {
      OR: [
        { title: { contains: 'Avis' } },
        { title: { contains: 'Baswanandam' } },
        { title: { contains: 'PVR' } }
      ]
    },
    include: {
      articles: true
    }
  });

  console.log(`Found ${stories.length} stories`);
  stories.forEach((story: any) => {
    console.log(`Story Title: ${story.title}`);
    console.log(`Primary Category: ${story.primaryCategory}`);
    story.articles.forEach((art: any) => {
      console.log(`  Article Title: ${art.title}`);
      console.log(`  URL: ${art.url}`);
      console.log(`  urlToImage: ${art.urlToImage}`);
    });
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
