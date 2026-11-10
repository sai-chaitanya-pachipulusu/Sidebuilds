// Clamp public pagination inputs before they reach either SQL dialect.
const positiveInteger = (value, fallback, maximum) => {
  if (typeof value !== 'string' && typeof value !== 'number') return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, maximum);
};
const getPagination = (query = {}) => {
  const limit = positiveInteger(query.limit, 20, 100);
  const page = positiveInteger(query.page, 1, Math.floor(Number.MAX_SAFE_INTEGER / limit));
  return { page, limit, offset: (page - 1) * limit };
};
module.exports = { getPagination };
