# Architecture cible Coolify (front + api + postgresql)

## Services recommandés dans le projet Coolify

1. **valthera-frontend**
   - Build: [Dockerfile](Dockerfile)
   - Port interne: `8080`
   - Exposé publiquement via Traefik/Caddy Coolify

2. **valthera-api**
   - Build: [server/Dockerfile](server/Dockerfile)
   - Port interne: `4000`
   - Exposé publiquement (ou privé + réseau interne selon choix)

3. **valthera-postgres**
   - Service PostgreSQL managé par Coolify (recommandé)
   - Volume persistant dédié

4. **valthera-minio**
   - Service MinIO Community Edition (S3-compatible)
   - Bucket(s): `card-images`, `avatars`, `series-covers`
   - Volume persistant dédié

## Réseau

- Front et API partagent le réseau projet Coolify.
- API accède à PostgreSQL via hostname interne service (ex: `valthera-postgres`).

## Variables d’environnement

### Frontend (build vars)
- `VITE_API_BASE_URL` (URL publique de `valthera-api`, ex: `https://api.valthera.example.com`)
- `VITE_SUPABASE_URL` (temporaire tant que front non migré API)
- `VITE_SUPABASE_ANON_KEY` (temporaire)
- `VITE_AUTH0_DOMAIN`
- `VITE_AUTH0_CLIENT_ID`
- `VITE_AUTH0_AUDIENCE`

### API
- `PORT=4000`
- `DATABASE_URL=postgresql://user:password@valthera-postgres:5432/valthera`
- `CORS_ORIGIN=https://valtheratcg.sourcekod.fr`
- `STORAGE_BACKEND=minio`
- `MINIO_ENDPOINT=valthera-minio:9000`
- `MINIO_REGION=us-east-1`
- `MINIO_ACCESS_KEY=<access-key>`
- `MINIO_SECRET_KEY=<secret-key>`
- `MINIO_USE_SSL=false`
- `MINIO_FORCE_PATH_STYLE=true`
- `UPLOADS_DIR=/app/uploads` (fallback local uniquement)
- `AUTH_ENABLED=true`
- `AUTH0_ISSUER_BASE_URL=https://<tenant>.auth0.com/`
- `AUTH0_AUDIENCE=https://<tenant>.auth0.com/api/v2/`
- `ADMIN_EMAILS=email1@example.com,email2@example.com`

### Volume persistant API

- En mode MinIO, les images sont stockées dans MinIO et servies via l'API (`/uploads/:bucket/:path`).
- Conserver `/app/uploads` uniquement comme fallback local/dev.

### Mode transition

Pour une bascule progressive (tests internes), tu peux temporairement désactiver la vérification JWT côté API:

- `AUTH_ENABLED=false`

Puis réactiver à `true` dès que la chaîne Auth0 frontend → API est validée.

## Base PostgreSQL

- Initialisation possible avec [database/postgresql-init.sql](database/postgresql-init.sql)
- Migration des données Supabase via:
  - [scripts/migration/export_supabase_db.sh](scripts/migration/export_supabase_db.sh)
  - [scripts/migration/import_to_postgres.sh](scripts/migration/import_to_postgres.sh)

## Storage (bucket)

- Pour sortir de Supabase Storage, prévoir un bucket S3-compatible (MinIO, Wasabi, S3...)
- Script de migration: [scripts/migration/migrate_supabase_bucket.sh](scripts/migration/migrate_supabase_bucket.sh)

## Stratégie de transition recommandée

1. Déployer API + PostgreSQL sur Coolify
2. Importer les données Supabase vers PostgreSQL
3. Frontend déjà câblé sur l’API via `services/apiService.ts` (vérifier `VITE_API_BASE_URL`)
4. Migrer les assets bucket vers stockage cible
5. Désactiver Supabase quand tous les flux sont migrés
