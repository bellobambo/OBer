const pool = require("../db");

class Location {
  static async updateLocation(userId, latitude, longitude, heading) {
    const query = `
      INSERT INTO user_locations (user_id, latitude, longitude, heading, updated_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        heading = EXCLUDED.heading,
        updated_at = NOW()
      RETURNING *;
    `;
    return pool.query(query, [userId, latitude, longitude, heading]);
  }

  static async getNearbyDrivers(latitude, longitude, radiusInKm = 5) {
    const query = `
      SELECT * FROM (
        SELECT
          u.id as driver_id,
          u.phone,
          d.driver_code,
          l.latitude,
          l.longitude,
          l.heading,
          l.updated_at,
          (
            6371 * acos(
              cos(radians($1)) * cos(radians(l.latitude)) *
              cos(radians(l.longitude) - radians($2)) +
              sin(radians($1)) * sin(radians(l.latitude))
            )
          ) AS distance
        FROM user_locations l
        JOIN users u ON l.user_id = u.id
        JOIN drivers d ON u.id = d.user_id
        WHERE u.role = 'DRIVER'
          AND l.updated_at > NOW() - INTERVAL '5 minutes'
      ) as sub
      WHERE distance <= $3
      ORDER BY distance ASC;
    `;
    return pool.query(query, [latitude, longitude, radiusInKm]);
  }

  static async getDriverLocation(driverId) {
    const query = `
      SELECT
        l.latitude,
        l.longitude,
        l.heading,
        l.updated_at
      FROM user_locations l
      JOIN users u ON l.user_id = u.id
      WHERE u.role = 'DRIVER' AND u.id = $1
    `;
    return pool.query(query, [driverId]);
  }
}

module.exports = Location;
