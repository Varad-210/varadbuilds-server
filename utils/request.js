const MAX_TEXT_LENGTH = 2000;

// Returns null for anything that is not a usable, bounded string, so callers
// can treat null as "missing" uniformly for required and optional fields.
function toText(value, { maxLength = MAX_TEXT_LENGTH } = {}) {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();

  if (trimmed.length === 0 || trimmed.length > maxLength) return null;

  return trimmed;
}

function parsePagination(query) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 10, 1), 100);

  return { page, limit };
}

module.exports = { toText, parsePagination };
