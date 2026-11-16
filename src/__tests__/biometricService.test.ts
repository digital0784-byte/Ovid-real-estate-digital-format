import { describe, it, expect, vi, afterEach } from "vitest";
import {
  calculateDistanceMeters,
  matchWorkerByToken,
  computeFaceDescriptor,
  compareFaceDescriptors,
  analyzeFaceCanvas,
  enrollWorkerFingerprint,
  verifyWorkerFingerprint,
} from "../services/biometricService";
import { Worker } from "../types";

function makeFakeCanvas(
  width: number,
  height: number,
  pixelFn: (x: number, y: number) => [number, number, number]
): HTMLCanvasElement {
  const fullData = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b] = pixelFn(x, y);
      const idx = (y * width + x) * 4;
      fullData[idx] = r;
      fullData[idx + 1] = g;
      fullData[idx + 2] = b;
      fullData[idx + 3] = 255;
    }
  }

  return {
    width,
    height,
    getContext: () => ({
      getImageData: (rx: number, ry: number, rw: number, rh: number) => {
        const sub = new Uint8ClampedArray(rw * rh * 4);
        for (let y = 0; y < rh; y++) {
          for (let x = 0; x < rw; x++) {
            const srcIdx = ((ry + y) * width + (rx + x)) * 4;
            const dstIdx = (y * rw + x) * 4;
            sub[dstIdx] = fullData[srcIdx] ?? 0;
            sub[dstIdx + 1] = fullData[srcIdx + 1] ?? 0;
            sub[dstIdx + 2] = fullData[srcIdx + 2] ?? 0;
            sub[dstIdx + 3] = 255;
          }
        }
        return { data: sub };
      },
    }),
  } as unknown as HTMLCanvasElement;
}

describe("biometricService", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("calculates Haversine GPS distance accurately", () => {
    expect(calculateDistanceMeters(9.0049, 38.7783, 9.0049, 38.7783)).toBe(0);
    const approxMeters = calculateDistanceMeters(9.0049, 38.7783, 9.0058, 38.7783);
    expect(approxMeters).toBeGreaterThan(90);
    expect(approxMeters).toBeLessThan(110);
  });

  it("matches worker by ID, nationalId, PIN, fingerprint or QR token", () => {
    const workers = [
      {
        id: "ERP-W-101",
        name: "Abebe Bikila",
        nationalId: "ET-9901",
        attendancePin: "4821",
        qrCode: "QR-101",
        fingerprint: "webauthn:cred123",
      },
    ] as Worker[];

    expect(matchWorkerByToken("erp-w-101", workers)?.id).toBe("ERP-W-101");
    expect(matchWorkerByToken("ET-9901", workers)?.id).toBe("ERP-W-101");
    expect(matchWorkerByToken("4821", workers)?.id).toBe("ERP-W-101");
    expect(matchWorkerByToken("QR-101", workers)?.id).toBe("ERP-W-101");
    expect(matchWorkerByToken("unknown", workers)).toBeNull();
  });

  it("rejects dark, uniform, or blank camera frames in analyzeFaceCanvas", async () => {
    const darkCanvas = makeFakeCanvas(80, 60, () => [5, 5, 5]);
    const darkRes = await analyzeFaceCanvas(darkCanvas);
    expect(darkRes.detected).toBe(false);

    const flatCanvas = makeFakeCanvas(80, 60, () => [120, 120, 120]);
    const flatRes = await analyzeFaceCanvas(flatCanvas);
    expect(flatRes.detected).toBe(false);
  });

  it("detects centered warm skin-tone face with facial feature edges and compares descriptors", async () => {
    const w = 100;
    const h = 80;
    const faceCanvas = makeFakeCanvas(w, h, (x, y) => {
      const inCenter = x >= 28 && x <= 72 && y >= 14 && y <= 66;
      if (!inCenter) return [40, 45, 55];
      // Add deterministic eye/mouth contrast inside center face ROI
      const isEyeRow = y >= 28 && y <= 33 && ((x >= 38 && x <= 44) || (x >= 56 && x <= 62));
      const isMouthRow = y >= 50 && y <= 54 && x >= 44 && x <= 56;
      if (isEyeRow || isMouthRow) return [90, 58, 48];
      return [185, 132, 108];
    });

    const detection = await analyzeFaceCanvas(faceCanvas);
    expect(detection.detected).toBe(true);
    expect(detection.descriptor?.startsWith("face-v1:")).toBe(true);
    expect(detection.confidence).toBeGreaterThan(70);

    const descA = computeFaceDescriptor(faceCanvas);
    const sameSimilarity = compareFaceDescriptors(descA, detection.descriptor!);
    expect(sameSimilarity).toBeGreaterThanOrEqual(85);

    // Inverted lighting pattern should not score as same identity
    const invertedCanvas = makeFakeCanvas(w, h, (x, y) => {
      const topHalf = y < h / 2;
      return topHalf ? [220, 220, 220] : [20, 20, 20];
    });
    const descB = computeFaceDescriptor(invertedCanvas);
    const diffSimilarity = compareFaceDescriptors(descA, descB);
    expect(diffSimilarity).toBeLessThan(62);
  });

  it("handles WebAuthn fingerprint enrollment and verification cleanly", async () => {
    Object.defineProperty(window, "isSecureContext", { value: true, configurable: true });
    const fakeCredBytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]).buffer;

    const createMock = vi.fn().mockResolvedValue({ rawId: fakeCredBytes });
    const getMock = vi.fn().mockResolvedValue({ rawId: fakeCredBytes });

    Object.defineProperty(window, "PublicKeyCredential", {
      value: class FakePKC {},
      configurable: true,
    });
    Object.defineProperty(navigator, "credentials", {
      value: { create: createMock, get: getMock },
      configurable: true,
    });

    const enrollRes = await enrollWorkerFingerprint({ id: "W-1", name: "Test Worker" });
    expect(enrollRes.success).toBe(true);
    expect(enrollRes.templateString).toMatch(/^webauthn:/);

    const verifyRes = await verifyWorkerFingerprint({
      id: "W-1",
      name: "Test Worker",
      fingerprint: enrollRes.templateString,
    });
    expect(verifyRes.success).toBe(true);
    expect(verifyRes.credentialId).toBe(enrollRes.credentialId);

    // Unenrolled worker fails clearly without faking pass
    localStorage.clear();
    const missingRes = await verifyWorkerFingerprint({ id: "W-2", name: "Other Worker" });
    expect(missingRes.success).toBe(false);
    expect(missingRes.code).toBe("not_enrolled");
  });
});
