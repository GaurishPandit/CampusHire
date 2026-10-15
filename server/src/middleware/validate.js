'use strict';

const { z } = require('zod');
const { createError } = require('./errorHandler');

/**
 * validate — Zod schema validation middleware factory.
 * Usage: router.post('/path', validate(mySchema), controller)
 *
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @param {'body'|'query'|'params'} source - Which part of req to validate
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return next(createError('Validation failed', 422, errors));
    }
    // Replace with parsed (transformed) data
    req[source] = result.data;
    next();
  };
}

module.exports = { validate };
