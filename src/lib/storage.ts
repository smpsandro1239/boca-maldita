export function readSession(key: string): string | null {
  return typeof sessionStorage === 'undefined' ? null : sessionStorage.getItem(key);
}

export function writeSession(key: string, value: string): void {
  if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(key, value);
}