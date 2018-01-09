const { validationResult } = require('express-validator/check');

module.exports = {
  // Higher-order function that catches an error and sends it to next
  handleError(fn) {
    return (req, res, next) => {
      fn(req, res, next).catch(next);
    };
  },
  // Generate error object
  throwValidationResult(req, res, next) {
    try {
      validationResult(req).throw();
      next();
    } catch (err) {
      next(err);
    }
  },
};
