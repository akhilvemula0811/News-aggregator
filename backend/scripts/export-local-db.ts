import fs from 'fs';
import path from 'path';
import { prisma } from '../src/config/db';

async function exportLocalDb() {
  console.log('[Export] Fetching all database records from local SQLite...');
  
  const sources = await prisma.source.findMany();
  const rawArticles = await prisma.article.findMany();
  const articles = rawArticles.map(a => ({
    ...a,
    embedding: null // Embedding is only needed during initial clustering; omitting saves 20+ MB
  }));
  const stories = await prisma.story.findMany({
    include: {
      articles: {
        select: { id: true }
      }
    }
  });
  const claims = await prisma.claim.findMany();
  const storyTimelines = await prisma.storyTimeline.findMany();
  const storyDiffs = await prisma.storyDiff.findMany();

  const exportData = {
    exportedAt: new Date().toISOString(),
    sources,
    articles,
    stories,
    claims,
    storyTimelines,
    storyDiffs
  };

  const outputPath = path.join(__dirname, '../prisma/seed_data.json');
  fs.writeFileSync(outputPath, JSON.stringify(exportData), 'utf-8');
  
  const stats = fs.statSync(outputPath);
  console.log(`[Export] Successfully exported to ${outputPath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`[Export] Counts: ${sources.length} sources, ${articles.length} articles, ${stories.length} stories, ${claims.length} claims`);
  
  await prisma.$disconnect();
}

exportLocalDb().catch((err) => {
  console.error('[Export] Error:', err);
  process.exit(1);
});
