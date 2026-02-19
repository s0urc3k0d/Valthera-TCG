import { Router } from 'express';
import { pool, query } from '../db.js';
import { requireUserOrAdmin } from '../middleware/auth.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { config } from '../config.js';

interface TradeItem {
  cardId: string;
  quantity: number;
}

interface ActorContext {
  userId: string | null;
  isAdmin: boolean;
}

const normalizeTradeItems = (items: TradeItem[]): TradeItem[] => {
  const aggregated = new Map<string, number>();
  for (const item of items) {
    aggregated.set(item.cardId, (aggregated.get(item.cardId) || 0) + item.quantity);
  }
  return [...aggregated.entries()].map(([cardId, quantity]) => ({ cardId, quantity }));
};

const parseTradeItems = (value: unknown): TradeItem[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }

  const parsed: TradeItem[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') {
      return null;
    }

    const cardId = (item as { cardId?: unknown }).cardId;
    const quantity = (item as { quantity?: unknown }).quantity;

    if (typeof cardId !== 'string' || cardId.trim().length === 0) {
      return null;
    }

    if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity <= 0) {
      return null;
    }

    parsed.push({ cardId: cardId.trim(), quantity });
  }

  return normalizeTradeItems(parsed);
};

const resolveActor = async (req: AuthenticatedRequest): Promise<ActorContext | null> => {
  if (!config.authEnabled) {
    return { userId: null, isAdmin: true };
  }

  const actorEmail = req.auth?.email?.toLowerCase();
  if (!actorEmail) {
    return null;
  }

  const actorRows = await query<{ id: string; isAdmin: boolean }>(
    `SELECT id, is_admin AS "isAdmin" FROM users WHERE lower(email) = $1 LIMIT 1`,
    [actorEmail]
  );

  const actor = actorRows[0];
  if (!actor) {
    return null;
  }

  const isAdminByEmail = config.adminEmails.includes(actorEmail);
  return {
    userId: actor.id,
    isAdmin: isAdminByEmail || actor.isAdmin,
  };
};

const removeCardsFromList = (source: string[], items: TradeItem[]): { ok: boolean; result: string[] } => {
  const result = [...source];
  for (const item of items) {
    for (let i = 0; i < item.quantity; i++) {
      const index = result.indexOf(item.cardId);
      if (index === -1) {
        return { ok: false, result: source };
      }
      result.splice(index, 1);
    }
  }
  return { ok: true, result };
};

export const tradesRouter = Router();

tradesRouter.get('/user/:userId', requireUserOrAdmin('userId'), async (req, res) => {
  const rows = await query(
    `SELECT id, from_user_id AS "fromUserId", to_user_id AS "toUserId",
            from_username AS "fromUsername", to_username AS "toUsername",
            status, offered_cards AS "offeredCards", requested_cards AS "requestedCards",
            message, created_at AS "createdAt", updated_at AS "updatedAt", completed_at AS "completedAt"
     FROM trades
     WHERE from_user_id = $1 OR to_user_id = $1
     ORDER BY created_at DESC`,
    [req.params.userId]
  );

  res.json(rows);
});

tradesRouter.post('/', async (req: AuthenticatedRequest, res) => {
  const body = req.body;

  const offeredCards = parseTradeItems(body.offeredCards);
  const requestedCards = parseTradeItems(body.requestedCards);

  if (!body.fromUserId || !body.toUserId || typeof body.fromUserId !== 'string' || typeof body.toUserId !== 'string') {
    return res.status(400).json({ message: 'fromUserId and toUserId are required' });
  }

  if (body.fromUserId === body.toUserId) {
    return res.status(400).json({ message: 'Cannot create trade with same source and target user' });
  }

  if (!offeredCards || !requestedCards || offeredCards.length === 0 || requestedCards.length === 0) {
    return res.status(400).json({ message: 'offeredCards and requestedCards must be valid non-empty arrays' });
  }

  const actor = await resolveActor(req);
  if (!actor) {
    return res.status(403).json({ message: 'Actor user not found' });
  }

  if (!actor.isAdmin && actor.userId !== body.fromUserId) {
    return res.status(403).json({ message: 'Only trade sender can create this trade' });
  }

  const usersRows = await query<{ id: string; username: string }>(
    `SELECT id, username FROM users WHERE id IN ($1, $2)`,
    [body.fromUserId, body.toUserId]
  );

  const fromUser = usersRows.find((user) => user.id === body.fromUserId);
  const toUser = usersRows.find((user) => user.id === body.toUserId);

  if (!fromUser || !toUser) {
    return res.status(404).json({ message: 'One or more users not found' });
  }

  const fromCollectionRows = await query<{ cardId: string }>(
    `SELECT card_id AS "cardId"
     FROM user_collections
     WHERE user_id = $1
     ORDER BY obtained_at ASC`,
    [body.fromUserId]
  );
  const fromCollection = fromCollectionRows.map((row) => row.cardId);
  const canOffer = removeCardsFromList(fromCollection, offeredCards);
  if (!canOffer.ok) {
    return res.status(409).json({ message: 'Sender does not own offered cards' });
  }

  const rows = await query(
    `INSERT INTO trades (
      from_user_id, to_user_id, from_username, to_username, status,
      offered_cards, requested_cards, message, created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, NOW())
    RETURNING id, from_user_id AS "fromUserId", to_user_id AS "toUserId",
              from_username AS "fromUsername", to_username AS "toUsername",
              status, offered_cards AS "offeredCards", requested_cards AS "requestedCards",
              message, created_at AS "createdAt", updated_at AS "updatedAt", completed_at AS "completedAt"`,
    [
      body.fromUserId,
      body.toUserId,
      fromUser.username,
      toUser.username,
      'pending',
      JSON.stringify(offeredCards),
      JSON.stringify(requestedCards),
      body.message || null,
    ]
  );

  res.status(201).json(rows[0]);
});

