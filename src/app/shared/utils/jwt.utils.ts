export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payloadBase64 = token.split('.')[1];
    if (!payloadBase64) return null;

    const normalized = payloadBase64.replaceAll('-', '+').replaceAll('_', '/');
    const padLength = (4 - (normalized.length % 4)) % 4;
    const padded = normalized + '='.repeat(padLength);
    const payloadJson = decodeURIComponent(
      atob(padded)
        .split('')
        .map(c => '%' + ('00' + c.codePointAt(0)!.toString(16)).slice(-2))
        .join('')
    );

    return JSON.parse(payloadJson) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  const exp = payload?.['exp'];

  if (typeof exp !== 'number') {
    return false;
  }

  return exp * 1000 <= Date.now();
}
