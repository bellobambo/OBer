const User = require("../models/userModel");
const Location = require("../models/locationModel");
const { sendError, sendSuccess } = require("../utils/response");

async function updateLocationPreference(req, res) {
  const { allowLocation, coordinates } = req.body;
  const userId = req.user.id;

  if (typeof allowLocation !== "boolean") {
    return sendError(res, 400, "allowLocation must be a boolean.");
  }

  if (allowLocation && coordinates !== undefined) {
    const longitude = Number(coordinates?.[0]);
    const latitude = Number(coordinates?.[1]);
    if (
      !Array.isArray(coordinates) ||
      coordinates.length !== 2 ||
      !Number.isFinite(longitude) ||
      !Number.isFinite(latitude) ||
      longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90
    ) {
      return sendError(res, 400, "coordinates must be valid [longitude, latitude] values.");
    }
  }

  try {
    const userResult = await User.updateLocationPreference(userId, allowLocation);

    if (allowLocation && Array.isArray(coordinates) && coordinates.length === 2) {
      const [longitude, latitude] = coordinates;
      await Location.updateLocation(userId, latitude, longitude, null);
    }

    return sendSuccess(res, 200, "Location preference updated.", {
      user: userResult.rows[0],
    });
  } catch (error) {
    return sendError(res, 500, "Unable to update location preference.", error.message);
  }
}

module.exports = {
  updateLocationPreference,
};
