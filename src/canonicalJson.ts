/**
 * Serializes a JSON-compatible value with object keys sorted recursively.
 * Postgres `jsonb` does not preserve key order, so remote rows must be
 * compared by content, never by the raw `JSON.stringify` order.
 */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(normalize(value));
}

export function sameCanonicalJson(left: unknown, right: unknown): boolean {
  return canonicalJson(left) === canonicalJson(right);
}

function normalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(item => (item === undefined ? null : normalize(item)));
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort()) {
      if (record[key] !== undefined) sorted[key] = normalize(record[key]);
    }
    return sorted;
  }
  return value;
}
