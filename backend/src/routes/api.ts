import { Router, Request, Response } from 'express';
import { storiesController } from '../controllers/stories';
import { executeRefreshCycle } from '../services/scheduler';
import { prisma } from '../config/db';

const router = Router();

// Debug Endpoint for Database Diagnostics
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

    return res.json({
      articlesCount,
      storiesCount,
      unclusteredCount,
      sources: sources.map((s: any) => ({
        name: s.name,
        category: s.category,
        count: s._count.articles
      }))
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/admin/test-fetch', async (req: Request, res: Response) => {
  try {
    const Parser = require('rss-parser');
    const parser = new Parser();
    const axios = require('axios');
    const url = 'https://news.google.com/rss/search?q=TV9+Telugu+OR+Andhra+Pradesh+news&hl=en-IN&gl=IN&ceid=IN:en';
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*'
      },
      timeout: 10000
    });
    const feed = await parser.parseString(response.data);
    return res.json({
      success: true,
      itemsCount: feed.items.length,
      firstItem: feed.items[0]
    });
  } catch (err: any) {
    return res.json({ success: false, error: err.message });
  }
});

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
