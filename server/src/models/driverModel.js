const supabase = require("../db");

async function create(client, driver) {
  const { data, error } = await supabase
    .from('drivers')
    .insert({
      user_id: driver.userId,
      driver_code: driver.driverCode,
      vehicle_id: driver.vehicleId || null,
      vehicle_type: driver.vehicleType || null,
      license_number: driver.licenseNumber || null,
      onboarding_status: driver.onboardingStatus || "ACTIVE"
    })
    .select('id, user_id, driver_code, vehicle_id, vehicle_type, license_number, onboarding_status, created_at');
  if (error) throw error;
  return { rows: data || [], rowCount: data ? data.length : 0 };
}

function toAdminResponse(row) {
  return {
    id: row.id,
    userId: row.user_id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    phoneVerified: row.phone_verified,
    driverCode: row.driver_code,
    vehicleId: row.vehicle_id,
    vehicleType: row.vehicle_type,
    licenseNumber: row.license_number,
    onboardingStatus: row.onboarding_status,
    isOnDuty: Boolean(row.is_on_duty),
    createdAt: row.created_at,
  };
}

async function listAdmin(client, options = {}) {
  let query = supabase
    .from('drivers')
    .select(`
      id,
      user_id,
      driver_code,
      vehicle_id,
      vehicle_type,
      license_number,
      onboarding_status,
      created_at,
      users!inner(
        full_name, email, phone, phone_verified, role,
        user_locations!left(is_visible)
      )
    `)
    .eq('users.role', 'DRIVER')
    .order('created_at', { ascending: false });

  if (options.search) {
    const s = `%${options.search}%`;
    query = query.or(`driver_code.ilike.${s},vehicle_id.ilike.${s},users.full_name.ilike.${s},users.email.ilike.${s},users.phone.ilike.${s}`);
  }

  const { data, error } = await query;
  if (error) throw error;

  const flattened = (data || []).map(d => ({
    ...d,
    full_name: d.users?.full_name,
    email: d.users?.email,
    phone: d.users?.phone,
    phone_verified: d.users?.phone_verified,
    is_on_duty: d.users?.user_locations && d.users.user_locations.length > 0 ? d.users.user_locations[0].is_visible : false
  }));

  return { rows: flattened, rowCount: flattened.length };
}

async function getAdminStats(client) {
  const { data, error } = await supabase
    .from('drivers')
    .select(`
      id,
      onboarding_status,
      vehicle_type,
      users!inner(
        role,
        user_locations!left(is_visible)
      )
    `)
    .eq('users.role', 'DRIVER');
    
  if (error) throw error;

  let total_drivers = 0;
  let drivers_on_duty = 0;
  let active_drivers = 0;
  let suspended_drivers = 0;
  let total_bus_drivers = 0;
  let total_tricycle_drivers = 0;

  for (const d of (data || [])) {
    total_drivers++;
    if (d.users?.user_locations && d.users.user_locations.length > 0 && d.users.user_locations[0].is_visible) drivers_on_duty++;
    if (d.onboarding_status === 'ACTIVE') active_drivers++;
    if (d.onboarding_status === 'SUSPENDED') suspended_drivers++;
    if (d.vehicle_type === 'BUS') total_bus_drivers++;
    if (d.vehicle_type === 'TRICYCLE') total_tricycle_drivers++;
  }

  return {
    rows: [{
      total_drivers,
      drivers_on_duty,
      active_drivers,
      suspended_drivers,
      total_bus_drivers,
      total_tricycle_drivers,
    }],
    rowCount: 1,
  };
}

async function findByCode(client, driverCode) {
  const { data, error } = await supabase
    .from('drivers')
    .select('id, driver_code')
    .eq('driver_code', driverCode)
    .limit(1);
  if (error) throw error;
  return { rows: data || [], rowCount: data ? data.length : 0 };
}

async function updateStatus(client, driverId, onboardingStatus) {
  const { data, error } = await supabase
    .from('drivers')
    .update({ onboarding_status: onboardingStatus })
    .eq('id', driverId)
    .select('id, user_id, driver_code, vehicle_id, vehicle_type, license_number, onboarding_status, created_at');

  if (error) throw error;

  if (onboardingStatus === 'SUSPENDED' && data?.[0]?.user_id) {
    const { error: visibilityError } = await supabase
      .from('user_locations')
      .update({ is_visible: false })
      .eq('user_id', data[0].user_id);

    if (visibilityError) throw visibilityError;
  }

  return { rows: data || [], rowCount: data ? data.length : 0 };
}

module.exports = {
  create,
  findByCode,
  getAdminStats,
  listAdmin,
  toAdminResponse,
  updateStatus,
};