tradesRouter.patch('/:tradeId/status', async (req: AuthenticatedRequest, res) => {
  const { status } = req.body as { status: string };

  if (!status || typeof status !== 'string') {
    return res.status(400).json({ message: 'status is required' });
  }

  if (status === 'accepted') {
    return res.status(400).json({ message: 'Use /trades/:tradeId/accept for accepted status' });
  }

  if (!['rejected', 'cancelled'].includes(status)) {
    return res.status(400).json({ message: 'Unsupported status transition' });
  }

  const tradeRows = await query<{
    id: string;
    fromUserId: string;
    toUserId: string;
    status: string;
  }>(
    `SELECT id,
            from_user_id AS "fromUserId",
            to_user_id AS "toUserId",
            status
     FROM trades
     WHERE id = $1
     LIMIT 1`,
    [req.params.tradeId]
  );

  const trade = tradeRows[0];
  if (!trade) {
    return res.status(404).json({ message: 'Trade not found' });
  }

  if (trade.status !== 'pending') {
    return res.status(409).json({ message: 'Trade is not pending' });
  }

  const actor = await resolveActor(req);
  if (!actor) {
    return res.status(403).json({ message: 'Actor user not found' });
  }

  if (!actor.isAdmin) {
    if (status === 'cancelled' && actor.userId !== trade.fromUserId) {
      return res.status(403).json({ message: 'Only sender can cancel this trade' });
    }

    if (status === 'rejected' && actor.userId !== trade.toUserId) {
      return res.status(403).json({ message: 'Only recipient can reject this trade' });
    }
  }

  const rows = await query(
    `UPDATE trades
     SET status = $2,
         updated_at = NOW(),
         completed_at = CASE WHEN $2 IN ('accepted', 'rejected', 'cancelled') THEN NOW() ELSE completed_at END
     WHERE id = $1
     RETURNING id, from_user_id AS "fromUserId", to_user_id AS "toUserId",
               from_username AS "fromUsername", to_username AS "toUsername",
               status, offered_cards AS "offeredCards", requested_cards AS "requestedCards",
               message, created_at AS "createdAt", updated_at AS "updatedAt", completed_at AS "completedAt"`,
    [req.params.tradeId, status]
  );

  if (!rows[0]) {
    return res.status(404).json({ message: 'Trade not found' });
  }

  res.json(rows[0]);
});

