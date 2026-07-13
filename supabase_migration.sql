-- Run this entire script in your Supabase SQL Editor

-- 1. Tables Creation
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  role VARCHAR(20) NOT NULL DEFAULT 'PASSENGER' CHECK (role IN ('PASSENGER', 'DRIVER')),
  full_name VARCHAR(160),
  email VARCHAR(160) UNIQUE,
  phone VARCHAR(40) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
  phone_verification_code VARCHAR(6),
  phone_verification_expires_at TIMESTAMPTZ,
  password_reset_code VARCHAR(6),
  password_reset_expires_at TIMESTAMPTZ,
  location_tracking_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Drivers may register without an email address.
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;

CREATE TABLE IF NOT EXISTS drivers (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  driver_code VARCHAR(100) NOT NULL UNIQUE,
  vehicle_id VARCHAR(100),
  vehicle_type VARCHAR(100) CHECK (vehicle_type IS NULL OR vehicle_type IN ('BUS', 'TRICYCLE')),
  license_number VARCHAR(100),
  onboarding_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (onboarding_status IN ('ACTIVE', 'SUSPENDED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Replace the former approval workflow with account availability states.
-- Existing pending/complete drivers are active because neither state represented a suspension.
ALTER TABLE drivers DROP CONSTRAINT IF EXISTS drivers_onboarding_status_check;
UPDATE drivers
SET onboarding_status = 'ACTIVE'
WHERE onboarding_status IN ('PENDING', 'COMPLETE');
ALTER TABLE drivers ALTER COLUMN onboarding_status SET DEFAULT 'ACTIVE';
ALTER TABLE drivers
  ADD CONSTRAINT drivers_onboarding_status_check
  CHECK (onboarding_status IN ('ACTIVE', 'SUSPENDED'));

-- Vehicle IDs and licence numbers identify one driver each. These functional
-- indexes also prevent duplicates that differ only by letter casing.
CREATE UNIQUE INDEX IF NOT EXISTS drivers_vehicle_id_unique_idx
  ON drivers (UPPER(TRIM(vehicle_id)))
  WHERE vehicle_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS drivers_license_number_unique_idx
  ON drivers (UPPER(TRIM(license_number)))
  WHERE license_number IS NOT NULL;

CREATE TABLE IF NOT EXISTS user_locations (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  heading DECIMAL(5, 2),
  is_visible BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hotspots (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  place_name VARCHAR(255) NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DISARMED', 'EXPIRED')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS hotspots_active_expiry_idx
  ON hotspots (expires_at)
  WHERE status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS hotspots_active_group_idx
  ON hotspots (LOWER(TRIM(place_name)), ROUND(longitude, 5), ROUND(latitude, 5))
  WHERE status = 'ACTIVE';

-- 2. RPC Functions (Required because Supabase JS cannot run raw math queries)

-- Get Nearby Drivers
CREATE OR REPLACE FUNCTION get_nearby_drivers(p_latitude numeric, p_longitude numeric, p_radius_in_km numeric DEFAULT 5)
RETURNS TABLE(
  driver_id BIGINT,
  phone VARCHAR(40),
  driver_code VARCHAR(100),
  latitude numeric,
  longitude numeric,
  heading numeric,
  is_visible BOOLEAN,
  updated_at TIMESTAMPTZ,
  distance numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM (
    SELECT
      u.id as driver_id,
      u.phone,
      d.driver_code,
      l.latitude,
      l.longitude,
      l.heading,
      l.is_visible,
      l.updated_at,
      (
        6371 * acos(
          LEAST(1, GREATEST(-1,
            cos(radians(p_latitude)) * cos(radians(l.latitude)) *
            cos(radians(l.longitude) - radians(p_longitude)) +
            sin(radians(p_latitude)) * sin(radians(l.latitude))
          ))
        )
      ) AS distance
    FROM user_locations l
    JOIN users u ON l.user_id = u.id
    JOIN drivers d ON u.id = d.user_id
    WHERE u.role = 'DRIVER'
      AND l.is_visible = TRUE
      AND l.updated_at > NOW() - INTERVAL '5 minutes'
  ) as sub
  WHERE sub.distance <= p_radius_in_km
  ORDER BY sub.distance ASC;
END;
$$ LANGUAGE plpgsql;

-- Get Nearby Users
CREATE OR REPLACE FUNCTION get_nearby_users(p_latitude numeric, p_longitude numeric, p_radius_in_km numeric DEFAULT 5)
RETURNS TABLE(
  user_id BIGINT,
  role VARCHAR(20),
  latitude numeric,
  longitude numeric,
  heading numeric,
  is_visible BOOLEAN,
  updated_at TIMESTAMPTZ,
  distance numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM (
    SELECT
      u.id as user_id,
      u.role,
      l.latitude,
      l.longitude,
      l.heading,
      l.is_visible,
      l.updated_at,
      (
        6371 * acos(
          LEAST(1, GREATEST(-1,
            cos(radians(p_latitude)) * cos(radians(l.latitude)) *
            cos(radians(l.longitude) - radians(p_longitude)) +
            sin(radians(p_latitude)) * sin(radians(l.latitude))
          ))
        )
      ) AS distance
    FROM user_locations l
    JOIN users u ON l.user_id = u.id
    WHERE l.updated_at > NOW() - INTERVAL '5 minutes'
  ) as sub
  WHERE sub.distance <= p_radius_in_km
  ORDER BY sub.distance ASC;
END;
$$ LANGUAGE plpgsql;

-- Get Active Hotspot Groups
CREATE OR REPLACE FUNCTION get_active_hotspot_groups(p_latitude numeric DEFAULT NULL, p_longitude numeric DEFAULT NULL, p_radius_in_km numeric DEFAULT NULL)
RETURNS TABLE(
  place_name VARCHAR(255),
  longitude numeric,
  latitude numeric,
  passenger_count BIGINT,
  distance numeric
) AS $$
BEGIN
  IF p_latitude IS NOT NULL AND p_longitude IS NOT NULL AND p_radius_in_km IS NOT NULL THEN
    RETURN QUERY
    WITH grouped_hotspots AS (
      SELECT
        MIN(TRIM(h.place_name)) AS place_name,
        ROUND(h.longitude, 5) AS longitude,
        ROUND(h.latitude, 5) AS latitude,
        COUNT(*)::BIGINT AS passenger_count
      FROM hotspots h
      WHERE h.status = 'ACTIVE' AND h.expires_at > NOW()
      GROUP BY
        LOWER(TRIM(h.place_name)),
        ROUND(h.longitude, 5),
        ROUND(h.latitude, 5)
    ),
    hotspots_with_distance AS (
      SELECT
        gh.*,
        (
          6371 * acos(
            LEAST(1, GREATEST(-1,
              cos(radians(p_latitude)) * cos(radians(gh.latitude)) *
              cos(radians(gh.longitude) - radians(p_longitude)) +
              sin(radians(p_latitude)) * sin(radians(gh.latitude))
            ))
          )
        ) AS distance
      FROM grouped_hotspots gh
    )
    SELECT *
    FROM hotspots_with_distance
    WHERE hotspots_with_distance.distance <= p_radius_in_km
    ORDER BY hotspots_with_distance.distance ASC, passenger_count DESC, hotspots_with_distance.place_name ASC;
  ELSE
    RETURN QUERY
    SELECT
      MIN(TRIM(h.place_name)) AS place_name,
      ROUND(h.longitude, 5) AS longitude,
      ROUND(h.latitude, 5) AS latitude,
      COUNT(*)::BIGINT AS passenger_count,
      NULL::numeric AS distance
    FROM hotspots h
    WHERE h.status = 'ACTIVE' AND h.expires_at > NOW()
    GROUP BY
      LOWER(TRIM(h.place_name)),
      ROUND(h.longitude, 5),
      ROUND(h.latitude, 5)
    ORDER BY passenger_count DESC, place_name ASC;
  END IF;
END;
$$ LANGUAGE plpgsql;
