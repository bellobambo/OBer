const Hotspot = require("../models/hotspotModel");
const Realtime = require("../realtime");
const { sendError, sendSuccess } = require("../utils/response");

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

function serializeGroup(group) {
  const serialized = {
    placeName: group.place_name,
    coordinates: [Number(group.longitude), Number(group.latitude)],
    passengerCount: Number(group.passenger_count),
  };

  if (group.distance !== undefined) {
    serialized.distance = Number(Number(group.distance).toFixed(3));
  }

  return serialized;
}

async function armHotspot(req, res) {
  const { placeName, coordinates } = req.body;
  const userId = req.user.id;

  if (!placeName || !Array.isArray(coordinates) || coordinates.length !== 2) {
    return sendError(res, 400, "placeName and coordinates [longitude, latitude] are required.");
  }

  const longitude = Number(coordinates[0]);
  const latitude = Number(coordinates[1]);

  if (!String(placeName).trim() || !isValidCoordinate(longitude, latitude)) {
    return sendError(res, 400, "A valid placeName and coordinates [longitude, latitude] are required.");
  }

  try {
    const result = await Hotspot.arm(userId, String(placeName).trim(), longitude, latitude);
    const row = result.rows[0];
    const replacedHotspots = row.replaced_hotspots || [];
    const hotspot = { ...row };
    delete hotspot.replaced_hotspots;

    await Promise.allSettled([
      Realtime.emitHotspotGroup(hotspot.place_name, hotspot.longitude, hotspot.latitude),
      ...replacedHotspots.map((replaced) =>
        Realtime.emitHotspotGroup(replaced.place_name, replaced.longitude, replaced.latitude)
      ),
    ]);

    return sendSuccess(res, 201, "Hotspot armed successfully.", {
      hotspotId: hotspot.id,
      hotspot,
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

    const hotspot = result.rows[0];
    Realtime.emitHotspotGroup(
      hotspot.place_name,
      hotspot.longitude,
      hotspot.latitude
    ).catch((error) => {
      console.error("Unable to broadcast disarmed hotspot:", error.message);
    });

    return sendSuccess(res, 200, "Hotspot disarmed successfully.", {
      hotspot,
    });
  } catch (error) {
    return sendError(res, 500, "Unable to disarm hotspot.", error.message);
  }
}

async function getActiveHotspots(req, res) {
  const hasLatitude = req.query.latitude !== undefined;
  const hasLongitude = req.query.longitude !== undefined;
  const hasLocationFilter = hasLatitude || hasLongitude;

  if (hasLatitude !== hasLongitude) {
    return sendError(
      res,
      400,
      "Both latitude and longitude are required when filtering active hotspots by distance."
    );
  }

  const latitude = hasLocationFilter ? Number(req.query.latitude) : undefined;
  const longitude = hasLocationFilter ? Number(req.query.longitude) : undefined;
  const radius = req.query.radius === undefined ? 5 : Number(req.query.radius);

  if (hasLocationFilter && !isValidCoordinate(longitude, latitude)) {
    return sendError(res, 400, "Valid latitude and longitude are required.");
  }

  if (!Number.isFinite(radius) || radius <= 0 || radius > 50) {
    return sendError(res, 400, "radius must be greater than 0 and no more than 50 kilometres.");
  }

  try {
    const result = await Hotspot.getActiveGroups(latitude, longitude, radius);
    return sendSuccess(res, 200, "Active hotspots retrieved successfully.", {
      hotspots: result.rows.map(serializeGroup),
      ...(hasLocationFilter
        ? {
            searchArea: {
              latitude,
              longitude,
              radius,
              unit: "kilometres",
            },
          }
        : {}),
    });
  } catch (error) {
    return sendError(res, 500, "Unable to get active hotspots.", error.message);
  }
}

module.exports = {
  armHotspot,
  disarmHotspot,
  getActiveHotspots,
  serializeGroup,
};
