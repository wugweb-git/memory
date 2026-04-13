import express from 'express';
import apiHandler from '../api/index.js';

const app = express();
app.use(express.json({ limit: '1mb' }));

app.all('/api', (req, res) => apiHandler(req, res));
app.all('/api/*', (req, res) => apiHandler(req, res));

export default app;
