const supabase = require("../db");

function getDriverRecord(user) {
  return Array.isArray(user.drivers) ? user.drivers[0] : user.drivers;
}

function getOnboardingStatus(user) {
  return getDriverRecord(user)?.onboarding_status || null;
}

function toResponse(user) {
  const driver = getDriverRecord(user);

  return {
    id: user.id,
    role: user.role,
    fullName: user.full_name,
    email: user.email,
    phone: user.phone,
    phoneVerified: user.phone_verified,
    locationTrackingEnabled: user.location_tracking_enabled,
    createdAt: user.created_at,
    ...(user.role === "DRIVER" && {
      driverCode: driver?.driver_code || null,
      vehicleType: driver?.vehicle_type || null,
      vehicleId: driver?.vehicle_id || null,
      licenseNumber: driver?.license_number || null,
      accountStatus: driver?.onboarding_status || null,
    }),
  };
}

async function create(client, user) {
  const { data, error } = await supabase
    .from('users')
    .insert({
      role: user.role,
      full_name: user.fullName || null,
      email: user.email || null,
      phone: user.phone,
      password_hash: user.passwordHash,
      phone_verified: Boolean(user.phoneVerified),
      phone_verification_code: user.phoneVerificationCode,
      phone_verification_expires_at: user.phoneVerificationExpiresAt
    })
    .select('id, role, full_name, email, phone, phone_verified, created_at');

  if (error) throw error;
  return { rows: data || [], rowCount: data ? data.length : 0 };
}

async function findByLogin(login) {
  const search = login.toLowerCase();
  
  let { data, error } = await supabase
    .from('users')
    .select('id, role, email, phone, password_hash, full_name, phone_verified, password_reset_code, password_reset_expires_at, created_at, drivers!left(driver_code, vehicle_type, vehicle_id, license_number, onboarding_status)')
    .or(`email.eq.${search},phone.eq.${login}`);
    
  if (error) throw error;
  
  if (!data || data.length === 0) {
    const { data: driverData, error: driverErr } = await supabase
      .from('drivers')
      .select('user_id')
      .eq('driver_code', login)
      .limit(1);
    
    if (driverErr) throw driverErr;
    if (driverData && driverData.length > 0) {
      const { data: uData, error: uErr } = await supabase
        .from('users')
        .select('id, role, email, phone, password_hash, full_name, phone_verified, password_reset_code, password_reset_expires_at, created_at, drivers!left(driver_code, vehicle_type, vehicle_id, license_number, onboarding_status)')
        .eq('id', driverData[0].user_id);
      if (uErr) throw uErr;
      data = uData;
    }
  }

  return { rows: data || [], rowCount: data ? data.length : 0 };
}

async function findPublicById(id) {
  const { data, error } = await supabase
    .from('users')
    .select('id, role, full_name, email, phone, phone_verified, location_tracking_enabled, created_at, drivers!left(driver_code, vehicle_type, vehicle_id, license_number, onboarding_status)')
    .eq('id', id)
    .limit(1);
  if (error) throw error;
  return { rows: data || [], rowCount: data ? data.length : 0 };
}

async function verifyPhone(phone, code) {
  const { data: users, error: selectErr } = await supabase
    .from('users')
    .select('id')
    .eq('phone', phone)
    .eq('phone_verification_code', code)
    .gt('phone_verification_expires_at', new Date().toISOString());
    
  if (selectErr) throw selectErr;
  if (!users || users.length === 0) return { rows: [], rowCount: 0 };
  
  const { data, error } = await supabase
    .from('users')
    .update({
      phone_verified: true,
      phone_verification_code: null,
      phone_verification_expires_at: null
    })
    .eq('id', users[0].id)
    .select('id, role, full_name, email, phone, phone_verified, created_at');
    
  if (error) throw error;
  return { rows: data || [], rowCount: data ? data.length : 0 };
}

async function setPasswordResetCode(userId, resetCode, expiresAt) {
  const { data, error } = await supabase
    .from('users')
    .update({
      password_reset_code: resetCode,
      password_reset_expires_at: expiresAt
    })
    .eq('id', userId)
    .select();
  if (error) throw error;
  return { rows: data || [], rowCount: data ? data.length : 0 };
}

async function updatePassword(userId, passwordHash) {
  const { data, error } = await supabase
    .from('users')
    .update({
      password_hash: passwordHash,
      password_reset_code: null,
      password_reset_expires_at: null
    })
    .eq('id', userId)
    .select('id, role, full_name, email, phone, phone_verified, created_at');
  if (error) throw error;
  return { rows: data || [], rowCount: data ? data.length : 0 };
}

async function updateLocationPreference(userId, trackingEnabled) {
  const { data, error } = await supabase
    .from('users')
    .update({ location_tracking_enabled: trackingEnabled })
    .eq('id', userId)
    .select('id, role, full_name, email, phone, location_tracking_enabled, created_at');
  if (error) throw error;
  return { rows: data || [], rowCount: data ? data.length : 0 };
}

async function updateProfile(userId, profile) {
  const { data, error } = await supabase
    .from('users')
    .update({
      full_name: profile.fullName,
      email: profile.email,
    })
    .eq('id', userId)
    .select('id, role, full_name, email, phone, phone_verified, location_tracking_enabled, created_at');
  if (error) throw error;
  return { rows: data || [], rowCount: data ? data.length : 0 };
}

async function updatePhoneVerificationCode(userId, code, expiresAt) {
  const { data, error } = await supabase
    .from('users')
    .update({
      phone_verification_code: code,
      phone_verification_expires_at: expiresAt
    })
    .eq('id', userId)
    .select();
  if (error) throw error;
  return { rows: data || [], rowCount: data ? data.length : 0 };
}

module.exports = {
  create,
  findByLogin,
  findPublicById,
  getOnboardingStatus,
  setPasswordResetCode,
  toResponse,
  updateLocationPreference,
  updateProfile,
  updatePassword,
  updatePhoneVerificationCode,
  verifyPhone,
};
