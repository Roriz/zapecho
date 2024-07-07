const { SignJWT, jwtVerify } = require('jose');
const { createSecretKey } = require('crypto');
const envParams = require('#/configs/env_params.js');

const secretKeyString = envParams().jwt_secret;
const secretKey = createSecretKey(Buffer.from(secretKeyString, 'utf-8'));

function generateToken(payload, expiresIn = '1h') {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(expiresIn)
    .sign(secretKey);
}

function verifyToken(token) {
  return jwtVerify(token, secretKey);
}

module.exports = {
  generateToken,
  verifyToken
}
