const jwt = require('jsonwebtoken');

const getIssuer = () => process.env.JWT_ISSUER || 'sidebuilds-api';
const getAudience = () => process.env.JWT_AUDIENCE || 'sidebuilds-client';

const getSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }
  return process.env.JWT_SECRET;
};

const signToken = (payload, options = {}) => jwt.sign(payload, getSecret(), {
  ...options,
  algorithm: 'HS256',
  issuer: getIssuer(),
  audience: getAudience()
});

const verifyToken = (token, options = {}) => jwt.verify(token, getSecret(), {
  ...options,
  algorithms: ['HS256'],
  issuer: getIssuer(),
  audience: getAudience()
});

module.exports = { signToken, verifyToken };
