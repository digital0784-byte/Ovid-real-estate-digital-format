/**
 * Central Data Formatting and Normalization Utilities
 * Prevents runtime crashes from undefined/null property access on Firestore data.
 */

/**
 * Parses financial amount from numbers or strings (e.g., "ETB 1,850,000", "240000", 15400000).
 * Returns null if the value is missing, empty, or unparseable, ensuring missing data is not masked as zero.
 */
export function parseMoney(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  if (typeof value === "number") {
    return isNaN(value) ? null : value;
  }
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.-]/g, "");
    if (!cleaned) return null;
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

/**
 * Formats monetary amounts safely with ETB or specified currency prefix.
 * If value is missing or unparseable, returns the fallback string (default: "ETB —")
 * so missing business records are never misrepresented as ETB 0.
 */
export function formatCurrency(
  value: unknown, 
  currency = "ETB", 
  fallback = "ETB —"
): string {
  const parsed = parseMoney(value);
  if (parsed === null) {
    return fallback;
  }
  return `${currency} ${parsed.toLocaleString()}`;
}

/**
 * Formats a generic count or quantity safely with toLocaleString().
 * Returns fallback (default: "—") when value is null or undefined.
 */
export function formatNumber(
  value: unknown, 
  fallback = "—"
): string {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }
  const num = typeof value === "number" ? value : Number(value);
  if (isNaN(num)) {
    return fallback;
  }
  return num.toLocaleString();
}

/**
 * Safely calls .toFixed() on potentially null or undefined numeric values.
 */
export function safeToFixed(
  value: unknown, 
  digits = 2, 
  fallback = "0.00"
): string {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }
  const num = typeof value === "number" ? value : Number(value);
  if (isNaN(num)) {
    return fallback;
  }
  return num.toFixed(digits);
}

/**
 * Safely trims and converts string values to lowercase for searches and comparisons.
 */
export function safeLowerCase(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).toLowerCase().trim();
}

/**
 * Safely retrieves a displayable string name or label.
 */
export function safeString(value: unknown, fallback = ""): string {
  if (value === null || value === undefined) return fallback;
  const str = String(value).trim();
  return str.length > 0 ? str : fallback;
}
