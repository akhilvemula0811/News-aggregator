import { prisma } from '../config/db';

async function check() {
  console.log('Inspecting Sources and Stories...');
  const sources = await prisma.source.findMany({
    include: {
      _count: {
        select: { articles: true }
      }
    }
  });

  console.log('Sources and their article counts:');
  for (const src of sources) {
    if (src._count.articles > 0) {
      console.log(`- [${src.name}] (${src.category}): ${src._count.articles} articles`);
    }
  }

  // Check how many articles have storyId != null
  const articlesWithStory = await prisma.article.count({
    where: {
      storyId: { not: null }
    }
  });

  const totalArticles = await prisma.article.count();
  console.log(`Articles linked to a story: ${articlesWithStory} / ${totalArticles}`);

  // Check sample of stories with their article sources
  const sampleStories = await prisma.story.findMany({
    take: 10,
    include: {
      articles: {
        include: { source: true }
      }
    }
  });
  console.log('Sample stories article counts:');
  for (const s of sampleStories) {
    console.log(`Story ${s.id} ("${s.title.substring(0, 40)}..."): ${s.articles.length} articles (${s.articles.map(a => a.source?.name).join(', ')})`);
  }
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
