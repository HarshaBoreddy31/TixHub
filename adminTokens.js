// adminTokens.js — minimal JWT-style session store for admin + user auth.
// Uses standard JWT-compatible HMAC signing without extra dependencies.

const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'tixhub-dev-secret-key';
const activeTokens = new Set();

function toBase64Url(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function fromBase64Url(value) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  const normalized = pad ? base64 + '='.repeat(4 - pad) : base64;
  return Buffer.from(normalized, 'base64');
}

function signToken(payload) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const headerPart = toBase64Url(JSON.stringify(header));
  const payloadPart = toBase64Url(JSON.stringify(payload));
  const signingInput = `${headerPart}.${payloadPart}`;
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(signingInput)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

  return `${signingInput}.${signature}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') {
    return null;
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    activeTokens.delete(token);
    return null;
  }

  const [headerPart, payloadPart, signature] = parts;
  const signingInput = `${headerPart}.${payloadPart}`;
  const expectedSig = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(signingInput)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

  const actualSig = Buffer.from(signature, 'utf8');
  const expectedBuf = Buffer.from(expectedSig, 'utf8');
  if (actualSig.length !== expectedBuf.length || !crypto.timingSafeEqual(actualSig, expectedBuf)) {
    activeTokens.delete(token);
    return null;
  }

  if (!activeTokens.has(token)) {
    return null;
  }

  try {
    const payload = JSON.parse(fromBase64Url(payloadPart).toString('utf8'));
    const nowSec = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp <= nowSec) {
      activeTokens.delete(token);
      return null;
    }
    return payload;
  } catch (err) {
    activeTokens.delete(token);
    return null;
  }
}

function issueToken(payload) {
  const nowSec = Math.floor(Date.now() / 1000);
  const token = signToken({
    ...payload,
    iat: nowSec,
    exp: nowSec + 8 * 60 * 60
  });
  activeTokens.add(token);
  return token;
}

function isValid(token) {
  return !!verifyToken(token);
}

function revoke(token) {
  activeTokens.delete(token);
}

function getBearerToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

function requireRole(req, res, next, role) {
  const token = getBearerToken(req);
  if (!token || !isValid(token)) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const user = verifyToken(token);
  if (!user || !user.role) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const userRole = user.role.toLowerCase();
  const allowedRoles = Array.isArray(role) ? role.map((r) => r.toLowerCase()) : [role.toLowerCase()];

  if (!allowedRoles.includes(userRole)) {
    return res.status(403).json({ error: `Requires ${Array.isArray(role) ? role.join(' or ') : role} role` });
  }

  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  return requireRole(req, res, next, 'admin');
}

function requireUser(req, res, next) {
  return requireRole(req, res, next, 'user');
}

function requireCreator(req, res, next) {
  return requireRole(req, res, next, 'creator');
}

function requireCreatorOrAdmin(req, res, next) {
  return requireRole(req, res, next, ['creator', 'admin']);
}

module.exports = {
  issueToken,
  isValid,
  revoke,
  verifyToken,
  requireRole,
  requireAdmin,
  requireUser,
  requireCreator,
  requireCreatorOrAdmin,
  getBearerToken
};
