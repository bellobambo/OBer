const crypto = require("crypto");
const authConfig = require("../config/auth");

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");

  return `${salt}:${hash}`;
}

function verifyPassword(password, passwordHash) {
  const [salt, storedHash] = String(passwordHash).split(":");

  if (!salt || !storedHash) {
    return false;
  }

  const hash = crypto.scryptSync(password, salt, 64);
  const stored = Buffer.from(storedHash, "hex");

  return stored.length === hash.length && crypto.timingSafeEqual(stored, hash);
}

function toBase64Url(value) {
  return Buffer.from(value).toString("base64url");
}

function fromBase64Url(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signToken(payload) {
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = crypto
    .createHmac("sha256", authConfig.tokenSecret)
    .update(encodedPayload)
    .digest("base64url");

  return `${encodedPayload}.${signature}`;
}

function createAuthToken(user) {
  const now = Math.floor(Date.now() / 1000);

  return signToken({
    sub: String(user.id),
    role: user.role,
    iat: now,
    exp: now + authConfig.tokenTtlSeconds,
  });
}

function verifyAuthToken(token) {
  const [encodedPayload, signature] = String(token).split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = crypto
    .createHmac("sha256", authConfig.tokenSecret)
    .update(encodedPayload)
    .digest("base64url");

  const actual = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);

  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) {
    return null;
  }

  const payload = JSON.parse(fromBase64Url(encodedPayload));

  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  return payload;
}

function createVerificationCode() {
  return String(crypto.randomInt(100000, 1000000));
}

function getVerificationExpiry() {
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 10);

  return expiresAt;
}

module.exports = {
  createAuthToken,
  createVerificationCode,
  getVerificationExpiry,
  hashPassword,
  verifyAuthToken,
  verifyPassword,
};
