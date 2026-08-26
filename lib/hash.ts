/**
 * Small, fast, non-cryptographic string hash (FNV-1a, 32-bit) rendered as
 * base-36. Used only to key the report cache by its summary payload — collision
 * resistance beyond "different summaries → different keys in practice" isn't
 * required, and avoiding a crypto dependency keeps this usable on the edge.
 */

export function hashString(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/** Stable hash of a JSON-serializable value. */
export function hashObject(value: unknown): string {
  return hashString(JSON.stringify(value));
}
