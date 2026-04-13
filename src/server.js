import express from 'express';
import itemsHandler from '../api/items.js';
import syncHandler from '../api/sync.js';
import emailHandler from '../api/email.js';
import healthHandler from '../api/health.js';
import testHandler from '../api/test.js';

const app = express();

app.use(express.json());

app.get('/api/test', (req, res) => testHandler(req, res));
app.get('/api/items', (req, res) => itemsHandler(req, res));
app.post('/api/items', (req, res) => itemsHandler(req, res));
app.post('/api/sync', (req, res) => syncHandler(req, res));
app.post('/api/email', (req, res) => emailHandler(req, res));
app.get('/api/health', (req, res) => healthHandler(req, res));

export default app;
