import { Router } from 'express';
import { query } from '../db.js';

export const healthRouter = Router();

healthRouter.get('/', async (_req, res) => {
  try {
    await query<{ ok: number }>('SELECT 1 as ok');
    res.json({ status: 'ok', database: 'ok' });
  } catch (error) {
    res.status(500).json({ status: 'error', database: 'down' });
  }
});
