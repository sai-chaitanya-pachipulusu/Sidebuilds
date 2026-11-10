// Accept a same-app destination only; authentication must never redirect off site.
export function safeReturnTo(value, fallback = '/dashboard') {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u0020]/.test(value)) return fallback;
  try {
    const decoded = decodeURIComponent(value);
    if (decoded.startsWith('//') || /[\\\u0000-\u001f]/.test(decoded)) return fallback;
    const url = new URL(value, 'https://sidebuilds.invalid');
    if (url.origin !== 'https://sidebuilds.invalid' || /^\/(login|register|forgot-password|reset-password)(\/|$)/.test(url.pathname)) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch (_) { return fallback; }
}

export const loginDestination = destination => `/login?next=${encodeURIComponent(safeReturnTo(destination))}`;

export function readMarketplaceSearch(params) {
  const page = Number(params.get('page'));
  const sort = params.get('sort');
  return {
    page: Number.isSafeInteger(page) && page > 0 && page <= 10000 ? page : 1,
    search: params.get('q') || '',
    sort: ['newest', 'price-low', 'price-high', 'revenue', 'views', 'score'].includes(sort) ? sort : 'newest',
    filters: Object.fromEntries(['stage', 'minPrice', 'maxPrice', 'techStack', 'category'].map(key => [key, params.get(key) || '']))
  };
}
