import { BiometricDeviceProtocolType } from "../types";

export interface ZKTecoHardwareProfile {
  id: string;
  manufacturer: "ZKTeco";
  model: "G3 Pro" | "MB360 Plus";
  displayName: string;
  supportedCapabilities: string[];
  recommendedProtocol: BiometricDeviceProtocolType;
  supportedProtocols: BiometricDeviceProtocolType[];
  admsPath: string;
  tcpDefaultPort: number;
  networkGuidance: string;
  admsSetupSteps: string[];
}

export const ZKTECO_VERIFIED_HARDWARE_PROFILES: ZKTecoHardwareProfile[] = [
  {
    id: "zkteco-g3-pro",
    manufacturer: "ZKTeco",
    model: "G3 Pro",
    displayName: "ZKTeco G3 Pro (Face / Fingerprint / Palm)",
    supportedCapabilities: ["Face", "Fingerprint", "Palm", "RFID Card", "PIN"],
    recommendedProtocol: "ADMS_PUSH_HTTP",
    supportedProtocols: ["ADMS_PUSH_HTTP", "TCP_4370_SITE_BRIDGE"],
    admsPath: "/iclock/cdata",
    tcpDefaultPort: 4370,
    networkGuidance:
      "Use outbound ADMS HTTP/HTTPS Push (/iclock/cdata) when the terminal operates on a separate construction-site cellular/ISP network without static IP or router port forwarding. Use TCP Port 4370 only via an on-site LAN Relay Bridge or site-to-site VPN.",
    admsSetupSteps: [
      "Open Comm. -> Cloud Server Setting (ADMS) on the ZKTeco G3 Pro terminal.",
      "Set Server Mode = ADMS, Enable Domain Name = ON, and point Server Address to this ERP host (HTTPS port 443) with request path /iclock/cdata.",
      "Verify the exact Device Serial Number (Sys Info -> Device Info -> Serial Num) matches the registered device Serial Number in Employee Biometric Mapping.",
      "Enroll employees locally on the G3 Pro and enter only their numeric Device User ID (PIN) into Employee Biometric Mapping (never store templates in ERP).",
    ],
  },
  {
    id: "zkteco-mb360-plus",
    manufacturer: "ZKTeco",
    model: "MB360 Plus",
    displayName: "ZKTeco MB360 Plus (Face / Fingerprint / Card)",
    supportedCapabilities: ["Face", "Fingerprint", "RFID Card", "PIN"],
    recommendedProtocol: "ADMS_PUSH_HTTP",
    supportedProtocols: ["ADMS_PUSH_HTTP", "TCP_4370_SITE_BRIDGE"],
    admsPath: "/iclock/cdata",
    tcpDefaultPort: 4370,
    networkGuidance:
      "Supports ADMS Cloud Push (/iclock/cdata) across separate site WAN networks as well as TCP Port 4370 standalone pull inside local LAN/VPN or through an on-site Site Relay Bridge.",
    admsSetupSteps: [
      "Open Comm. -> Cloud Server Setting on the ZKTeco MB360 Plus terminal.",
      "Configure Server Address / Domain to this ERP host over HTTPS (path /iclock/cdata) or configure an on-site LAN Relay Bridge pulling TCP 4370 locally.",
      "Copy the MB360 Plus Serial Number into the registered Biometric Device record in HRM -> Employee Biometric Mapping.",
      "Map each enrolled worker's MB360 Plus PIN (Biometric User ID) to their existing ERP Employee ID.",
    ],
  },
];

export type ZKTecoPunchType =
  | "Check-In"
  | "Check-Out"
  | "Lunch-Out"
  | "Lunch-In"
  | "Unknown";

export interface ZKTecoNormalizedEvent {
  eventFingerprint: string;
  deviceSerialNumber: string;
  deviceId?: string;
  biometricUserId: string;
  eventTime: string; // ISO UTC string
  rawDeviceTimestamp: string;
  punchType: ZKTecoPunchType;
  verifyModeLabel: string;
  workCode?: string;
  sourceProtocol: BiometricDeviceProtocolType;
  receivedAt: string;
}

