const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const jsonwebtoken = require('jsonwebtoken');

const TEST_SECRET = 'sidebuilds-security-test-secret-32-characters';
process.env.JWT_SECRET = TEST_SECRET;
process.env.JWT_ISSUER = 'sidebuilds-api';
process.env.JWT_AUDIENCE = 'sidebuilds-client';

const { signToken, verifyToken } = require('../utils/jwt');
const { rateLimit } = require('../middleware/rateLimiter');
const { resolveStoredUploadPath, sanitizeDownloadName } = require('../utils/uploadSecurity');

const createResponse = () => ({
  headers: {},
  statusCode: 200,
  setHeader(name, value) { this.headers[name] = value; },
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
  end() {}
});

test('JWT verification accepts only the configured algorithm, issuer, and audience', () => {
  const token = signToken({ user: { user_id: 'user-1' } }, { expiresIn: '5m' });
  assert.equal(verifyToken(token).user.user_id, 'user-1');

  const wrongAlgorithm = jsonwebtoken.sign(
    { user: { user_id: 'user-1' }, iss: 'sidebuilds-api', aud: 'sidebuilds-client' },
    TEST_SECRET,
    { algorithm: 'HS512', expiresIn: '5m' }
  );
  assert.throws(() => verifyToken(wrongAlgorithm), /invalid algorithm/i);
});

test('strict rate limiters use an independent bucket from the general API limiter', () => {
  const request = { ip: 'security-test-ip', body: {} };
  const general = rateLimit({ namespace: 'security-test-general', maxRequests: 5 });
  const strict = rateLimit({ namespace: 'security-test-strict', maxRequests: 1 });

  let generalNext = 0;
  general(request, createResponse(), () => { generalNext += 1; });
  assert.equal(generalNext, 1);

  let strictNext = 0;
  strict(request, createResponse(), () => { strictNext += 1; });
  assert.equal(strictNext, 1);

  const blockedResponse = createResponse();
  strict(request, blockedResponse, () => { strictNext += 1; });
  assert.equal(strictNext, 1);
  assert.equal(blockedResponse.statusCode, 429);
  assert.match(blockedResponse.body.error, /too many requests/i);
});

test('stored upload paths cannot escape the upload root', () => {
  const outsideFile = path.resolve(__dirname, '..', 'package.json');
  assert.equal(resolveStoredUploadPath(outsideFile), null);
});

test('download names cannot inject headers or directory segments', () => {
  const safeName = sanitizeDownloadName('../unsafe\r\n"name.svg');
  assert.doesNotMatch(safeName, /[\r\n"\\/]/);
  assert.equal(safeName.includes('..'), false);
});
