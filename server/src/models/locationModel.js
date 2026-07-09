const supabase = require("../db");

class Location {
  static async updateLocation(userId, latitude, longitude, heading) {
    const { data, error } = await supabase
      .from('user_locations')
      .upsert({
        user_id: userId,
        latitude,
        longitude,
        heading,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })
      .select();
    if (error) throw error;
    return { rows: data || [], rowCount: data ? data.length : 0 };
  }

  static async updateDriverVisibility(userId, isVisible, latitude, longitude, heading) {
    if (!isVisible) {
      const { data, error } = await supabase
        .from('user_locations')
        .update({ is_visible: false, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .select();
      if (error) throw error;
      return { rows: data || [], rowCount: data ? data.length : 0 };
    }

    const { data, error } = await supabase
      .from('user_locations')
      .upsert({
        user_id: userId,
        latitude,
        longitude,
        heading,
        is_visible: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })
      .select();
    if (error) throw error;
    return { rows: data || [], rowCount: data ? data.length : 0 };
  }

  static async getNearbyDrivers(latitude, longitude, radiusInKm = 5) {
    const { data, error } = await supabase.rpc('get_nearby_drivers', {
      p_latitude: latitude,
      p_longitude: longitude,
      p_radius_in_km: radiusInKm
    });
    if (error) throw error;
    return { rows: data || [], rowCount: data ? data.length : 0 };
  }

  static async getDriverLocation(driverId) {
    const { data, error } = await supabase
      .from('user_locations')
      .select('latitude, longitude, heading, is_visible, updated_at, users!inner(role)')
      .eq('user_id', driverId)
      .eq('is_visible', true)
      .eq('users.role', 'DRIVER');
    if (error) throw error;
    return { rows: data || [], rowCount: data ? data.length : 0 };
  }

  static async getUserLocation(userId) {
    const { data, error } = await supabase
      .from('user_locations')
      .select('latitude, longitude, heading, is_visible, updated_at')
      .eq('user_id', userId);
    if (error) throw error;
    return { rows: data || [], rowCount: data ? data.length : 0 };
  }

  static async getNearbyUsers(latitude, longitude, radiusInKm = 5) {
    const { data, error } = await supabase.rpc('get_nearby_users', {
      p_latitude: latitude,
      p_longitude: longitude,
      p_radius_in_km: radiusInKm
    });
    if (error) throw error;
    return { rows: data || [], rowCount: data ? data.length : 0 };
  }
}

module.exports = Location;
