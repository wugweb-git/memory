const express = require('express');
const itemsHandler = require('../api/items');
const syncHandler = require('../api/sync');
const emailHandler = require('../api/email');
const healthHandler = require('../api/health');

const app = express();

app.use(express.json());

app.get('/api/test', (req, res) => {
  res.json({ status: 'working' });
});

app.get('/api/items', (req, res) => itemsHandler(req, res));
app.post('/api/items', (req, res) => itemsHandler(req, res));
app.delete('/api/items', (req, res) => itemsHandler(req, res));
app.post('/api/sync', (req, res) => syncHandler(req, res));
app.post('/api/email', (req, res) => emailHandler(req, res));
app.get('/api/health', (req, res) => healthHandler(req, res));

module.exports = app;
