-- Script pour ajouter le système de boosters accumulables
-- À exécuter dans Supabase SQL Editor

-- Ajouter la colonne available_boosters à la table users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS available_boosters INTEGER DEFAULT 0;

-- Mettre à jour tous les utilisateurs existants avec 1 booster de bienvenue
-- (seulement ceux qui n'ont jamais ouvert de booster)
UPDATE users 
SET available_boosters = 1 
WHERE last_booster_date IS NULL AND available_boosters = 0;

-- Pour les utilisateurs qui ont déjà ouvert des boosters,
-- calculer combien ils ont accumulé (max 2)
-- Note: Cette mise à jour est approximative, le calcul exact se fait côté client
UPDATE users 
SET available_boosters = LEAST(
  2, -- Max 2 boosters
  FLOOR(EXTRACT(EPOCH FROM (NOW() - last_booster_date::timestamp)) / (6 * 3600))::INTEGER
)
WHERE last_booster_date IS NOT NULL;

-- Vérification
SELECT id, username, last_booster_date, available_boosters FROM users;
