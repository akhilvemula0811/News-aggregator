import { Router, Request, Response } from 'express';
import { storiesController } from '../controllers/stories';
import { executeRefreshCycle } from '../services/scheduler';
import { translateBatch } from '../services/translation';

const router = Router();

router.get('/debug-translation', async (req: Request, res: Response) => {
  const { text, lang } = req.query;
  try {
    const result = await translateBatch([text as string], lang as string);
    return res.json({ success: true, original: text, lang, translated: result[0] });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
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
