const { rateLimit } = require('express-rate-limit');

// A spam brake, not a wall: keyed on req.ip (see the 'trust proxy' note in
// index.js). Each route gets its own instance so failed booking attempts
// can't lock a genuine lead out of the contact form.
function createSubmitLimiter() {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-8',
    legacyHeaders: false,

    // Must be an object: BookDemo parses every response as JSON and reads
    // result.message, so the library's default plain-text reply would surface
    // to the visitor as "Server returned an invalid response (429)".
    message: {
      success: false,
      message:
        'Too many requests from this connection. Please try again in a few minutes.',
    },
  });
}

module.exports = { createSubmitLimiter };
