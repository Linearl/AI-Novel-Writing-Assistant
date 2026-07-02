/**
 * Shared network defaults for server configuration.
 *
 * These values are used as fallback defaults when the corresponding
 * environment variables are not set. In production, always set the
 * explicit env vars (HOST, APP_BASE_URL, etc.) instead of relying
 * on these constants.
 */

/** Default host when allowLan is false and HOST env is not set */
export const DEFAULT_HOST = "localhost";

/** Host that binds to all network interfaces */
export const BIND_ALL_HOST = "0.0.0.0";

/** Default server port */
export const DEFAULT_SERVER_PORT = 3000;

/** Default fallback base URL for the auto-director channel callbacks */
export const DEFAULT_APP_BASE_URL = `http://localhost:${DEFAULT_SERVER_PORT}`;
