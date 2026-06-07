const pool = require("../db");

function toResponse(user) {
  return {
    id: user.id,
    role: user.role,
    email: user.email,
    phone: user.phone,
    phoneVerified: user.phone_verified,
    createdAt: user.created_at,
  };
}

async function create(client, user) {
  return client.query(
    `INSERT INTO users (
      role,
      email,
      phone,
      password_hash,
      phone_verification_code,
      phone_verification_expires_at
     )
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, role, email, phone, phone_verified, created_at`,
    [
      user.role,
      user.email,
      user.phone,
      user.passwordHash,
      user.phoneVerificationCode,
      user.phoneVerificationExpiresAt,
    ]
  );
}

async function findByLogin(login) {
  return pool.query(
    `SELECT users.id, users.role, users.email, users.phone, users.password_hash,
            users.phone_verified, users.password_reset_code,
            users.password_reset_expires_at, users.created_at
     FROM users
     LEFT JOIN drivers ON drivers.user_id = users.id
     WHERE LOWER(users.email) = $1
        OR users.phone = $2
        OR drivers.driver_code = $2
     LIMIT 1`,
    [login.toLowerCase(), login]
  );
}

async function findPublicById(id) {
  return pool.query(
    `SELECT id, role, email, phone, phone_verified, created_at
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [id]
  );
}

async function verifyPhone(phone, code) {
  return pool.query(
    `UPDATE users
     SET phone_verified = TRUE,
         phone_verification_code = NULL,
         phone_verification_expires_at = NULL
     WHERE phone = $1
       AND phone_verification_code = $2
       AND phone_verification_expires_at > NOW()
     RETURNING id, role, email, phone, phone_verified, created_at`,
    [phone, code]
  );
}

async function setPasswordResetCode(userId, resetCode, expiresAt) {
  return pool.query(
    `UPDATE users
     SET password_reset_code = $2,
         password_reset_expires_at = $3
     WHERE id = $1`,
    [userId, resetCode, expiresAt]
  );
}

async function updatePassword(userId, passwordHash) {
  return pool.query(
    `UPDATE users
     SET password_hash = $2,
         password_reset_code = NULL,
         password_reset_expires_at = NULL
     WHERE id = $1
     RETURNING id, role, email, phone, phone_verified, created_at`,
    [userId, passwordHash]
  );
}

module.exports = {
  create,
  findByLogin,
  findPublicById,
  setPasswordResetCode,
  toResponse,
  updatePassword,
  verifyPhone,
};
