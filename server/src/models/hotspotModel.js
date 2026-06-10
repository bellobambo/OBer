const pool = require("../db");

class Hotspot {
  static async arm(userId, placeName, longitude, latitude) {
    const query = `
      INSERT INTO hotspots (user_id, place_name, longitude, latitude, status, expires_at)
      VALUES ($1, $2, $3, $4, 'ACTIVE', NOW() + INTERVAL '5 minutes')
      RETURNING *;
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
}

module.exports = Hotspot;
