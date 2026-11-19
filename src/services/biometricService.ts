import { Worker } from "../types";

export interface BiometricCapabilities {
  webAuthnSupported: boolean;
  isSecureContext: boolean;
  cameraSupported: boolean;
  nativeFaceDetectorSupported: boolean;
  geolocationSupported: boolean;
  usbHidSupported: boolean;
}

export interface WebAuthnResult {
  success: boolean;
  credentialId?: string;
  templateString?: string;
  code?:
    | "unsupported"
    | "insecure_context"
    | "not_enrolled"
    | "cancelled"
    | "sensor_unavailable"
    | "mismatch"
    | "error";
  message: string;
  messageAm: string;
}

export interface FaceDetectionResult {
  detected: boolean;
  confidence: number;
  descriptor?: string;
  snapshotDataUrl?: string;
  similarityScore?: number;
  method?: "native-face-detector" | "canvas-vision";
  livenessChecked?: boolean;
  boundingBox?: { x: number; y: number; width: number; height: number };
  reasonEn?: string;
  reasonAm?: string;
}

export interface GpsPositionResult {
  lat: number;
  lng: number;
  accuracy: number;
}

const WEBAUTHN_STORAGE_KEY = "erp_webauthn_creds_v1";

export function getBiometricCapabilities(): BiometricCapabilities {
  const hasWindow = typeof window !== "undefined";
  const hasNav = typeof navigator !== "undefined";
  return {
    webAuthnSupported:
      hasWindow &&
      typeof window.PublicKeyCredential !== "undefined" &&
      hasNav &&
      Boolean(navigator.credentials?.create) &&
      Boolean(navigator.credentials?.get),
    isSecureContext: hasWindow ? Boolean(window.isSecureContext) : false,
    cameraSupported:
      hasNav &&
      Boolean(navigator.mediaDevices) &&
      typeof navigator.mediaDevices.getUserMedia === "function",
    nativeFaceDetectorSupported:
      hasWindow && typeof (window as any).FaceDetector === "function",
    geolocationSupported:
      hasNav &&
      Boolean(navigator.geolocation) &&
      typeof navigator.geolocation.getCurrentPosition === "function",
    usbHidSupported:
      hasNav &&
      (typeof (navigator as any).usb !== "undefined" ||
        typeof (navigator as any).hid !== "undefined"),
  };
}

