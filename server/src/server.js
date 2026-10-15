'use strict';

const app = require('./app');
const { connectDB } = require('./config/database');
const env = require('./config/env');
const logger = require('./utils/logger');

async function start() {
  await connectDB();

  const server = app.listen(env.PORT, () => {
    logger.info(`🚀 CampusHire API server running on port ${env.PORT} [${env.NODE_ENV}]`);
    logger.info(`Health: http://localhost:${env.PORT}/api/v1/health`);
  });

  // Graceful shutdown
  function shutdown(signal) {
    logger.info(`${signal} received — shutting down gracefully`);
    server.close(async () => {
      const mongoose = require('mongoose');
      await mongoose.connection.close();
      logger.info('MongoDB connection closed');
      process.exit(0);
    });
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('unhandledRejection', (err) => {
    logger.error('Unhandled promise rejection:', err);
  });
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception:', err);
  });
}

start().catch((err) => {
  require('./utils/logger').error('Failed to start server:', err);
  process.exit(1);
});
