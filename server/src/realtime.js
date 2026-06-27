const { Server } = require("socket.io");
const Hotspot = require("./models/hotspotModel");
const Location = require("./models/locationModel");
const User = require("./models/userModel");
const { verifyAuthToken } = require("./utils/security");

let io;
let expiryInterval;

function serializeHotspotGroup(group) {
  return {
    placeName: group.place_name,
    coordinates: [Number(group.longitude), Number(group.latitude)],
    passengerCount: Number(group.passenger_count),
  };
}

function serializeDriverLocation(location) {
  return {
    driverId: String(location.user_id),
    latitude:
      location.latitude === undefined || location.latitude === null
        ? null
        : Number(location.latitude),
    longitude:
      location.longitude === undefined || location.longitude === null
        ? null
        : Number(location.longitude),
    heading: location.heading === null ? null : Number(location.heading),
    isVisible: Boolean(location.is_visible),
    updatedAt: location.updated_at,
  };
}

function getSocketToken(socket) {
  const authToken = socket.handshake.auth?.token;
  if (authToken) {
    return String(authToken).replace(/^Bearer\s+/i, "");
  }

  const authorization = socket.handshake.headers.authorization || "";
  const [scheme, token] = authorization.split(" ");
  return scheme === "Bearer" ? token : null;
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

async function authenticateSocket(socket, next) {
  try {
    const token = getSocketToken(socket);
    const payload = token ? verifyAuthToken(token) : null;

    if (!payload) {
      return next(new Error("Authentication required."));
    }

    const result = await User.findPublicById(payload.sub);
    if (result.rowCount === 0) {
      return next(new Error("Authentication required."));
    }

    socket.user = result.rows[0];
    return next();
  } catch (_error) {
    return next(new Error("Authentication required."));
  }
}

async function emitHotspotGroup(placeName, longitude, latitude) {
  if (!io) return;

  const result = await Hotspot.getActiveGroup(placeName, longitude, latitude);
  const group = serializeHotspotGroup(result.rows[0]);
  io.emit(group.passengerCount > 0 ? "hotspot:updated" : "hotspot:removed", group);
}

async function emitHotspotSnapshot(socket) {
  const result = await Hotspot.getActiveGroups();
  socket.emit("hotspots:snapshot", {
    hotspots: result.rows.map(serializeHotspotGroup),
  });
}

async function expireHotspots() {
  try {
    const result = await Hotspot.expireActive();
    const groups = new Map();

    for (const hotspot of result.rows) {
      const key = [
        hotspot.place_name.trim().toLowerCase(),
        Number(hotspot.longitude).toFixed(5),
        Number(hotspot.latitude).toFixed(5),
      ].join(":");
      groups.set(key, hotspot);
    }

    await Promise.all(
      [...groups.values()].map((hotspot) =>
        emitHotspotGroup(hotspot.place_name, hotspot.longitude, hotspot.latitude)
      )
    );
  } catch (error) {
    console.error("Unable to expire hotspots:", error.message);
  }
}

function acknowledge(callback, response) {
  if (typeof callback === "function") {
    callback(response);
  }
}

function initialize(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_ORIGIN || "*",
      methods: ["GET", "POST", "PUT"],
    },
  });

  io.use(authenticateSocket);

  io.on("connection", (socket) => {
    socket.join(socket.user.role);

    emitHotspotSnapshot(socket).catch((error) => {
      console.error("Unable to send hotspot snapshot:", error.message);
    });

    socket.on("driver:location:update", async (payload = {}, callback) => {
      if (socket.user.role !== "DRIVER") {
        return acknowledge(callback, { success: false, message: "Only drivers can update driver locations." });
      }

      const latitude = Number(payload.latitude);
      const longitude = Number(payload.longitude);
      const heading =
        payload.heading === undefined || payload.heading === null
          ? null
          : Number(payload.heading);

      if (
        !isValidCoordinate(longitude, latitude) ||
        (heading !== null && !Number.isFinite(heading))
      ) {
        return acknowledge(callback, { success: false, message: "Valid latitude and longitude are required." });
      }

      try {
        const result = await Location.updateDriverVisibility(
          socket.user.id,
          true,
          latitude,
          longitude,
          heading
        );
        const location = serializeDriverLocation(result.rows[0]);
        io.to("PASSENGER").emit("driver:location", location);
        return acknowledge(callback, { success: true, data: { location } });
      } catch (error) {
        return acknowledge(callback, { success: false, message: "Unable to update driver location." });
      }
    });

    socket.on("driver:visibility:update", async (payload = {}, callback) => {
      if (socket.user.role !== "DRIVER") {
        return acknowledge(callback, { success: false, message: "Only drivers can update map visibility." });
      }

      if (typeof payload.isVisible !== "boolean") {
        return acknowledge(callback, { success: false, message: "isVisible must be a boolean." });
      }

      const latitude = Number(payload.latitude);
      const longitude = Number(payload.longitude);
      const heading =
        payload.heading === undefined || payload.heading === null
          ? null
          : Number(payload.heading);

      if (payload.isVisible && !isValidCoordinate(longitude, latitude)) {
        return acknowledge(callback, { success: false, message: "Valid latitude and longitude are required when enabling visibility." });
      }

      try {
        const result = await Location.updateDriverVisibility(
          socket.user.id,
          payload.isVisible,
          payload.isVisible ? latitude : undefined,
          payload.isVisible ? longitude : undefined,
          heading
        );
        const row = result.rows[0] || {
          user_id: socket.user.id,
          heading: null,
          is_visible: false,
          updated_at: new Date(),
        };
        const location = serializeDriverLocation(row);
        io.to("PASSENGER").emit("driver:visibility", location);
        return acknowledge(callback, { success: true, data: { location } });
      } catch (error) {
        return acknowledge(callback, { success: false, message: "Unable to update driver visibility." });
      }
    });

    socket.on("disconnect", async () => {
      if (socket.user && socket.user.role === "DRIVER") {
        try {
          const result = await Location.updateDriverVisibility(
            socket.user.id,
            false,
            undefined,
            undefined,
            null
          );
          const row = result.rows[0] || {
            user_id: socket.user.id,
            heading: null,
            is_visible: false,
            updated_at: new Date(),
          };
          const location = serializeDriverLocation(row);
          io.to("PASSENGER").emit("driver:visibility", location);
        } catch (error) {
          console.error(`Unable to process disconnect for driver ${socket.user.id}:`, error.message);
        }
      }
    });
  });

  expiryInterval = setInterval(expireHotspots, 5000);
  expiryInterval.unref();
  expireHotspots().catch((error) => {
    console.error("Unable to run initial hotspot expiry:", error.message);
  });

  return io;
}

function emitDriverLocation(location) {
  if (!io) return;
  io.to("PASSENGER").emit("driver:location", serializeDriverLocation(location));
}

function emitDriverVisibility(location) {
  if (!io) return;
  io.to("PASSENGER").emit("driver:visibility", serializeDriverLocation(location));
}

module.exports = {
  emitDriverLocation,
  emitDriverVisibility,
  emitHotspotGroup,
  initialize,
};