tradesRouter.post('/:tradeId/accept', async (req: AuthenticatedRequest, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    let actorUserId: string | null = null;
    let isActorAdmin = !config.authEnabled;

    if (config.authEnabled) {
      const actorEmail = req.auth?.email?.toLowerCase();
      if (!actorEmail) {
        await client.query('ROLLBACK');
        return res.status(403).json({ message: 'Authenticated email required' });
      }

      const actorUserResult = await client.query<{ id: string; isAdmin: boolean }>(
        `SELECT id, is_admin AS "isAdmin" FROM users WHERE lower(email) = $1 LIMIT 1`,
        [actorEmail]
      );
      const actorUser = actorUserResult.rows[0];
      if (!actorUser) {
        await client.query('ROLLBACK');
        return res.status(403).json({ message: 'Actor user not found' });
      }

      actorUserId = actorUser.id;
      const isAdminByEmail = config.adminEmails.includes(actorEmail);
      isActorAdmin = isAdminByEmail || actorUser.isAdmin;
    }

    const tradeResult = await client.query<{
      id: string;
      fromUserId: string;
      toUserId: string;
      fromUsername: string | null;
      toUsername: string | null;
      status: string;
      offeredCards: TradeItem[];
      requestedCards: TradeItem[];
      message: string | null;
      createdAt: string;
      updatedAt: string | null;
      completedAt: string | null;
    }>(
      `SELECT id,
              from_user_id AS "fromUserId",
              to_user_id AS "toUserId",
              from_username AS "fromUsername",
              to_username AS "toUsername",
              status,
              offered_cards AS "offeredCards",
              requested_cards AS "requestedCards",
              message,
              created_at AS "createdAt",
              updated_at AS "updatedAt",
              completed_at AS "completedAt"
       FROM trades
       WHERE id = $1
       FOR UPDATE`,
      [req.params.tradeId]
    );

    const trade = tradeResult.rows[0];
    if (!trade) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Trade not found' });
    }

    if (trade.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'Trade is not pending' });
    }

    if (!isActorAdmin && actorUserId !== trade.toUserId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: 'Only recipient can accept this trade' });
    }

    const toUserCollectionRows = await client.query<{ cardId: string }>(
      `SELECT card_id AS "cardId"
       FROM user_collections
       WHERE user_id = $1
       ORDER BY obtained_at ASC`,
      [trade.toUserId]
    );
    const fromUserCollectionRows = await client.query<{ cardId: string }>(
      `SELECT card_id AS "cardId"
       FROM user_collections
       WHERE user_id = $1
       ORDER BY obtained_at ASC`,
      [trade.fromUserId]
    );

    const toCollection = toUserCollectionRows.rows.map((row) => row.cardId);
    const fromCollection = fromUserCollectionRows.rows.map((row) => row.cardId);

    const toAfterRemoval = removeCardsFromList(toCollection, trade.requestedCards || []);
    if (!toAfterRemoval.ok) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'Recipient does not own requested cards anymore' });
    }

    const fromAfterRemoval = removeCardsFromList(fromCollection, trade.offeredCards || []);
    if (!fromAfterRemoval.ok) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'Sender does not own offered cards anymore' });
    }

    const toFinalCollection = toAfterRemoval.result.concat((trade.offeredCards || []).map((item) => item.cardId));
    const fromFinalCollection = fromAfterRemoval.result.concat((trade.requestedCards || []).map((item) => item.cardId));

    await client.query(`DELETE FROM user_collections WHERE user_id = $1`, [trade.toUserId]);
    if (toFinalCollection.length > 0) {
      const values = toFinalCollection.map((_, index) => `($1, $${index + 2}, NOW())`).join(',');
      await client.query(
        `INSERT INTO user_collections (user_id, card_id, obtained_at) VALUES ${values}`,
        [trade.toUserId, ...toFinalCollection]
      );
    }

    await client.query(`DELETE FROM user_collections WHERE user_id = $1`, [trade.fromUserId]);
    if (fromFinalCollection.length > 0) {
      const values = fromFinalCollection.map((_, index) => `($1, $${index + 2}, NOW())`).join(',');
      await client.query(
        `INSERT INTO user_collections (user_id, card_id, obtained_at) VALUES ${values}`,
        [trade.fromUserId, ...fromFinalCollection]
      );
    }

    const tradeArraysRows = await client.query<{
      id: string;
      cardsForTrade: string[] | null;
    }>(
      `SELECT id, cards_for_trade AS "cardsForTrade"
       FROM users
       WHERE id IN ($1, $2)
       FOR UPDATE`,
      [trade.toUserId, trade.fromUserId]
    );

    const toUserTradeRow = tradeArraysRows.rows.find((row) => row.id === trade.toUserId);
    const fromUserTradeRow = tradeArraysRows.rows.find((row) => row.id === trade.fromUserId);
    const toCardsForTrade = toUserTradeRow?.cardsForTrade || [];
    const fromCardsForTrade = fromUserTradeRow?.cardsForTrade || [];

    const toCardsForTradeAfter = removeCardsFromList(toCardsForTrade, trade.requestedCards || []);
    const fromCardsForTradeAfter = removeCardsFromList(fromCardsForTrade, trade.offeredCards || []);

    await client.query(
      `UPDATE users SET cards_for_trade = $2, updated_at = NOW() WHERE id = $1`,
      [trade.toUserId, toCardsForTradeAfter.ok ? toCardsForTradeAfter.result : toCardsForTrade]
    );
    await client.query(
      `UPDATE users SET cards_for_trade = $2, updated_at = NOW() WHERE id = $1`,
      [trade.fromUserId, fromCardsForTradeAfter.ok ? fromCardsForTradeAfter.result : fromCardsForTrade]
    );

    const updatedTradeResult = await client.query(
      `UPDATE trades
       SET status = 'accepted',
           updated_at = NOW(),
           completed_at = NOW()
       WHERE id = $1
       RETURNING id, from_user_id AS "fromUserId", to_user_id AS "toUserId",
                 from_username AS "fromUsername", to_username AS "toUsername",
                 status, offered_cards AS "offeredCards", requested_cards AS "requestedCards",
                 message, created_at AS "createdAt", updated_at AS "updatedAt", completed_at AS "completedAt"`,
      [req.params.tradeId]
    );

    await client.query('COMMIT');
    return res.json(updatedTradeResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Atomic trade accept error:', error);
    return res.status(500).json({ message: 'Failed to accept trade atomically' });
  } finally {
    client.release();
  }
});
