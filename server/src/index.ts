import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config.js';
import { healthRouter } from './routes/health.js';
import { cardsRouter } from './routes/cards.js';
import { seriesRouter } from './routes/series.js';
import { usersRouter } from './routes/users.js';
import { collectionsRouter } from './routes/collections.js';
import { tradesRouter } from './routes/trades.js';
import { notificationsRouter } from './routes/notifications.js';
import { mediaPublicRouter, mediaRouter } from './routes/media.js';
import { requireAuth } from './middleware/auth.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: config.corsOrigin === '*' ? true : config.corsOrigin }));
app.use(express.json({ limit: '2mb' }));
app.use('/uploads', mediaPublicRouter);

app.get('/', (_req, res) => {
  res.json({ service: 'valthera-api', status: 'ok' });
});

app.use('/health', healthRouter);
app.use('/cards', cardsRouter);
app.use('/series', seriesRouter);
app.use('/users', usersRouter);
app.use('/collections', collectionsRouter);
app.use('/trades', requireAuth, tradesRouter);
app.use('/notifications', requireAuth, notificationsRouter);
app.use('/media', requireAuth, express.raw({ type: 'image/*', limit: '10mb' }), mediaRouter);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  res.status(500).json({ message: 'Internal server error' });
});

app.listen(config.port, () => {
  console.log(`valthera-api listening on :${config.port}`);
});
