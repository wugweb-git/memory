const express = require('express');
const path = require('path');
const itemRoutes = require('./routes/items');

const app = express();

// Core middleware.
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use('/test', express.static(path.join(process.cwd(), 'test')));
app.use(itemRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

module.exports = app;
