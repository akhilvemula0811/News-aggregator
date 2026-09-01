import { prisma } from '../config/db';

async function check() {
  const sources = [
    'Prudent Media', 'Amar Ujala Himachal Pradesh', 'Zee Bihar Jharkhand',
    'Impact TV', 'OTV (Odisha TV)', 'Sikkim Chronicle', 'Headlines Tripura', 'Amar Ujala Uttarakhand'
  ];

  console.log('Checking remaining sources for linked stories:');
  for (const srcName of sources) {
    const src = await prisma.source.findFirst({
      where: { name: srcName }
    });
    if (!src) {
      console.log(`- Source not found: ${srcName}`);
      continue;
    }
    const articles = await prisma.article.findMany({
      where: { sourceId: src.id },
      select: { id: true, title: true, storyId: true }
    });
    const linked = articles.filter(a => a.storyId !== null).length;
    console.log(`- ${srcName}: ${linked} / ${articles.length} articles linked to story`);
  }
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
