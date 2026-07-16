import { apiRequest } from "./api";

function queryString(params) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });
  const value = query.toString();
  return value ? `?${value}` : "";
}

/**
 * Validates admin access and returns the admin user profile
 */
export async function getAdminProfile() {
  const response = await apiRequest("/api/admin/me", {
    auth: true,
    fallback: "Unable to load admin profile",
  });
  return response.data?.admin ?? null;
}

/**
 * Fetches admin dashboard statistics
 */
export async function getDriverStats() {
  const response = await apiRequest("/api/admin/drivers/stats", {
    auth: true,
    fallback: "Unable to load fleet statistics",
  });
  return response.data ?? null;
}

/**
 * Fetches the list of all drivers with optional filtering and pagination
 */
export async function getFleet(filters = {}) {
  const response = await apiRequest(`/api/admin/drivers${queryString(filters)}`, {
    auth: true,
    fallback: "Unable to load fleet",
  });
  return {
    drivers: response.data?.drivers ?? response.data ?? [],
    pagination: response.data?.pagination ?? { currentPage: 1, totalPages: 1 }
  };
}

/**
 * Onboards a new driver to the platform
 */
export async function onboardDriver(driverData) {
  return apiRequest("/api/admin/drivers", {
    method: "POST",
    auth: true,
    body: JSON.stringify(driverData),
    fallback: "Unable to onboard driver",
  });
}

export async function suspendDriver(driverId) {
  return apiRequest(`/api/admin/drivers/${encodeURIComponent(driverId)}/suspend`, {
    method: "PATCH",
    auth: true,
    fallback: "Unable to suspend driver",
  });
}

export async function reactivateDriver(driverId) {
  return apiRequest(`/api/admin/drivers/${encodeURIComponent(driverId)}/reactivate`, {
    method: "PATCH",
    auth: true,
    fallback: "Unable to reactivate driver",
  });
}
