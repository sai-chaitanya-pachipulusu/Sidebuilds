const createReadinessHandler = (checkConnection) => async (_req, res) => {
  let connected = false;
  try {
    connected = Boolean((await checkConnection()).ok);
  } catch (_error) {
    // Infrastructure details belong in private diagnostics, not a public endpoint.
  }
  res.setHeader('Cache-Control', 'no-store');
  return res.status(connected ? 200 : 503).json({
    status: connected ? 'ready' : 'not_ready', database: { connected }, timestamp: Date.now()
  });
};
module.exports = { createReadinessHandler };
