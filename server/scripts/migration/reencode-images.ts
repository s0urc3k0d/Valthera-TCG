import 'dotenv/config';
import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import pg from 'pg';
import sharp from 'sharp';

const { Pool } = pg;

type ImageRef = {
  table: 'cards' | 'series' | 'users';
  column: 'image_url' | 'cover_image' | 'avatar';
  id: string;
  url: string;
};

type TargetFormat = 'webp' | 'avif';

const env = {
  databaseUrl: process.env.DATABASE_URL || '',
  minioEndpoint: process.env.MINIO_ENDPOINT || '',
  minioRegion: process.env.MINIO_REGION || 'us-east-1',
  minioAccessKey: process.env.MINIO_ACCESS_KEY || '',
  minioSecretKey: process.env.MINIO_SECRET_KEY || '',
  minioUseSsl: (process.env.MINIO_USE_SSL || 'false') === 'true',
  minioForcePathStyle: (process.env.MINIO_FORCE_PATH_STYLE || 'true') === 'true',
  publicApiBaseUrl: (process.env.PUBLIC_API_BASE_URL || 'https://api.valtheratcg.sourcekod.fr').replace(/\/+$/, ''),
  targetFormat: ((process.env.REENCODE_TARGET_FORMAT || 'webp').toLowerCase() === 'avif' ? 'avif' : 'webp') as TargetFormat,
  quality: Math.max(1, Math.min(100, Number(process.env.REENCODE_QUALITY || 78) || 78)),
  dryRun: (process.env.DRY_RUN || 'true') === 'true',
  deleteOldObject: (process.env.DELETE_OLD_OBJECT || 'false') === 'true',
};

for (const required of ['databaseUrl', 'minioEndpoint', 'minioAccessKey', 'minioSecretKey'] as const) {
  if (!env[required]) {
    throw new Error(`Missing required env var for migration: ${required}`);
  }
}

const pool = new Pool({ connectionString: env.databaseUrl });
const s3 = new S3Client({
  endpoint: env.minioUseSsl ? `https://${env.minioEndpoint}` : `http://${env.minioEndpoint}`,
  region: env.minioRegion,
  forcePathStyle: env.minioForcePathStyle,
  credentials: {
    accessKeyId: env.minioAccessKey,
    secretAccessKey: env.minioSecretKey,
  },
});

const fetchRows = async (): Promise<ImageRef[]> => {
  const queries = [
    `SELECT id::text AS id, image_url AS url, 'cards'::text AS table_name, 'image_url'::text AS column_name
     FROM cards WHERE image_url IS NOT NULL AND image_url <> ''`,
    `SELECT id::text AS id, cover_image AS url, 'series'::text AS table_name, 'cover_image'::text AS column_name
     FROM series WHERE cover_image IS NOT NULL AND cover_image <> ''`,
    `SELECT id::text AS id, avatar AS url, 'users'::text AS table_name, 'avatar'::text AS column_name
     FROM users WHERE avatar IS NOT NULL AND avatar <> ''`,
  ];

  const result: ImageRef[] = [];
  for (const sql of queries) {
    const { rows } = await pool.query<{ id: string; url: string; table_name: ImageRef['table']; column_name: ImageRef['column'] }>(sql);
    for (const row of rows) {
      result.push({
        id: row.id,
        url: row.url,
        table: row.table_name,
        column: row.column_name,
      });
    }
  }
  return result;
};

const parseUploadPath = (urlValue: string): { bucket: string; key: string } | null => {
  try {
    const parsed = new URL(urlValue);
    const marker = '/uploads/';
    const idx = parsed.pathname.indexOf(marker);
    if (idx < 0) return null;
    const rest = parsed.pathname.slice(idx + marker.length);
    const slash = rest.indexOf('/');
    if (slash <= 0) return null;
    const bucket = decodeURIComponent(rest.slice(0, slash));
    const key = decodeURIComponent(rest.slice(slash + 1));
    if (!bucket || !key) return null;
    return { bucket, key };
  } catch {
    return null;
  }
};

