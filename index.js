const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Render and Vercel terminate TLS in front of this app, so without this every
// request looks like it came from the proxy's IP. Using `true` would trust the
// whole X-Forwarded-For chain and let clients pick their own key -- the limiter
// then resets on every spoofed value, and the CORS allowlist has no effect on
// req.ip. `1` trusts one hop: Render's own appended address, not a forged one.
app.set('trust proxy', 1);

// Exact origins only. No wildcards: `https://*.vercel.app` would equally match
// any third-party deployment.
const PRODUCTION_ORIGINS = ['https://varadbuilds.vercel.app'];
const DEVELOPMENT_ORIGINS = ['http://localhost:8080', 'http://127.0.0.1:8080'];

function resolveAllowedOrigins() {
  if (process.env.ALLOWED_ORIGINS) {
    return process.env.ALLOWED_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
  }

  if (process.env.NODE_ENV === 'production') return PRODUCTION_ORIGINS;

  return [...PRODUCTION_ORIGINS, ...DEVELOPMENT_ORIGINS];
}

const allowedOrigins = new Set(resolveAllowedOrigins());

// Middleware
app.use(
  cors({
    origin(origin, callback) {
      // Requests without an Origin header (curl, health checks, server-to-
      // server, same-origin) are unaffected; CORS constrains browsers only.
      if (!origin) return callback(null, true);

      if (allowedOrigins.has(origin)) return callback(null, true);

      // Omit the CORS headers so the browser blocks the response.
      return callback(null, false);
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-admin-token'],
    maxAge: 600,
  })
);

// Bound request bodies; field-level caps in the routes come after parsing.
app.use(express.json({ limit: '32kb' }));

// Import Routes
const bookingRoutes = require('./routes/bookings');
const contactRoutes = require('./routes/contacts');

// Use Routes
app.use('/api/bookings', bookingRoutes);
app.use('/api/contacts', contactRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log('   Allowed origins:', [...allowedOrigins].join(', '));
});
