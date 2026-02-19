import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db.js';
import { requireAuth, requireUserOrAdmin } from '../middleware/auth.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { config } from '../config.js';

const createUserSchema = z.object({
  username: z.string().trim().min(3).max(50),
  email: z.string().trim().email().optional().nullable(),
  avatar: z.string().trim().max(2048).optional().nullable(),
  isAdmin: z.boolean().optional(),
  isBanned: z.boolean().optional(),
  lastBoosterDate: z.string().datetime().optional().nullable(),
  availableBoosters: z.number().int().min(0).max(50).optional(),
  favoriteCards: z.array(z.string().uuid()).max(2000).optional(),
  cardsForTrade: z.array(z.string().uuid()).max(2000).optional(),
  isPublicProfile: z.boolean().optional(),
});

const updateUserSchema = z.object({
  username: z.string().trim().min(3).max(50).optional(),
  email: z.string().trim().email().optional().nullable(),
  avatar: z.string().trim().max(2048).optional().nullable(),
  isAdmin: z.boolean().optional(),
  isBanned: z.boolean().optional(),
  lastBoosterDate: z.string().datetime().optional().nullable(),
  availableBoosters: z.number().int().min(0).max(50).optional(),
  favoriteCards: z.array(z.string().uuid()).max(2000).optional(),
  cardsForTrade: z.array(z.string().uuid()).max(2000).optional(),
  isPublicProfile: z.boolean().optional(),
});

type UserColumns = {
  avatar: boolean;
  isAdmin: boolean;
  isBanned: boolean;
  lastBoosterDate: boolean;
  availableBoosters: boolean;
  favoriteCards: boolean;
  cardsForTrade: boolean;
  isPublicProfile: boolean;
  shareCode: boolean;
  createdAt: boolean;
  updatedAt: boolean;
};

let userColumnsCache: UserColumns | undefined;

const getUserColumns = async (): Promise<UserColumns> => {
  if (userColumnsCache) {
    return userColumnsCache;
  }

  const rows = await query<{ columnName: string }>(
    `SELECT column_name AS "columnName"
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'users'`
  );

  const set = new Set(rows.map((row) => row.columnName));
  userColumnsCache = {
    avatar: set.has('avatar'),
    isAdmin: set.has('is_admin'),
    isBanned: set.has('is_banned'),
    lastBoosterDate: set.has('last_booster_date'),
    availableBoosters: set.has('available_boosters'),
    favoriteCards: set.has('favorite_cards'),
    cardsForTrade: set.has('cards_for_trade'),
    isPublicProfile: set.has('is_public_profile'),
    shareCode: set.has('share_code'),
    createdAt: set.has('created_at'),
    updatedAt: set.has('updated_at'),
  };

  return userColumnsCache;
};

const getUserSelectColumns = async () => {
  const cols = await getUserColumns();
  return `id,
          username,
          email,
          ${cols.avatar ? 'avatar' : 'NULL::text'} AS "avatar",
          ${cols.isAdmin ? 'is_admin' : 'false'} AS "isAdmin",
          ${cols.isBanned ? 'is_banned' : 'false'} AS "isBanned",
          ${cols.lastBoosterDate ? 'last_booster_date' : 'NULL::date'} AS "lastBoosterDate",
          ${cols.availableBoosters ? 'available_boosters' : '0'} AS "availableBoosters",
          ${cols.favoriteCards ? 'favorite_cards' : "'{}'::text[]"} AS "favoriteCards",
          ${cols.cardsForTrade ? 'cards_for_trade' : "'{}'::text[]"} AS "cardsForTrade",
          ${cols.isPublicProfile ? 'is_public_profile' : 'true'} AS "isPublicProfile",
          ${cols.shareCode ? 'share_code' : 'NULL::text'} AS "shareCode",
          ${cols.createdAt ? 'created_at' : 'NOW()'} AS "createdAt",
          ${cols.updatedAt ? 'updated_at' : cols.createdAt ? 'created_at' : 'NOW()'} AS "updatedAt"`;
};

const resolveActor = async (req: AuthenticatedRequest): Promise<{ userId: string; isAdmin: boolean } | null> => {
  if (!config.authEnabled) {
    return { userId: req.params.id || 'no-auth', isAdmin: true };
  }

  const actorEmail = req.auth?.email?.toLowerCase();
  if (!actorEmail) {
    return null;
  }

  const rows = await query<{ id: string; isAdmin: boolean }>(
    `SELECT id, is_admin AS "isAdmin" FROM users WHERE lower(email) = $1 LIMIT 1`,
    [actorEmail]
  );

  if (!rows[0]) {
    return null;
  }

  return {
    userId: rows[0].id,
    isAdmin: rows[0].isAdmin || config.adminEmails.includes(actorEmail),
  };
};

export const usersRouter = Router();

usersRouter.get('/', async (req, res) => {
  const userSelect = await getUserSelectColumns();
  const cols = await getUserColumns();

  if (req.query.withCardsForTrade === 'true') {
    if (!cols.cardsForTrade) {
      return res.json([]);
    }

    const rows = await query(
      `SELECT ${userSelect}
       FROM users
       WHERE cards_for_trade IS NOT NULL
         AND array_length(cards_for_trade, 1) > 0`
    );
    return res.json(rows);
  }

  const rows = await query(
    `SELECT ${userSelect}
     FROM users`
  );
  res.json(rows);
});

