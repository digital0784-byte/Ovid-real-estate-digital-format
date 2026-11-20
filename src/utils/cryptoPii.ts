/**
 * Client-side Web Crypto AES-GCM encryption utility for sensitive HRM personal,
 * banking, Fayda ID, and biometric template fields.
 */

const ENC_PREFIX = "enc:v1:";
const KEY_MATERIAL_SEED = "OVID-ERP-HRM-PII-AES256-KEY-2026-V1";

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  if (typeof btoa === "function") {
    return btoa(binary);
  }
  return Buffer.from(bytes).toString("base64");
}

function fromBase64(b64: string): Uint8Array {
  if (typeof atob === "function") {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      out[i] = bin.charCodeAt(i);
    }
    return out;
  }
  return new Uint8Array(Buffer.from(b64, "base64"));
}

let cachedCryptoKey: CryptoKey | null = null;

async function getAesGcmKey(): Promise<CryptoKey | null> {
  if (cachedCryptoKey) return cachedCryptoKey;
  const cryptoApi = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (!cryptoApi?.subtle) return null;

  const rawSeed = new TextEncoder().encode(KEY_MATERIAL_SEED);
  const digest = await cryptoApi.subtle.digest("SHA-256", rawSeed);
  cachedCryptoKey = await cryptoApi.subtle.importKey(
    "raw",
    digest,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
  return cachedCryptoKey;
}

export function isEncryptedSensitiveValue(value?: string | null): boolean {
  return typeof value === "string" && value.startsWith(ENC_PREFIX);
}

export async function encryptSensitiveText(plainText?: string | null): Promise<string> {
  const clean = String(plainText ?? "").trim();
  if (!clean) return "";
  if (isEncryptedSensitiveValue(clean)) return clean;

  const cryptoApi = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  const key = await getAesGcmKey();
  if (!cryptoApi?.subtle || !key) {
    // Fallback deterministic UTF-8 envelope when WebCrypto subtle is unavailable
    const encoded = new TextEncoder().encode(clean);
    return `${ENC_PREFIX}raw:${toBase64(encoded)}`;
  }

  const iv = cryptoApi.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(clean);
  const cipherBuf = await cryptoApi.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded
  );
  return `${ENC_PREFIX}${toBase64(iv)}:${toBase64(new Uint8Array(cipherBuf))}`;
}

export async function decryptSensitiveText(cipherText?: string | null): Promise<string> {
  const raw = String(cipherText ?? "").trim();
  if (!raw) return "";
  if (!isEncryptedSensitiveValue(raw)) return raw;

  const payload = raw.slice(ENC_PREFIX.length);
  if (payload.startsWith("raw:")) {
    try {
      const bytes = fromBase64(payload.slice(4));
      return new TextDecoder().decode(bytes);
    } catch {
      return "";
    }
  }

  const parts = payload.split(":");
  if (parts.length !== 2) return "";

  const key = await getAesGcmKey();
  const cryptoApi = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (!cryptoApi?.subtle || !key) return "";

  try {
    const iv = fromBase64(parts[0]!);
    const cipherBytes = fromBase64(parts[1]!);
    const plainBuf = await cryptoApi.subtle.decrypt(
      { name: "AES-GCM", iv: iv as BufferSource },
      key,
      cipherBytes as BufferSource
    );
    return new TextDecoder().decode(plainBuf);
  } catch {
    return "";
  }
}

export function buildMaskedPreview(plainText?: string | null, keepLast = 4): string {
  const clean = String(plainText ?? "").trim();
  if (!clean) return "";
  if (isEncryptedSensitiveValue(clean)) return "******** (Encrypted)";
  if (clean.length <= keepLast) return "*".repeat(clean.length);
  return `${"*".repeat(Math.max(4, clean.length - keepLast))}${clean.slice(-keepLast)}`;
}

export async function hashSensitiveIdentifier(value?: string | null): Promise<string> {
  const normalized = String(value ?? "").trim().replace(/[\s-]+/g, "").toUpperCase();
  if (!normalized || normalized.includes("*")) return "";
  const cryptoApi = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  const bytes = new TextEncoder().encode(`OVID-ID-HASH:${normalized}`);
  if (cryptoApi?.subtle) {
    const digest = await cryptoApi.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  return `h:${toBase64(bytes)}`;
}

