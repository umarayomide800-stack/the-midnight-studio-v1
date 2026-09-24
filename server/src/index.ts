import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import type { HealthResponse } from '@the-midnight-studio/types';
import v1Router, { releaseExpiredHolds } from './routes/v1.js';
import paymentsRouter, { stripeWebhook } from './routes/payments.js';
import bookingManagementRouter from './routes/booking-management.js';
import contactRouter from './routes/contact.js';
import { errorHandler } from './middleware/error.js';

const app = express();
const port = Number(process.env.PORT ?? 4000);
const rawOrigins = (process.env.CLIENT_ORIGIN ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const defaultOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:4173',
  'https://the-midnight-studio-v1-1.onrender.com'
];

const allowedOriginsSet = new Set([...defaultOrigins, ...rawOrigins]);

function isOriginAllowed(origin: string): boolean {
  if (allowedOriginsSet.has(origin)) return true;
  try {
    const url = new URL(origin);
    if (url.hostname.endsWith('.onrender.com') || url.hostname.endsWith('.vercel.app')) {
      return true;
    }
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

app.use(
  cors({
    origin: (requestOrigin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server) or matched origins
      if (!requestOrigin || isOriginAllowed(requestOrigin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-key'],
    optionsSuccessStatus: 204
  })
);
app.post('/api/v1/webhooks/stripe', express.raw({ type: 'application/json' }), stripeWebhook);
app.use(express.json());
app.use('/api/v1', v1Router);
app.use('/api/v1', paymentsRouter);
app.use('/api/v1', bookingManagementRouter);
app.use('/api/v1', contactRouter);

app.get('/', (_request, response) => {
  response.json({ service: 'the-midnight-studio-api', status: 'ok' });
});

app.get('/api/health', (_request, response) => {
  const payload: HealthResponse = {
    status: 'ok',
    service: 'the-midnight-studio-api',
    timestamp: new Date().toISOString()
  };

  response.json(payload);
});

app.use(errorHandler);

const cleanupTimer = setInterval(() => {
  releaseExpiredHolds().catch((error) => console.error('Expired hold cleanup failed', error));
}, 60_000);
cleanupTimer.unref();

app.listen(port, () => {
  console.log(`The Midnight Studio API listening on http://localhost:${port}`);
});
