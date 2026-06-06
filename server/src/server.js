require("dotenv").config();

const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const pool = require("./db");

const app = express();
const PORT = process.env.PORT || 5000;
const AUTH_TOKEN_SECRET = process.env.AUTH_TOKEN_SECRET || "change-this-secret";
const AUTH_TOKEN_TTL_SECONDS = Number(process.env.AUTH_TOKEN_TTL_SECONDS || 60 * 60 * 24 * 7);

app.use(cors());
app.use(express.json());

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_ROLES = new Set(["PASSENGER", "DRIVER"]);

function getField(body, ...names) {
  for (const name of names) {
    if (body[name] !== undefined && body[name] !== null) {
      return String(body[name]).trim();
    }
  }

  return "";
}

function sendSuccess(res, statusCode, message, data = {}) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

function sendError(res, statusCode, message, errors) {
  const response = {
    success: false,
    message,
  };

  if (errors) {
    response.errors = Array.isArray(errors) ? errors : [errors];
  }

  return res.status(statusCode).json(response);
}

function validateBaseRegistration(body) {
  const data = {
    role: getField(body, "role").toUpperCase(),
    email: getField(body, "email").toLowerCase(),
    phone: getField(body, "phone", "phoneNumber", "phone_number"),
    password: getField(body, "password"),
    driverCode: getField(body, "driverCode", "driver_code"),
  };

  const errors = [];

  if (!data.role) {
    errors.push("role is required.");
  } else if (!VALID_ROLES.has(data.role)) {
    errors.push("role must be either PASSENGER or DRIVER.");
  }
  if (!data.email) {
    errors.push("email is required.");
  } else if (!EMAIL_PATTERN.test(data.email)) {
    errors.push("email must be a valid email address.");
  }
  if (!data.phone) errors.push("phone is required.");
  if (!data.password) {
    errors.push("password is required.");
  } else if (data.password.length < 8) {
    errors.push("password must be at least 8 characters long.");
  }
  if (data.role === "DRIVER" && !data.driverCode) {
    errors.push("driverCode is required when role is DRIVER.");
  }

  return { data, errors };
}

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
    .createHmac("sha256", AUTH_TOKEN_SECRET)
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
    exp: now + AUTH_TOKEN_TTL_SECONDS,
  });
}

function verifyAuthToken(token) {
  const [encodedPayload, signature] = String(token).split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = crypto
    .createHmac("sha256", AUTH_TOKEN_SECRET)
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

function buildUserResponse(user) {
  return {
    id: user.id,
    role: user.role,
    email: user.email,
    phone: user.phone,
    phoneVerified: user.phone_verified,
    createdAt: user.created_at,
  };
}

function sendPhoneVerificationCode(phone, code) {
  console.log(`Phone verification code for ${phone}: ${code}`);
}

function sendPasswordResetCode(phone, code) {
  console.log(`Password reset code for ${phone}: ${code}`);
}

async function createTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      role VARCHAR(20) NOT NULL DEFAULT 'PASSENGER' CHECK (role IN ('PASSENGER', 'DRIVER')),
      email VARCHAR(160) NOT NULL UNIQUE,
      phone VARCHAR(40) NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
      phone_verification_code VARCHAR(6),
      phone_verification_expires_at TIMESTAMPTZ,
      password_reset_code VARCHAR(6),
      password_reset_expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
    UPDATE users
    SET role = CASE WHEN LOWER(role) = 'driver' THEN 'DRIVER' ELSE 'PASSENGER' END
    WHERE role NOT IN ('PASSENGER', 'DRIVER');
    ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('PASSENGER', 'DRIVER'));
    ALTER TABLE users ALTER COLUMN role SET DEFAULT 'PASSENGER';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verification_code VARCHAR(6);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verification_expires_at TIMESTAMPTZ;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_code VARCHAR(6);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires_at TIMESTAMPTZ;
    CREATE UNIQUE INDEX IF NOT EXISTS users_phone_unique_idx ON users(phone);

    CREATE TABLE IF NOT EXISTS drivers (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      driver_code VARCHAR(100) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE drivers ADD COLUMN IF NOT EXISTS driver_code VARCHAR(100);
    CREATE UNIQUE INDEX IF NOT EXISTS drivers_driver_code_unique_idx ON drivers(driver_code);
  `);

  await pool.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'users'
          AND column_name = 'full_name'
      ) THEN
        ALTER TABLE users ALTER COLUMN full_name DROP NOT NULL;
      END IF;

      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'drivers'
          AND column_name = 'license_number'
      ) THEN
        ALTER TABLE drivers ALTER COLUMN license_number DROP NOT NULL;
      END IF;

      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'drivers'
          AND column_name = 'vehicle_plate_number'
      ) THEN
        ALTER TABLE drivers ALTER COLUMN vehicle_plate_number DROP NOT NULL;
      END IF;

      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'drivers'
          AND column_name = 'vehicle_model'
      ) THEN
        ALTER TABLE drivers ALTER COLUMN vehicle_model DROP NOT NULL;
      END IF;
    END $$;
  `);
}

