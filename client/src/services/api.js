const API_BASE = import.meta.env.VITE_API_URL || "";

export class ApiError extends Error {
  constructor(message, { status, response } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.response = response;
    this.errors = Array.isArray(response?.errors) ? response.errors : [];
  }
}

function getBackendMessage(response, fallback, status) {
  if (
    status < 500 &&
    Array.isArray(response?.errors) &&
    response.errors.length > 0
  ) {
    return response.errors.filter(Boolean).join(" ");
  }

  return response?.message || response?.error || fallback;
}

function redirectToLogin() {
  localStorage.removeItem("token");
  window.location.replace("/login");
}

function getAuthToken() {
  const token = localStorage.getItem("token");

  if (!token) {
    redirectToLogin();
    throw new ApiError("No authentication token found", { status: 401 });
  }

  return token;
}

async function apiRequest(path, options = {}) {
  const { auth = false, fallback = "Request failed", headers, ...fetchOptions } = options;
  const requestHeaders = { ...headers };

  if (fetchOptions.body !== undefined) {
    requestHeaders["Content-Type"] = "application/json";
  }

  if (auth) {
    requestHeaders.Authorization = `Bearer ${getAuthToken()}`;
  }

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...fetchOptions,
      headers: requestHeaders,
    });
  } catch (error) {
    throw new ApiError(error.message || "Unable to reach the server.");
  }

  const response = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message = getBackendMessage(response, fallback, res.status);
    if (
      res.status === 401 &&
      ["Invalid or expired token.", "Bearer token is required."].includes(response?.message)
    ) {
      redirectToLogin();
    }
    throw new ApiError(message, { status: res.status, response });
  }

  return response;
}

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

export function registerPassenger(data) {
  return apiRequest("/api/register", {
    method: "POST",
    body: JSON.stringify({ role: "PASSENGER", ...data }),
    fallback: "Passenger registration failed",
  });
}

export function registerDriver(data) {
  return apiRequest("/api/register", {
    method: "POST",
    body: JSON.stringify({ role: "DRIVER", ...data }),
    fallback: "Driver registration failed",
  });
}

export async function loginPassenger(phone, password) {
  const response = await apiRequest("/api/login", {
    method: "POST",
    body: JSON.stringify({ phone, password }),
    fallback: "Passenger login failed",
  });
  if (response.data?.user?.role !== "PASSENGER") {
    throw new ApiError("Please use the driver login page for this account.", {
      status: 403,
      response,
    });
  }
  return response;
}

export async function loginDriver(driverId, password) {
  const response = await apiRequest("/api/login", {
    method: "POST",
    body: JSON.stringify({ driver_id: driverId, password }),
    fallback: "Driver login failed",
  });
  if (response.data?.user?.role !== "DRIVER") {
    throw new ApiError("Please use the passenger login page for this account.", {
      status: 403,
      response,
    });
  }
  return response;
}

export function verifyPhone(phone, code) {
  return apiRequest("/api/register/verify-phone", {
    method: "POST",
    body: JSON.stringify({ phone, code }),
    fallback: "Phone verification failed",
  });
}

export function resendVerificationCode(phone) {
  return apiRequest("/api/register/resend-verification", {
    method: "POST",
    body: JSON.stringify({ phone }),
    fallback: "Unable to resend verification code",
  });
}

export function requestPasswordReset(phone) {
  return apiRequest("/api/password-reset/request", {
    method: "POST",
    body: JSON.stringify({ phone }),
    fallback: "Unable to request a password reset",
  });
}

export function confirmPasswordReset(phone, code, password) {
  return apiRequest("/api/password-reset/confirm", {
    method: "POST",
    body: JSON.stringify({ phone, code, password }),
    fallback: "Unable to reset password",
  });
}

export async function fetchUserProfile() {
  const response = await apiRequest("/api/me", {
    auth: true,
    fallback: "Unable to load your profile",
  });
  return response.data?.user ?? null;
}

export function updateUserProfile(data) {
  return apiRequest("/api/me", {
    method: "PUT",
    auth: true,
    body: JSON.stringify(data),
    fallback: "Unable to update your profile",
  });
}

export function updateLocationPreference(allowLocation, coordinates) {
  return apiRequest("/api/user/location-preference", {
    method: "POST",
    auth: true,
    body: JSON.stringify({ allowLocation, coordinates }),
    fallback: "Unable to save your location preference",
  });
}

export function updateLocation(latitude, longitude, heading) {
  return apiRequest("/api/location", {
    method: "PUT",
    auth: true,
    body: JSON.stringify({ latitude, longitude, heading }),
    fallback: "Unable to update your location",
  });
}

export function updateDriverVisibility(isVisible, latitude, longitude, heading) {
  return apiRequest("/api/location/visibility", {
    method: "PUT",
    auth: true,
    body: JSON.stringify({ isVisible, latitude, longitude, heading }),
    fallback: "Unable to update driver visibility",
  });
}

export function getNearbyDrivers(latitude, longitude, radius = 5) {
  return apiRequest(
    `/api/location/nearby-drivers${queryString({ latitude, longitude, radius })}`,
    { auth: true, fallback: "Unable to load nearby drivers" },
  );
}

export function getNearbyUsers(latitude, longitude, radius = 5) {
  return apiRequest(
    `/api/location/nearby-users${queryString({ latitude, longitude, radius })}`,
    { auth: true, fallback: "Unable to load nearby users" },
  );
}

export function getDriverLocation(driverId) {
  return apiRequest(`/api/location/driver/${encodeURIComponent(driverId)}`, {
    auth: true,
    fallback: "Unable to load driver location",
  });
}

export function getUserLocation(userId) {
  return apiRequest(`/api/location/user/${encodeURIComponent(userId)}`, {
    auth: true,
    fallback: "Unable to load user location",
  });
}

export function armHotspot(placeName, coordinates) {
  return apiRequest("/api/hotspot/arm", {
    method: "POST",
    auth: true,
    body: JSON.stringify({ placeName, coordinates }),
    fallback: "Unable to arm hotspot",
  });
}

export function disarmHotspot(hotspotId) {
  return apiRequest("/api/hotspot/disarm", {
    method: "POST",
    auth: true,
    body: JSON.stringify({ hotspotId }),
    fallback: "Unable to disarm hotspot",
  });
}

export function getActiveHotspots(latitude, longitude, radius) {
  return apiRequest(
    `/api/hotspots/active${queryString({ latitude, longitude, radius })}`,
    { auth: true, fallback: "Unable to load active hotspots" },
  );
}
