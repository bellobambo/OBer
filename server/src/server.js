require("dotenv").config();

const express = require("express");
const cors = require("cors");
const http = require("http");
const routes = require("./routes");
const Realtime = require("./realtime");

const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(routes);

async function startServer() {
  console.log("Database tables must be created via Supabase SQL Editor.");

  Realtime.initialize(httpServer);

  httpServer.listen(PORT, () => {
    console.log(`OBer server is running on port ${PORT}`);
  });
}

startServer();