usersRouter.get('/card-counts/all', async (_req, res) => {
  const rows = await query<{ userId: string; count: string }>(
    `SELECT user_id AS "userId", COUNT(*)::text AS count
     FROM user_collections
     GROUP BY user_id`
  );

  const mapped = rows.reduce<Record<string, number>>((acc, item) => {
    acc[item.userId] = Number(item.count);
    return acc;
  }, {});

  res.json(mapped);
});

usersRouter.get('/by-username/:username', async (req, res) => {
  const userSelect = await getUserSelectColumns();

  const rows = await query(
    `SELECT ${userSelect}
     FROM users
     WHERE username = $1
     LIMIT 1`,
    [decodeURIComponent(req.params.username)]
  );

  if (!rows[0]) {
    return res.status(404).json({ message: 'User not found' });
  }

  res.json(rows[0]);
});

usersRouter.get('/by-email/:email', async (req, res) => {
  const userSelect = await getUserSelectColumns();

  const rows = await query(
    `SELECT ${userSelect}
     FROM users
     WHERE lower(email) = lower($1)
     LIMIT 1`,
    [decodeURIComponent(req.params.email)]
  );

  if (!rows[0]) {
    return res.status(404).json({ message: 'User not found' });
  }

  res.json(rows[0]);
});

usersRouter.get('/:id', async (req, res) => {
  const userSelect = await getUserSelectColumns();

  const rows = await query(
    `SELECT ${userSelect}
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [req.params.id]
  );

  if (!rows[0]) {
    return res.status(404).json({ message: 'User not found' });
  }

  res.json(rows[0]);
});

usersRouter.post('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid payload', issues: parsed.error.flatten() });
  }

  const body = parsed.data;
  const actor = await resolveActor(req);
  if (!actor) {
    return res.status(403).json({ message: 'Actor user not found' });
  }

  if (!actor.isAdmin && (body.isAdmin !== undefined || body.isBanned !== undefined)) {
    return res.status(403).json({ message: 'Forbidden fields for non-admin user' });
  }

  if (config.authEnabled && body.email && req.auth?.email && !actor.isAdmin) {
    if (body.email.toLowerCase() !== req.auth.email.toLowerCase()) {
      return res.status(403).json({ message: 'Email mismatch with authenticated user' });
    }
  }

  const rows = await query(
    `INSERT INTO users (username, email, avatar, is_admin, last_booster_date, available_boosters, favorite_cards, cards_for_trade, is_public_profile)
     VALUES ($1, $2, $3, $4, $5, COALESCE($6, 0), COALESCE($7::text[], '{}'::text[]), COALESCE($8::text[], '{}'::text[]), COALESCE($9, true))
     RETURNING id, username, email, avatar, is_admin AS "isAdmin", is_banned AS "isBanned",
               last_booster_date AS "lastBoosterDate", available_boosters AS "availableBoosters",
               favorite_cards AS "favoriteCards", cards_for_trade AS "cardsForTrade",
               is_public_profile AS "isPublicProfile", share_code AS "shareCode",
               created_at AS "createdAt", updated_at AS "updatedAt"`,
    [
      body.username,
      body.email || null,
      body.avatar || null,
      actor.isAdmin ? Boolean(body.isAdmin) : false,
      body.lastBoosterDate || null,
      body.availableBoosters ?? 0,
      body.favoriteCards ?? [],
      body.cardsForTrade ?? [],
      body.isPublicProfile ?? true,
    ]
  );

  res.status(201).json(rows[0]);
});

usersRouter.patch('/:id', requireAuth, requireUserOrAdmin('id'), async (req: AuthenticatedRequest, res) => {
  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid payload', issues: parsed.error.flatten() });
  }

  const body = parsed.data;
  const actor = await resolveActor(req);
  if (!actor) {
    return res.status(403).json({ message: 'Actor user not found' });
  }

  if (!actor.isAdmin && (body.isAdmin !== undefined || body.isBanned !== undefined)) {
    return res.status(403).json({ message: 'Forbidden fields for non-admin user' });
  }

  const safeIsAdmin = actor.isAdmin ? body.isAdmin ?? null : null;
  const safeIsBanned = actor.isAdmin ? body.isBanned ?? null : null;

  const rows = await query(
    `UPDATE users
     SET username = COALESCE($2, username),
         email = COALESCE($3, email),
         avatar = COALESCE($4, avatar),
         is_admin = COALESCE($5, is_admin),
         is_banned = COALESCE($6, is_banned),
         last_booster_date = COALESCE($7, last_booster_date),
         available_boosters = COALESCE($8, available_boosters),
       favorite_cards = COALESCE($9::text[], favorite_cards),
       cards_for_trade = COALESCE($10::text[], cards_for_trade),
         is_public_profile = COALESCE($11, is_public_profile),
         updated_at = NOW()
     WHERE id = $1
    RETURNING id, username, email, avatar, is_admin AS "isAdmin", is_banned AS "isBanned",
          last_booster_date AS "lastBoosterDate", available_boosters AS "availableBoosters",
          favorite_cards AS "favoriteCards", cards_for_trade AS "cardsForTrade",
          is_public_profile AS "isPublicProfile", share_code AS "shareCode",
          created_at AS "createdAt", updated_at AS "updatedAt"`,
    [
      req.params.id,
      body.username ?? null,
      body.email ?? null,
      body.avatar ?? null,
      safeIsAdmin,
      safeIsBanned,
      body.lastBoosterDate ?? null,
      body.availableBoosters ?? null,
      body.favoriteCards ?? null,
      body.cardsForTrade ?? null,
      body.isPublicProfile ?? null,
    ]
  );

  if (!rows[0]) {
    return res.status(404).json({ message: 'User not found' });
  }

  res.json(rows[0]);
});
