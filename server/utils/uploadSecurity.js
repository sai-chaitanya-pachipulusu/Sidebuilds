const fs = require('fs');
const path = require('path');
const { uploadsDir } = require('../config/multer');

const uploadRoot = path.resolve(uploadsDir);

const isWithinDirectory = (parent, candidate) => {
  const relative = path.relative(parent, candidate);
  return relative !== '' && !relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative);
};

/**
 * Resolve a database-backed upload path while enforcing both lexical and real
 * (symlink-aware) containment inside the configured upload directory.
 */
const resolveStoredUploadPath = (storedPath) => {
  if (!storedPath || typeof storedPath !== 'string') return null;

  const resolved = path.resolve(storedPath);
  if (!isWithinDirectory(uploadRoot, resolved) || !fs.existsSync(resolved)) return null;

  try {
    const realRoot = fs.realpathSync(uploadRoot);
    const realPath = fs.realpathSync(resolved);
    if (!isWithinDirectory(realRoot, realPath) || !fs.statSync(realPath).isFile()) return null;
    return realPath;
  } catch (_error) {
    return null;
  }
};

const sanitizeDownloadName = (name) => {
  const safeName = path.basename(String(name || 'download'))
    .replace(/[^\x20-\x7e]|["\\/]/g, '_')
    .slice(0, 180);
  return safeName || 'download';
};

const SAFE_INLINE_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp'
]);

module.exports = {
  resolveStoredUploadPath,
  sanitizeDownloadName,
  SAFE_INLINE_IMAGE_TYPES
};
