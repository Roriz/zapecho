const { SignJWT, jwtVerify } = require('jose');
const { createSecretKey } = require('crypto');
const envParams = require('#/configs/env_params.js');

function _getSecretKey() {
  const secretKeyString = envParams().jwt_secret;
  return createSecretKey(Buffer.from(secretKeyString, 'utf-8'));
}

function generateToken(payload, expiresIn = '1h') {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(expiresIn)
    .sign(_getSecretKey());
}

function verifyToken(token) {
  return jwtVerify(token, _getSecretKey());
}

module.exports = {
  generateToken,
  verifyToken
}
