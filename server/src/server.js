require("dotenv").config();

const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const pool = require("./db");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const VALID_ROLES = new Set(["PASSENGER", "DRIVER"]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getField(body, ...names) {
  for (const name of names) {
    if (body[name] !== undefined && body[name] !== null) {
      return String(body[name]).trim();
    }
  }

  return "";
}

function validateBaseRegistration(body) {
  const data = {
    fullName: getField(body, "fullName", "full_name", "name"),
    email: getField(body, "email").toLowerCase(),
    phone: getField(body, "phone", "phoneNumber", "phone_number"),
    password: getField(body, "password"),
  };

  const errors = [];

  if (!data.fullName) errors.push("fullName is required.");
  if (!data.email) {
    errors.push("email is required.");
  } else if (!EMAIL_PATTERN.test(data.email)) {
    errors.push("email must be a valid email address.");
  }
  if (!data.phone) errors.push("phone is required.");
  if (!data.password) {
    errors.push("password is required.");
  } else if (data.password.length < 8) {
    errors.push("password must be at least 8 characters long.");
  }

  return { data, errors };
}

function getRole(body) {
  return getField(body, "role").toUpperCase();
}

function validatePassengerRegistration(body) {
  const { data, errors } = validateBaseRegistration(body);

  data.studentId = getField(body, "studentId", "student_id", "matricNumber", "matric_number");
  data.department = getField(body, "department");
  data.level = getField(body, "level");

  return { data, errors };
}

function validateDriverRegistration(body) {
  const { data, errors } = validateBaseRegistration(body);

  data.licenseNumber = getField(
    body,
    "licenseNumber",
    "license_number",
    "driversLicenseNumber",
    "drivers_license_number"
  );
  data.vehiclePlateNumber = getField(
    body,
    "vehiclePlateNumber",
    "vehicle_plate_number",
    "plateNumber",
    "plate_number"
  );
  data.vehicleModel = getField(body, "vehicleModel", "vehicle_model", "carModel", "car_model");
  data.vehicleColor = getField(body, "vehicleColor", "vehicle_color", "carColor", "car_color");

  if (!data.licenseNumber) errors.push("licenseNumber is required.");
  if (!data.vehiclePlateNumber) errors.push("vehiclePlateNumber is required.");
  if (!data.vehicleModel) errors.push("vehicleModel is required.");

  return { data, errors };
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");

  return `${salt}:${hash}`;
}

function buildUserResponse(user, roleDetails = {}) {
  return {
    id: user.id,
    role: user.role,
    fullName: user.full_name,
    email: user.email,
    phone: user.phone,
    ...roleDetails,
    createdAt: user.created_at,
  };
}

async function createTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      role VARCHAR(20) NOT NULL CHECK (role IN ('PASSENGER', 'DRIVER')),
      full_name VARCHAR(120) NOT NULL,
      email VARCHAR(160) NOT NULL UNIQUE,
      phone VARCHAR(40) NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS passengers (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      student_id VARCHAR(80) UNIQUE,
      department VARCHAR(120),
      level VARCHAR(40),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS drivers (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      license_number VARCHAR(100) NOT NULL UNIQUE,
      vehicle_plate_number VARCHAR(80) NOT NULL UNIQUE,
      vehicle_model VARCHAR(120) NOT NULL,
      vehicle_color VARCHAR(80),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function registerUser(req, res) {
  const role = getRole(req.body);

  if (!VALID_ROLES.has(role)) {
    return res.status(400).json({
      message: "Validation failed.",
      errors: ["role must be either PASSENGER or DRIVER."],
    });
  }

  const { data, errors } =
    role === "PASSENGER"
      ? validatePassengerRegistration(req.body)
      : validateDriverRegistration(req.body);

  if (errors.length > 0) {
    return res.status(400).json({ message: "Validation failed.", errors });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const userResult = await client.query(
      `INSERT INTO users (role, full_name, email, phone, password_hash)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, role, full_name, email, phone, created_at`,
      [role, data.fullName, data.email, data.phone, hashPassword(data.password)]
    );

    let roleDetails = {};

    if (role === "PASSENGER") {
      const passengerResult = await client.query(
        `INSERT INTO passengers (user_id, student_id, department, level)
         VALUES ($1, $2, $3, $4)
         RETURNING student_id, department, level`,
        [
          userResult.rows[0].id,
          data.studentId || null,
          data.department || null,
          data.level || null,
        ]
      );

      roleDetails = {
        studentId: passengerResult.rows[0].student_id,
        department: passengerResult.rows[0].department,
        level: passengerResult.rows[0].level,
      };
    } else {
      const driverResult = await client.query(
        `INSERT INTO drivers (user_id, license_number, vehicle_plate_number, vehicle_model, vehicle_color)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING license_number, vehicle_plate_number, vehicle_model, vehicle_color`,
        [
          userResult.rows[0].id,
          data.licenseNumber,
          data.vehiclePlateNumber,
          data.vehicleModel,
          data.vehicleColor || null,
        ]
      );

      roleDetails = {
        licenseNumber: driverResult.rows[0].license_number,
        vehiclePlateNumber: driverResult.rows[0].vehicle_plate_number,
        vehicleModel: driverResult.rows[0].vehicle_model,
        vehicleColor: driverResult.rows[0].vehicle_color,
      };
    }

    await client.query("COMMIT");

    return res.status(201).json({
      message: `${role} registered successfully.`,
      user: buildUserResponse(userResult.rows[0], roleDetails),
    });
  } catch (error) {
    await client.query("ROLLBACK");

    if (error.code === "23505") {
      return res.status(409).json({
        message: "A user with one of these details already exists.",
      });
    }

    return res.status(500).json({
      message: "Unable to register user.",
      error: error.message,
    });
  } finally {
    client.release();
  }
}

app.get("/", (_req, res) => {
  res.status(200).json({
    name: "OBer API",
    message: "Welcome to the OBer backend service.",
    description:
      "This API will power the OBer application with Node.js, Express.js, and PostgreSQL Database.",
    status: "running",
    version: "1.0.0",
  });
});

app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");

    res.status(200).json({
      status: "ok",
      database: "connected",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      database: "disconnected",
      message: error.message,
    });
  }
});

app.post("/api/register", registerUser);

async function startServer() {
  try {
    await createTables();
    console.log("Database tables are ready.");
  } catch (error) {
    console.error("Unable to initialize database tables:", error.message);
  }

  app.listen(PORT, () => {
    console.log(`OBer server is running on port ${PORT}`);
  });
}

startServer();
