import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import apiRouter from './routes/api';

const app = express();

// Middlewares
app.use(cors({
  origin: '*', // Allow all origins for simplicity, in prod customize to frontend URL
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-secret'],
}));

app.use(express.json());

// Base Route
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Mount API router
app.use('/api', apiRouter);

// Global Error Handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('[Global Error Handler]', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
  });
});

export default app;
