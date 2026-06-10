const { sendError } = require("../utils/response");
const { verifyAuthToken } = require("../utils/security");
const User = require("../models/userModel");

async function requireAuth(req, res, next) {
  const authorization = req.get("authorization") || "";
  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    return sendError(res, 401, "Bearer token is required.");
  }

  let payload;
  try {
    payload = verifyAuthToken(token);
  } catch (_error) {
    return sendError(res, 401, "Invalid or expired token.");
  }

  try {
    const userResult = await User.findPublicById(payload.sub);

    if (userResult.rowCount === 0) {
      return sendError(res, 401, "Invalid or expired token.");
    }

    req.user = userResult.rows[0];
    next();
  } catch (error) {
    return sendError(res, 500, "Unable to authenticate user.", error.message);
  }
}

module.exports = { requireAuth };