async function registerUser(req, res) {
  const { data, errors } = validateBaseRegistration(req.body);

  if (errors.length > 0) {
    return sendError(res, 400, "Validation failed.", errors);
  }

  const verificationCode = createVerificationCode();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const userResult = await client.query(
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
        data.role,
        data.email,
        data.phone,
        hashPassword(data.password),
        verificationCode,
        getVerificationExpiry(),
      ]
    );

    if (data.role === "DRIVER") {
      await client.query(
        `INSERT INTO drivers (user_id, driver_code)
         VALUES ($1, $2)`,
        [userResult.rows[0].id, data.driverCode]
      );
    }

    await client.query("COMMIT");

    sendPhoneVerificationCode(data.phone, verificationCode);

    return sendSuccess(res, 201, "Registration created. Verify the phone number with the code sent to the user.", {
      user: buildUserResponse(userResult.rows[0]),
      verificationCode,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    if (error.code === "23505") {
      return sendError(res, 409, "A user with this email, phone number, or driver code already exists.");
    }

    return sendError(res, 500, "Unable to register user.", error.message);
  } finally {
    client.release();
  }
}

async function verifyPhone(req, res) {
  const phone = getField(req.body, "phone", "phoneNumber", "phone_number");
  const code = getField(req.body, "code", "verificationCode", "verification_code");
  const errors = [];

  if (!phone) errors.push("phone is required.");
  if (!code) errors.push("code is required.");

  if (errors.length > 0) {
    return sendError(res, 400, "Validation failed.", errors);
  }

  try {
    const userResult = await pool.query(
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

    if (userResult.rowCount === 0) {
      return sendError(res, 400, "Invalid or expired verification code.");
    }

    return sendSuccess(res, 200, "Phone number verified successfully.", {
      user: buildUserResponse(userResult.rows[0]),
    });
  } catch (error) {
    return sendError(res, 500, "Unable to verify phone number.", error.message);
  }
}

async function loginUser(req, res) {
  const role = getField(req.body, "role").toUpperCase();
  const rawIdentifier = getField(
    req.body,
    "identifier",
    "email",
    "phone",
    "phoneNumber",
    "phone_number",
    "driverCode",
    "driver_code"
  );
  const normalizedIdentifier = rawIdentifier.toLowerCase();
  const password = getField(req.body, "password");
  const errors = [];

  if (!role) {
    errors.push("role is required.");
  } else if (!VALID_ROLES.has(role)) {
    errors.push("role must be either PASSENGER or DRIVER.");
  }
  if (!rawIdentifier) errors.push("identifier is required.");
  if (!password) errors.push("password is required.");

  if (errors.length > 0) {
    return sendError(res, 400, "Validation failed.", errors);
  }

  try {
    const userResult = await pool.query(
      `SELECT users.id, users.role, users.email, users.phone, users.password_hash,
              users.phone_verified, users.created_at
       FROM users
       LEFT JOIN drivers ON drivers.user_id = users.id
       WHERE users.role = $1
         AND (
           LOWER(users.email) = $2
           OR users.phone = $3
           OR ($1 = 'DRIVER' AND drivers.driver_code = $3)
         )
       LIMIT 1`,
      [role, normalizedIdentifier, rawIdentifier]
    );

    if (userResult.rowCount === 0) {
      return sendError(res, 401, "Invalid login credentials.");
    }

    const user = userResult.rows[0];

    if (!verifyPassword(password, user.password_hash)) {
      return sendError(res, 401, "Invalid login credentials.");
    }

    if (!user.phone_verified) {
      return sendError(res, 403, "Verify phone number before logging in.");
    }

    delete user.password_hash;

    return sendSuccess(res, 200, "Login successful.", {
      tokenType: "Bearer",
      token: createAuthToken(user),
      user: buildUserResponse(user),
    });
  } catch (error) {
    return sendError(res, 500, "Unable to login.", error.message);
  }
}

async function getAuthenticatedUser(req, res) {
  const authorization = req.get("authorization") || "";
  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    return sendError(res, 401, "Bearer token is required.");
  }

  let payload;

  try {
    payload = verifyAuthToken(token);
  } catch (_error) {
    payload = null;
  }

  if (!payload) {
    return sendError(res, 401, "Invalid or expired token.");
  }

  try {
    const userResult = await pool.query(
      `SELECT id, role, email, phone, phone_verified, created_at
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [payload.sub]
    );

    if (userResult.rowCount === 0) {
      return sendError(res, 401, "Invalid or expired token.");
    }

    return sendSuccess(res, 200, "Authenticated user loaded successfully.", {
      user: buildUserResponse(userResult.rows[0]),
    });
  } catch (error) {
    return sendError(res, 500, "Unable to load authenticated user.", error.message);
  }
}

async function requestPasswordReset(req, res) {
  const rawIdentifier = getField(
    req.body,
    "identifier",
    "email",
    "phone",
    "phoneNumber",
    "phone_number",
    "driverCode",
    "driver_code"
  );
  const normalizedIdentifier = rawIdentifier.toLowerCase();
  const errors = [];

  if (!rawIdentifier) errors.push("identifier is required.");

  if (errors.length > 0) {
    return sendError(res, 400, "Validation failed.", errors);
  }

  const resetCode = createVerificationCode();

  try {
    const existingUserResult = await pool.query(
      `SELECT users.id, users.phone
       FROM users
       LEFT JOIN drivers ON drivers.user_id = users.id
       WHERE LOWER(users.email) = $1
          OR users.phone = $2
          OR drivers.driver_code = $2
       LIMIT 1`,
      [normalizedIdentifier, rawIdentifier]
    );

    if (existingUserResult.rowCount > 0) {
      await pool.query(
        `UPDATE users
         SET password_reset_code = $2,
             password_reset_expires_at = $3
         WHERE id = $1`,
        [existingUserResult.rows[0].id, resetCode, getVerificationExpiry()]
      );

      sendPasswordResetCode(existingUserResult.rows[0].phone, resetCode);
    }

    return sendSuccess(res, 200, "If the account exists, a password reset code has been sent.", {
      ...(process.env.NODE_ENV !== "production" && existingUserResult.rowCount > 0
        ? { resetCode }
        : {}),
    });
  } catch (error) {
    return sendError(res, 500, "Unable to request password reset.", error.message);
  }
}

async function resetPassword(req, res) {
  const rawIdentifier = getField(
    req.body,
    "identifier",
    "email",
    "phone",
    "phoneNumber",
    "phone_number",
    "driverCode",
    "driver_code"
  );
  const normalizedIdentifier = rawIdentifier.toLowerCase();
  const code = getField(req.body, "code", "resetCode", "reset_code");
  const password = getField(req.body, "password", "newPassword", "new_password");
  const errors = [];

  if (!rawIdentifier) errors.push("identifier is required.");
  if (!code) errors.push("code is required.");
  if (!password) {
    errors.push("password is required.");
  } else if (password.length < 8) {
    errors.push("password must be at least 8 characters long.");
  }

  if (errors.length > 0) {
    return sendError(res, 400, "Validation failed.", errors);
  }

  try {
    const existingUserResult = await pool.query(
      `SELECT users.id
       FROM users
       LEFT JOIN drivers ON drivers.user_id = users.id
       WHERE (
           LOWER(users.email) = $1
           OR users.phone = $2
           OR drivers.driver_code = $2
         )
         AND users.password_reset_code = $3
         AND users.password_reset_expires_at > NOW()
       LIMIT 1`,
      [normalizedIdentifier, rawIdentifier, code]
    );

    if (existingUserResult.rowCount === 0) {
      return sendError(res, 400, "Invalid or expired password reset code.");
    }

    const userResult = await pool.query(
      `UPDATE users
       SET password_hash = $2,
           password_reset_code = NULL,
           password_reset_expires_at = NULL
       WHERE id = $1
       RETURNING id, role, email, phone, phone_verified, created_at`,
      [existingUserResult.rows[0].id, hashPassword(password)]
    );

    return sendSuccess(res, 200, "Password reset successfully.", {
      user: buildUserResponse(userResult.rows[0]),
    });
  } catch (error) {
    return sendError(res, 500, "Unable to reset password.", error.message);
  }
}

app.get("/", (_req, res) => {
  return sendSuccess(res, 200, "Welcome to the OBer backend service.", {
    name: "OBer API",
    description:
      "This API will power the OBer application with Node.js, Express.js, and PostgreSQL Database.",
    status: "running",
    version: "1.0.0",
  });
});

app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");

    return sendSuccess(res, 200, "API and database are healthy.", {
      status: "ok",
      database: "connected",
    });
  } catch (error) {
    return sendError(res, 500, "Database health check failed.", {
      status: "error",
      database: "disconnected",
      error: error.message,
    });
  }
});

app.post("/api/register", registerUser);
app.post("/api/register/verify-phone", verifyPhone);
app.post("/api/login", loginUser);
app.get("/api/me", getAuthenticatedUser);
app.post("/api/password-reset/request", requestPasswordReset);
app.post("/api/password-reset/confirm", resetPassword);

async function startServer() {
  try {
    await createTables();
    console.log("Database tables are ready.");
  } catch (error) {
    console.error("Unable to initialize database tables:", error.message);
  }

  app.listen(PORT, () => {
    console.log(`OBer server is running on port ${PORT}`);
  });
}

startServer();
