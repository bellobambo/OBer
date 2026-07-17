const supabase = require("../db");

async function create(client, driver) {
  const { data, error } = await supabase
    .from('drivers')
    .insert({
      user_id: driver.userId,
      driver_code: driver.driverCode,
      vehicle_id: driver.vehicleId ? driver.vehicleId.toUpperCase() : null,
      vehicle_type: driver.vehicleType || null,
      license_number: driver.licenseNumber ? driver.licenseNumber.toUpperCase() : null,
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
  const {
    page = 1,
    perPage = 10,
    status = null,
    search = null,
    sort = "newest",
  } = options;

  const ascending = sort === "oldest";
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  // Shared select columns (used by both count and data queries)
  const selectColumns = `
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
  `;

  // --- Helper to apply shared filters to a query builder ---
  function applyFilters(query) {
    let q = query.eq('users.role', 'DRIVER');

    if (status) {
      q = q.eq('onboarding_status', status);
    }

    if (search) {
      // Escape PostgREST-reserved characters (backslash, double-quote) and
      // wrap values in double-quotes so commas, dots, parentheses etc. inside
      // user input don't break the .or() filter string.
      const escaped = search.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      const s = `"%${escaped}%"`;
      q = q.or(`driver_code.ilike.${s},vehicle_id.ilike.${s},users.full_name.ilike.${s},users.email.ilike.${s},users.phone.ilike.${s}`);
    }

    return q;
  }

  // --- 1. Count query (no row data transferred) ---
  let countQuery = supabase
    .from('drivers')
    .select(selectColumns, { count: 'exact', head: true });
  countQuery = applyFilters(countQuery);

  const { count: totalCount, error: countError } = await countQuery;
  if (countError) throw countError;

  const safeTotal = totalCount || 0;
  const totalPages = Math.ceil(safeTotal / perPage) || 1;

  // --- 2. Data query (fetch only the requested page) ---
  let dataQuery = supabase
    .from('drivers')
    .select(selectColumns)
    .order('created_at', { ascending });
  dataQuery = applyFilters(dataQuery);
  dataQuery = dataQuery.range(from, to);

  const { data, error: dataError } = await dataQuery;
  if (dataError) throw dataError;

  const flattened = (data || []).map(({ users, ...d }) => ({
    ...d,
    full_name: users?.full_name,
    email: users?.email,
    phone: users?.phone,
    phone_verified: users?.phone_verified,
    is_on_duty: users?.user_locations && users.user_locations.length > 0 ? users.user_locations[0].is_visible : false
  }));

  return {
    rows: flattened,
    totalCount: safeTotal,
    totalPages,
    currentPage: page,
  };
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
