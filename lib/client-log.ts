/**
 * Client-side error logger.
 *
 * In production builds errors are silently suppressed to avoid polluting
 * the browser console with noise (e.g. failed image decodes for corrupt
 * uploads).  Instead, the UI relies on React error boundaries to show
 * user-friendly feedback.
 */
export function logClientError(context: string, error: unknown) {
  if (process.env.NODE_ENV !== "production") {
    console.error(context, error);
  }
}
