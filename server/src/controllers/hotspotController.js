const Hotspot = require("../models/hotspotModel");
const { sendError, sendSuccess } = require("../utils/response");

async function armHotspot(req, res) {
  const { placeName, coordinates } = req.body;
  const userId = req.user.id;

  if (!placeName || !Array.isArray(coordinates) || coordinates.length !== 2) {
    return sendError(res, 400, "placeName and coordinates [longitude, latitude] are required.");
  }

  const [longitude, latitude] = coordinates;

  try {
    const result = await Hotspot.arm(userId, placeName, longitude, latitude);
    return sendSuccess(res, 201, "Hotspot armed successfully.", {
      hotspotId: result.rows[0].id,
      hotspot: result.rows[0],
    });
  } catch (error) {
    return sendError(res, 500, "Unable to arm hotspot.", error.message);
  }
}

async function disarmHotspot(req, res) {
  const { hotspotId } = req.body;
  const userId = req.user.id;

  if (!hotspotId) {
    return sendError(res, 400, "hotspotId is required.");
  }

  try {
    const result = await Hotspot.disarm(hotspotId, userId);
    
    if (result.rowCount === 0) {
      return sendError(res, 404, "Active hotspot not found or you don't have permission to disarm it.");
    }

    return sendSuccess(res, 200, "Hotspot disarmed successfully.", {
      hotspot: result.rows[0],
    });
  } catch (error) {
    return sendError(res, 500, "Unable to disarm hotspot.", error.message);
  }
}

module.exports = {
  armHotspot,
  disarmHotspot,
};
