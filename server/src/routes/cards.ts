import { Router } from 'express';
import { query } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';

export const cardsRouter = Router();

cardsRouter.get('/', async (req, res) => {
  const { seriesId } = req.query;

  const rows = await query(
    `SELECT id, series_id AS "seriesId", name, title, description, lore, image_url AS "imageUrl",
            card_type AS "cardType", rarity, attack, defense, abilities,
            created_at AS "createdAt", updated_at AS "updatedAt"
     FROM cards
     WHERE ($1::uuid IS NULL OR series_id = $1::uuid)
     ORDER BY name ASC`,
    [seriesId || null]
  );

  res.json(rows);
});

cardsRouter.get('/:id', async (req, res) => {
  const rows = await query(
    `SELECT id, series_id AS "seriesId", name, title, description, lore, image_url AS "imageUrl",
            card_type AS "cardType", rarity, attack, defense, abilities,
            created_at AS "createdAt", updated_at AS "updatedAt"
     FROM cards
     WHERE id = $1
     LIMIT 1`,
    [req.params.id]
  );

  if (!rows[0]) {
    return res.status(404).json({ message: 'Card not found' });
  }

  res.json(rows[0]);
});

cardsRouter.post('/', requireAdmin, async (req, res) => {
  const body = req.body;
  const rows = await query(
    `INSERT INTO cards (
      id, series_id, name, title, description, lore, image_url,
      card_type, rarity, attack, defense, abilities, created_at
    )
    VALUES (
      COALESCE($1::uuid, uuid_generate_v4()), $2::uuid, $3, $4, $5, $6, $7,
      $8, $9, COALESCE($10, 0), COALESCE($11, 0), COALESCE($12, '{}'), NOW()
    )
    RETURNING id, series_id AS "seriesId", name, title, description, lore, image_url AS "imageUrl",
              card_type AS "cardType", rarity, attack, defense, abilities,
              created_at AS "createdAt", updated_at AS "updatedAt"`,
    [
      body.id || null,
      body.seriesId,
      body.name,
      body.title || null,
      body.description,
      body.lore || null,
      body.imageUrl || null,
      body.cardType,
      body.rarity,
      body.attack ?? 0,
      body.defense ?? 0,
      body.abilities ?? [],
    ]
  );

  res.status(201).json(rows[0]);
});

cardsRouter.patch('/:id', requireAdmin, async (req, res) => {
  const body = req.body;
  const rows = await query(
    `UPDATE cards
     SET series_id = COALESCE($2::uuid, series_id),
         name = COALESCE($3, name),
         title = COALESCE($4, title),
         description = COALESCE($5, description),
         lore = COALESCE($6, lore),
         image_url = COALESCE($7, image_url),
         card_type = COALESCE($8, card_type),
         rarity = COALESCE($9, rarity),
         attack = COALESCE($10, attack),
         defense = COALESCE($11, defense),
         abilities = COALESCE($12, abilities),
         updated_at = NOW()
     WHERE id = $1
     RETURNING id, series_id AS "seriesId", name, title, description, lore, image_url AS "imageUrl",
               card_type AS "cardType", rarity, attack, defense, abilities,
               created_at AS "createdAt", updated_at AS "updatedAt"`,
    [
      req.params.id,
      body.seriesId ?? null,
      body.name ?? null,
      body.title ?? null,
      body.description ?? null,
      body.lore ?? null,
      body.imageUrl ?? null,
      body.cardType ?? null,
      body.rarity ?? null,
      body.attack ?? null,
      body.defense ?? null,
      body.abilities ?? null,
    ]
  );

  if (!rows[0]) {
    return res.status(404).json({ message: 'Card not found' });
  }

  res.json(rows[0]);
});

cardsRouter.delete('/:id', requireAdmin, async (req, res) => {
  const rows = await query(
    `DELETE FROM cards
     WHERE id = $1
     RETURNING id`,
    [req.params.id]
  );

  if (!rows[0]) {
    return res.status(404).json({ message: 'Card not found' });
  }

  res.json({ success: true });
});