export interface ZKTecoParseResult {
  events: ZKTecoNormalizedEvent[];
  skippedTemplateLines: number;
  rejectedMalformedLines: number;
}

const FORBIDDEN_SECRET_OR_TEMPLATE_KEY_REGEX =
  /password|passwd|pwd|commkey|secret|token|apikey|api_key|pushkey|template|biodata|tmp|facepic|userpic|fptmp|facetemp|fingerprint|facerecognitiondata/i;

export function sanitizeBiometricMetadata<T = Record<string, any>>(input: T): T {
  if (input === null || input === undefined) return input;
  if (Array.isArray(input)) {
    return input.map((item) => sanitizeBiometricMetadata(item)) as unknown as T;
  }
  if (typeof input !== "object") {
    return input;
  }
  const out: Record<string, any> = {};
  for (const [key, value] of Object.entries(input as Record<string, any>)) {
    if (FORBIDDEN_SECRET_OR_TEMPLATE_KEY_REGEX.test(key)) {
      continue;
    }
    if (typeof value === "object" && value !== null) {
      out[key] = sanitizeBiometricMetadata(value);
    } else if (typeof value === "string" && value.length > 512) {
      // Prevent oversized base64/binary blobs from leaking via arbitrary string fields
      out[key] = value.slice(0, 512);
    } else {
      out[key] = value;
    }
  }
  return out as T;
}

export function buildBiometricEventFingerprint(
  deviceKey: string,
  biometricUserId: string,
  eventTimeIso: string,
  punchType: string
): string {
  const cleanDev = String(deviceKey || "").trim().toLowerCase();
  const cleanBio = String(biometricUserId || "").trim().toLowerCase();
  const cleanTs = String(eventTimeIso || "").trim();
  const cleanType = String(punchType || "Unknown").trim().toLowerCase();
  return `${cleanDev}::${cleanBio}::${cleanTs}::${cleanType}`;
}

export function mapZKTecoStatusCode(codeRaw: string | number | undefined): ZKTecoPunchType {
  const code = String(codeRaw ?? "").trim();
  switch (code) {
    case "0":
    case "4":
    case "Check-In":
    case "IN":
      return "Check-In";
    case "1":
    case "5":
    case "Check-Out":
    case "OUT":
      return "Check-Out";
    case "2":
    case "Lunch-Out":
      return "Lunch-Out";
    case "3":
    case "Lunch-In":
      return "Lunch-In";
    default:
      return "Unknown";
  }
}

export function mapZKTecoVerifyMode(codeRaw: string | number | undefined): string {
  const code = String(codeRaw ?? "").trim();
  switch (code) {
    case "0":
      return "Password/PIN";
    case "1":
      return "Fingerprint";
    case "2":
      return "Card";
    case "3":
      return "Password";
    case "4":
      return "RFID Card";
    case "15":
      return "Face";
    case "25":
      return "Palm";
    default:
      return code ? `Mode ${code}` : "Terminal";
  }
}

/**
 * Normalizes a ZKTeco device timestamp string (typically "YYYY-MM-DD HH:MM:SS" in site local Addis Ababa time UTC+03:00)
 * or ISO-8601 timestamp into a canonical UTC ISO string.
 */
export function normalizeZKTecoTimestampToIso(
  rawTimestamp: string,
  defaultUtcOffset = "+03:00"
): string | null {
  const trimmed = String(rawTimestamp || "").trim();
  if (!trimmed) return null;

  // Already has timezone info (Z or +HH:MM / -HH:MM)
  if (/(Z|[+-]\d{2}:?\d{2})$/i.test(trimmed)) {
    const parsed = new Date(trimmed);
    return isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  // Standard ZKTeco ATTLOG timestamp: "YYYY-MM-DD HH:MM:SS" or "YYYY-MM-DDTHH:MM:SS"
  const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}(?::\d{2})?)$/.exec(trimmed);
  if (m) {
    const timePart = m[2].length === 5 ? `${m[2]}:00` : m[2];
    const parsed = new Date(`${m[1]}T${timePart}${defaultUtcOffset}`);
    return isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  const fallback = new Date(trimmed);
  return isNaN(fallback.getTime()) ? null : fallback.toISOString();
}

