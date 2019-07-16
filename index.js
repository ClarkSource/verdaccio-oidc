/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/camelcase */
require('dotenv').config();

const { debuglog } = require('util');
const debug = debuglog('verdaccio-oidc');

const { Issuer, generators } = require('openid-client');

const bodyParser = require('body-parser');
const httpErrors = require('http-errors-express').default;
const session = require('./lib/middleware/session');
const tokenParser = require('./lib/middleware/token-parser');

const createError = require('http-errors');

const Deferreds = require('./lib/deferreds');
const getRandomToken = require('./lib/utils/token');

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

    this.deferreds = new Deferreds(1000 * 30);

    this.boot();
  }

  async boot() {
    const { Client } = await getIssuerFromURL(OIDC_ISSUER_URL);

    this.client = new Client({
      client_id: OIDC_CLIENT_ID,
      client_secret: OIDC_CLIENT_SECRET,
      response_types: ['code']
    });
  }

  authenticate(user, password, callback) {}

  register_middlewares(app, auth, storage) {
    app.use('/-/oidc', httpErrors(), session);

    app.use('/-/oidc/authorize', (request, res) => {
      this.createSession(request);
      res.redirect(request.session.authorizationUrl);
    });

    app.use(
      '/-/oidc/callback',
      bodyParser.urlencoded({ extended: false }),
      async (request, res, next) => {
        const params = this.client.callbackParams(request);
        const { callbackURL, codeVerifier, nonce, npmToken } = request.session;

        const tokenSet = await this.client.callback(callbackURL, params, {
          nonce,
          code_verifier: codeVerifier
        });

        this.deferreds.resolve(npmToken, tokenSet);

        res.json({
          tokenSet,
          claims: tokenSet.claims(),
          userinfo: await this.client.userinfo(tokenSet.id_token),
          refresh: await this.client.refresh(tokenSet.refresh_token),
          npmToken
        });
      }
    );

    app.use(
      '/-/user/org.couchdb.user:*',
      bodyParser.json(),
      async (request, res) => {
        console.log(request.body);

        const token = await getRandomToken();

        res.json({ token, sso: this.getInitializationURL(token, request) });
      }
    );

    app.use(
      '/-/whoami',
      tokenParser(false),
      bodyParser.urlencoded({ extended: false }),
      async (request, res, next) => {
        if (!request.token) return next();

        let tokenSet;
        try {
          tokenSet = await this.deferreds.waitFor(request.token);
        } catch (error) {
          return next(createError(401, 'SSO client did not respond in time.'));
        }

        const claims = tokenSet.claims();

        res.json({ username: claims.preferred_username, claims, tokenSet });
      }
    );
  }

  createSession(request) {
    const { session, query } = request;

    session.npmToken = query.npmToken;
    session.callbackURL = this.getCallbackURL(request);
    session.codeVerifier = generators.codeVerifier();
    session.codeChallenge = generators.codeChallenge(session.codeVerifier);
    session.nonce = generators.nonce();
    session.authorizationUrl = this.getAuthorizationURL(session);
  }

  buildURL(path, request) {
    const protocol = request.headers['x-forwarded-proto'] || request.protocol;
    const { host } = request.headers;
    return `${protocol}://${host}${path}`;
  }

  getCallbackURL(request) {
    return this.buildURL('/-/oidc/callback', request);
  }

  getInitializationURL(token, request) {
    return this.buildURL(
      `/-/oidc/authorize?npmToken=${encodeURIComponent(token)}`,
      request
    );
  }

  getAuthorizationURL({ callbackURL, codeChallenge, nonce }) {
    return this.client.authorizationUrl({
      redirect_uri: callbackURL,
      scope: 'openid profile groups email',
      response_mode: 'form_post',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      nonce
    });
  }
}

module.exports.default = VerdaccioOIDCPlugin;
