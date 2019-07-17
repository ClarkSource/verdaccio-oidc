const createError = require('http-errors');

const PREFIX = 'Bearer ';

// eslint-disable-next-line func-names
module.exports = (isTokenRequired = false) => (request, res, next) => {
  const { authorization } = request.headers;
  if (!authorization) {
    if (isTokenRequired)
      return next(createError(401, '`Authorization` header is missing.'));
    return next();
  }

  if (!authorization.startsWith(PREFIX))
    return next(
      createError(
        401,
        '`Authorization` header is not using the `Bearer` format.'
      )
    );

  const token = authorization.slice(PREFIX.length);

  if (!token)
    return next(createError(401, '`Authorization` header has an empty token.'));

  request.token = token;

  next();
};
