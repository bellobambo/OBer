const pool = require("../db");

class Hotspot {
  static async arm(userId, placeName, longitude, latitude) {
    const query = `
      WITH replaced_hotspots AS (
        UPDATE hotspots
        SET status = CASE
          WHEN expires_at <= NOW() THEN 'EXPIRED'
          ELSE 'DISARMED'
        END
        WHERE user_id = $1 AND status = 'ACTIVE'
        RETURNING *
      ),
      inserted_hotspot AS (
        INSERT INTO hotspots (user_id, place_name, longitude, latitude, status, expires_at)
        VALUES ($1, $2, $3, $4, 'ACTIVE', NOW() + INTERVAL '5 minutes')
        RETURNING *
      )
      SELECT
        inserted_hotspot.*,
        COALESCE(
          (SELECT JSON_AGG(replaced_hotspots) FROM replaced_hotspots),
          '[]'::JSON
        ) AS replaced_hotspots
      FROM inserted_hotspot;
    `;
    return pool.query(query, [userId, placeName, longitude, latitude]);
  }

  static async disarm(hotspotId, userId) {
    const query = `
      UPDATE hotspots
      SET status = 'DISARMED'
      WHERE id = $1 AND user_id = $2 AND status = 'ACTIVE'
      RETURNING *;
    `;
    return pool.query(query, [hotspotId, userId]);
  }

  static async getActiveGroups(latitude, longitude, radiusInKm) {
    if (latitude !== undefined && longitude !== undefined) {
      const query = `
        WITH grouped_hotspots AS (
          SELECT
            MIN(TRIM(place_name)) AS place_name,
            ROUND(longitude, 5) AS longitude,
            ROUND(latitude, 5) AS latitude,
            COUNT(*)::INTEGER AS passenger_count
          FROM hotspots
          WHERE status = 'ACTIVE' AND expires_at > NOW()
          GROUP BY
            LOWER(TRIM(place_name)),
            ROUND(longitude, 5),
            ROUND(latitude, 5)
        ),
        hotspots_with_distance AS (
          SELECT
            grouped_hotspots.*,
            (
              6371 * acos(
                LEAST(
                  1,
                  GREATEST(
                    -1,
                    cos(radians($1::NUMERIC)) *
                    cos(radians(grouped_hotspots.latitude)) *
                    cos(
                      radians(grouped_hotspots.longitude) -
                      radians($2::NUMERIC)
                    ) +
                    sin(radians($1::NUMERIC)) *
                    sin(radians(grouped_hotspots.latitude))
                  )
                )
              )
            ) AS distance
          FROM grouped_hotspots
        )
        SELECT *
        FROM hotspots_with_distance
        WHERE distance <= $3
        ORDER BY distance ASC, passenger_count DESC, place_name ASC;
      `;
      return pool.query(query, [latitude, longitude, radiusInKm]);
    }

    const query = `
      SELECT
        MIN(TRIM(place_name)) AS place_name,
        ROUND(longitude, 5) AS longitude,
        ROUND(latitude, 5) AS latitude,
        COUNT(*)::INTEGER AS passenger_count
      FROM hotspots
      WHERE status = 'ACTIVE' AND expires_at > NOW()
      GROUP BY
        LOWER(TRIM(place_name)),
        ROUND(longitude, 5),
        ROUND(latitude, 5)
      ORDER BY passenger_count DESC, place_name ASC;
    `;
    return pool.query(query);
  }

  static async getActiveGroup(placeName, longitude, latitude) {
    const query = `
      SELECT
        COALESCE(MIN(TRIM(place_name)), TRIM($1::TEXT)) AS place_name,
        ROUND($2::NUMERIC, 5) AS longitude,
        ROUND($3::NUMERIC, 5) AS latitude,
        COUNT(*)::INTEGER AS passenger_count
      FROM hotspots
      WHERE status = 'ACTIVE'
        AND expires_at > NOW()
        AND LOWER(TRIM(place_name)) = LOWER(TRIM($1))
        AND ROUND(longitude, 5) = ROUND($2::NUMERIC, 5)
        AND ROUND(latitude, 5) = ROUND($3::NUMERIC, 5);
    `;
    return pool.query(query, [placeName, longitude, latitude]);
  }

  static async expireActive() {
    const query = `
      UPDATE hotspots
      SET status = 'EXPIRED'
      WHERE status = 'ACTIVE' AND expires_at <= NOW()
      RETURNING place_name, longitude, latitude;
    `;
    return pool.query(query);
  }
}

module.exports = Hotspot;
