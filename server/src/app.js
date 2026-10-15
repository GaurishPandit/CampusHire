'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const env = require('./config/env');
const { generalLimiter } = require('./middleware/rateLimiter');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

// Route modules
const authRoutes = require('./routes/v1/auth.routes');
const studentRoutes = require('./routes/v1/student.routes');
const opportunityRoutes = require('./routes/v1/opportunity.routes');
const miscRoutes = require('./routes/v1/misc.routes');

const app = express();

// ── Security Headers ────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// ── CORS ────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: env.CLIENT_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Body Parsing ────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// ── HTTP Logging ────────────────────────────────────────────────────────────
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev', {
  stream: { write: (msg) => logger.http(msg.trim()) },
}));

// ── Rate Limiting ────────────────────────────────────────────────────────────
app.use('/api', generalLimiter);

// ── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/v1/health', (_req, res) => {
  const mongoose = require('mongoose');
  return res.json({
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString(),
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    version: process.env.npm_package_version || '1.0.0',
  });
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/students', studentRoutes);
app.use('/api/v1/opportunities', opportunityRoutes);
app.use('/api/v1', miscRoutes);

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use(notFound);

// ── Central Error Handler (must be last) ─────────────────────────────────────
app.use(errorHandler);

module.exports = app;
