const Location = require("../models/locationModel");
const Realtime = require("../realtime");
const { sendError, sendSuccess } = require("../utils/response");

function toNumber(value) {
  if (value === undefined || value === null || value === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function isValidCoordinate(longitude, latitude) {
  return (
    Number.isFinite(longitude) &&
    Number.isFinite(latitude) &&
    longitude >= -180 &&
    longitude <= 180 &&
    latitude >= -90 &&
    latitude <= 90
  );
}

async function updateLocation(req, res) {
  const latitude = toNumber(req.body.latitude);
  const longitude = toNumber(req.body.longitude);
  const heading = toNumber(req.body.heading);
  const userId = req.user.id;

  if (!isValidCoordinate(longitude, latitude)) {
    return sendError(res, 400, "Valid latitude and longitude are required.");
  }

  try {
    const result = await Location.updateLocation(userId, latitude, longitude, heading);
    if (req.user.role === "DRIVER" && result.rows[0].is_visible) {
      Realtime.emitDriverLocation(result.rows[0]);
    }
    return sendSuccess(res, 200, "Location updated successfully.", {
      location: result.rows[0],
    });
  } catch (error) {
    return sendError(res, 500, "Unable to update location.", error.message);
  }
}

async function updateDriverVisibility(req, res) {
  const { isVisible, heading } = req.body;
  const latitude = toNumber(req.body.latitude);
  const longitude = toNumber(req.body.longitude);
  const userId = req.user.id;

  if (req.user.role !== "DRIVER") {
    return sendError(res, 403, "Only drivers can update map visibility.");
  }

  if (typeof isVisible !== "boolean") {
    return sendError(res, 400, "isVisible must be a boolean.");
  }

  if (isVisible && (latitude === undefined || longitude === undefined)) {
    return sendError(res, 400, "Latitude and longitude are required when enabling visibility.");
  }

  if (isVisible && !isValidCoordinate(longitude, latitude)) {
    return sendError(res, 400, "Valid latitude and longitude are required when enabling visibility.");
  }

  try {
    const result = await Location.updateDriverVisibility(
      userId,
      isVisible,
      latitude,
      longitude,
      heading
    );
    const location = result.rows[0] || {
      user_id: userId,
      is_visible: false,
    };

    Realtime.emitDriverVisibility(location);

    return sendSuccess(
      res,
      200,
      isVisible ? "Driver visibility enabled successfully." : "Driver visibility disabled successfully.",
      { location }
    );
  } catch (error) {
    return sendError(res, 500, "Unable to update driver visibility.", error.message);
  }
}

async function getNearbyDrivers(req, res) {
  const latitude = toNumber(req.query.latitude);
  const longitude = toNumber(req.query.longitude);
  const radius = req.query.radius === undefined ? 5 : toNumber(req.query.radius);

  if (!isValidCoordinate(longitude, latitude)) {
    return sendError(res, 400, "Valid latitude and longitude are required.");
  }

  if (radius === undefined || radius <= 0 || radius > 50) {
    return sendError(res, 400, "radius must be greater than 0 and no more than 50 kilometres.");
  }

  try {
    const result = await Location.getNearbyDrivers(latitude, longitude, radius);
    return sendSuccess(res, 200, "Nearby drivers retrieved successfully.", {
      drivers: result.rows,
    });
  } catch (error) {
    return sendError(res, 500, "Unable to get nearby drivers.", error.message);
  }
}

async function getDriverLocation(req, res) {
  const { driverId } = req.params;

  try {
    const result = await Location.getDriverLocation(driverId);
    if (result.rowCount === 0) {
      return sendError(res, 404, "Driver location not found.");
    }
    return sendSuccess(res, 200, "Driver location retrieved successfully.", {
      location: result.rows[0],
    });
  } catch (error) {
    return sendError(res, 500, "Unable to get driver location.", error.message);
  }
}

async function getUserLocation(req, res) {
  const { userId } = req.params;

  try {
    const result = await Location.getUserLocation(userId);
    if (result.rowCount === 0) {
      return sendError(res, 404, "User location not found.");
    }
    return sendSuccess(res, 200, "User location retrieved successfully.", {
      location: result.rows[0],
    });
  } catch (error) {
    return sendError(res, 500, "Unable to get user location.", error.message);
  }
}

async function getNearbyUsers(req, res) {
  const latitude = toNumber(req.query.latitude);
  const longitude = toNumber(req.query.longitude);
  const radius = req.query.radius === undefined ? 5 : toNumber(req.query.radius);

  if (!isValidCoordinate(longitude, latitude)) {
    return sendError(res, 400, "Valid latitude and longitude are required.");
  }

  if (radius === undefined || radius <= 0 || radius > 50) {
    return sendError(res, 400, "radius must be greater than 0 and no more than 50 kilometres.");
  }

  try {
    const result = await Location.getNearbyUsers(latitude, longitude, radius);
    return sendSuccess(res, 200, "Nearby users retrieved successfully.", {
      users: result.rows,
    });
  } catch (error) {
    return sendError(res, 500, "Unable to get nearby users.", error.message);
  }
}

module.exports = {
  updateDriverVisibility,
  updateLocation,
  getNearbyDrivers,
  getDriverLocation,
  getUserLocation,
  getNearbyUsers,
};
