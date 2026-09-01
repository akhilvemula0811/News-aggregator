import fs from 'fs';
import path from 'path';
import { prisma } from '../config/db';

export async function importSeedData(): Promise<{ success: boolean; counts?: any; message: string }> {
  const seedFilePath = path.join(__dirname, '../../prisma/seed_data.json');
  if (!fs.existsSync(seedFilePath)) {
    console.log('[Seed Importer] No seed_data.json found at', seedFilePath);
    return { success: false, message: 'seed_data.json not found' };
  }

  console.log('[Seed Importer] Loading seed_data.json...');
  const fileContent = fs.readFileSync(seedFilePath, 'utf-8');
  const data = JSON.parse(fileContent);

  console.log(`[Seed Importer] Starting database synchronization: ${data.stories.length} stories, ${data.articles.length} articles, ${data.sources.length} sources...`);

  try {
    // 1. Wipe existing tables to avoid foreign key constraints and start clean
    console.log('[Seed Importer] Cleaning existing database records...');
    await prisma.claim.deleteMany({});
    await prisma.storyTimeline.deleteMany({});
    await prisma.storyDiff.deleteMany({});
    await prisma.article.deleteMany({});
    await prisma.story.deleteMany({});
    await prisma.source.deleteMany({});

    // 2. Insert Sources
    console.log('[Seed Importer] Inserting sources...');
    for (const src of data.sources) {
      await prisma.source.create({
        data: {
          id: src.id,
          name: src.name,
          url: src.url,
          type: src.type || 'RSS',
          category: src.category || 'General',
          language: src.language || 'en',
          country: src.country || 'in'
        }
      });
    }

    // 3. Insert Stories
    console.log('[Seed Importer] Inserting stories...');
    const chunkSize = 50;
    for (let i = 0; i < data.stories.length; i += chunkSize) {
      const chunk = data.stories.slice(i, i + chunkSize);
      for (const s of chunk) {
        await prisma.story.create({
          data: {
            id: s.id,
            title: s.title,
            summary: s.summary,
            credibilityScore: s.credibilityScore,
            primaryCategory: s.primaryCategory,
            secondaryCategory: s.secondaryCategory || null,
            isDeveloping: s.isDeveloping || false,
            createdAt: new Date(s.createdAt),
            updatedAt: new Date(s.updatedAt)
          }
        });
      }
    }

    // 4. Insert Articles
    console.log('[Seed Importer] Inserting articles...');
    for (let i = 0; i < data.articles.length; i += chunkSize) {
      const chunk = data.articles.slice(i, i + chunkSize);
      for (const a of chunk) {
        await prisma.article.create({
          data: {
            id: a.id,
            title: a.title,
            description: a.description || null,
            content: a.content || null,
            url: a.url,
            urlToImage: a.urlToImage || null,
            publishedAt: new Date(a.publishedAt),
            publishedIstDate: a.publishedIstDate || new Date(a.publishedAt).toISOString().split('T')[0],
            author: a.author || null,
            sourceId: a.sourceId || null,
            storyId: a.storyId || null,
            createdAt: new Date(a.createdAt)
          }
        });
      }
    }

    // 5. Insert Claims
    console.log('[Seed Importer] Inserting claims...');
    if (data.claims && data.claims.length > 0) {
      for (let i = 0; i < data.claims.length; i += chunkSize) {
        const chunk = data.claims.slice(i, i + chunkSize);
        for (const c of chunk) {
          await prisma.claim.create({
            data: {
              id: c.id,
              storyId: c.storyId,
              claimText: c.claimText || c.statement || '',
              status: c.status || 'SINGLE_SOURCE',
              sourcesCount: c.sourcesCount || 1,
              createdAt: new Date(c.createdAt)
            }
          });
        }
      }
    }

    // 6. Insert Story Timelines
    if (data.storyTimelines && data.storyTimelines.length > 0) {
      console.log('[Seed Importer] Inserting timelines...');
      for (const t of data.storyTimelines) {
        await prisma.storyTimeline.create({
          data: {
            id: t.id,
            storyId: t.storyId,
            eventTime: new Date(t.eventTime || t.timestamp || Date.now()),
            eventTitle: t.eventTitle || t.title || '',
            eventDescription: t.eventDescription || t.description || '',
            sourceUrl: t.sourceUrl || null,
            createdAt: new Date(t.createdAt)
          }
        });
      }
    }

    // 7. Insert Story Diffs
    if (data.storyDiffs && data.storyDiffs.length > 0) {
      console.log('[Seed Importer] Inserting diffs...');
      for (const d of data.storyDiffs) {
        await prisma.storyDiff.create({
          data: {
            id: d.id,
            storyId: d.storyId,
            diffDate: d.diffDate || new Date().toISOString().split('T')[0],
            diffContent: d.diffContent || d.description || '',
            createdAt: new Date(d.createdAt)
          }
        });
      }
    }

    const counts = {
      sources: data.sources.length,
      stories: data.stories.length,
      articles: data.articles.length,
      claims: (data.claims || []).length
    };

    console.log('[Seed Importer] ✅ Production database synchronization complete:', counts);
    return { success: true, counts, message: 'Database successfully synced with local records.' };
  } catch (error: any) {
    console.error('[Seed Importer] Error during database synchronization:', error.message);
    return { success: false, message: error.message };
  }
}
