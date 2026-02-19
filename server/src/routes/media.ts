import { Router } from 'express';
import type { Request } from 'express';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { config } from '../config.js';

export const mediaRouter = Router();
export const mediaPublicRouter = Router();

const s3Client = config.storageBackend === 'minio'
  ? new S3Client({
      endpoint: config.minioUseSsl ? `https://${config.minioEndpoint}` : `http://${config.minioEndpoint}`,
      region: config.minioRegion,
      credentials: {
        accessKeyId: config.minioAccessKey,
        secretAccessKey: config.minioSecretKey,
      },
      forcePathStyle: config.minioForcePathStyle,
    })
  : null;

const normalizeSegment = (input: string): string => input.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');

const resolveUploadPath = (bucket: string, requestedPath: string): { safeBucket: string; safePath: string; absolutePath: string } => {
  const safeBucket = normalizeSegment(bucket);
  const safePath = normalizeSegment(requestedPath);

  if (!safeBucket || !safePath) {
    throw new Error('bucket and path are required');
  }

  if (safeBucket.includes('..') || safePath.includes('..')) {
    throw new Error('Invalid path');
  }

  const absolutePath = path.resolve(config.uploadsDir, safeBucket, safePath);
  const uploadsBase = path.resolve(config.uploadsDir);

  if (!absolutePath.startsWith(uploadsBase + path.sep) && absolutePath !== uploadsBase) {
    throw new Error('Invalid target path');
  }

  return { safeBucket, safePath, absolutePath };
};

const readBodyBuffer = async (body: unknown): Promise<Buffer | null> => {
  if (Buffer.isBuffer(body)) {
    return body;
  }

  if (body instanceof Uint8Array) {
    return Buffer.from(body);
  }

  return null;
};

const isOptimizableImageContentType = (contentType: string): boolean => {
  const normalized = contentType.toLowerCase();
  if (!normalized.startsWith('image/')) {
    return false;
  }

  return !normalized.includes('gif') && !normalized.includes('svg');
};

const rewritePathExtension = (objectPath: string, extension: string): string => {
  const parsed = path.posix.parse(objectPath);
  const fileName = parsed.name || 'image';
  if (!parsed.dir) {
    return `${fileName}.${extension}`;
  }
  return `${parsed.dir}/${fileName}.${extension}`;
};

const optimizeUploadedImage = async (
  payload: Buffer,
  contentType: string,
  safePath: string
): Promise<{ buffer: Buffer; contentType: string; objectPath: string }> => {
  if (!config.imageOptimizationEnabled || config.imageOutputFormat === 'original' || !isOptimizableImageContentType(contentType)) {
    return { buffer: payload, contentType, objectPath: safePath };
  }

  const baseImage = sharp(payload, { failOn: 'none' }).rotate();

  if (config.imageOutputFormat === 'avif') {
    const buffer = await baseImage.avif({ quality: config.imageOutputQuality, effort: 4 }).toBuffer();
    return {
      buffer,
      contentType: 'image/avif',
      objectPath: rewritePathExtension(safePath, 'avif'),
    };
  }

  const buffer = await baseImage.webp({ quality: config.imageOutputQuality, effort: 4 }).toBuffer();
  return {
    buffer,
    contentType: 'image/webp',
    objectPath: rewritePathExtension(safePath, 'webp'),
  };
};

const getPublicUrl = (req: Request, bucket: string, objectPath: string): string => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  return `${baseUrl}/uploads/${bucket}/${objectPath}`;
};

mediaRouter.post('/upload', async (req, res) => {
  try {
    const bucket = String(req.query.bucket || '');
    const requestedPath = String(req.query.path || '');
    const contentType = req.header('content-type') || '';

    if (!contentType.startsWith('image/')) {
      return res.status(400).json({ message: 'Only image content-type is supported' });
    }

    const payload = await readBodyBuffer(req.body);
    if (!payload || payload.length === 0) {
      return res.status(400).json({ message: 'Empty image payload' });
    }

    const { safeBucket, safePath } = resolveUploadPath(bucket, requestedPath);
    const optimized = await optimizeUploadedImage(payload, contentType, safePath);
    const { absolutePath } = resolveUploadPath(safeBucket, optimized.objectPath);

    if (config.storageBackend === 'minio') {
      if (!s3Client) {
        return res.status(500).json({ message: 'MinIO client is not configured' });
      }

      await s3Client.send(
        new PutObjectCommand({
          Bucket: safeBucket,
          Key: optimized.objectPath,
          Body: optimized.buffer,
          ContentType: optimized.contentType,
          CacheControl: 'public, max-age=31536000, immutable',
        })
      );
    } else {
      await fs.mkdir(path.dirname(absolutePath), { recursive: true });
      await fs.writeFile(absolutePath, optimized.buffer);
    }

    const publicPath = `/uploads/${safeBucket}/${optimized.objectPath}`;
    return res.status(201).json({ url: getPublicUrl(req, safeBucket, optimized.objectPath), path: publicPath });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    return res.status(400).json({ message });
  }
});

mediaRouter.delete('/delete', async (req, res) => {
  try {
    const bucket = String(req.query.bucket || '');
    const requestedPath = String(req.query.path || '');
    const { safeBucket, safePath, absolutePath } = resolveUploadPath(bucket, requestedPath);

    if (config.storageBackend === 'minio') {
      if (!s3Client) {
        return res.status(500).json({ message: 'MinIO client is not configured' });
      }

      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: safeBucket,
          Key: safePath,
        })
      );
    } else {
      await fs.unlink(absolutePath);
    }

    return res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Delete failed';
    if (message.includes('ENOENT')) {
      return res.status(404).json({ message: 'File not found' });
    }
    return res.status(400).json({ message });
  }
});

mediaPublicRouter.get('/:bucket/*', async (req, res) => {
  try {
    const bucket = String(req.params.bucket || '');
    const requestedPath = String((req.params as Record<string, string>)['0'] || '');
    const { safeBucket, safePath, absolutePath } = resolveUploadPath(bucket, requestedPath);

    if (config.storageBackend === 'minio') {
      if (!s3Client) {
        return res.status(500).json({ message: 'MinIO client is not configured' });
      }

      const output = await s3Client.send(
        new GetObjectCommand({
          Bucket: safeBucket,
          Key: safePath,
        })
      );

      const body = output.Body;
      if (!body) {
        return res.status(404).json({ message: 'File not found' });
      }

      res.setHeader('Cache-Control', output.CacheControl || 'public, max-age=31536000, immutable');
      if (output.ContentType) {
        res.setHeader('Content-Type', output.ContentType);
      }

      if (typeof (body as { pipe?: (destination: NodeJS.WritableStream) => NodeJS.WritableStream }).pipe === 'function') {
        return (body as { pipe: (destination: NodeJS.WritableStream) => NodeJS.WritableStream }).pipe(res);
      }

      if (typeof (body as { transformToByteArray?: () => Promise<Uint8Array> }).transformToByteArray !== 'function') {
        return res.status(404).json({ message: 'File not found' });
      }

      const bytes = await (body as { transformToByteArray: () => Promise<Uint8Array> }).transformToByteArray();
      return res.send(Buffer.from(bytes));
    }

    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return res.sendFile(absolutePath);
  } catch (error) {
    return res.status(404).json({ message: 'File not found' });
  }
});