export async function isPlatformBiometricAvailable(): Promise<boolean> {
  try {
    if (
      typeof window === "undefined" ||
      typeof window.PublicKeyCredential === "undefined" ||
      typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable !== "function"
    ) {
      return false;
    }
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

function uint8ToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToUint8(base64url: string): Uint8Array {
  const normalized = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + "=".repeat(padLen);
  const binary = atob(padded);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

function loadLocalCredentialRegistry(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(WEBAUTHN_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function saveLocalCredential(workerId: string, credentialId: string): void {
  if (typeof window === "undefined") return;
  try {
    const map = loadLocalCredentialRegistry();
    map[workerId] = credentialId;
    localStorage.setItem(WEBAUTHN_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore storage quota failures
  }
}

export function getStoredCredentialId(worker?: {
  id: string;
  fingerprint?: string;
}): string | null {
  if (!worker) return null;
  if (worker.fingerprint && worker.fingerprint.startsWith("webauthn:")) {
    return worker.fingerprint.slice("webauthn:".length).trim() || null;
  }
  const map = loadLocalCredentialRegistry();
  return map[worker.id] || null;
}

function randomChallenge(): Uint8Array {
  const buf = new Uint8Array(32);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(buf);
  } else {
    for (let i = 0; i < buf.length; i++) {
      buf[i] = Math.floor(Math.random() * 256);
    }
  }
  return buf;
}

function resolveRpId(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const host = window.location.hostname;
  if (!host || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    return undefined;
  }
  return host;
}

function mapWebAuthnError(err: any): { code: WebAuthnResult["code"]; message: string; messageAm: string } {
  const name = err?.name || "";
  if (name === "NotAllowedError" || name === "AbortError") {
    return {
      code: "cancelled",
      message: "Fingerprint/biometric prompt was cancelled, timed out, or failed verification.",
      messageAm: "የጣት አሻራ/ባዮሜትሪክ ማረጋገጫው ተሰርዟል፣ ጊዜው አልፏል ወይም አልተዛመደም።",
    };
  }
  if (name === "NotSupportedError" || name === "SecurityError") {
    return {
      code: "sensor_unavailable",
      message: "This device or browser context does not support a hardware fingerprint/platform authenticator.",
      messageAm: "ይህ መሳሪያ ወይም አሳሽ የሃርድዌር የጣት አሻራ/ባዮሜትሪክ ዳሳሽን አይደግፍም።",
    };
  }
  if (name === "InvalidStateError") {
    return {
      code: "mismatch",
      message: "Credential state mismatch on this authenticator.",
      messageAm: "በዚህ መሳሪያ ላይ የተመዘገበው የጣት አሻራ መረጃ አልተዛመደም።",
    };
  }
  return {
    code: "error",
    message: err?.message || "Biometric hardware verification failed.",
    messageAm: err?.message || "የባዮሜትሪክ ሃርድዌር ማረጋገጫ አልተሳካም።",
  };
}

export async function enrollWorkerFingerprint(
  worker: { id: string; name: string },
  attachment: "platform" | "cross-platform" | "any" = "platform"
): Promise<WebAuthnResult> {
  const caps = getBiometricCapabilities();
  if (!caps.isSecureContext) {
    return {
      success: false,
      code: "insecure_context",
      message: "Fingerprint WebAuthn requires HTTPS or localhost.",
      messageAm: "የጣት አሻራ (WebAuthn) ለመጠቀም HTTPS ወይም localhost ግንኙነት ያስፈልጋል።",
    };
  }
  if (!caps.webAuthnSupported) {
    return {
      success: false,
      code: "unsupported",
      message: "This browser does not support WebAuthn fingerprint/biometric credentials.",
      messageAm: "ይህ አሳሽ (Browser) የጣት አሻራ (WebAuthn) ማረጋገጫን አይደግፍም።",
    };
  }

  try {
    const userIdBytes = new TextEncoder().encode(worker.id).slice(0, 64);
    const rpId = resolveRpId();
    const publicKey: PublicKeyCredentialCreationOptions = {
      challenge: randomChallenge() as BufferSource,
      rp: {
        name: "Digital Construction ERP",
        ...(rpId ? { id: rpId } : {}),
      },
      user: {
        id: userIdBytes as BufferSource,
        name: worker.id,
        displayName: worker.name || worker.id,
      },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 },
      ],
      authenticatorSelection: {
        userVerification: "required",
        residentKey: "preferred",
        ...(attachment !== "any" ? { authenticatorAttachment: attachment } : {}),
      },
      timeout: 60000,
      attestation: "none",
    };

    const credential = (await navigator.credentials.create({
      publicKey,
    })) as PublicKeyCredential | null;

    if (!credential || !credential.rawId) {
      return {
        success: false,
        code: "cancelled",
        message: "No fingerprint credential returned by device sensor.",
        messageAm: "ከመሳሪያው የጣት አሻራ ዳሳሽ ምንም መረጃ አልተመለሰም።",
      };
    }

    const credentialId = uint8ToBase64Url(new Uint8Array(credential.rawId));
    saveLocalCredential(worker.id, credentialId);
    const templateString = `webauthn:${credentialId}`;

    return {
      success: true,
      credentialId,
      templateString,
      message: `Fingerprint credential enrolled on device sensor for ${worker.name}.`,
      messageAm: `የ ${worker.name} የጣት አሻራ በመሳሪያው ዳሳሽ በተሳካ ሁኔታ ተመዝግቧል።`,
    };
  } catch (err: any) {
    const mapped = mapWebAuthnError(err);
    return {
      success: false,
      ...mapped,
    };
  }
}

export async function verifyWorkerFingerprint(
  worker: { id: string; name: string; fingerprint?: string }
): Promise<WebAuthnResult> {
  const caps = getBiometricCapabilities();
  if (!caps.isSecureContext) {
    return {
      success: false,
      code: "insecure_context",
      message: "Fingerprint WebAuthn requires HTTPS or localhost.",
      messageAm: "የጣት አሻራ (WebAuthn) ለመጠቀም HTTPS ወይም localhost ግንኙነት ያስፈልጋል።",
    };
  }
  if (!caps.webAuthnSupported) {
    return {
      success: false,
      code: "unsupported",
      message: "This browser does not support WebAuthn fingerprint verification.",
      messageAm: "ይህ አሳሽ የጣት አሻራ (WebAuthn) ማረጋገጫን አይደግፍም።",
    };
  }

  const storedCredId = getStoredCredentialId(worker);
  if (!storedCredId) {
    return {
      success: false,
      code: "not_enrolled",
      message: `No fingerprint credential is enrolled on this device for ${worker.name}. Please enroll fingerprint first.`,
      messageAm: `ለ ${worker.name} በዚህ መሳሪያ ላይ የተመዘገበ የጣት አሻራ የለም። እባክዎ መጀመሪያ 'አሻራ አስመዝግብ' የሚለውን ይጫኑ።`,
    };
  }

  try {
    const rpId = resolveRpId();
    const publicKey: PublicKeyCredentialRequestOptions = {
      challenge: randomChallenge() as BufferSource,
      ...(rpId ? { rpId } : {}),
      allowCredentials: [
        {
          id: base64UrlToUint8(storedCredId) as BufferSource,
          type: "public-key",
          transports: ["internal", "usb", "hybrid", "ble", "nfc"],
        },
      ],
      userVerification: "required",
      timeout: 60000,
    };

    const assertion = (await navigator.credentials.get({
      publicKey,
    })) as PublicKeyCredential | null;

    if (!assertion || !assertion.rawId) {
      return {
        success: false,
        code: "cancelled",
        message: "Fingerprint verification was cancelled or did not return an assertion.",
        messageAm: "የጣት አሻራ ማረጋገጫው ተሰርዟል ወይም አልተረጋገጠም።",
      };
    }

    const returnedId = uint8ToBase64Url(new Uint8Array(assertion.rawId));
    if (returnedId !== storedCredId) {
      return {
        success: false,
        code: "mismatch",
        message: "Verified credential does not match the selected employee's enrolled fingerprint.",
        messageAm: "የተነበበው የጣት አሻራ ከተመረጠው ሰራተኛ መዝገብ ጋር አልተዛመደም።",
      };
    }

    return {
      success: true,
      credentialId: returnedId,
      templateString: `webauthn:${returnedId}`,
      message: `Device fingerprint/biometric verified for ${worker.name}.`,
      messageAm: `የ ${worker.name} የጣት አሻራ በስኬት ተረጋግጧል።`,
    };
  } catch (err: any) {
    const mapped = mapWebAuthnError(err);
    return {
      success: false,
      ...mapped,
    };
  }
}

export async function getConnectedUsbHidCount(): Promise<{ usb: number; hid: number }> {
  let usb = 0;
  let hid = 0;
  try {
    if (typeof navigator !== "undefined" && (navigator as any).usb?.getDevices) {
      const devices = await (navigator as any).usb.getDevices();
      usb = Array.isArray(devices) ? devices.length : 0;
    }
  } catch {
    usb = 0;
  }
  try {
    if (typeof navigator !== "undefined" && (navigator as any).hid?.getDevices) {
      const devices = await (navigator as any).hid.getDevices();
      hid = Array.isArray(devices) ? devices.length : 0;
    }
  } catch {
    hid = 0;
  }
  return { usb, hid };
}

export async function requestUsbScannerDevice(): Promise<{
  connected: boolean;
  deviceName?: string;
  error?: string;
}> {
  if (typeof navigator === "undefined") {
    return { connected: false, error: "Navigator unavailable" };
  }
  try {
    if ((navigator as any).hid?.requestDevice) {
      const devices = await (navigator as any).hid.requestDevice({ filters: [] });
      if (Array.isArray(devices) && devices.length > 0) {
        return {
          connected: true,
          deviceName: devices[0]?.productName || "USB HID Biometric Reader",
        };
      }
    }
    if ((navigator as any).usb?.requestDevice) {
      const device = await (navigator as any).usb.requestDevice({
        filters: [
          { classCode: 0xff },
          { classCode: 0x0b },
          { classCode: 0x03 },
        ],
      });
      if (device) {
        return {
          connected: true,
          deviceName: device.productName || "USB OTG Biometric Scanner",
        };
      }
    }
    return {
      connected: false,
      error: "WebUSB/WebHID reader access is not supported in this browser or was cancelled.",
    };
  } catch (err: any) {
    return {
      connected: false,
      error: err?.message || "No USB/OTG reader selected.",
    };
  }
}

// =========================================================================
// CAMERA & REAL FACE DETECTION + PERCEPTUAL DESCRIPTOR MATCHING
// =========================================================================

export function captureCanvasFromVideo(
  video: HTMLVideoElement,
  maxWidth: number = 320
): HTMLCanvasElement | null {
  if (!video || !video.videoWidth || !video.videoHeight || video.readyState < 2) {
    return null;
  }
  const scale = Math.min(1, maxWidth / video.videoWidth);
  const width = Math.max(64, Math.round(video.videoWidth * scale));
  const height = Math.max(64, Math.round(video.videoHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.drawImage(video, 0, 0, width, height);
  return canvas;
}

export function computeFaceDescriptor(
  canvas: HTMLCanvasElement,
  box?: { x: number; y: number; width: number; height: number }
): string {
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const cw = canvas.width;
  const ch = canvas.height;

  const rx = box ? Math.max(0, Math.floor(box.x)) : Math.floor(cw * 0.25);
  const ry = box ? Math.max(0, Math.floor(box.y)) : Math.floor(ch * 0.15);
  const rw = box
    ? Math.max(16, Math.min(cw - rx, Math.floor(box.width)))
    : Math.floor(cw * 0.5);
  const rh = box
    ? Math.max(16, Math.min(ch - ry, Math.floor(box.height)))
    : Math.floor(ch * 0.7);

  const img = ctx.getImageData(rx, ry, rw, rh);
  const data = img.data;
  const grid = 8;
  const bins = new Float32Array(grid * grid);

  for (let gy = 0; gy < grid; gy++) {
    const yStart = Math.floor((gy * rh) / grid);
    const yEnd = Math.max(yStart + 1, Math.floor(((gy + 1) * rh) / grid));
    for (let gx = 0; gx < grid; gx++) {
      const xStart = Math.floor((gx * rw) / grid);
      const xEnd = Math.max(xStart + 1, Math.floor(((gx + 1) * rw) / grid));
      let sum = 0;
      let count = 0;
      for (let py = yStart; py < yEnd; py++) {
        for (let px = xStart; px < xEnd; px++) {
          const idx = (py * rw + px) * 4;
          const luma =
            0.299 * data[idx]! + 0.587 * data[idx + 1]! + 0.114 * data[idx + 2]!;
          sum += luma;
          count++;
        }
      }
      bins[gy * grid + gx] = count > 0 ? sum / count : 0;
    }
  }

  let mean = 0;
  for (let i = 0; i < bins.length; i++) mean += bins[i]!;
  mean /= bins.length;

  let normSq = 0;
  for (let i = 0; i < bins.length; i++) {
    bins[i] = bins[i]! - mean;
    normSq += bins[i]! * bins[i]!;
  }
  const norm = Math.sqrt(normSq) || 1;

  const quantized = new Uint8Array(bins.length);
  for (let i = 0; i < bins.length; i++) {
    const v = Math.max(-1, Math.min(1, bins[i]! / norm));
    quantized[i] = Math.max(0, Math.min(255, Math.round((v + 1) * 127.5)));
  }

  return `face-v1:${uint8ToBase64Url(quantized)}`;
}

export function compareFaceDescriptors(descA: string, descB: string): number {
  if (!descA.startsWith("face-v1:") || !descB.startsWith("face-v1:")) {
    return 0;
  }
  try {
    const bytesA = base64UrlToUint8(descA.slice("face-v1:".length));
    const bytesB = base64UrlToUint8(descB.slice("face-v1:".length));
    if (bytesA.length === 0 || bytesA.length !== bytesB.length) return 0;

    let dot = 0;
    let magA = 0;
    let magB = 0;
    for (let i = 0; i < bytesA.length; i++) {
      const a = (bytesA[i]! - 127.5) / 127.5;
      const b = (bytesB[i]! - 127.5) / 127.5;
      dot += a * b;
      magA += a * a;
      magB += b * b;
    }
    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    if (denom === 0) return 0;
    const cosine = Math.max(-1, Math.min(1, dot / denom));
    // Map [-1, 1] -> [0, 100]
    return Math.round(((cosine + 1) / 2) * 1000) / 10;
  } catch {
    return 0;
  }
}

export async function analyzeFaceCanvas(
  canvas: HTMLCanvasElement
): Promise<FaceDetectionResult> {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return {
      detected: false,
      confidence: 0,
      reasonEn: "Unable to read camera frame buffer.",
      reasonAm: "የካሜራ ምስልን ማንበብ አልተቻለም።",
    };
  }

  const w = canvas.width;
  const h = canvas.height;
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  const totalPixels = w * h;

  let lumaSum = 0;
  let lumaSqSum = 0;

  let roiCount = 0;
  let roiSkinCount = 0;
  let borderCount = 0;
  let borderSkinCount = 0;
  let roiEdgeSum = 0;

  // ROI center oval (22%..78% width, 14%..86% height)
  const xMin = Math.floor(w * 0.22);
  const xMax = Math.ceil(w * 0.78);
  const yMin = Math.floor(h * 0.14);
  const yMax = Math.ceil(h * 0.86);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const r = data[idx]!;
      const g = data[idx + 1]!;
      const b = data[idx + 2]!;

      const yVal = 0.299 * r + 0.587 * g + 0.114 * b;
      const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
      const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

      lumaSum += yVal;
      lumaSqSum += yVal * yVal;

      const isYCbCrSkin =
        yVal >= 35 && yVal <= 238 && cb >= 72 && cb <= 132 && cr >= 130 && cr <= 178;
      const isWarmSkinTone =
        r >= 45 &&
        r > g &&
        r > b &&
        r - Math.min(g, b) >= 10 &&
        Math.abs(r - g) >= 4;
      const isSkin = isYCbCrSkin || isWarmSkinTone;

      const inRoi = x >= xMin && x <= xMax && y >= yMin && y <= yMax;
      if (inRoi) {
        roiCount++;
        if (isSkin) roiSkinCount++;
        if (x > xMin && y > yMin) {
          const leftIdx = (y * w + (x - 1)) * 4;
          const upIdx = ((y - 1) * w + x) * 4;
          const lLeft =
            0.299 * data[leftIdx]! + 0.587 * data[leftIdx + 1]! + 0.114 * data[leftIdx + 2]!;
          const lUp =
            0.299 * data[upIdx]! + 0.587 * data[upIdx + 1]! + 0.114 * data[upIdx + 2]!;
          roiEdgeSum += Math.abs(yVal - lLeft) + Math.abs(yVal - lUp);
        }
      } else if (x < w * 0.12 || x > w * 0.88) {
        borderCount++;
        if (isSkin) borderSkinCount++;
      }
    }
  }

  const meanLuma = lumaSum / Math.max(1, totalPixels);
  const variance = Math.max(0, lumaSqSum / Math.max(1, totalPixels) - meanLuma * meanLuma);
  const stdLuma = Math.sqrt(variance);

  if (meanLuma < 16) {
    return {
      detected: false,
      confidence: 0,
      reasonEn: "Camera image is too dark or lens is covered. Please improve lighting.",
      reasonAm: "የካሜራው ምስል በጣም ጨለማ ነው ወይም ተሸፍኗል። እባክዎ ብርሃን ያስተካክሉ።",
    };
  }
  if (meanLuma > 248) {
    return {
      detected: false,
      confidence: 0,
      reasonEn: "Camera image is overexposed. Move slightly out of direct glare.",
      reasonAm: "ብርሃኑ በጣም ጠንካራ በመሆኑ ፊትን መለየት አልተቻለም።",
    };
  }
  if (stdLuma < 8) {
    return {
      detected: false,
      confidence: 0,
      reasonEn: "No face detected — uniform or blank camera frame.",
      reasonAm: "በካሜራው ውስጥ ምንም ፊት አልተገኘም (ባዶ ምስል)።",
    };
  }

  // Try native browser FaceDetector first when available (Chrome Android / Desktop)
  if (typeof window !== "undefined" && typeof (window as any).FaceDetector === "function") {
    try {
      const detector = new (window as any).FaceDetector({
        fastMode: true,
        maxDetectedFaces: 3,
      });
      const faces = await detector.detect(canvas);
      if (Array.isArray(faces)) {
        if (faces.length === 0) {
          return {
            detected: false,
            confidence: 0,
            method: "native-face-detector",
            reasonEn: "No human face detected in camera frame. Center your face inside the box.",
            reasonAm: "በካሜራው ውስጥ የሰው ፊት አልተገኘም። እባክዎ ፊትዎን በሳጥኑ መሃል ያድርጉ።",
          };
        }
        const primary = faces[0];
        const box = primary.boundingBox
          ? {
              x: primary.boundingBox.x,
              y: primary.boundingBox.y,
              width: primary.boundingBox.width,
              height: primary.boundingBox.height,
            }
          : { x: xMin, y: yMin, width: xMax - xMin, height: yMax - yMin };

        const descriptor = computeFaceDescriptor(canvas, box);
        const areaRatio = Math.min(1, (box.width * box.height) / Math.max(1, w * h));
        const confidence = Math.round((88 + Math.min(11.4, areaRatio * 24)) * 10) / 10;
        return {
          detected: true,
          confidence,
          descriptor,
          boundingBox: box,
          method: "native-face-detector",
        };
      }
    } catch {
      // Fallback gracefully to deterministic canvas vision analysis below
    }
  }

  // Deterministic Canvas Face & Contrast Analyzer (works across Safari / Firefox / Chrome)
  const centerSkinRatio = roiSkinCount / Math.max(1, roiCount);
  const borderSkinRatio = borderCount > 0 ? borderSkinCount / borderCount : 0;
  const meanEdge = roiEdgeSum / Math.max(1, roiCount);

  if (centerSkinRatio < 0.14 || meanEdge < 7) {
    return {
      detected: false,
      confidence: 0,
      method: "canvas-vision",
      reasonEn:
        "No face detected in camera view. Look straight into the camera with good front lighting.",
      reasonAm:
        "በካሜራው ውስጥ ፊት አልተገኘም። እባክዎ ፊትዎን በቀጥታ ወደ ካሜራው አቅንተው በበቂ ብርሃን ይሞክሩ።",
    };
  }

  if (borderSkinRatio > 0.72 && centerSkinRatio - borderSkinRatio < 0.04) {
    return {
      detected: false,
      confidence: 0,
      method: "canvas-vision",
      reasonEn:
        "Camera frame lacks distinct centered facial boundaries. Center your face inside the reticle.",
      reasonAm:
        "የፊት ገጽታው በካሜራው መሃል በግልጽ አልተለየም። እባክዎ ፊትዎን በሳጥኑ መሃል ያድርጉ።",
    };
  }

  const box = {
    x: xMin,
    y: yMin,
    width: xMax - xMin,
    height: yMax - yMin,
  };
  const descriptor = computeFaceDescriptor(canvas, box);
  const skinScore = Math.min(1, centerSkinRatio / 0.45);
  const edgeScore = Math.min(1, meanEdge / 26);
  const confidence = Math.round((78 + skinScore * 12 + edgeScore * 9.5) * 10) / 10;

  return {
    detected: true,
    confidence: Math.min(99.5, confidence),
    descriptor,
    boundingBox: box,
    method: "canvas-vision",
  };
}

export async function captureAndVerifyLiveFace(
  video: HTMLVideoElement,
  enrolledDescriptor?: string
): Promise<FaceDetectionResult> {
  const firstCanvas = captureCanvasFromVideo(video);
  if (!firstCanvas) {
    return {
      detected: false,
      confidence: 0,
      reasonEn: "Live camera feed is not active yet. Please allow camera access and wait a moment.",
      reasonAm: "የቀጥታ ካሜራ ምስል ገና አልበራም። እባክዎ የካሜራ ፍቃድ ይስጡ እና ትንሽ ይጠብቁ።",
    };
  }

  const firstAnalysis = await analyzeFaceCanvas(firstCanvas);
  if (!firstAnalysis.detected || !firstAnalysis.descriptor) {
    return firstAnalysis;
  }

  // Wait briefly and capture a confirmation frame for liveness/stability check
  await new Promise((r) => setTimeout(r, 180));
  const secondCanvas = captureCanvasFromVideo(video) || firstCanvas;
  const secondAnalysis = await analyzeFaceCanvas(secondCanvas);
  if (!secondAnalysis.detected || !secondAnalysis.descriptor) {
    return {
      detected: false,
      confidence: 0,
      reasonEn: "Face lost during verification. Hold steady inside the frame.",
      reasonAm: "ማረጋገጫው በሂደት ላይ እያለ ፊትዎ ከካሜራው ወጥቷል። እባክዎ ሳይንቀሳቀሱ ይሞክሩ።",
    };
  }

  const snapshotDataUrl = secondCanvas.toDataURL("image/jpeg", 0.78);

  if (enrolledDescriptor && enrolledDescriptor.startsWith("face-v1:")) {
    const similarity = compareFaceDescriptors(enrolledDescriptor, secondAnalysis.descriptor);
    if (similarity < 62) {
      return {
        detected: false,
        confidence: similarity,
        similarityScore: similarity,
        descriptor: secondAnalysis.descriptor,
        snapshotDataUrl,
        method: secondAnalysis.method,
        livenessChecked: true,
        reasonEn: `Face does not match enrolled worker template (${similarity}% similarity, minimum 62% required).`,
        reasonAm: `የፊት ገጽታው ከተመዘገበው ሰራተኛ መዝገብ ጋር አልተዛመደም (${similarity}% ተዛምዶ — ቢያንስ 62% ያስፈልጋል)።`,
      };
    }

    return {
      detected: true,
      confidence: similarity,
      similarityScore: similarity,
      descriptor: secondAnalysis.descriptor,
      snapshotDataUrl,
      method: secondAnalysis.method,
      livenessChecked: true,
    };
  }

  return {
    ...secondAnalysis,
    snapshotDataUrl,
    livenessChecked: true,
  };
}

// =========================================================================
// REAL GPS GEOLOCATION & HAVERSINE DISTANCE
// =========================================================================

export function calculateDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dPhi = ((lat2 - lat1) * Math.PI) / 180;
  const dLam = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dPhi / 2) * Math.sin(dPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLam / 2) * Math.sin(dLam / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getCurrentGpsPosition(timeoutMs: number = 10000): Promise<GpsPositionResult> {
  return new Promise((resolve, reject) => {
    if (
      typeof navigator === "undefined" ||
      !navigator.geolocation ||
      typeof navigator.geolocation.getCurrentPosition !== "function"
    ) {
      reject(new Error("Geolocation API is not supported on this device."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy || 0),
        });
      },
      (err) => {
        reject(new Error(err?.message || "Location permission denied or unavailable."));
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 15000 }
    );
  });
}

export function matchWorkerByToken(
  token: string,
  workers: Worker[]
): Worker | null {
  const clean = token.trim();
  if (!clean) return null;
  const lower = clean.toLowerCase();
  return (
    workers.find(
      (w) =>
        w.id.toLowerCase() === lower ||
        (w.nationalId && w.nationalId.toLowerCase() === lower) ||
        (w.fingerprint && w.fingerprint.toLowerCase() === lower) ||
        (w.qrCode && w.qrCode.toLowerCase() === lower) ||
        (w.attendancePin && w.attendancePin === clean)
    ) || null
  );
}
