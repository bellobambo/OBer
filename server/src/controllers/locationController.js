const Location = require("../models/locationModel");
const { sendError, sendSuccess } = require("../utils/response");

function toNumber(value) {
  if (value === undefined || value === null || value === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

async function updateLocation(req, res) {
  const { latitude, longitude, heading } = req.body;
  const userId = req.user.id;

  if (latitude === undefined || longitude === undefined) {
    return sendError(res, 400, "Latitude and longitude are required.");
  }

  try {
    const result = await Location.updateLocation(userId, latitude, longitude, heading);
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
  const { latitude, longitude, radius } = req.query;

  if (latitude === undefined || longitude === undefined) {
    return sendError(res, 400, "Latitude and longitude are required.");
  }

  try {
    const result = await Location.getNearbyDrivers(latitude, longitude, radius || 5);
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

module.exports = {
  updateDriverVisibility,
  updateLocation,
  getNearbyDrivers,
  getDriverLocation,
};
