const { getField } = require("../utils/request");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function validateRegistration(body) {
  const data = {
    role: getField(body, "role").toUpperCase(),
    fullName: getField(body, "fullName", "full_name", "name"),
    email: getField(body, "email").toLowerCase(),
    phone: getField(body, "phone"),
    password: getField(body, "password"),
  };

  const errors = [];

  if (!data.role) {
    errors.push("role is required.");
  } else if (data.role !== "PASSENGER") {
    errors.push("Public registration is only available for passengers. Drivers must be onboarded by an admin.");
  }

  if (!data.email) {
    errors.push("email is required.");
  } else if (data.email && !EMAIL_PATTERN.test(data.email)) {
    errors.push("email must be a valid email address.");
  }

  if (!data.phone) errors.push("phone is required.");

  if (!data.password) {
    errors.push("password is required.");
  } else if (data.password.length < 8) {
    errors.push("password must be at least 8 characters long.");
  }

  return { data, errors };
}

function validatePhoneVerification(body) {
  const data = {
    phone: getField(body, "phone"),
    code: getField(body, "code"),
  };

  const errors = [];

  if (!data.phone) errors.push("phone is required.");
  if (!data.code) errors.push("code is required.");

  return { data, errors };
}

function validateLogin(body) {
  const data = {
    phone: getField(body, "phone"),
    email: getField(body, "email").toLowerCase(),
    driverId: getField(body, "driver_id"),
    password: getField(body, "password"),
  };

  const errors = [];

  if (data.driverId) {
    if (!data.phone) errors.push("phone is required for driver login.");
  } else {
    if (!data.phone && !data.email) errors.push("phone or email is required.");
    if (!data.password) errors.push("password is required.");
  }

  return { data, errors };
}

function validateProfileUpdate(body) {
  const data = {
    fullName: getField(body, "fullName", "full_name", "name"),
    email: getField(body, "email").toLowerCase(),
  };
  const errors = [];

  if (!data.fullName) errors.push("fullName is required.");
  if (!data.email) {
    errors.push("email is required.");
  } else if (!EMAIL_PATTERN.test(data.email)) {
    errors.push("email must be a valid email address.");
  }

  return { data, errors };
}

function validatePasswordResetRequest(body) {
  const data = {
    login: getField(body, "phone", "email", "driver_id"),
  };

  const errors = [];

  if (!data.login) errors.push("phone, email, or driver_id is required.");

  return { data, errors };
}

function validatePasswordReset(body) {
  const data = {
    login: getField(body, "phone", "email", "driver_id"),
    code: getField(body, "code"),
    password: getField(body, "password"),
  };

  const errors = [];

  if (!data.login) errors.push("phone, email, or driver_id is required.");
  if (!data.code) errors.push("code is required.");

  if (!data.password) {
    errors.push("password is required.");
  } else if (data.password.length < 8) {
    errors.push("password must be at least 8 characters long.");
  }

  return { data, errors };
}

function validateResendVerification(body) {
  const data = {
    phone: getField(body, "phone"),
  };

  const errors = [];

  if (!data.phone) errors.push("phone is required.");

  return { data, errors };
}

module.exports = {
  validateLogin,
  validatePasswordReset,
  validatePasswordResetRequest,
  validatePhoneVerification,
  validateProfileUpdate,
  validateRegistration,
  validateResendVerification,
};
