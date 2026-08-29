import { prisma } from '../config/db';

async function main() {
  const articles = await prisma.article.findMany({
    take: 50,
    orderBy: {
      publishedAt: 'desc',
    },
  });

  console.log('Recent 50 articles in the database:');
  articles.forEach((art, index) => {
    console.log(`${index + 1}. Title: "${art.title}" \n   Desc: "${art.description}"\n`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
