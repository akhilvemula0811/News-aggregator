import { prisma } from '../config/db';

async function check() {
  const terms = ['RTV', 'Avis', 'PVR'];
  for (const term of terms) {
    const stories = await prisma.story.findMany({
      where: {
        OR: [
          { title: { contains: term } },
          { summary: { contains: term } }
        ]
      },
      include: {
        articles: true
      },
      take: 5
    });
    console.log(`Found ${stories.length} stories for "${term}":`);
    for (const s of stories) {
      const img = s.articles[0]?.urlToImage;
      console.log(`- Story: "${s.title}" (Image: ${img ? img.substring(0, 70) + '...' : 'NONE'})`);
    }
  }
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