const replaceExtension = (key: string, extension: string): string => {
  const idx = key.lastIndexOf('.');
  if (idx <= 0) return `${key}.${extension}`;
  return `${key.slice(0, idx)}.${extension}`;
};

const isAlreadyTargetFormat = (key: string): boolean => key.toLowerCase().endsWith(`.${env.targetFormat}`);

const optimize = async (input: Buffer): Promise<{ output: Buffer; contentType: string; extension: string }> => {
  const base = sharp(input, { failOn: 'none' }).rotate();
  if (env.targetFormat === 'avif') {
    const output = await base.avif({ quality: env.quality, effort: 4 }).toBuffer();
    return { output, contentType: 'image/avif', extension: 'avif' };
  }
  const output = await base.webp({ quality: env.quality, effort: 4 }).toBuffer();
  return { output, contentType: 'image/webp', extension: 'webp' };
};

const updateDbUrl = async (ref: ImageRef, nextUrl: string): Promise<void> => {
  await pool.query(
    `UPDATE ${ref.table}
     SET ${ref.column} = $2
     WHERE id = $1`,
    [ref.id, nextUrl]
  );
};

const run = async () => {
  console.log('--- Reencode existing images migration ---');
  console.log(`Target format: ${env.targetFormat}`);
  console.log(`Quality: ${env.quality}`);
  console.log(`Dry run: ${env.dryRun}`);
  console.log(`Delete old object: ${env.deleteOldObject}`);

  const refs = await fetchRows();
  console.log(`Found ${refs.length} image URLs in DB.`);

  let scanned = 0;
  let converted = 0;
  let skipped = 0;
  let failed = 0;

  for (const ref of refs) {
    scanned += 1;
    const parsed = parseUploadPath(ref.url);
    if (!parsed) {
      skipped += 1;
      continue;
    }

    const { bucket, key } = parsed;
    if (isAlreadyTargetFormat(key)) {
      skipped += 1;
      continue;
    }

    try {
      const getResult = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      const body = getResult.Body;
      if (!body || typeof (body as { transformToByteArray?: () => Promise<Uint8Array> }).transformToByteArray !== 'function') {
        failed += 1;
        console.warn(`[WARN] Missing object stream: s3://${bucket}/${key}`);
        continue;
      }

      const bytes = await (body as { transformToByteArray: () => Promise<Uint8Array> }).transformToByteArray();
      const { output, contentType, extension } = await optimize(Buffer.from(bytes));
      const nextKey = replaceExtension(key, extension);
      const nextUrl = `${env.publicApiBaseUrl}/uploads/${encodeURIComponent(bucket)}/${nextKey
        .split('/')
        .map((part) => encodeURIComponent(part))
        .join('/')}`;

      if (!env.dryRun) {
        await s3.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: nextKey,
            Body: output,
            ContentType: contentType,
            CacheControl: 'public, max-age=31536000, immutable',
          })
        );

        await updateDbUrl(ref, nextUrl);

        if (env.deleteOldObject && nextKey !== key) {
          await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
        }
      }

      converted += 1;
      if (converted % 25 === 0) {
        console.log(`Progress: converted=${converted}, scanned=${scanned}, skipped=${skipped}, failed=${failed}`);
      }
    } catch (error) {
      failed += 1;
      console.warn(`[WARN] Failed for ${ref.table}.${ref.column} id=${ref.id}:`, error instanceof Error ? error.message : error);
    }
  }

  console.log('--- Done ---');
  console.log(`Scanned:   ${scanned}`);
  console.log(`Converted: ${converted}`);
  console.log(`Skipped:   ${skipped}`);
  console.log(`Failed:    ${failed}`);
  console.log(env.dryRun ? 'Dry-run mode: no DB/object writes were performed.' : 'Writes completed.');
};

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => undefined);
  });
