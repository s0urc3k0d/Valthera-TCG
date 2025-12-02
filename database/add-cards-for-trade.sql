-- Script pour ajouter la colonne cards_for_trade à la table users
-- À exécuter dans Supabase SQL Editor

-- Ajouter la colonne cards_for_trade (tableau de UUIDs pour les IDs de cartes)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS cards_for_trade TEXT[] DEFAULT '{}';

-- Vérification
SELECT id, username, cards_for_trade FROM users;

-- Note: La colonne stocke un tableau de chaînes (IDs de cartes)
-- Exemple de mise à jour manuelle :
-- UPDATE users SET cards_for_trade = ARRAY['card-id-1', 'card-id-2'] WHERE id = 'user-id';
