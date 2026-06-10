const express = require("express");
const AuthController = require("./controllers/authController");
const HomeController = require("./controllers/homeController");
const LocationController = require("./controllers/locationController");
const HotspotController = require("./controllers/hotspotController");
const UserController = require("./controllers/userController");
const { requireAuth } = require("./middlewares/auth");

const router = express.Router();

router.get("/", HomeController.index);
router.get("/health", HomeController.health);

router.post("/api/register", AuthController.register);
router.post("/api/register/verify-phone", AuthController.verifyPhone);
router.post("/api/register/resend-verification", AuthController.resendVerificationCode);
router.post("/api/login", AuthController.login);
router.get("/api/me", AuthController.me);
router.post("/api/password-reset/request", AuthController.requestPasswordReset);
router.post("/api/password-reset/confirm", AuthController.resetPassword);

// Location routes
router.put("/api/location", requireAuth, LocationController.updateLocation);
router.get("/api/location/nearby-drivers", requireAuth, LocationController.getNearbyDrivers);
router.get("/api/location/driver/:driverId", requireAuth, LocationController.getDriverLocation);

// Hotspot routes
router.post("/api/hotspot/arm", requireAuth, HotspotController.armHotspot);
router.post("/api/hotspot/disarm", requireAuth, HotspotController.disarmHotspot);

// User location preference
router.post("/api/user/location-preference", requireAuth, UserController.updateLocationPreference);

module.exports = router;
