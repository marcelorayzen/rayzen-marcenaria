export type SupabaseConfigurationIssue =
  | "missing-url"
  | "missing-publishable-key"
  | "invalid-url"
  | "unsafe-key";

export interface PublicSupabaseConfiguration {
  url: string;
  publishableKey: string;
}

export type PublicSupabaseConfigurationResult =
  | { configured: true; configuration: PublicSupabaseConfiguration }
  | { configured: false; issue: SupabaseConfigurationIssue };

function legacyJwtRole(key: string): string | undefined {
  const payload = key.split(".")[1];
  if (!payload) return undefined;

  try {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    let buffer = 0;
    let bits = 0;
    let decodedText = "";

    for (const character of payload) {
      const value = alphabet.indexOf(character);
      if (value < 0) return undefined;
      buffer = (buffer << 6) | value;
      bits += 6;
      while (bits >= 8) {
        bits -= 8;
        decodedText += String.fromCharCode((buffer >> bits) & 0xff);
      }
    }

    const decoded = JSON.parse(decodedText) as { role?: unknown };
    return typeof decoded.role === "string" ? decoded.role : undefined;
  } catch {
    return undefined;
  }
}

function isPrivilegedKey(key: string): boolean {
  return (
    key.startsWith("sb_secret_") ||
    key.includes("service_role") ||
    legacyJwtRole(key) === "service_role"
  );
}

/**
 * Validates only browser-safe Supabase configuration. It deliberately does
 * not contact Supabase and refuses known privileged credentials, so a Vite
 * build cannot silently turn a server secret into a browser value.
 */
export function validatePublicSupabaseConfiguration(input: {
  url?: string;
  publishableKey?: string;
}): PublicSupabaseConfigurationResult {
  const url = input.url?.trim() ?? "";
  const publishableKey = input.publishableKey?.trim() ?? "";

  if (!url) return { configured: false, issue: "missing-url" };
  if (!publishableKey) return { configured: false, issue: "missing-publishable-key" };

  try {
    const match = /^(https?):\/\/([^/?#\s]+)(?:[/?#]|$)/i.exec(url);
    if (!match || match[2].includes("@")) {
      return { configured: false, issue: "invalid-url" };
    }
  } catch {
    return { configured: false, issue: "invalid-url" };
  }

  if (isPrivilegedKey(publishableKey)) {
    return { configured: false, issue: "unsafe-key" };
  }

  return { configured: true, configuration: { url, publishableKey } };
}
