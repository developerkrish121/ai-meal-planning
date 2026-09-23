import express from 'express';

import { env } from './config/env.js';
import { healthRouter } from './routes/health.routes.js';

const app = express();

app.disable('x-powered-by');
app.use(express.json());
app.use('/api/health', healthRouter);

if (process.env.NODE_ENV !== 'test') {
  app.listen(env.port, () => {
    console.log(`Backend listening on http://localhost:${env.port}`);
  });
}

export { app };

