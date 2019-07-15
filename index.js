require('dotenv').config();

const { debuglog } = require('util');
const debug = debuglog('verdaccio-oidc');

const { Issuer, generators } = require('openid-client');

const { OIDC_ISSUER_URL, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET } = process.env;

async function getIssuerFromURL(issuerURL) {
  debug(`Trying to discover issuer from '${issuerURL}'.`);
  const issuer = await Issuer.discover(OIDC_ISSUER_URL);
  debug('Discovered issuer.', issuer.metadata);
  return issuer;
}

class VerdaccioOIDCPlugin {
  constructor(config, stuff) {
    this._users = {};

    // config for this module
    this._config = config;

    // verdaccio logger
    this._logger = stuff.logger;

    // pass verdaccio logger to ldapauth
    this._config.client_options.log = stuff.logger;

    this.boot();
  }

  async boot() {
    const { Client } = await getIssuerFromURL(OIDC_ISSUER_URL);

    this.client = new Client({
      client_id: OIDC_CLIENT_ID,
      client_secret: OIDC_CLIENT_SECRET,
      redirect_uris: ['http://localhost:5000/cb'],
      response_types: ['id_token']
    });

    this.nonce = generators.nonce();
  }

  authenticate(user, password, callback) {
    const LdapClient = new LdapAuth(self._config.client_options);
    LdapClient.authenticate(user, password, function(error, ldapUser) {
      let groups;
      callback(null, groups);
    });
  }

  // eslint-disable-next-line camelcase
  register_middlewares(app, auth, storage) {
    app.use('/oauth/authorize', (request, res) =>
      res.redirect(this.getAuthorizationURL())
    );

    app.use('/oauth/callback', (request, res, next) => {});
  }

  getAuthorizationURL() {
    return this.client.authorizationUrl({
      scope: 'openid email profile',
      response_mode: 'form_post',
      nonce: this.nonce
    });
  }
}

module.exports = VerdaccioOIDCPlugin;
