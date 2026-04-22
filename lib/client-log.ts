/**
 * Log an error to the console in non-production environments.
 *
 * Suppresses output when `NODE_ENV` is `"production"` to avoid leaking
 * potentially sensitive information in the browser console.
 */
export function logClientError(context: string, error: unknown) {
  if (process.env.NODE_ENV !== "production") {
    console.error(context, error);
  }
}
