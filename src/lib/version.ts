export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";

export const RELEASES_URL = "https://github.com/jwposton/tvminder/releases";

function parseVersion(version: string): number[] {
  return version
    .replace(/^v/i, "")
    .split(".")
    .map((part) => parseInt(part, 10) || 0);
}

export function isNewerVersion(latest: string, current: string): boolean {
  const a = parseVersion(latest);
  const b = parseVersion(current);
  const len = Math.max(a.length, b.length);

  for (let i = 0; i < len; i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff > 0) return true;
    if (diff < 0) return false;
  }
  return false;
}
