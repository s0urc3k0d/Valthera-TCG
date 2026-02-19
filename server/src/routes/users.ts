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
  if (req.query.withCardsForTrade === 'true') {
    const rows = await query(
      `SELECT id, username, email, avatar, is_admin AS "isAdmin", is_banned AS "isBanned",
              last_booster_date AS "lastBoosterDate", available_boosters AS "availableBoosters",
              favorite_cards AS "favoriteCards", cards_for_trade AS "cardsForTrade",
              is_public_profile AS "isPublicProfile", share_code AS "shareCode",
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM users
       WHERE cards_for_trade IS NOT NULL
         AND array_length(cards_for_trade, 1) > 0`
    );
    return res.json(rows);
  }

  const rows = await query(
    `SELECT id, username, email, avatar, is_admin AS "isAdmin", is_banned AS "isBanned",
            last_booster_date AS "lastBoosterDate", available_boosters AS "availableBoosters",
            favorite_cards AS "favoriteCards", cards_for_trade AS "cardsForTrade",
            is_public_profile AS "isPublicProfile", share_code AS "shareCode",
            created_at AS "createdAt", updated_at AS "updatedAt"
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
  const rows = await query(
    `SELECT id, username, email, avatar, is_admin AS "isAdmin", is_banned AS "isBanned",
            last_booster_date AS "lastBoosterDate", available_boosters AS "availableBoosters",
            favorite_cards AS "favoriteCards", cards_for_trade AS "cardsForTrade",
            is_public_profile AS "isPublicProfile", share_code AS "shareCode",
            created_at AS "createdAt", updated_at AS "updatedAt"
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
  const rows = await query(
    `SELECT id, username, email, avatar, is_admin AS "isAdmin", is_banned AS "isBanned",
            last_booster_date AS "lastBoosterDate", available_boosters AS "availableBoosters",
            favorite_cards AS "favoriteCards", cards_for_trade AS "cardsForTrade",
            is_public_profile AS "isPublicProfile", share_code AS "shareCode",
            created_at AS "createdAt", updated_at AS "updatedAt"
     FROM users
     WHERE email = $1
     LIMIT 1`,
    [decodeURIComponent(req.params.email)]
  );

  if (!rows[0]) {
    return res.status(404).json({ message: 'User not found' });
  }

  res.json(rows[0]);
});

usersRouter.get('/:id', async (req, res) => {
  const rows = await query(
    `SELECT id, username, email, avatar, is_admin AS "isAdmin", is_banned AS "isBanned",
            last_booster_date AS "lastBoosterDate", available_boosters AS "availableBoosters",
            favorite_cards AS "favoriteCards", cards_for_trade AS "cardsForTrade",
            is_public_profile AS "isPublicProfile", share_code AS "shareCode",
            created_at AS "createdAt", updated_at AS "updatedAt"
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
