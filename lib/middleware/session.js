const { randomBytes } = require('crypto');
const sessions = require('client-sessions');

module.exports = sessions({
  cookieName: 'verdaccio-oidc',
  requestKey: 'session',
  secret: randomBytes(256).toString('hex'),
  duration: 60 * 60 * 1000, // 1 hour
  activeDuration: 1000 * 60 * 5 // if expiresIn < activeDuration, the session will be extended by activeDuration milliseconds
});
