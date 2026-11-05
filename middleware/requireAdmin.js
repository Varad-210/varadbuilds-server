const { timingSafeEqual } = require('crypto');

// Fail closed: if ADMIN_API_TOKEN is unset these routes refuse everything
// rather than silently becoming public.
module.exports = function requireAdmin(req, res, next) {
  const expected = process.env.ADMIN_API_TOKEN;

  if (!expected) {
    return res.status(503).json({
      success: false,
      message: 'Admin API is not configured.',
    });
  }

  const provided = req.get('x-admin-token');

  if (!provided) {
    return res.status(401).json({ success: false, message: 'Unauthorized.' });
  }

  const a = Buffer.from(String(provided));
  const b = Buffer.from(String(expected));

  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return res.status(401).json({ success: false, message: 'Unauthorized.' });
  }

  return next();
};
