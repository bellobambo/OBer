const supabase = require("../db");

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
    const { data, error } = await supabase.rpc('get_active_hotspot_groups', {
      p_latitude: latitude,
      p_longitude: longitude,
      p_radius_in_km: radiusInKm
    });
    if (error) throw error;
    return { rows: data || [], rowCount: data ? data.length : 0 };
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
