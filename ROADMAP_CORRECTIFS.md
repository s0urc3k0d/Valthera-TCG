# 🛠️ Roadmap des Correctifs — Valthera TCG

> Basée sur l’audit technique complet (frontend, auth, data, SQL/RLS, déploiement).
> 
> Objectif: sécuriser l’application, fiabiliser les flux métier critiques, puis améliorer la maintenabilité sans casser l’UX actuelle.

---

## 1) Priorités globales

### P0 — Critique (sécurité / intégrité des données)
1. **Durcir les policies RLS Supabase** (supprimer les `USING (true)` en écriture publique).
2. **Protéger les opérations sensibles côté serveur** (échanges, update collection, statut utilisateur admin/ban).
3. **Réconcilier les scripts SQL** pour éviter les politiques contradictoires entre migrations.

### P1 — Haute (fiabilité fonctionnelle)
1. **Rendre atomique l’acceptation d’échange** (transaction / RPC SQL), éviter les états partiels.
2. **Uniformiser la logique de collection** (source de vérité unique + diff robuste).
3. **Renforcer validation côté métier** (quantités, propriété de carte, duplication, anti-race-condition).

### P2 — Moyenne (maintenabilité)
1. **Découper `supabaseService.ts`** en modules par domaine.
2. **Mettre à jour la documentation** (README vs état réel Supabase/Auth0).
3. **Ajouter une couche de tests ciblés** sur flux critiques.

### P3 — Confort / qualité produit
1. Améliorer UX admin (remplacer `alert/prompt/confirm` par UI native cohérente).
2. Normaliser logs et observabilité.
3. Nettoyage technique (dead code localStorage legacy, cohérence types).

---

## 2) Détail des correctifs par chantier

## Chantier A — Sécurité Supabase (P0)

### Constats
- Plusieurs scripts autorisent lecture/écriture publique: `FOR INSERT WITH CHECK (true)`, `FOR UPDATE USING (true)`.
- Présence de versions SQL contradictoires (restrictives et permissives).

### Fichiers impactés
- `database/schema.sql`
- `database/fix-rls-policies.sql`
- `database/migrations_v2.sql`
- `database/fix-trades-table.sql`

### Actions
1. **Geler un schéma canonique unique** (nouveau script de migration consolidé).
2. **Supprimer les policies publiques en écriture**.
3. **Restreindre les updates** selon `auth.uid()` + contrôles de rôle (admin).
4. **Créer des fonctions RPC sécurisées** pour actions complexes (trade accept/reject, give booster, ban/unban).
5. **Limiter la clé anon** à la lecture stricte là où possible.

### Critères d’acceptation
- Aucun `UPDATE/INSERT/DELETE` critique accessible sans condition d’identité.
- Tous les scénarios sensibles passent par des règles explicites ou RPC.
- Vérification via tests SQL de policies (jeu d’utilisateurs simulés).

---

## Chantier B — Intégrité des échanges (P1)

### Constats
- Acceptation d’échange répartie sur plusieurs appels client successifs (risque d’état partiel en cas d’erreur réseau).
- Mise à jour de deux collections + deux listes `cards_for_trade` sans transaction globale.

### Fichiers impactés
- `pages/Market.tsx`
- `services/supabaseService.ts`
- SQL à ajouter: `database/rpc_trade_accept.sql` (nouveau)

### Actions
1. Implémenter une **RPC `accept_trade_atomic(trade_id, actor_id)`** côté DB.
2. Déplacer la logique d’échange de cartes côté SQL transactionnel.
3. Dans le front, remplacer la séquence multi-appels par **un appel unique**.
4. Ajouter rollback automatique + erreurs métier explicites (insufficient cards, trade already closed).

### Critères d’acceptation
- Impossible d’obtenir un trade `accepted` sans mouvement de cartes cohérent.
- Rejouer la requête n’introduit pas de doublons (idempotence).

---

## Chantier C — Cohérence collection/booster (P1)

### Constats
- Flux de collection mis à jour à plusieurs endroits (`AuthContext`, `Market`, `BoosterOpening`, service).
- Risque de divergence entre état local, Supabase user, et table `user_collections`.

### Fichiers impactés
- `contexts/AuthContext.tsx`
- `pages/BoosterOpening.tsx`
- `pages/Market.tsx`
- `services/supabaseService.ts`

