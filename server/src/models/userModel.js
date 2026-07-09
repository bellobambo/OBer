const supabase = require("../db");

function toResponse(user) {
  return {
    id: user.id,
    role: user.role,
    fullName: user.full_name,
    email: user.email,
    phone: user.phone,
    phoneVerified: user.phone_verified,
    locationTrackingEnabled: user.location_tracking_enabled,
    createdAt: user.created_at,
  };
}

async function create(client, user) {
  const { data, error } = await supabase
    .from('users')
    .insert({
      role: user.role,
      full_name: user.fullName || null,
      email: user.email,
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
    .select('id, role, email, phone, password_hash, full_name, phone_verified, password_reset_code, password_reset_expires_at, created_at, drivers!left(driver_code)')
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
        .select('id, role, email, phone, password_hash, full_name, phone_verified, password_reset_code, password_reset_expires_at, created_at, drivers!left(driver_code)')
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
    .select('id, role, full_name, email, phone, phone_verified, location_tracking_enabled, created_at')
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
  setPasswordResetCode,
  toResponse,
  updateLocationPreference,
  updatePassword,
  updatePhoneVerificationCode,
  verifyPhone,
};
