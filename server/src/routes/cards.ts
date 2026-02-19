import { Router } from 'express';
import { query } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';

export const cardsRouter = Router();

type CardColumns = {
  seriesId: boolean;
  title: boolean;
  lore: boolean;
  imageUrl: boolean;
  cardType: boolean;
  attack: boolean;
  defense: boolean;
  abilities: boolean;
  createdAt: boolean;
  updatedAt: boolean;
};

let cardColumnsCache: CardColumns | undefined;

const getCardColumns = async (): Promise<CardColumns> => {
  if (cardColumnsCache) {
    return cardColumnsCache;
  }

  const rows = await query<{ columnName: string }>(
    `SELECT column_name AS "columnName"
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'cards'`
  );

  const set = new Set(rows.map((row) => row.columnName));
  cardColumnsCache = {
    seriesId: set.has('series_id'),
    title: set.has('title'),
    lore: set.has('lore'),
    imageUrl: set.has('image_url'),
    cardType: set.has('card_type'),
    attack: set.has('attack'),
    defense: set.has('defense'),
    abilities: set.has('abilities'),
    createdAt: set.has('created_at'),
    updatedAt: set.has('updated_at'),
  };

  return cardColumnsCache;
};

const getCardSelect = async () => {
  const cols = await getCardColumns();
  return `id,
          ${cols.seriesId ? 'series_id' : 'NULL::uuid'} AS "seriesId",
          name,
          ${cols.title ? 'title' : 'NULL::text'} AS "title",
          description,
          ${cols.lore ? 'lore' : 'NULL::text'} AS "lore",
          ${cols.imageUrl ? 'image_url' : 'NULL::text'} AS "imageUrl",
          ${cols.cardType ? 'card_type' : 'NULL::text'} AS "cardType",
          rarity,
          ${cols.attack ? 'attack' : '0'} AS attack,
          ${cols.defense ? 'defense' : '0'} AS defense,
          ${cols.abilities ? 'abilities' : "'{}'::text[]"} AS abilities,
          ${cols.createdAt ? 'created_at' : 'NOW()'} AS "createdAt",
          ${cols.updatedAt ? 'updated_at' : cols.createdAt ? 'created_at' : 'NOW()'} AS "updatedAt"`;
};

cardsRouter.get('/', async (req, res) => {
  const { seriesId } = req.query;
  const select = await getCardSelect();
  const cols = await getCardColumns();

  const canFilterBySeries = cols.seriesId && typeof seriesId === 'string' && seriesId.length > 0;

  const rows = canFilterBySeries
    ? await query(
        `SELECT ${select}
         FROM cards
         WHERE series_id::text = $1
         ORDER BY name ASC`,
        [seriesId]
      )
    : await query(
        `SELECT ${select}
         FROM cards
         ORDER BY name ASC`
      );

  res.json(rows);
});

cardsRouter.get('/:id', async (req, res) => {
  const select = await getCardSelect();

  const rows = await query(
    `SELECT ${select}
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
