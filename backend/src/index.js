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
const authRoutes          = require('./routes/auth');
const adminRoutes         = require('./routes/admin');

const ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://pixo-web.vercel.app',
    process.env.FRONTEND_URL,
].filter(Boolean);

const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, Render health checks)
        if (!origin) return callback(null, true);
        if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
        // Allow any *.vercel.app or *.netlify.app preview deploy
        if (/\.(vercel|netlify)\.app$/.test(origin)) return callback(null, true);
        callback(new Error(`CORS: ${origin} not allowed`));
    },
    credentials: true,
};

const app  = express();
const PORT = process.env.PORT || 4000;

// ── Global middleware ────────────────────────────────────────
app.use(helmet());
app.use(cors(corsOptions));
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
app.use('/api/auth',         authRoutes);
app.use('/api/admin',        adminRoutes);

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
