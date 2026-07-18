const supabase = require("../db");

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function haversineDistanceInKm(fromLatitude, fromLongitude, toLatitude, toLongitude) {
  const earthRadiusInKm = 6371;
  const latitudeDelta = toRadians(toLatitude - fromLatitude);
  const longitudeDelta = toRadians(toLongitude - fromLongitude);
  const originLatitude = toRadians(fromLatitude);
  const targetLatitude = toRadians(toLatitude);

  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(originLatitude) *
      Math.cos(targetLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return earthRadiusInKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getRecentThresholdIso() {
  return new Date(Date.now() - 5 * 60 * 1000).toISOString();
}

function normalizeSingleRelation(value) {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

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
    const { data, error } = await supabase
      .from("user_locations")
      .select(`
        latitude,
        longitude,
        heading,
        is_visible,
        updated_at,
        users!inner(
          id,
          full_name,
          phone,
          role,
          drivers!inner(
            driver_code,
            onboarding_status
          )
        )
      `)
      .eq("is_visible", true)
      .eq("users.role", "DRIVER")
      .gt("updated_at", getRecentThresholdIso());
    if (error) throw error;

    const rows = (data || [])
      .map((location) => {
        const driver = normalizeSingleRelation(location.users?.drivers);
        if (!driver || driver.onboarding_status !== "ACTIVE") return null;

        const distance = haversineDistanceInKm(
          latitude,
          longitude,
          Number(location.latitude),
          Number(location.longitude)
        );

        return {
          driver_id: location.users.id,
          full_name: location.users.full_name,
          phone: location.users.phone,
          driver_code: driver.driver_code,
          latitude: location.latitude,
          longitude: location.longitude,
          heading: location.heading,
          is_visible: location.is_visible,
          updated_at: location.updated_at,
          distance,
        };
      })
      .filter(Boolean)
      .filter((driver) => driver.distance <= radiusInKm)
      .sort((left, right) => left.distance - right.distance);

    return { rows, rowCount: rows.length };
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
    const { data, error } = await supabase
      .from("user_locations")
      .select(`
        latitude,
        longitude,
        heading,
        is_visible,
        updated_at,
        users!inner(
          id,
          role
        )
      `)
      .gt("updated_at", getRecentThresholdIso());
    if (error) throw error;

    const rows = (data || [])
      .map((location) => {
        const distance = haversineDistanceInKm(
          latitude,
          longitude,
          Number(location.latitude),
          Number(location.longitude)
        );

        return {
          user_id: location.users.id,
          role: location.users.role,
          latitude: location.latitude,
          longitude: location.longitude,
          heading: location.heading,
          is_visible: location.is_visible,
          updated_at: location.updated_at,
          distance,
        };
      })
      .filter((user) => user.distance <= radiusInKm)
      .sort((left, right) => left.distance - right.distance);

    return { rows, rowCount: rows.length };
  }
}

module.exports = Location;
