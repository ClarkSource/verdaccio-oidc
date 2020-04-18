import { Request } from 'express';
import { BadRequest } from 'http-errors';

/**
 * Returns the full host with protocol from the `request`.
 * Respects the `x-forwarded-proto` HTTP header.
 *
 * @example 'https://registry.example.com'
 */
export function getProtocolAndHost(request: Request) {
  const protocol = request.headers['x-forwarded-proto'] || request.protocol;
  const { host } = request.headers;
  return `${protocol}://${host}`;
}

export function buildURL(request: Request, path: string = '/') {
  return getProtocolAndHost(request) + path;
}

/**
 * Extracts the Bearer Authentication token for the HTTP headers of `request`.
 */
export function getBearerTokenFromRequest(request: Request) {
  const { authorization } = request.headers;
  if (!authorization)
    throw new BadRequest(`Missing the 'Authorization' header.`);

  const prefix = 'Bearer ';

  if (!authorization.startsWith(prefix))
    throw new BadRequest(
      `'Authorization' header is not using Bearer Authentication.`
    );

  const token = authorization.slice(prefix.length).trim();

  if (token.length === 0)
    throw new BadRequest(`'Authorization' header is empty.`);

  return token;
}
