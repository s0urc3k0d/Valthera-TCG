# Déploiement Coolify — Valthera TCG

Ce guide décrit un déploiement complet sur Coolify avec 4 services:

- frontend (React + Nginx)
- API (Node/Express)
- PostgreSQL
- MinIO (stockage images)

## 1) Prérequis

- Domaine frontend prêt (exemple: `valtheratcg.sourcekod.fr`)
- Sous-domaine API prêt (exemple: `api.valthera.sourcekod.fr`)
- Projet Coolify créé
- Données PostgreSQL déjà importées (ou plan d'import prêt)
- Buckets MinIO existants:
  - `card-images`
  - `avatars`
  - `series-covers`

## 2) Services Coolify à créer

## 2.1 PostgreSQL (`valthera-postgres`)

- Type: service PostgreSQL managé Coolify
- Base: `valthera` (créer si nécessaire)
- Volume persistant: activé
- Connexion interne attendue par l'API:
  - `postgresql://<user>:<password>@valthera-postgres:5432/valthera`

## 2.2 MinIO (`valthera-minio`)

- Type: MinIO Community Edition
- Volume persistant: activé
- Conserver les credentials MinIO (access/secret)
- Vérifier les buckets:
  - `card-images`
  - `avatars`
  - `series-covers`

## 2.3 API (`valthera-api`)

- Source: ce repository
- Build: Dockerfile
- Dockerfile path: `server/Dockerfile`
- Port interne: `4000`
- Domaine public: `https://api.valthera.sourcekod.fr` (ou ton sous-domaine)

Variables d'environnement API:

- `PORT=4000`
- `DATABASE_URL=postgresql://<user>:<password>@valthera-postgres:5432/valthera`
- `CORS_ORIGIN=https://valtheratcg.sourcekod.fr`
- `STORAGE_BACKEND=minio`
- `MINIO_ENDPOINT=<endpoint-minio-s3-sans-protocole>`
- `MINIO_REGION=us-east-1`
- `MINIO_ACCESS_KEY=<access-key>`
- `MINIO_SECRET_KEY=<secret-key>`
- `MINIO_USE_SSL=true` (false si MinIO uniquement interne en http)
- `MINIO_FORCE_PATH_STYLE=true`
- `UPLOADS_DIR=/app/uploads`
- `AUTH_ENABLED=true`
- `AUTH0_ISSUER_BASE_URL=https://<tenant>.auth0.com/`
- `AUTH0_AUDIENCE=https://<tenant>.auth0.com/api/v2/`
- `ADMIN_EMAILS=<email1>,<email2>`

## 2.4 Frontend (`valthera-frontend`)

- Source: ce repository
- Build: Dockerfile
- Dockerfile path: `Dockerfile`
- Port interne: `8080`
- Domaine public: `https://valtheratcg.sourcekod.fr`

Build variables frontend:

- `VITE_API_BASE_URL=https://api.valthera.sourcekod.fr`
- `VITE_AUTH0_DOMAIN=<tenant>.auth0.com`
- `VITE_AUTH0_CLIENT_ID=<client-id>`
- `VITE_AUTH0_AUDIENCE=https://<tenant>.auth0.com/api/v2/`

Variables legacy (optionnelles pendant transition uniquement):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## 3) Ordre de déploiement recommandé

1. Déployer `valthera-postgres`
2. Déployer `valthera-minio`
3. Déployer `valthera-api`
4. Déployer `valthera-frontend`

## 4) Vérifications post-déploiement

## 4.1 API

- `GET https://api.valthera.sourcekod.fr/health` doit répondre `{"status":"ok",...}`
- `GET https://api.valthera.sourcekod.fr/` doit répondre `service: valthera-api`

## 4.2 Frontend

- Ouvrir `https://valtheratcg.sourcekod.fr`
- Vérifier login Auth0
- Vérifier chargement cartes/séries

## 4.3 MinIO via API

- Créer/modifier une carte avec upload image dans l'admin
- Vérifier que l'URL stockée commence par:
  - `https://api.valthera.sourcekod.fr/uploads/card-images/...`
- Vérifier présence de l'objet dans MinIO

## 5) Migration images base64 vers MinIO (si pas déjà fait)

- Export des entrées `data:image/...` depuis la base source
- Upload dans MinIO
- Update SQL des colonnes:
  - `cards.image_url`
  - `series.cover_image`
  - `users.avatar`

Appliquer les updates SQL sur la base PostgreSQL cible (pas sur Supabase si la bascule est déjà faite).

## 6) Rollback rapide

- Front cassé: rollback image/tag du service frontend
- API cassée: rollback image/tag du service API
- Données: restaurer dump PostgreSQL le plus récent
- MinIO: restaurer depuis snapshot/backup objet

## 7) Sécurité minimale

- Faire rotation de tous les secrets exposés pendant migration (DB, MinIO, Auth0)
- Ne pas utiliser le root MinIO en prod applicative, préférer un utilisateur dédié API
- Limiter `CORS_ORIGIN` au domaine frontend exact
- Garder `AUTH_ENABLED=true` en production

## 8) Blocs `.env` prêts à copier

## 8.1 API (`valthera-api`)

```env
PORT=4000
NODE_ENV=production

DATABASE_URL=postgresql://valthera_user:CHANGE_ME_DB_PASSWORD@valthera-postgres:5432/valthera
CORS_ORIGIN=https://valtheratcg.sourcekod.fr

STORAGE_BACKEND=minio
MINIO_ENDPOINT=minio.valthera.sourcekod.fr
MINIO_REGION=us-east-1
MINIO_ACCESS_KEY=CHANGE_ME_MINIO_ACCESS_KEY
MINIO_SECRET_KEY=CHANGE_ME_MINIO_SECRET_KEY
MINIO_USE_SSL=true
MINIO_FORCE_PATH_STYLE=true
UPLOADS_DIR=/app/uploads

AUTH_ENABLED=true
AUTH0_ISSUER_BASE_URL=https://CHANGE_ME_TENANT.auth0.com/
AUTH0_AUDIENCE=https://CHANGE_ME_TENANT.auth0.com/api/v2/
ADMIN_EMAILS=admin1@domaine.tld,admin2@domaine.tld
```

Si MinIO est uniquement en réseau interne (HTTP), adapter:

```env
MINIO_ENDPOINT=valthera-minio:9000
MINIO_USE_SSL=false
```

## 8.2 Frontend (`valthera-frontend`)

```env
VITE_API_BASE_URL=https://api.valthera.sourcekod.fr

VITE_AUTH0_DOMAIN=CHANGE_ME_TENANT.auth0.com
VITE_AUTH0_CLIENT_ID=CHANGE_ME_AUTH0_CLIENT_ID
VITE_AUTH0_AUDIENCE=https://CHANGE_ME_TENANT.auth0.com/api/v2/

# Optionnel (transition uniquement)
# VITE_SUPABASE_URL=
# VITE_SUPABASE_ANON_KEY=
```

## 8.3 PostgreSQL (`valthera-postgres`) — référence

```env
POSTGRES_DB=valthera
POSTGRES_USER=valthera_user
POSTGRES_PASSWORD=CHANGE_ME_DB_PASSWORD
```

## 8.4 MinIO (`valthera-minio`) — référence

```env
MINIO_ROOT_USER=CHANGE_ME_MINIO_ROOT_USER
MINIO_ROOT_PASSWORD=CHANGE_ME_MINIO_ROOT_PASSWORD
```

## 9) Option recommandée: déploiement unique Docker Compose (multi-conteneurs)

Si tu veux tout gérer dans **un seul déploiement Coolify** (frontend + API + PostgreSQL + MinIO), utilise:

- Compose: [docker-compose.coolify.yml](docker-compose.coolify.yml)
- Variables: [.env.coolify.example](.env.coolify.example)

Si PostgreSQL et MinIO existent déjà dans d'autres services Coolify (cas actuel), utilise plutôt:

- Compose app-only: [docker-compose.coolify.app-only.yml](docker-compose.coolify.app-only.yml)
- Variables app-only: [.env.coolify.app-only.example](.env.coolify.app-only.example)

## 9.1 Étapes Coolify (pas à pas)

1. Créer une nouvelle application dans Coolify
2. Build Pack: `Docker Compose`
3. Pointer le repo `Valthera-TCG` sur la branche voulue
4. Dans le fichier compose, utiliser `docker-compose.coolify.yml`
5. Ajouter les variables d'environnement depuis `.env.coolify.example` (remplacer `CHANGE_ME_*`)
6. Sauvegarder

Pour l'architecture actuelle (PostgreSQL + MinIO externes), faire la même procédure avec:

- `docker-compose.coolify.app-only.yml`
- `.env.coolify.app-only.example`

## 9.2 Domaines à renseigner dans Coolify

Dans l'écran Domaines de l'app compose:

- `frontend` → `https://valtheratcg.sourcekod.fr`
- `api` → `https://api.valtheratcg.sourcekod.fr`

Ne pas mettre les 2 domaines sur le même service.

## 9.3 Healthchecks conseillés

- `frontend`: `/`
- `api`: `/health`

Note (mode `app-only` avec PostgreSQL externe):

- Le compose `app-only` utilise un healthcheck API de **liveness** (`/`) pour éviter les faux négatifs au boot.
- La vérification de dépendances externes (DB/MinIO) se fait ensuite via tests manuels (`/health` + upload image).

## 9.4 Ce qui est déjà sécurisé dans le compose fourni

- `read_only: true` sur frontend et API
- `tmpfs` pour répertoires runtime temporaires
- `cap_drop: [ALL]` sur frontend et API
- `security_opt: no-new-privileges:true`
- réseau interne isolé (`internal: true`) pour PostgreSQL/MinIO
- volumes persistants dédiés (`postgres_data`, `minio_data`, `uploads_data`)

## 9.5 Points sécurité à faire après mise en prod

- Remplacer tous les secrets `CHANGE_ME_*`
- Utiliser un utilisateur MinIO dédié API (pas `MINIO_ROOT_USER`)
- Restreindre `ADMIN_EMAILS` aux adresses strictement nécessaires
- Vérifier que `CORS_ORIGIN` = domaine frontend exact
- Activer rotation périodique des secrets DB/MinIO/Auth0

## 10) Redis: pertinent maintenant ?

Oui, **potentiellement pertinent**, mais ce n'est pas prioritaire avant stabilisation complète du déploiement.

Redis devient utile si tu veux:

- cache de réponses fréquentes (cartes/séries) pour réduire la charge PostgreSQL
- rate limiting distribué côté API
- gestion de sessions ou invalidation de tokens côté serveur
- file d'attente (jobs asynchrones: thumbnails, notifications batch)

Pour l'état actuel de Valthera, la priorité reste:

1. stabiliser frontend + API + Postgres + MinIO
2. mesurer (latence API, CPU DB, endpoints les plus appelés)
3. ajouter Redis seulement sur les endpoints réellement coûteux