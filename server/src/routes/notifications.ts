import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db.js';
import { requireUserOrAdmin } from '../middleware/auth.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

const createNotificationSchema = z.object({
  userId: z.string().uuid(),
  type: z.string().trim().min(1).max(60),
  title: z.string().trim().min(1).max(150),
  message: z.string().trim().max(2000).optional().nullable(),
  data: z.record(z.any()).optional(),
  isRead: z.boolean().optional(),
});

export const notificationsRouter = Router();

notificationsRouter.get('/user/:userId', requireUserOrAdmin('userId'), async (req, res) => {
  const rows = await query(
    `SELECT id, user_id AS "userId", type, title, message, data, is_read AS "isRead", created_at AS "createdAt"
     FROM notifications
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 50`,
    [req.params.userId]
  );

  res.json(rows);
});

notificationsRouter.post('/', async (req: AuthenticatedRequest, res) => {
  const parsed = createNotificationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid payload', issues: parsed.error.flatten() });
  }

  const body = parsed.data;

  if (req.auth?.email) {
    const rowsTarget = await query<{ email: string | null }>(
      `SELECT email FROM users WHERE id = $1 LIMIT 1`,
      [body.userId]
    );
    const targetEmail = rowsTarget[0]?.email?.toLowerCase();
    if (targetEmail && targetEmail !== req.auth.email.toLowerCase()) {
      return res.status(403).json({ message: 'Forbidden for this user' });
    }
  }

  const rows = await query(
    `INSERT INTO notifications (user_id, type, title, message, data, is_read, created_at)
     VALUES ($1, $2, $3, $4, $5::jsonb, COALESCE($6, false), NOW())
     RETURNING id, user_id AS "userId", type, title, message, data, is_read AS "isRead", created_at AS "createdAt"`,
    [
      body.userId,
      body.type,
      body.title,
      body.message || null,
      JSON.stringify(body.data || {}),
      body.isRead ?? false,
    ]
  );

  res.status(201).json(rows[0]);
});

notificationsRouter.patch('/:notificationId/read', async (req: AuthenticatedRequest, res) => {
  if (req.auth?.email) {
    const ownerRows = await query<{ email: string | null }>(
      `SELECT u.email
       FROM notifications n
       JOIN users u ON u.id = n.user_id
       WHERE n.id = $1
       LIMIT 1`,
      [req.params.notificationId]
    );
    const ownerEmail = ownerRows[0]?.email?.toLowerCase();
    if (ownerEmail && ownerEmail !== req.auth.email.toLowerCase()) {
      return res.status(403).json({ message: 'Forbidden for this notification' });
    }
  }

  const rows = await query(
    `UPDATE notifications
     SET is_read = true
     WHERE id = $1
     RETURNING id, user_id AS "userId", type, title, message, data, is_read AS "isRead", created_at AS "createdAt"`,
    [req.params.notificationId]
  );

  if (!rows[0]) {
    return res.status(404).json({ message: 'Notification not found' });
  }

  res.json(rows[0]);
});
