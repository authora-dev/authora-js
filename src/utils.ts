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
