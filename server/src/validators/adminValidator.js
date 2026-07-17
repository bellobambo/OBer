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

const SORT_VALUES = new Set(["newest", "oldest"]);

function validateListDriversQuery(query) {
  const errors = [];

  // per_page: integer, default 10, clamped 1–100
  let perPage = parseInt(query.per_page, 10);
  if (Number.isNaN(perPage) || perPage < 1) {
    perPage = 10;
  } else if (perPage > 100) {
    perPage = 100;
  }

  // page: integer, default 1, minimum 1
  let page = parseInt(query.page, 10);
  if (Number.isNaN(page) || page < 1) {
    page = 1;
  }

  // status: must be ACTIVE or SUSPENDED if provided
  let status = query.status ? query.status.toUpperCase().trim() : null;
  if (status && !ONBOARDING_STATUSES.has(status)) {
    errors.push("status must be ACTIVE or SUSPENDED.");
    status = null;
  }

  // search: trimmed string or null
  const search = query.search ? query.search.trim() : null;

  // sort: "newest" (default) or "oldest"
  let sort = query.sort ? query.sort.toLowerCase().trim() : "newest";
  if (!SORT_VALUES.has(sort)) {
    sort = "newest";
  }

  return {
    data: { perPage, page, status, search, sort },
    errors,
  };
}

module.exports = {
  validateDriverOnboarding,
  validateListDriversQuery,
};
