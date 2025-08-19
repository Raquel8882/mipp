import jwt from 'jsonwebtoken';

const SECRET = process.env.SESSION_SECRET || process.env.NEXTAUTH_SECRET;
if (!SECRET) console.warn('SESSION_SECRET not set. Set SESSION_SECRET in env for secure JWTs.');

export function createToken(payloadObj, expiresInSeconds = 60 * 60 * 24 * 7) {
  const opts = { algorithm: 'HS256', expiresIn: expiresInSeconds };
  return jwt.sign(payloadObj, SECRET || '', opts);
}

export function verifyToken(token) {
  try {
    if (!token) return null;
    const payload = jwt.verify(token, SECRET || '', { algorithms: ['HS256'] });
    return payload;
  } catch (err) {
    // token invalid or expired
    return null;
  }
}
