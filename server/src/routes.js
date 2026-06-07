const express = require("express");
const AuthController = require("./controllers/authController");
const HomeController = require("./controllers/homeController");

const router = express.Router();

router.get("/", HomeController.index);
router.get("/health", HomeController.health);

router.post("/api/register", AuthController.register);
router.post("/api/register/verify-phone", AuthController.verifyPhone);
router.post("/api/login", AuthController.login);
router.get("/api/me", AuthController.me);
router.post("/api/password-reset/request", AuthController.requestPasswordReset);
router.post("/api/password-reset/confirm", AuthController.resetPassword);

module.exports = router;
