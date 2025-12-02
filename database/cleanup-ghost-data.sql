-- =============================================
-- Cleanup Ghost Data in Valthera TCG
-- Exécuter ce script dans Supabase SQL Editor
-- =============================================

-- 1. Afficher les statistiques avant nettoyage
SELECT 'AVANT NETTOYAGE' as status;

SELECT 'user_collections avec cartes invalides' as table_name, COUNT(*) as count
FROM user_collections uc
WHERE NOT EXISTS (SELECT 1 FROM cards c WHERE c.id = uc.card_id);

SELECT 'Total user_collections' as table_name, COUNT(*) as count FROM user_collections;

-- 2. Supprimer les entrées de collection qui référencent des cartes inexistantes
DELETE FROM user_collections
WHERE card_id NOT IN (SELECT id FROM cards);

-- 3. Supprimer les trade_items qui référencent des cartes inexistantes
DELETE FROM trade_items
WHERE card_id NOT IN (SELECT id FROM cards);

-- 4. Afficher les statistiques après nettoyage
SELECT 'APRÈS NETTOYAGE' as status;

SELECT 'Total user_collections' as table_name, COUNT(*) as count FROM user_collections;
SELECT 'Total cards' as table_name, COUNT(*) as count FROM cards;
SELECT 'Total series' as table_name, COUNT(*) as count FROM series;
SELECT 'Total users' as table_name, COUNT(*) as count FROM users;

-- 5. Afficher les utilisateurs et leur nombre de cartes (valides)
SELECT 
  u.username,
  u.email,
  COUNT(uc.card_id) as cards_count
FROM users u
LEFT JOIN user_collections uc ON u.id = uc.user_id
GROUP BY u.id, u.username, u.email
ORDER BY cards_count DESC;
