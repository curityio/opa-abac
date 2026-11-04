import https from 'https';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksRsa from 'jwks-rsa';

import { trace } from '../trace';

const ISSUER = process.env.ISSUER ?? 'https://localhost:8443/oauth/v2/oauth-anonymous';
const JWKS_URI = `${ISSUER}/jwks`;

/* A fresh Curity installation uses a self-signed TLS certificate, so the demo
 * skips certificate verification for the JWKS fetch. Not for production. */
const client = jwksRsa({
  jwksUri: JWKS_URI,
  cache: true,
  cacheMaxAge: 600000,
  requestAgent: new https.Agent({ rejectUnauthorized: false }),
});

function getKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback): void {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    callback(null, key?.getPublicKey());
  });
}

declare global {
  namespace Express {
    interface Request {
      user?: jwt.JwtPayload;
    }
  }
}

export function verifyJwt(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.slice(7);
  const header = jwt.decode(token, { complete: true })?.header;

  trace(req, {
    kind: 'step',
    label: 'Verify the access token',
    note: `Signed with ${header?.alg ?? 'unknown'}; the key is fetched from the issuer's JWKS at ${JWKS_URI}.`,
  });

  jwt.verify(token, getKey, { algorithms: ['RS256'] }, (err, decoded) => {
    if (err) {
      trace(req, {
        kind: 'jwt',
        label: 'Access token rejected',
        verified: false,
        verifyNote: err.message,
        header: header ?? {},
        payload: jwt.decode(token) ?? {},
      });
      res.status(401).json({ error: 'Invalid token', detail: err.message, trace: req.trace });
      return;
    }

    const payload = decoded as jwt.JwtPayload;
    trace(req, {
      kind: 'jwt',
      label: 'Access token',
      verified: true,
      verifyNote: 'Signature valid. Curity put department and clearance on this token — the API never looked the user up.',
      header: header ?? {},
      payload,
    });

    req.user = payload;
    next();
  });
}
