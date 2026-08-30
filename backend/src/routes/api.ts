import { Router, Request, Response } from 'express';
import { storiesController } from '../controllers/stories';
import { executeRefreshCycle } from '../services/scheduler';
import { translateBatch } from '../services/translation';

import axios from 'axios';

const router = Router();

router.get('/debug-translation', async (req: Request, res: Response) => {
  const { text, lang } = req.query;
  try {
    const apiLangCode = (lang as string || 'en').toLowerCase();
    const url = `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=auto&tl=${apiLangCode}&q=${encodeURIComponent(text as string)}`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 10000
    });
    return res.json({
      success: true,
      original: text,
      lang: apiLangCode,
      status: response.status,
      data: response.data
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
      response: error.response ? {
        status: error.response.status,
        data: error.response.data
      } : null
    });
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
