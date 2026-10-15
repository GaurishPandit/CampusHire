'use strict';

const mongoose = require('mongoose');
const { MONGODB_URI, NODE_ENV } = require('./env');
const logger = require('../utils/logger');

const MONGOOSE_OPTIONS = {
  autoIndex: NODE_ENV !== 'production', // create indexes in dev/test; let Atlas handle in prod
};

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI, MONGOOSE_OPTIONS);
    logger.info(`MongoDB connected: ${mongoose.connection.host}`);
  } catch (err) {
    logger.error('MongoDB connection error:', err);
    process.exit(1);
  }
}

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  logger.error('MongoDB error:', err);
});

module.exports = { connectDB };
