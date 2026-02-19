import { Router } from 'express';
import { query } from '../db.js';
import { requireUserOrAdmin } from '../middleware/auth.js';

export const collectionsRouter = Router();

collectionsRouter.get('/:userId', async (req, res) => {
  const rows = await query<{ cardId: string }>(
    `SELECT card_id AS "cardId"
     FROM user_collections
     WHERE user_id = $1
     ORDER BY obtained_at ASC`,
    [req.params.userId]
  );

  res.json(rows.map((item) => item.cardId));
});

collectionsRouter.post('/:userId/add', requireUserOrAdmin('userId'), async (req, res) => {
  const { cardIds } = req.body as { cardIds: string[] };
  if (!Array.isArray(cardIds) || cardIds.length === 0) {
    return res.status(400).json({ message: 'cardIds requis' });
  }

  const values = cardIds
    .map((_, index) => `($1, $${index + 2}, NOW())`)
    .join(',');

  await query(
    `INSERT INTO user_collections (user_id, card_id, obtained_at)
     VALUES ${values}`,
    [req.params.userId, ...cardIds]
  );

  res.status(201).json({ success: true, inserted: cardIds.length });
});

collectionsRouter.delete('/:userId/card/:cardId', requireUserOrAdmin('userId'), async (req, res) => {
  const rows = await query<{ id: string }>(
    `SELECT id
     FROM user_collections
     WHERE user_id = $1
       AND card_id = $2
     ORDER BY obtained_at ASC
     LIMIT 1`,
    [req.params.userId, req.params.cardId]
  );

  if (!rows[0]) {
    return res.status(404).json({ message: 'Card not found in user collection' });
  }

  await query(`DELETE FROM user_collections WHERE id = $1`, [rows[0].id]);
  res.json({ success: true });
});

collectionsRouter.put('/:userId/replace', requireUserOrAdmin('userId'), async (req, res) => {
  const { collection } = req.body as { collection: string[] };

  if (!Array.isArray(collection)) {
    return res.status(400).json({ message: 'collection must be an array' });
  }

  await query(`DELETE FROM user_collections WHERE user_id = $1`, [req.params.userId]);

  if (collection.length > 0) {
    const values = collection
      .map((_, index) => `($1, $${index + 2}, NOW())`)
      .join(',');

    await query(
      `INSERT INTO user_collections (user_id, card_id, obtained_at)
       VALUES ${values}`,
      [req.params.userId, ...collection]
    );
  }

  res.json({ success: true, size: collection.length });
});
