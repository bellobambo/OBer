async function create(client, driver) {
  return client.query(
    `INSERT INTO drivers (
      user_id,
      driver_code,
      vehicle_id,
      vehicle_type,
      license_number,
      onboarding_status
     )
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, user_id, driver_code, vehicle_id, vehicle_type, license_number,
       onboarding_status, created_at`,
    [
      driver.userId,
      driver.driverCode,
      driver.vehicleId || null,
      driver.vehicleType || null,
      driver.licenseNumber || null,
      driver.onboardingStatus || "PENDING",
    ]
  );
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
  const search = options.search ? `%${String(options.search).toLowerCase()}%` : null;

  return client.query(
    `SELECT
       drivers.id,
       drivers.user_id,
       users.full_name,
       users.email,
       users.phone,
       users.phone_verified,
       drivers.driver_code,
       drivers.vehicle_id,
       drivers.vehicle_type,
       drivers.license_number,
       drivers.onboarding_status,
       drivers.created_at,
       COALESCE(user_locations.is_visible, FALSE) AS is_on_duty
     FROM drivers
     INNER JOIN users ON users.id = drivers.user_id
     LEFT JOIN user_locations ON user_locations.user_id = users.id
     WHERE users.role = 'DRIVER'
       AND (
         $1::TEXT IS NULL
         OR LOWER(COALESCE(users.full_name, '')) LIKE $1
         OR LOWER(users.email) LIKE $1
         OR users.phone LIKE $1
         OR LOWER(drivers.driver_code) LIKE $1
         OR LOWER(COALESCE(drivers.vehicle_id, '')) LIKE $1
       )
     ORDER BY drivers.created_at DESC`,
    [search]
  );
}

async function getAdminStats(client) {
  return client.query(
    `SELECT
       COUNT(*)::INT AS total_drivers,
       COUNT(*) FILTER (WHERE COALESCE(user_locations.is_visible, FALSE))::INT AS drivers_on_duty,
       COUNT(*) FILTER (WHERE drivers.onboarding_status = 'COMPLETE')::INT AS ready_drivers,
       COUNT(*) FILTER (WHERE drivers.vehicle_type = 'BUS')::INT AS total_bus_drivers,
       COUNT(*) FILTER (WHERE drivers.vehicle_type = 'TRICYCLE')::INT AS total_tricycle_drivers
     FROM users
     INNER JOIN drivers ON drivers.user_id = users.id
     LEFT JOIN user_locations ON user_locations.user_id = users.id
     WHERE users.role = 'DRIVER'`
  );
}

async function findByCode(client, driverCode) {
  return client.query(
    `SELECT id, driver_code
     FROM drivers
     WHERE driver_code = $1
     LIMIT 1`,
    [driverCode]
  );
}

module.exports = {
  create,
  findByCode,
  getAdminStats,
  listAdmin,
  toAdminResponse,
};
