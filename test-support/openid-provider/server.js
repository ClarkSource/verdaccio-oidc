const Provider = require('oidc-provider');

const PORT = 5267;

const oidc = new Provider('http://localhost:3000', {
  clients: [
    {
      client_id: '123456',
      client_secret: 'abcdef',
      redirect_uris: ['http://localhost:5266/-/oidc/callback']
    }
  ]
});

oidc.listen(PORT, () => {
  console.log(`oidc-provider listening on port ${PORT}`);
  console.log(
    `check http://localhost:${PORT}/.well-known/openid-configuration`
  );
});
