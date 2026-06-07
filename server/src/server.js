require("dotenv").config();

const express = require("express");
const cors = require("cors");
const routes = require("./routes");
const { createTables } = require("./schema");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(routes);

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
