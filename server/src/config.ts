import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const imageOutputFormat = (process.env.IMAGE_OUTPUT_FORMAT || 'webp').toLowerCase();
const imageOutputQualityRaw = Number(process.env.IMAGE_OUTPUT_QUALITY || 78);
const imageOutputQuality = Number.isFinite(imageOutputQualityRaw)
  ? Math.max(1, Math.min(100, Math.round(imageOutputQualityRaw)))
  : 78;

export const config = {
  port: Number(process.env.PORT || 4000),
  databaseUrl: process.env.DATABASE_URL || '',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  storageBackend: (process.env.STORAGE_BACKEND || 'local').toLowerCase(),
  authEnabled: (process.env.AUTH_ENABLED || 'true') === 'true',
  auth0IssuerBaseUrl: process.env.AUTH0_ISSUER_BASE_URL || '',
  auth0Audience: process.env.AUTH0_AUDIENCE || '',
  uploadsDir: process.env.UPLOADS_DIR || path.resolve(process.cwd(), 'uploads'),
  minioEndpoint: process.env.MINIO_ENDPOINT || '',
  minioRegion: process.env.MINIO_REGION || 'us-east-1',
  minioAccessKey: process.env.MINIO_ACCESS_KEY || '',
  minioSecretKey: process.env.MINIO_SECRET_KEY || '',
  minioUseSsl: (process.env.MINIO_USE_SSL || 'false') === 'true',
  minioForcePathStyle: (process.env.MINIO_FORCE_PATH_STYLE || 'true') === 'true',
  imageOptimizationEnabled: (process.env.IMAGE_OPTIMIZATION_ENABLED || 'true') === 'true',
  imageOutputFormat: (['original', 'webp', 'avif'].includes(imageOutputFormat) ? imageOutputFormat : 'webp') as
    | 'original'
    | 'webp'
    | 'avif',
  imageOutputQuality,
  adminEmails: (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
};

if (!config.databaseUrl) {
  throw new Error('DATABASE_URL est obligatoire');
}

if (config.authEnabled && (!config.auth0IssuerBaseUrl || !config.auth0Audience)) {
  throw new Error('AUTH0_ISSUER_BASE_URL et AUTH0_AUDIENCE sont obligatoires quand AUTH_ENABLED=true');
}

if (config.storageBackend === 'minio' && (!config.minioEndpoint || !config.minioAccessKey || !config.minioSecretKey)) {
  throw new Error('MINIO_ENDPOINT, MINIO_ACCESS_KEY et MINIO_SECRET_KEY sont obligatoires quand STORAGE_BACKEND=minio');
}
