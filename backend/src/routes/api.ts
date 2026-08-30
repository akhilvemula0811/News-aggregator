import { Router, Request, Response } from 'express';
import { storiesController } from '../controllers/stories';
import { executeRefreshCycle } from '../services/scheduler';
import { prisma } from '../config/db';

const router = Router();

router.get('/debug-db', async (req: Request, res: Response) => {
  try {
    const articlesCount = await prisma.article.count();
    const storiesCount = await prisma.story.count();
    const unclusteredCount = await prisma.article.count({
      where: { storyId: null }
    });
    const sources = await prisma.source.findMany({
      include: {
        _count: {
          select: { articles: true }
        }
      }
    });

    const sourcesDetails = await Promise.all(sources.map(async (s: any) => {
      const clustered = await prisma.article.count({
        where: {
          sourceId: s.id,
          storyId: { not: null }
        }
      });
      return {
        name: s.name,
        category: s.category,
        totalArticles: s._count.articles,
        clusteredArticles: clustered
      };
    }));

    const sampleUnclustered = await prisma.article.findMany({
      where: { storyId: null },
      take: 10,
      select: {
        title: true,
        publishedAt: true,
        source: {
          select: { name: true }
        }
      }
    });

    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - 36);

    return res.json({
      articlesCount,
      storiesCount,
      unclusteredCount,
      cutoffDate: cutoffDate.toISOString(),
      sampleUnclustered: sampleUnclustered.map((a: any) => ({
        title: a.title,
        source: a.source?.name,
        publishedAt: a.publishedAt.toISOString(),
        isFreshEnough: a.publishedAt >= cutoffDate
      })),
      sources: sourcesDetails
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Debug Endpoint for Database Diagnostics (Removed for production)

// Public User Endpoints
router.get('/stories', (req, res) => storiesController.getStories(req, res));
router.get('/stories/:id', (req, res) => storiesController.getStoryDetails(req, res));
router.post('/stories/:id/engagement', (req, res) => storiesController.logEngagement(req, res));
router.post('/stories/:id/bookmark', (req, res) => storiesController.toggleBookmark(req, res));
router.get('/personalization', (req, res) => storiesController.getPersonalizationProfile(req, res));

// Protected Admin/Cron Ingestion Endpoint
router.post('/admin/ingest', async (req: Request, res: Response) => {
  const adminSecret = process.env.ADMIN_SECRET;
  const receivedSecret = req.headers['x-admin-secret'];

  if (!adminSecret || receivedSecret !== adminSecret) {
    return res.status(401).json({ error: 'Unauthorized. Invalid admin secret.' });
  }

  console.log('[Admin API] Manual ingestion trigger received. Starting background worker...');

  // Execute ingestion cycle in the background (non-blocking)
  executeRefreshCycle()
    .then((result) => {
      console.log('[Admin API] Background manual ingestion completed successfully:', result);
    })
    .catch((error) => {
      console.error('[Admin API] Background manual ingestion failed:', error.message);
    });

  // Return 202 Accepted status immediately
  return res.status(202).json({
    message: 'Ingestion and processing started in the background.',
    status: 'processing'
  });
});

export default router;
