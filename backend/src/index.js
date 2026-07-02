require('dotenv').config();
const express     = require('express');
const helmet      = require('helmet');
const cors        = require('cors');

const { pool }            = require('./db/pool');
const accessCodeRoutes    = require('./routes/accessCodes');
const inviteLinkRoutes    = require('./routes/inviteLinks');
const sessionRoutes       = require('./routes/sessions');
const dashboardRoutes     = require('./routes/dashboard');
const appRoutes           = require('./routes/app');

const app  = express();
const PORT = process.env.PORT || 4000;

// ── Global middleware ────────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));

// ── Health check ─────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'pixo-backend' }));

// ── Routes ───────────────────────────────────────────────────
app.use('/api/access-codes', accessCodeRoutes);
app.use('/api/invite-links', inviteLinkRoutes);
app.use('/api/sessions',     sessionRoutes);
app.use('/api/dashboard',    dashboardRoutes);
app.use('/api/app',          appRoutes);

// ── 404 catch-all ─────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// ── Global error handler ──────────────────────────────────────
app.use((err, _req, res, _next) => {
    console.error('[pixo-error]', err);
    res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
    console.log(`[pixo] Backend running on http://localhost:${PORT}`);
});

module.exports = app;
