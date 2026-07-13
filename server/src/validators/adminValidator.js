const { getField } = require("../utils/request");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ONBOARDING_STATUSES = new Set(["ACTIVE", "SUSPENDED"]);
const VEHICLE_TYPES = new Set(["BUS", "TRICYCLE"]);

function normalizeStatus(value) {
  return value ? value.toUpperCase() : "";
}

function validateDriverOnboarding(body) {
  const onboardingStatus = normalizeStatus(getField(body, "onboardingStatus", "onboarding_status"));
  const vehicleType = normalizeStatus(getField(body, "vehicleType", "vehicle_type"));

  const data = {
    fullName: getField(body, "fullName", "full_name", "name"),
    email: getField(body, "email").toLowerCase(),
    phone: getField(body, "phone"),
    password: getField(body, "password", "pin"),
    vehicleId: getField(body, "vehicleId", "vehicle_id"),
    vehicleType,
    licenseNumber: getField(body, "licenseNumber", "license_number", "licenceNumber", "licence_number"),
    onboardingStatus,
  };

  const errors = [];

  if (!data.fullName) errors.push("fullName is required.");

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

  if (!data.vehicleId) errors.push("vehicleId is required.");

  if (!data.vehicleType) {
    errors.push("vehicleType is required.");
  } else if (!VEHICLE_TYPES.has(data.vehicleType)) {
    errors.push("vehicleType must be BUS or TRICYCLE.");
  }

  if (data.onboardingStatus && !ONBOARDING_STATUSES.has(data.onboardingStatus)) {
    errors.push("onboardingStatus must be ACTIVE or SUSPENDED.");
  }

  if (!data.onboardingStatus) {
    data.onboardingStatus = "ACTIVE";
  }

  return { data, errors };
}

module.exports = {
  validateDriverOnboarding,
};
