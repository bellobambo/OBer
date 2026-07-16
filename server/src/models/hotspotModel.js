const supabase = require("../db");

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function calculateDistanceInKm(latitudeA, longitudeA, latitudeB, longitudeB) {
  const earthRadiusInKm = 6371;
  const deltaLatitude = toRadians(latitudeB - latitudeA);
  const deltaLongitude = toRadians(longitudeB - longitudeA);
  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(toRadians(latitudeA)) *
      Math.cos(toRadians(latitudeB)) *
      Math.sin(deltaLongitude / 2) ** 2;

  return 2 * earthRadiusInKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

class Hotspot {
  static async arm(userId, placeName, longitude, latitude) {
    const { data: expiredData, error: err1 } = await supabase
      .from('hotspots')
      .update({ status: 'EXPIRED' })
      .eq('user_id', userId)
      .eq('status', 'ACTIVE')
      .lte('expires_at', new Date().toISOString())
      .select();
    if (err1) throw err1;

    const { data: disarmedData, error: err2 } = await supabase
      .from('hotspots')
      .update({ status: 'DISARMED' })
      .eq('user_id', userId)
      .eq('status', 'ACTIVE')
      .gt('expires_at', new Date().toISOString())
      .select();
    if (err2) throw err2;

    const replaced = [...(expiredData || []), ...(disarmedData || [])];

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('hotspots')
      .insert({
        user_id: userId,
        place_name: placeName,
        longitude,
        latitude,
        status: 'ACTIVE',
        expires_at: expiresAt
      })
      .select();
    
    if (error) throw error;
    const inserted = data[0];
    inserted.replaced_hotspots = replaced;
    
    return { rows: [inserted], rowCount: 1 };
  }

  static async disarm(hotspotId, userId) {
    const { data, error } = await supabase
      .from('hotspots')
      .update({ status: 'DISARMED' })
      .eq('id', hotspotId)
      .eq('user_id', userId)
      .eq('status', 'ACTIVE')
      .select();
    if (error) throw error;
    return { rows: data || [], rowCount: data ? data.length : 0 };
  }

  static async getActiveGroups(latitude, longitude, radiusInKm) {
    const { data, error } = await supabase
      .from("hotspots")
      .select("place_name, longitude, latitude")
      .eq("status", "ACTIVE")
      .gt("expires_at", new Date().toISOString());

    if (error) throw error;

    const groupedHotspots = new Map();

    for (const hotspot of data || []) {
      const normalizedPlaceName = String(hotspot.place_name || "").trim();
      const roundedLongitude = Number(Number(hotspot.longitude).toFixed(5));
      const roundedLatitude = Number(Number(hotspot.latitude).toFixed(5));
      const groupKey = `${normalizedPlaceName.toLowerCase()}|${roundedLongitude}|${roundedLatitude}`;

      if (!groupedHotspots.has(groupKey)) {
        groupedHotspots.set(groupKey, {
          place_name: normalizedPlaceName,
          longitude: roundedLongitude,
          latitude: roundedLatitude,
          passenger_count: 0,
        });
      }

      groupedHotspots.get(groupKey).passenger_count += 1;
    }

    let rows = Array.from(groupedHotspots.values());

    if (
      Number.isFinite(latitude) &&
      Number.isFinite(longitude) &&
      Number.isFinite(radiusInKm)
    ) {
      rows = rows
        .map((row) => ({
          ...row,
          distance: calculateDistanceInKm(
            latitude,
            longitude,
            row.latitude,
            row.longitude,
          ),
        }))
        .filter((row) => row.distance <= radiusInKm)
        .sort((a, b) => {
          if (a.distance !== b.distance) return a.distance - b.distance;
          if (b.passenger_count !== a.passenger_count) {
            return b.passenger_count - a.passenger_count;
          }
          return a.place_name.localeCompare(b.place_name);
        });
    } else {
      rows.sort((a, b) => {
        if (b.passenger_count !== a.passenger_count) {
          return b.passenger_count - a.passenger_count;
        }
        return a.place_name.localeCompare(b.place_name);
      });
    }

    return { rows, rowCount: rows.length };
  }

  static async getActiveGroup(placeName, longitude, latitude) {
    const { data, error } = await supabase
      .from('hotspots')
      .select('place_name, longitude, latitude')
      .eq('status', 'ACTIVE')
      .gt('expires_at', new Date().toISOString())
      .ilike('place_name', placeName);
      
    if (error) throw error;
    
    const roundedLon = Number(longitude).toFixed(5);
    const roundedLat = Number(latitude).toFixed(5);
    
    let count = 0;
    let actualPlaceName = placeName;
    
    for (const h of (data || [])) {
      if (Number(h.longitude).toFixed(5) === roundedLon && Number(h.latitude).toFixed(5) === roundedLat) {
        if (count === 0) actualPlaceName = h.place_name.trim();
        count++;
      }
    }
    
    if (count > 0) {
      return { rows: [{ place_name: actualPlaceName, longitude, latitude, passenger_count: count }], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }

  static async expireActive() {
    const { data, error } = await supabase
      .from('hotspots')
      .update({ status: 'EXPIRED' })
      .eq('status', 'ACTIVE')
      .lte('expires_at', new Date().toISOString())
      .select('place_name, longitude, latitude');
    if (error) throw error;
    return { rows: data || [], rowCount: data ? data.length : 0 };
  }
}

module.exports = Hotspot;
