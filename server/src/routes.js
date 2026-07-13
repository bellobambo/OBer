const express = require("express");
const AdminController = require("./controllers/adminController");
const AuthController = require("./controllers/authController");
const HomeController = require("./controllers/homeController");
const LocationController = require("./controllers/locationController");
const HotspotController = require("./controllers/hotspotController");
const UserController = require("./controllers/userController");
const { requireAdmin } = require("./middlewares/admin");
const { requireAuth } = require("./middlewares/auth");

const router = express.Router();

router.get("/", HomeController.index);
router.get("/health", HomeController.health);

router.post("/api/register", AuthController.register);
router.post("/api/register/verify-phone", AuthController.verifyPhone);
router.post("/api/register/resend-verification", AuthController.resendVerificationCode);
router.post("/api/login", AuthController.login);
router.get("/api/me", requireAuth, AuthController.me);
router.put("/api/me", requireAuth, AuthController.updateMe);
router.post("/api/password-reset/request", AuthController.requestPasswordReset);
router.post("/api/password-reset/confirm", AuthController.resetPassword);

// Admin routes
router.get("/api/admin/me", requireAuth, requireAdmin, AdminController.me);
router.get("/api/admin/drivers", requireAuth, requireAdmin, AdminController.listDrivers);
router.get("/api/admin/drivers/stats", requireAuth, requireAdmin, AdminController.getDriverStats);
router.post("/api/admin/drivers", requireAuth, requireAdmin, AdminController.onboardDriver);
router.patch("/api/admin/drivers/:driverId/suspend", requireAuth, requireAdmin, AdminController.suspendDriver);
router.patch("/api/admin/drivers/:driverId/reactivate", requireAuth, requireAdmin, AdminController.reactivateDriver);

// Location routes
router.put("/api/location", requireAuth, LocationController.updateLocation);
router.put("/api/location/visibility", requireAuth, LocationController.updateDriverVisibility);
router.get("/api/location/nearby-drivers", requireAuth, LocationController.getNearbyDrivers);
router.get("/api/location/nearby-users", requireAuth, LocationController.getNearbyUsers);
router.get("/api/location/driver/:driverId", requireAuth, LocationController.getDriverLocation);
router.get("/api/location/user/:userId", requireAuth, LocationController.getUserLocation);

// Hotspot routes
router.post("/api/hotspot/arm", requireAuth, HotspotController.armHotspot);
router.post("/api/hotspot/disarm", requireAuth, HotspotController.disarmHotspot);
router.get("/api/hotspots/active", requireAuth, HotspotController.getActiveHotspots);

// User location preference
router.post("/api/user/location-preference", requireAuth, UserController.updateLocationPreference);

module.exports = router;
