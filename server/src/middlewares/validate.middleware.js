const { ApiError } = require('../core/ApiError');

/**
 * Validate request parts against a zod schema map: { body, query, params }.
 * Parsed (and coerced) values replace the originals.
 */
function validate(schemas) {
  return (req, res, next) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.query) req.validatedQuery = schemas.query.parse(req.query);
      if (schemas.params) req.params = schemas.params.parse(req.params);
      next();
    } catch (err) {
      if (err.name === 'ZodError') {
        return next(
          ApiError.badRequest(
            'Validasi gagal',
            err.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
          ),
        );
      }
      next(err);
    }
  };
}

module.exports = { validate };
