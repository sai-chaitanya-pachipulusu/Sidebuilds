const test = require('node:test');
const assert = require('node:assert/strict');
const { getPagination } = require('../utils/pagination');
test('pagination calculates offsets and caps page sizes', () => {
  assert.deepEqual(getPagination({ page: '3', limit: '10' }), { page: 3, limit: 10, offset: 20 });
  assert.equal(getPagination({ limit: '9999' }).limit, 100);
});
test('pagination safely defaults invalid and structured input', () => {
  for (const value of ['-1', '0', '1.5', 'NaN', 'Infinity', '20xyz', '9007199254740992', {}, ['2'], null, true]) {
    assert.deepEqual(getPagination({ page: value, limit: value }), { page: 1, limit: 20, offset: 0 });
  }
});
