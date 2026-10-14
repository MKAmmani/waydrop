/**
 * Nigerian phone numbers. People type them every way: 0803..., 803..., +234803..., 234 803...
 * We keep the 10 national digits and show them as "803 123 4567".
 */
export function nationalDigits(input: string): string {
  let d = input.replace(/\D/g, "");
  if (d.startsWith("234")) d = d.slice(3);
  if (d.startsWith("0")) d = d.slice(1);
  return d.slice(0, 10);
}

export function formatNational(digits: string): string {
  const d = digits.slice(0, 10);
  return [d.slice(0, 3), d.slice(3, 6), d.slice(6)].filter(Boolean).join(" ");
}

/** Mobile prefixes start with 7, 8 or 9 once the leading 0 is dropped (070x, 080x, 081x, 090x, 091x). */
export function isValidNational(digits: string): boolean {
  return /^[789][01]\d{8}$/.test(digits);
}

export const toE164 = (digits: string) => `+234${digits}`;
export const pretty = (digits: string) => `+234 ${formatNational(digits)}`;
