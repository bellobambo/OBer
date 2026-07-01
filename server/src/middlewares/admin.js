const adminConfig = require("../config/admin");
const { sendError } = require("../utils/response");

function requireAdmin(req, res, next) {
  const email = String(req.user?.email || "").toLowerCase();

  if (!email || !adminConfig.allowedEmails.includes(email)) {
    return sendError(res, 403, "Admin access is restricted to approved emails.");
  }

  next();
}

module.exports = {
  requireAdmin,
};
