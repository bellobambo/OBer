require("dotenv").config();

const express = require("express");
const cors = require("cors");
const pool = require("./db");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

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

app.listen(PORT, () => {
  console.log(`OBer server is running on port ${PORT}`);
});
