import { prisma } from '../config/db';

async function main() {
  const total = await prisma.article.count();
  const unclustered = await prisma.article.count({
    where: { storyId: null }
  });
  const clustered = total - unclustered;
  
  console.log(`Total Articles: ${total}`);
  console.log(`Clustered Articles: ${clustered}`);
  console.log(`Unclustered Articles remaining: ${unclustered}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
