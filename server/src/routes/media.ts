import { Router } from 'express';
import type { Request } from 'express';
import fs from 'fs/promises';
import path from 'path';
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

    const { safeBucket, safePath, absolutePath } = resolveUploadPath(bucket, requestedPath);

    if (config.storageBackend === 'minio') {
      if (!s3Client) {
        return res.status(500).json({ message: 'MinIO client is not configured' });
      }

      await s3Client.send(
        new PutObjectCommand({
          Bucket: safeBucket,
          Key: safePath,
          Body: payload,
          ContentType: contentType,
        })
      );
    } else {
      await fs.mkdir(path.dirname(absolutePath), { recursive: true });
      await fs.writeFile(absolutePath, payload);
    }

    const publicPath = `/uploads/${safeBucket}/${safePath}`;
    return res.status(201).json({ url: getPublicUrl(req, safeBucket, safePath), path: publicPath });
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
      if (!body || typeof (body as { transformToByteArray?: () => Promise<Uint8Array> }).transformToByteArray !== 'function') {
        return res.status(404).json({ message: 'File not found' });
      }

      const bytes = await (body as { transformToByteArray: () => Promise<Uint8Array> }).transformToByteArray();
      if (output.ContentType) {
        res.setHeader('Content-Type', output.ContentType);
      }
      return res.send(Buffer.from(bytes));
    }

    return res.sendFile(absolutePath);
  } catch (error) {
    return res.status(404).json({ message: 'File not found' });
  }
});