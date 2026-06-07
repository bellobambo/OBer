const pool = require("../db");
const { sendError, sendSuccess } = require("../utils/response");

function index(_req, res) {
  return sendSuccess(res, 200, "Welcome to the OBer backend service.", {
    name: "OBer API",
    description:
      "This API will power the OBer application with Node.js, Express.js, and PostgreSQL Database.",
    status: "running",
    version: "1.0.0",
  });
}

async function health(_req, res) {
  try {
    await pool.query("SELECT 1");

    return sendSuccess(res, 200, "API and database are healthy.", {
      status: "ok",
      database: "connected",
    });
  } catch (error) {
    return sendError(res, 500, "Database health check failed.", {
      status: "error",
      database: "disconnected",
      error: error.message,
    });
  }
}

module.exports = {
  health,
  index,
};
