const { getField } = require("../utils/request");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_ROLES = new Set(["PASSENGER", "DRIVER"]);

function validateRegistration(body) {
  const data = {
    role: getField(body, "role").toUpperCase(),
    email: getField(body, "email").toLowerCase(),
    phone: getField(body, "phone"),
    password: getField(body, "password"),
    driverCode: getField(body, "driverCode"),
  };

  const errors = [];

  if (!data.role) {
    errors.push("role is required.");
  } else if (!VALID_ROLES.has(data.role)) {
    errors.push("role must be either PASSENGER or DRIVER.");
  }

  if (!data.email) {
    errors.push("email is required.");
  } else if (!EMAIL_PATTERN.test(data.email)) {
    errors.push("email must be a valid email address.");
  }

  if (!data.phone) errors.push("phone is required.");

  if (!data.password) {
    errors.push("password is required.");
  } else if (data.password.length < 8) {
    errors.push("password must be at least 8 characters long.");
  }

  if (data.role === "DRIVER" && !data.driverCode) {
    errors.push("driverCode is required when role is DRIVER.");
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
    login: getField(body, "phone", "email", "driver_id"),
    password: getField(body, "password"),
  };

  const errors = [];

  if (!data.login) errors.push("phone, email, or driver_id is required.");
  if (!data.password) errors.push("password is required.");

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
  validateRegistration,
  validateResendVerification,
};
