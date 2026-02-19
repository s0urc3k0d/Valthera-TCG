import { NextFunction, Request, Response } from 'express';
import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose';
import { config } from '../config.js';
import { query } from '../db.js';

interface AppAuthClaims extends JWTPayload {
  email?: string;
}

export interface AuthenticatedRequest extends Request {
  auth?: AppAuthClaims;
}

const jwks = config.authEnabled
  ? createRemoteJWKSet(new URL('.well-known/jwks.json', config.auth0IssuerBaseUrl))
  : null;

async function verifyToken(token: string): Promise<AppAuthClaims> {
  if (!jwks) {
    throw new Error('Auth is disabled');
  }

  const { payload } = await jwtVerify(token, jwks, {
    issuer: config.auth0IssuerBaseUrl,
    audience: config.auth0Audience,
  });

  const claims = payload as AppAuthClaims;

  if (!claims.email) {
    try {
      const userInfoUrl = new URL('userinfo', config.auth0IssuerBaseUrl).toString();
      const response = await fetch(userInfoUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const userInfo = (await response.json()) as { email?: string };
        if (typeof userInfo.email === 'string' && userInfo.email.length > 0) {
          claims.email = userInfo.email;
        }
      }
    } catch {
      // no-op: authorization checks will handle missing email if still absent
    }
  }

  return claims;
}

export const requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!config.authEnabled) {
    return next();
  }

  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

    if (!token) {
      return res.status(401).json({ message: 'Missing bearer token' });
    }

    req.auth = await verifyToken(token);
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

export const requireAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!config.authEnabled) {
    return next();
  }

  const email = req.auth?.email?.toLowerCase();
  if (!email) {
    return res.status(403).json({ message: 'Admin email required' });
  }

  if (config.adminEmails.includes(email)) {
    return next();
  }

  const rows = await query<{ isAdmin: boolean }>(
    `SELECT is_admin AS "isAdmin" FROM users WHERE lower(email) = lower($1) LIMIT 1`,
    [email]
  );

  if (!rows[0]?.isAdmin) {
    return res.status(403).json({ message: 'Admin required' });
  }

  return next();
};

export const requireUserOrAdmin = (paramName: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!config.authEnabled) {
      return next();
    }

    const email = req.auth?.email?.toLowerCase();
    if (!email) {
      return res.status(403).json({ message: 'User email required' });
    }

    if (config.adminEmails.includes(email)) {
      return next();
    }

    const targetUserId = req.params[paramName];
    if (!targetUserId) {
      return res.status(400).json({ message: `Missing route param: ${paramName}` });
    }

    const rows = await query<{ email: string | null }>(
      `SELECT email FROM users WHERE id = $1 LIMIT 1`,
      [targetUserId]
    );

    if (!rows[0]) {
      return res.status(404).json({ message: 'Target user not found' });
    }

    const targetEmail = rows[0].email?.toLowerCase() || '';
    if (targetEmail === email) {
      return next();
    }

    return res.status(403).json({ message: 'Forbidden for this user' });
  };
};
