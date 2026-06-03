const ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
};

export function escapeHtml(str: string): string {
  return str.replace(/[&<>"'/]/g, (ch) => ESCAPE_MAP[ch] || ch);
}

const ALLOWED_SCHEMES = ['http:', 'https:', 'mailto:', 'tel:'];

export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url.trim());
    if (ALLOWED_SCHEMES.includes(parsed.protocol)) {
      return parsed.toString();
    }
  } catch {
    const httpsMatch = url.trim().match(/^https?:\/\//i);
    if (httpsMatch) return url.trim();
    const mailtoMatch = url.trim().match(/^mailto:/i);
    if (mailtoMatch) return url.trim();
    const telMatch = url.trim().match(/^tel:/i);
    if (telMatch) return url.trim();
  }
  return '';
}

export function sanitizePhone(phone: string): string {
  return phone.replace(/[^+\d\s\-()]/g, '').trim();
}

export function sanitizeStationName(name: string): string {
  return name.replace(/[<>&"'/]/g, '').trim().slice(0, 200);
}

export function sanitizeAddress(addr: string): string {
  return addr.replace(/[<>&"'/]/g, '').trim().slice(0, 500);
}

export function validateRequired(value: string, label: string): string | null {
  if (!value.trim()) return `${label} is required.`;
  return null;
}

export function validateLength(value: string, label: string, max: number): string | null {
  if (value.trim().length > max) return `${label} must be ${max} characters or less.`;
  return null;
}

export function validateCoordinates(lat: number | null, lng: number | null): string | null {
  if (lat === null || lng === null) return 'Coordinates are required.';
  if (lat < -90 || lat > 90) return 'Invalid latitude.';
  if (lng < -180 || lng > 180) return 'Invalid longitude.';
  return null;
}

export function sanitizeForDb(value: string): string {
  return value.replace(/[^\p{L}\p{N}\s\-.,:;!?@#$%&*()_+=/\\[\]{}'"`~|]/gu, '').trim();
}
