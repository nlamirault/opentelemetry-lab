# Copyright (c) Nicolas Lamirault <nicolas.lamirault@gmail.com>
#
# SPDX-License-Identifier: Apache-2.0

const opentelemetry = require('@opentelemetry/sdk-node')
const otel = require('@opentelemetry/api')
// const { W3CTraceContextPropagator } = require("@opentelemetry/core");
const logsAPI = require('@opentelemetry/api-logs');
const { OTLPLogExporter } = require('@opentelemetry/exporter-logs-otlp-grpc');
// const { OTLPLogExporter } = require('@opentelemetry/exporter-logs-otlp-http');
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http')
const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express')
const { envDetector, Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const {
  BatchLogRecordProcessor,
  LoggerProvider,
  // SimpleLogRecordProcessor
} = require('@opentelemetry/sdk-logs');

const detected = envDetector.detect();

const serviceName = process.env.OTEL_SERVICE_NAME || "otel-js"
const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
}).merge(detected);

const otelEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://otel_collector:4317'
const logExporter = new OTLPLogExporter({
  url: otelEndpoint,
  keepAlive: true,
});
const logRecordProcessor = new BatchLogRecordProcessor({
  exporter: logExporter
})
// const logRecordProcessor = new SimpleLogRecordProcessor({
//   exporter: logExporter
// })
const sdk = new opentelemetry.NodeSDK({
  resource: resource,
  instrumentations: [new HttpInstrumentation(), new ExpressInstrumentation()],
  // traceExporter: new OTLPTraceExporter(collectorOptions),
  // metricReader: new PeriodicExportingMetricReader({
  //   exportIntervalMillis: 5000,
  //   exporter: new OTLPMetricExporter(collectorOptions),
  // }),
  logRecordProcessor: logRecordProcessor,
  instrumentations: [
    new HttpInstrumentation(),
    new ExpressInstrumentation(),
  ],
});
sdk.start();

const loggerProvider = new LoggerProvider({
  resource
});

// loggerProvider.addLogRecordProcessor(logRecordProcessor);

const loggerOtel = loggerProvider.getLogger(serviceName);
// loggerProvider.shutdown().catch(console.error)

const express = require('express');
const axios = require('axios');
const app = express();
const port = process.env.EXPOSE_PORT || 3000;

loggerOtel.emit({
  severityNumber: logsAPI.SeverityNumber.INFO,
  severityText: 'INFO',
  body: 'bootstrap',
  attributes: { 'log.type': 'LogRecord' },
});


const TARGET_ONE_SVC = process.env.TARGET_ONE_SVC || `localhost:${port}`;
const TARGET_TWO_SVC = process.env.TARGET_TWO_SVC || `localhost:${port}`;

app.get('/', (req, res) => {
  console.error('Hello World');
  res.json({ Hello: 'World' });
});

app.get('/items/:item_id', (req, res) => {
  console.error('items');
  res.json({ item_id: req.params.item_id, q: req.query.q });
});

app.get('/io_task', (req, res) => {
  setTimeout(() => {
    console.error('io task');
    res.send('IO bound task finish!');
  }, 1000);
});

app.get('/cpu_task', (req, res) => {
  for (let i = 0; i < 1000; i++) {
    _ = i * i * i;
  }
  console.error('cpu task');
  res.send('CPU bound task finish!');
});

app.get('/random_status', (req, res) => {
  const statusCodes = [200, 200, 300, 400, 500];
  const randomStatusCode = statusCodes[Math.floor(Math.random() * statusCodes.length)];
  res.status(randomStatusCode);
  console.error('random status');
  res.json({ path: '/random_status' });
});

app.get('/random_sleep', (req, res) => {
  const sleepTime = Math.floor(Math.random() * 6);
  setTimeout(() => {
    console.error('random sleep');
    res.json({ path: '/random_sleep' });
  }, sleepTime * 1000);
});

app.get('/error_test', (req, res) => {
  console.error('got error!!!!');
  throw new Error('value error');
});

app.get('/chain', async (req, res) => {
  console.info('Chain Start');
  await axios.get(`http://${TARGET_ONE_SVC}/`);
  await axios.get(`http://${TARGET_ONE_SVC}/io_task`);
  await axios.get(`http://${TARGET_TWO_SVC}/cpu_task`);
  console.info('Chain Finished');
  res.json({ path: '/chain' });
});

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
  loggerOtel.emit({
    severityNumber: logsAPI.SeverityNumber.INFO,
    severityText: 'INFO',
    body: 'App listening on ${port}',
    attributes: { 'log.type': 'LogRecord' },
  });
});