function matchSegment(pattern: string, value: string): boolean {
  if (pattern === '*') return true;
  if (pattern.endsWith('*')) return value.startsWith(pattern.slice(0, -1));
  return pattern === value;
}

export function matchPermission(pattern: string, resource: string): boolean {
  const p = pattern.split(':');
  const r = resource.split(':');
  if (p.length !== r.length) return false;
  return p.every((seg, i) => matchSegment(seg, r[i]));
}

export function matchAnyPermission(patterns: string[], resource: string): boolean {
  return patterns.some((p) => matchPermission(p, resource));
}
