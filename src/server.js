import express from 'express';
import itemsHandler from '../api/items.js';
import syncHandler from '../api/sync.js';
import emailHandler from '../api/email.js';
import healthHandler from '../api/health.js';
import logsHandler from '../api/logs.js';
import testHandler from '../api/test.js';
import loginHandler from '../api/auth/login.js';
import signupHandler from '../api/auth/signup.js';
import meHandler from '../api/auth/me.js';
import logoutHandler from '../api/auth/logout.js';

const app = express();

app.use(express.json());

app.get('/api/test', (req, res) => testHandler(req, res));
app.get('/api/items', (req, res) => itemsHandler(req, res));
app.post('/api/items', (req, res) => itemsHandler(req, res));
app.delete('/api/items', (req, res) => itemsHandler(req, res));
app.post('/api/sync', (req, res) => syncHandler(req, res));
app.post('/api/email', (req, res) => emailHandler(req, res));
app.get('/api/health', (req, res) => healthHandler(req, res));
app.get('/api/logs', (req, res) => logsHandler(req, res));
app.post('/api/auth/signup', (req, res) => signupHandler(req, res));
app.post('/api/auth/login', (req, res) => loginHandler(req, res));
app.get('/api/auth/me', (req, res) => meHandler(req, res));
app.post('/api/auth/logout', (req, res) => logoutHandler(req, res));

export default app;
