export const ACTIVE_API_ORIGIN = 'https://sidebuilds.onrender.com';
const LEGACY_API_HOSTNAME = 'api.sidebuilds.online';

/**
 * Preserve explicit deployment URLs while transparently replacing the legacy
 * custom hostname that currently has no DNS record.
 */
export const resolveServiceUrl = (configuredValue, fallbackValue) => {
  const candidate = String(configuredValue || fallbackValue || '').trim();
  if (!candidate) return '';

  try {
    const parsed = new URL(candidate);
    if (parsed.hostname === LEGACY_API_HOSTNAME) {
      const activeOrigin = new URL(ACTIVE_API_ORIGIN);
      parsed.protocol = activeOrigin.protocol;
      parsed.hostname = activeOrigin.hostname;
      parsed.port = activeOrigin.port;
    }
    return parsed.href.replace(/\/$/, '');
  } catch (_error) {
    return String(fallbackValue || '').replace(/\/$/, '');
  }
};
