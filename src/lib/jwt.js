const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function sign(payload, expiresIn = '7d') {
  return jwt.sign(payload, SECRET, { expiresIn });
}
function verify(token) {
  return jwt.verify(token, SECRET);
}

module.exports = { sign, verify };
