# Migration Supabase → PostgreSQL + Coolify (Docker)

Ce runbook prépare la migration de Valthera TCG depuis Supabase (PostgreSQL + Storage) vers une stack auto-hébergée sur Coolify.

## 1) Ce qui est prêt dans ce repo

- Docker build/serve pour Coolify via:
  - [Dockerfile](Dockerfile)
  - [nginx/app.conf](nginx/app.conf)
  - [.dockerignore](.dockerignore)
- Gestion d’env standardisée:
  - [.env.example](.env.example)
- Scripts de migration:
  - [scripts/migration/export_supabase_db.sh](scripts/migration/export_supabase_db.sh)
  - [scripts/migration/import_to_postgres.sh](scripts/migration/import_to_postgres.sh)
  - [scripts/migration/migrate_supabase_bucket.sh](scripts/migration/migrate_supabase_bucket.sh)

## 2) Point important d’architecture

Le frontend est maintenant câblé vers une API backend PostgreSQL via `services/apiService.ts`.

Les uploads images passent aussi par l'API (`/media/upload`, `/media/delete`) et sont servis via `/uploads/*`.
Le backend peut utiliser MinIO (S3-compatible) comme stockage objet cible.

La variable `VITE_API_BASE_URL` doit pointer vers le service `valthera-api` exposé par Coolify.

## 3) Déploiement Coolify (état actuel)

### Build Docker
- Source: ce repository
- Build type: Dockerfile
- Port exposé: `8080`

### Variables de build à définir dans Coolify
- `VITE_API_BASE_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_AUTH0_DOMAIN`
- `VITE_AUTH0_CLIENT_ID`
- `VITE_AUTH0_AUDIENCE`

> Les variables Supabase peuvent rester temporairement pour la phase de transition (Auth/Storage), mais les flux data principaux passent désormais par l’API.

## 4) Migration des données PostgreSQL

### 4.1 Export Supabase
```bash
SUPABASE_DB_URL='postgresql://user:pass@host:5432/postgres' \
./scripts/migration/export_supabase_db.sh
```

### 4.2 Import vers PostgreSQL cible
```bash
TARGET_DB_URL='postgresql://user:pass@host:5432/valthera' \
DUMP_FILE='./backups/supabase/<timestamp>/supabase.dump' \
RESET_PUBLIC_SCHEMA=true \
./scripts/migration/import_to_postgres.sh
```

## 5) Migration du Storage (bucket)

### Prérequis
- `aws` CLI installé
- Clés d’accès S3 pour source Supabase Storage et destination (MinIO)

### Exemple
```bash
SOURCE_BUCKET='card-images' \
TARGET_BUCKET='valthera-card-images' \
SOURCE_ENDPOINT='https://<project-ref>.supabase.co/storage/v1/s3' \
TARGET_ENDPOINT='https://minio.example.com' \
SOURCE_ACCESS_KEY='...' \
SOURCE_SECRET_KEY='...' \
TARGET_ACCESS_KEY='...' \
TARGET_SECRET_KEY='...' \
./scripts/migration/migrate_supabase_bucket.sh
```

## 6) Checklist de bascule

1. Export DB Supabase
2. Export bucket Supabase
3. Import DB vers PostgreSQL cible
4. Import bucket vers stockage cible
5. Déployer app sur Coolify (Dockerfile)
6. Valider l’app en mode « ancien backend » (Supabase)
7. Développer backend API PostgreSQL
8. Basculer le frontend vers la nouvelle API
9. Désactiver progressivement les accès Supabase

## 7) Sécurité recommandée

- Ne plus versionner `.env` (déjà corrigé via `.gitignore`).
- Faire tourner/rotater les clés exposées.
- Réduire les permissions SQL/RLS avant migration finale.
- Isoler les opérations critiques (trades, admin) côté backend serveur.

## 8) Variables backend Auth0 (API)

Définir dans le service `valthera-api`:

- `AUTH_ENABLED=true`
- `AUTH0_ISSUER_BASE_URL=https://<tenant>.auth0.com/`
- `AUTH0_AUDIENCE=https://<tenant>.auth0.com/api/v2/`
- `ADMIN_EMAILS=<liste emails admin séparés par virgule>`

Variables stockage MinIO (API):

- `STORAGE_BACKEND=minio`
- `MINIO_ENDPOINT=valthera-minio:9000`
- `MINIO_REGION=us-east-1`
- `MINIO_ACCESS_KEY=<access-key>`
- `MINIO_SECRET_KEY=<secret-key>`
- `MINIO_USE_SSL=false`
- `MINIO_FORCE_PATH_STYLE=true`
