import { Router } from 'express';
import { query } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';

export const seriesRouter = Router();

seriesRouter.get('/', async (_req, res) => {
  const rows = await query(
    `SELECT id, name, description, setting, total_cards AS "totalCards", cover_image AS "coverImage",
            release_date AS "releaseDate", is_active AS "isActive", created_at AS "createdAt", updated_at AS "updatedAt"
     FROM series
     ORDER BY name ASC`
  );
  res.json(rows);
});

seriesRouter.get('/:id', async (req, res) => {
  const rows = await query(
    `SELECT id, name, description, setting, total_cards AS "totalCards", cover_image AS "coverImage",
            release_date AS "releaseDate", is_active AS "isActive", created_at AS "createdAt", updated_at AS "updatedAt"
     FROM series
     WHERE id = $1
     LIMIT 1`,
    [req.params.id]
  );

  if (!rows[0]) {
    return res.status(404).json({ message: 'Series not found' });
  }

  res.json(rows[0]);
});

seriesRouter.post('/', requireAdmin, async (req, res) => {
  const body = req.body;
  const rows = await query(
    `INSERT INTO series (id, name, description, setting, total_cards, cover_image, release_date, is_active, created_at)
     VALUES (COALESCE($1::uuid, uuid_generate_v4()), $2, $3, $4, COALESCE($5, 0), $6, $7, COALESCE($8, true), NOW())
     RETURNING id, name, description, setting, total_cards AS "totalCards", cover_image AS "coverImage",
               release_date AS "releaseDate", is_active AS "isActive", created_at AS "createdAt", updated_at AS "updatedAt"`,
    [
      body.id || null,
      body.name,
      body.description || null,
      body.setting || null,
      body.totalCards ?? 0,
      body.coverImage || null,
      body.releaseDate || null,
      body.isActive ?? true,
    ]
  );

  res.status(201).json(rows[0]);
});

seriesRouter.patch('/:id', requireAdmin, async (req, res) => {
  const body = req.body;
  const rows = await query(
    `UPDATE series
     SET name = COALESCE($2, name),
         description = COALESCE($3, description),
         setting = COALESCE($4, setting),
         total_cards = COALESCE($5, total_cards),
         cover_image = COALESCE($6, cover_image),
         release_date = COALESCE($7, release_date),
         is_active = COALESCE($8, is_active),
         updated_at = NOW()
     WHERE id = $1
     RETURNING id, name, description, setting, total_cards AS "totalCards", cover_image AS "coverImage",
               release_date AS "releaseDate", is_active AS "isActive", created_at AS "createdAt", updated_at AS "updatedAt"`,
    [
      req.params.id,
      body.name ?? null,
      body.description ?? null,
      body.setting ?? null,
      body.totalCards ?? null,
      body.coverImage ?? null,
      body.releaseDate ?? null,
      body.isActive ?? null,
    ]
  );

  if (!rows[0]) {
    return res.status(404).json({ message: 'Series not found' });
  }

  res.json(rows[0]);
});

seriesRouter.delete('/:id', requireAdmin, async (req, res) => {
  const rows = await query(
    `DELETE FROM series WHERE id = $1 RETURNING id`,
    [req.params.id]
  );

  if (!rows[0]) {
    return res.status(404).json({ message: 'Series not found' });
  }

  res.json({ success: true });
});
