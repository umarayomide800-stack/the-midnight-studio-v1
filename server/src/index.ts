import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import type { HealthResponse } from '@the-midnight-studio/types';
import v1Router from './routes/v1.js';
import paymentsRouter, { stripeWebhook } from './routes/payments.js';
import { errorHandler } from './middleware/error.js';

const app = express();
const port = Number(process.env.PORT ?? 4000);
const clientOrigin = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';

app.use(helmet());
app.use(cors({ origin: clientOrigin }));
app.post('/api/v1/webhooks/stripe', express.raw({ type: 'application/json' }), stripeWebhook);
app.use(express.json());
app.use('/api/v1', v1Router);
app.use('/api/v1', paymentsRouter);

app.get('/api/health', (_request, response) => {
  const payload: HealthResponse = {
    status: 'ok',
    service: 'the-midnight-studio-api',
    timestamp: new Date().toISOString()
  };

  response.json(payload);
});

app.use(errorHandler);

app.listen(port, () => {
  console.log(`The Midnight Studio API listening on http://localhost:${port}`);
});
