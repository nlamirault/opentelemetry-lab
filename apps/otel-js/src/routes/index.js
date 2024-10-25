const axios = require("axios");
const express = require("express");
const pino = require("pino");

const logger = pino();
const router = express.Router();

const port = process.env.EXPOSE_PORT || 3000;
const TARGET_ONE_SVC = process.env.TARGET_ONE_SVC || `localhost:${port}`;
const TARGET_TWO_SVC = process.env.TARGET_TWO_SVC || `localhost:${port}`;

router.get("/", (req, res) => {
  logger.info("OpenTelemetry root handler");
  res.send("OpenTelemetry Lab / Javascript");
});

router.get("/version", (req, res) => {
  logger.info("OpenTelemetry version handler");
  res.json({ version: "v1.0.0" });
});

router.get("/error_test", (req, res) => {
  logger.error("got error!!!!");
  throw new Error("value error");
});

router.get("/chain", async (req, res) => {
  logger.info("Chain Start");
  await axios.get(`http://${TARGET_ONE_SVC}/`);
  await axios.get(`http://${TARGET_ONE_SVC}/`);
  await axios.get(`http://${TARGET_TWO_SVC}/`);
  logger.info("Chain Finished");
  res.json({ path: "/chain" });
});

module.exports = router;
