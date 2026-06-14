const pool = require("./db");

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

    ALTER TABLE users ADD COLUMN IF NOT EXISTS location_tracking_enabled BOOLEAN NOT NULL DEFAULT FALSE;

    ALTER TABLE drivers ADD COLUMN IF NOT EXISTS driver_code VARCHAR(100);
    CREATE UNIQUE INDEX IF NOT EXISTS drivers_driver_code_unique_idx ON drivers(driver_code);

    CREATE TABLE IF NOT EXISTS user_locations (
      user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      latitude DECIMAL(10, 8) NOT NULL,
      longitude DECIMAL(11, 8) NOT NULL,
      heading DECIMAL(5, 2),
      is_visible BOOLEAN NOT NULL DEFAULT FALSE,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE user_locations ADD COLUMN IF NOT EXISTS is_visible BOOLEAN NOT NULL DEFAULT FALSE;

    CREATE TABLE IF NOT EXISTS hotspots (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      place_name VARCHAR(255) NOT NULL,
      latitude DECIMAL(10, 8) NOT NULL,
      longitude DECIMAL(11, 8) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DISARMED')),
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

module.exports = {
  createTables,
};
