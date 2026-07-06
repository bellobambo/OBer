const API_BASE = import.meta.env.VITE_API_URL || "";

export async function registerPassenger(data) {
  const res = await fetch(`${API_BASE}/api/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "PASSENGER", ...data }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || "Registration failed");
  }
  return res.json();
}

export async function registerDriver(data) {
  const res = await fetch(`${API_BASE}/api/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "DRIVER", ...data }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || "Registration failed");
  }
  return res.json();
}

export async function loginPassenger(phone, password) {
  const res = await fetch(`${API_BASE}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || "Login failed");
  }
  return res.json();
}

export async function fetchUserProfile() {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("No authentication token found");
  }

  const res = await fetch(`${API_BASE}/api/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const response = await res.json();

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || "Failed to fetch user profile");
  }

  return response?.data?.user ?? null;
}

export async function updateUserProfile(data) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_BASE}/api/me`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      err.error || err.message || "Failed to update user profile",
    );
  }
  return res.json();
}

export async function verifyPhone(phone, code) {
  const res = await fetch(`${API_BASE}/api/register/verify-phone`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, code }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || "Verification failed");
  }
  return res.json();
}

export async function loginDriver(driver_id, password) {
  const res = await fetch(`${API_BASE}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ driver_id, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || "Driver login failed");
  }
  return res.json();
}

export async function requestPasswordReset(phone) {
  const res = await fetch(`${API_BASE}/api/password-reset/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || "Request failed");
  }
  return res.json();
}

export async function confirmPasswordReset(phone, code, password) {
  const res = await fetch(`${API_BASE}/api/password-reset/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, code, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || "Reset failed");
  }
  return res.json();
}

export async function updateLocationPreference(allowLocation, coordinates) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_BASE}/api/user/location-preference`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ allowLocation, coordinates }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const detail = err.errors
      ? Array.isArray(err.errors)
        ? err.errors.join(", ")
        : err.errors
      : "";
    throw new Error(
      detail ||
        err.error ||
        err.message ||
        "Failed to save location preference",
    );
  }
  return res.json();
}

export async function armHotspot(placeName, coordinates) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_BASE}/api/hotspot/arm`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ placeName, coordinates }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const detail = err.errors
      ? Array.isArray(err.errors)
        ? err.errors.join(", ")
        : err.errors
      : "";
    throw new Error(
      detail || err.error || err.message || "Failed to arm hotspot",
    );
  }
  return res.json();
}

export async function disarmHotspot(hotspotId) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_BASE}/api/hotspot/disarm`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ hotspotId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const detail = err.errors
      ? Array.isArray(err.errors)
        ? err.errors.join(", ")
        : err.errors
      : "";
    throw new Error(
      detail || err.error || err.message || "Failed to disarm hotspot",
    );
  }
  return res.json();
}

export async function updateDriverVisibility(
  isVisible,
  latitude,
  longitude,
  heading,
) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_BASE}/api/location/visibility`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ isVisible, latitude, longitude, heading }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const detail = err.errors
      ? Array.isArray(err.errors)
        ? err.errors.join(", ")
        : err.errors
      : "";
    throw new Error(
      detail || err.error || err.message || "Failed to update visibility",
    );
  }
  return res.json();
}
