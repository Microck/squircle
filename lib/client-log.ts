/**
 * Logs client-side errors to the console in development.
 * No-op in production to avoid cluttering console logs.
 * @param context - Description of where the error occurred
 * @param error - The error or error message to log
 */
export function logClientError(context: string, error: unknown) {
  if (process.env.NODE_ENV !== "production") {
    console.error(context, error);
  }
}