### Actions
1. Définir une **source de vérité unique**: table `user_collections`.
2. Encapsuler les mutations dans des méthodes métier centralisées (ex: `appendCardsToUserCollection`, `transferCardsBetweenUsers`).
3. Retirer les mises à jour implicites basées sur longueur de tableau quand fragile.
4. Ajouter contrôles de cohérence post-op (count avant/après).

### Critères d’acceptation
- Les cartes affichées = état DB réel pour chaque utilisateur.
- Aucun doublon/suppression fantôme après booster + échange + refresh.

---

## Chantier D — Refactor service data (P2)

### Constats
- `services/supabaseService.ts` est volumineux (>1000 lignes), mélange tous les domaines.

### Fichiers impactés
- `services/supabaseService.ts`
- Nouveaux fichiers:
  - `services/supabase/cardsService.ts`
  - `services/supabase/seriesService.ts`
  - `services/supabase/usersService.ts`
  - `services/supabase/collectionsService.ts`
  - `services/supabase/tradesService.ts`
  - `services/supabase/notificationsService.ts`

### Actions
1. Extraire méthodes par domaine avec interfaces partagées.
2. Centraliser utilitaires HTTP/mapping.
3. Harmoniser gestion d’erreurs (retours typés, codes métier).

### Critères d’acceptation
- Service monolithique supprimé ou réduit à un point d’orchestration.
- Chaque domaine testable indépendamment.

---

## Chantier E — Auth & profil (P1/P2)

### Constats
- Auth flow globalement sain, mais dépend beaucoup du client pour l’orchestration.
- Vérification d’unicité pseudo côté front uniquement avant création.

### Fichiers impactés
- `contexts/AuthContext.tsx`
- `config/auth0.ts`
- `database/schema.sql` (contrainte unique déjà présente, à conserver)

### Actions
1. Maintenir l’unicité pseudo côté DB comme source finale (déjà en place), gérer le conflit proprement côté UI.
2. Réduire logs sensibles en production.
3. Préparer extension rôles admin via claims Auth0 ou table dédiée permissions.

### Critères d’acceptation
- Création profil robuste en cas de concurrence.
- Aucun leak d’info sensible dans console prod.

---

## Chantier F — Documentation & exploitation (P2)

### Constats
- README ne reflète pas l’état actuel (mention localStorage “temporaire”).
- Multiples scripts SQL sans guide d’ordre d’exécution canonique.

### Fichiers impactés
- `README.md`
- `DEPLOYMENT.md`
- `database/` (ajout d’un `MIGRATION_ORDER.md`)

### Actions
1. Mettre README à jour: architecture réelle Auth0 + Supabase.
2. Documenter “migration order” unique + procédure rollback.
3. Ajouter checklist post-déploiement sécurité (RLS, Auth0 callbacks, env vars).

### Critères d’acceptation
- Un nouveau contributeur peut déployer sans ambiguïté.
- Plus de divergence doc/code majeure.

---

## 3) Plan d’exécution recommandé (itérations)

## Sprint 0 (1–2 jours) — Sécurité immédiate
- Geler policies permissives en prod.
- Corriger RLS sur tables critiques (`users`, `user_collections`, `trades`, `notifications`).
- Vérifier droits admin.

## Sprint 1 (2–4 jours) — Échanges atomiques
- Ajouter RPC SQL transactionnelle.
- Adapter `Market.tsx` à l’appel unique.
- Tests manuels end-to-end échange.

## Sprint 2 (3–5 jours) — Cohérence collection/booster
- Centraliser mutations collection.
- Valider scénarios concurrents (double clic, latence réseau).

## Sprint 3 (3–5 jours) — Refactor service + doc
- Découpage service data.
- Mise à jour README/DEPLOYMENT/migrations guide.

---

## 4) Indicateurs de succès

- **Sécurité**: aucune policy d’écriture critique avec `true` non restreint.
- **Fiabilité**: 0 cas d’état partiel lors d’un échange accepté.
- **Cohérence**: collections synchronisées après refresh forcé.
- **Maintenabilité**: service data découpé et responsabilités claires.

---

## 5) Backlog technique (après stabilisation)

- Remplacer `alert/prompt/confirm` admin par composants UI dédiés.
- Ajouter observabilité (erreurs API structurées, métriques de flux métier).
- Préparer migration `HashRouter` → `BrowserRouter` si contraintes serveur levées.
- Ajouter tests d’intégration front sur flux auth/profil/booster/market.
