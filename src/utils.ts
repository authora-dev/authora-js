/**
 * Convert a typed params object to a query-string-compatible record.
 *
 * Strips `undefined` and `null` values so they are not sent as query parameters.
 * Accepts any object and extracts its own enumerable string-keyed properties.
 */
export function toQuery(
  params: object,
): Record<string, string | number | boolean | undefined> {
  const result: Record<string, string | number | boolean | undefined> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      result[key] = value as string | number | boolean;
    }
  }
  return result;
}
