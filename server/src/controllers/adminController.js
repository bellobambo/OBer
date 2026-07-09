const crypto = require("crypto");
const pool = require("../db");
const Driver = require("../models/driverModel");
const User = require("../models/userModel");
const { hashPassword } = require("../utils/security");
const { sendError, sendSuccess } = require("../utils/response");
const { validateDriverOnboarding } = require("../validators/adminValidator");

function generateDriverCode() {
  return `OAU-${crypto.randomInt(1000, 10000)}`;
}

async function createUniqueDriverCode(client) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const driverCode = generateDriverCode();
    const existingDriver = await Driver.findByCode(client, driverCode);

    if (existingDriver.rowCount === 0) {
      return driverCode;
    }
  }

  throw new Error("Unable to generate a unique driver code.");
}

async function me(req, res) {
  return sendSuccess(res, 200, "Admin access confirmed.", {
    admin: {
      id: req.user.id,
      email: req.user.email,
      fullName: req.user.full_name,
    },
  });
}

async function listDrivers(req, res) {
  const client = await pool.connect();

  try {
    const result = await Driver.listAdmin(client, {
      search: req.query.search,
    });

    return sendSuccess(res, 200, "Drivers retrieved successfully.", {
      drivers: result.rows.map(Driver.toAdminResponse),
    });
  } catch (error) {
    return sendError(res, 500, "Unable to retrieve drivers.", error.message);
  } finally {
    client.release();
  }
}

async function getDriverStats(_req, res) {
  const client = await pool.connect();

  try {
    const result = await Driver.getAdminStats(client);
    const stats = result.rows[0] || {};

    return sendSuccess(res, 200, "Driver stats retrieved successfully.", {
      stats: {
        totalDrivers: Number(stats.total_drivers || 0),
        driversOnDuty: Number(stats.drivers_on_duty || 0),
        readyDrivers: Number(stats.ready_drivers || 0),
        totalBusDrivers: Number(stats.total_bus_drivers || 0),
        totalTricycleDrivers: Number(stats.total_tricycle_drivers || 0),
      },
    });
  } catch (error) {
    return sendError(res, 500, "Unable to retrieve driver stats.", error.message);
  } finally {
    client.release();
  }
}

async function onboardDriver(req, res) {
  const { data, errors } = validateDriverOnboarding(req.body);

  if (errors.length > 0) {
    return sendError(res, 400, "Validation failed.", errors);
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const driverCode = await createUniqueDriverCode(client);
    const userResult = await User.create(client, {
      role: "DRIVER",
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      passwordHash: hashPassword(data.password),
      phoneVerified: true,
      phoneVerificationCode: null,
      phoneVerificationExpiresAt: null,
    });

    const driverResult = await Driver.create(client, {
      userId: userResult.rows[0].id,
      driverCode,
      vehicleId: data.vehicleId,
      vehicleType: data.vehicleType,
      licenseNumber: data.licenseNumber,
      onboardingStatus: data.onboardingStatus,
    });

    await client.query("COMMIT");

    return sendSuccess(res, 201, "Driver onboarded successfully.", {
      driver: Driver.toAdminResponse({
        ...driverResult.rows[0],
        full_name: userResult.rows[0].full_name,
        email: userResult.rows[0].email,
        phone: userResult.rows[0].phone,
        phone_verified: userResult.rows[0].phone_verified,
        is_on_duty: false,
      }),
    });
  } catch (error) {
    await client.query("ROLLBACK");

    if (error.code === "23505") {
      return sendError(res, 409, "A user with this email, phone number, or driver code already exists.");
    }

    return sendError(res, 500, "Unable to onboard driver.", error.message);
  } finally {
    client.release();
  }
}

module.exports = {
  getDriverStats,
  listDrivers,
  me,
  onboardDriver,
};
