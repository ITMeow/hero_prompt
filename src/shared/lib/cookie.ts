/**
 * Browser-side cookie utilities
 * Note: Next.js doesn't provide client-side cookie helpers.
 * We use standard browser APIs for client components.
 */

/**
 * Get a cookie value by name (client-side only)
 * @param name Cookie name
 * @returns Cookie value or empty string if not found
 */
export function getCookie(name: string): string {
  if (typeof document === 'undefined') return '';

  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);

  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || '';
  }

  return '';
}

/**
 * Set a cookie (client-side only)
 * @param name Cookie name
 * @param value Cookie value
 * @param days Cookie expiration in days (optional)
 */
export function setCookie(name: string, value: string, days?: number): void {
  if (typeof document === 'undefined') return;

  let expires = '';
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    expires = `; expires=${date.toUTCString()}`;
  }

  document.cookie = `${name}=${value}${expires}; path=/`;
}

/**
 * Delete a cookie (client-side only)
 * @param name Cookie name
 */
export function deleteCookie(name: string): void {
  if (typeof document === 'undefined') return;

  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}
