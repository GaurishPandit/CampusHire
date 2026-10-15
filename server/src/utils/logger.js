'use strict';

const winston = require('winston');
const { NODE_ENV } = require('../config/env');

const logger = winston.createLogger({
  level: NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    NODE_ENV === 'production'
      ? winston.format.json()
      : winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            const extras = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
            return `${timestamp} [${level}]: ${message}${extras}`;
          })
        )
  ),
  transports: [
    new winston.transports.Console(),
  ],
});

module.exports = logger;