const TEMPLATE_LINE_PREFIX_REGEX =
  /^(BIODATA|FP\b|FACE\b|TMP\b|USERPIC|OPFACE|OPLOG\s+TMP|TEMPLATE)/i;

/**
 * Parses ZKTeco ADMS HTTP PUSH ATTLOG payload (tab-separated or comma-separated lines).
 * Strict privacy guard: never extracts or returns raw fingerprint, face, palm, or password blobs.
 */
export function parseZKTecoAdmsAttLog(
  rawText: string,
  options: {
    deviceSerialNumber: string;
    deviceId?: string;
    sourceProtocol?: BiometricDeviceProtocolType;
    defaultUtcOffset?: string;
  }
): ZKTecoParseResult {
  const serial = String(options.deviceSerialNumber || "").trim();
  const sourceProtocol = options.sourceProtocol || "ADMS_PUSH_HTTP";
  const receivedAt = new Date().toISOString();
  const events: ZKTecoNormalizedEvent[] = [];
  const seenInBatch = new Set<string>();
  let skippedTemplateLines = 0;
  let rejectedMalformedLines = 0;

  if (!rawText || !serial) {
    return { events, skippedTemplateLines, rejectedMalformedLines };
  }

  const lines = String(rawText)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  for (const line of lines) {
    // Strip/reject any biometric template or user photo/credential payload line immediately
    if (
      TEMPLATE_LINE_PREFIX_REGEX.test(line) ||
      /\b(TMP|FINGERTMP|FACETMP|BIODATA|USERPIC|PASSWD|PASSWORD)=/i.test(line)
    ) {
      skippedTemplateLines += 1;
      continue;
    }

    // Support both official ADMS tab-delimited rows and CSV USB/export rows
    const parts = line.includes("\t")
      ? line.split("\t").map((p) => p.trim())
      : line.split(",").map((p) => p.trim());

    if (parts.length < 2) {
      rejectedMalformedLines += 1;
      continue;
    }

    // Ignore header row if CSV export has headers like "PIN,Time,Status"
    if (/^(pin|user_?id|biometric_?user_?id|ac-no\.?)$/i.test(parts[0])) {
      continue;
    }

    const biometricUserId = parts[0];
    const rawTs = parts[1];
    const statusCode = parts[2];
    const verifyCode = parts[3];
    const workCode = parts[4];

    if (!biometricUserId || biometricUserId.length > 64) {
      rejectedMalformedLines += 1;
      continue;
    }

    const isoTime = normalizeZKTecoTimestampToIso(rawTs, options.defaultUtcOffset || "+03:00");
    if (!isoTime) {
      rejectedMalformedLines += 1;
      continue;
    }

    const punchType = mapZKTecoStatusCode(statusCode);
    const fingerprint = buildBiometricEventFingerprint(
      options.deviceId || serial,
      biometricUserId,
      isoTime,
      punchType
    );

    if (seenInBatch.has(fingerprint)) {
      continue;
    }
    seenInBatch.add(fingerprint);

    events.push({
      eventFingerprint: fingerprint,
      deviceSerialNumber: serial,
      deviceId: options.deviceId,
      biometricUserId,
      eventTime: isoTime,
      rawDeviceTimestamp: rawTs,
      punchType,
      verifyModeLabel: mapZKTecoVerifyMode(verifyCode),
      workCode: workCode && workCode !== "0" ? workCode : undefined,
      sourceProtocol,
      receivedAt,
    });
  }

  return { events, skippedTemplateLines, rejectedMalformedLines };
}
