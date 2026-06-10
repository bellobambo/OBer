const User = require("../models/userModel");
const Location = require("../models/locationModel");
const { sendError, sendSuccess } = require("../utils/response");

async function updateLocationPreference(req, res) {
  const { allowLocation, coordinates } = req.body;
  const userId = req.user.id;

  if (allowLocation === undefined) {
    return sendError(res, 400, "allowLocation is required.");
  }

  try {
    const userResult = await User.updateLocationPreference(userId, Boolean(allowLocation));

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
