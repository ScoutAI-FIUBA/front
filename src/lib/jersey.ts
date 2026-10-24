/** Jersey numbers compare by value: "07" and "7" are the same number. "0" and "00" stay distinct. */
export function normalizeJerseyNumber(value: string): string {
  const text = value.trim()
  return /^[0-9]+$/.test(text) && /[1-9]/.test(text) ? text.replace(/^0+/, '') : text
}
