export function safeInternalPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return null;
  }

  try {
    const base = "https://cerise.local";
    const parsed = new URL(value, base);
    return parsed.origin === base
      ? `${parsed.pathname}${parsed.search}${parsed.hash}`
      : null;
  } catch {
    return null;
  }
}
