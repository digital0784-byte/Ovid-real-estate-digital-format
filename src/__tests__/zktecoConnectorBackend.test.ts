import express, { type NextFunction, type Request, type Response } from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createBiometricConnectorRouter } from "../server/biometricConnectorRouter";

function buildTestApp(options?: { role?: string; authenticated?: boolean; sharedKey?: string }) {
  const app = express();
  app.use(express.json());

  const role = options?.role ?? "HR Manager";
  const authenticated = options?.authenticated ?? true;

  const verifyAppCheck = (_req: Request, _res: Response, next: NextFunction) => next();
  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    if (!authenticated) {
      return res.status(401).json({ success: false, error: "unauthorized", message: "Auth required" });
    }
    (req as any).authUser = { uid: "test-uid-1" };
    next();
  };
  const requireActiveUser = (req: Request, _res: Response, next: NextFunction) => {
    (req as any).userProfile = { role, displayName: `Tester (${role})`, status: "Active" };
    next();
  };

  const connector = createBiometricConnectorRouter({
    verifyAppCheck,
    requireAuth,
    requireActiveUser,
    getSharedKey: () => options?.sharedKey ?? "test-site-bridge-key-2026",
  });

  app.use(connector.router);
  return { app, connector };
}

describe("ZKTeco G3 Pro & MB360 Plus Backend Connector & RBAC", () => {
  it("reports hardwareConnected=false honestly before any device handshakes", async () => {
    const { app } = buildTestApp({ role: "HR Manager" });
    const res = await request(app).get("/api/biometric/connector/status");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.hardwareConnected).toBe(false);
    expect(res.body.handshakenDevices).toEqual([]);
    expect(res.body.pendingQueueCount).toBe(0);
    expect(res.body.verifiedHardwareProfiles).toHaveLength(2);
  });

  it("handles ZKTeco ADMS GET/POST handshakes, ATTLOG parsing, deduplication, and discards raw biometric templates", async () => {
    const { app } = buildTestApp({ role: "HR" });

    // 1. Handshake
    const hs = await request(app).get("/iclock/cdata?SN=ZKG3P-2026001&pushver=2.4.1");
    expect(hs.status).toBe(200);
    expect(hs.text).toContain("GET OPTION FROM: ZKG3P-2026001");
    expect(hs.text).toContain("ATTPHOTOStamp=9999");

    // 2. Registry
    const reg = await request(app).post("/iclock/registry?SN=ZKG3P-2026001").send("DeviceType=att");
    expect(reg.status).toBe(200);
    expect(reg.text).toMatch(/^RegistryCode=[A-F0-9]{12}$/);

    // 3. ATTLOG push with embedded BIODATA template line that must be stripped
    const attPayload = [
      "BIODATA\tPIN=101\tTMP=RAW_FP_TEMPLATE_DATA",
      "101\t2026-07-21 08:02:10\t0\t15\t0",
      "102\t2026-07-21 08:05:44\t0\t1\t0",
      "101\t2026-07-21 08:02:10\t0\t15\t0", // exact duplicate
    ].join("\n");

    const postAtt = await request(app)
      .post("/iclock/cdata?SN=ZKG3P-2026001&table=ATTLOG")
      .set("Content-Type", "text/plain")
      .send(attPayload);
    expect(postAtt.status).toBe(200);
    expect(postAtt.text).toBe("OK: 2");

    // 4. Dedicated BIODATA / FACE / ATTPHOTO table must be discarded immediately
    const postBio = await request(app)
      .post("/iclock/cdata?SN=ZKG3P-2026001&table=BIODATA")
      .set("Content-Type", "text/plain")
      .send("PIN=101\tTMP=SHOULD_NEVER_BE_STORED");
    expect(postBio.status).toBe(200);
    expect(postBio.text).toBe("OK: 0");

    // 5. Status & Queue inspection
    const statusRes = await request(app).get("/api/biometric/connector/status");
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.hardwareConnected).toBe(true);
    expect(statusRes.body.pendingQueueCount).toBe(2);
    expect(statusRes.body.discardedTemplatePackets).toBeGreaterThanOrEqual(2);

    const queueRes = await request(app).get("/api/biometric/connector/queue");
    expect(queueRes.status).toBe(200);
    expect(queueRes.body.events).toHaveLength(2);
    expect(JSON.stringify(queueRes.body.events)).not.toContain("RAW_FP_TEMPLATE_DATA");
    expect(JSON.stringify(queueRes.body.events)).not.toContain("SHOULD_NEVER_BE_STORED");

    // 6. Ack staged events
    const ids = queueRes.body.events.map((e: any) => e.id);
    const ackRes = await request(app)
      .post("/api/biometric/connector/ack")
      .send({ eventIds: ids });
    expect(ackRes.status).toBe(200);
    expect(ackRes.body.acknowledged).toBe(2);
    expect(ackRes.body.remainingPending).toBe(0);
  });

  it("enforces strict RBAC and Site LAN Bridge X-Site-Relay-Key authentication", async () => {
    // Unauthenticated rejected with 401
    const unauthApp = buildTestApp({ authenticated: false }).app;
    const unauthRes = await request(unauthApp).get("/api/biometric/connector/queue");
    expect(unauthRes.status).toBe(401);

    // Unauthorized role (Employee / Finance Manager) rejected with 403
    const empApp = buildTestApp({ role: "Employee" }).app;
    expect((await request(empApp).get("/api/biometric/connector/status")).status).toBe(403);
    expect((await request(empApp).get("/api/biometric/connector/queue")).status).toBe(403);

    // Site Manager can inspect status, but cannot pull/ack sync queue or run TCP probes
    const pmApp = buildTestApp({ role: "Project Manager" }).app;
    expect((await request(pmApp).get("/api/biometric/connector/status")).status).toBe(200);
    expect((await request(pmApp).get("/api/biometric/connector/queue")).status).toBe(403);
    expect(
      (await request(pmApp).post("/api/biometric/connector/tcp-probe").send({ host: "192.168.1.201" })).status
    ).toBe(403);

    // Site LAN Relay Bridge auth via X-Site-Relay-Key
    const { app } = buildTestApp({ role: "Employee", sharedKey: "bridge-secret-xyz" });
    const badBridge = await request(app)
      .post("/api/biometric/connector/ingest")
      .set("X-Site-Relay-Key", "wrong-key")
      .send({
        deviceSerialNumber: "ZK-MB360P-01",
        sourceProtocol: "TCP_4370_SITE_BRIDGE",
        events: [{ biometricUserId: "205", eventTime: "2026-07-21 08:15:00", punchType: "Check-In" }],
      });
    expect(badBridge.status).toBe(401);

    const goodBridge = await request(app)
      .post("/api/biometric/connector/ingest")
      .set("X-Site-Relay-Key", "bridge-secret-xyz")
      .send({
        deviceSerialNumber: "ZK-MB360P-01",
        sourceProtocol: "TCP_4370_SITE_BRIDGE",
        password: "should_be_stripped_by_sanitizer",
        events: [{ biometricUserId: "205", eventTime: "2026-07-21 08:15:00", punchType: "Check-In" }],
      });
    expect(goodBridge.status).toBe(200);
    expect(goodBridge.body.acceptedCount).toBe(1);
    expect(JSON.stringify(goodBridge.body)).not.toContain("should_be_stripped");
  });

  it("blocks SSRF loopback and metadata hosts on TCP 4370 probe", async () => {
    const { app } = buildTestApp({ role: "HR Manager" });

    const loopback = await request(app)
      .post("/api/biometric/connector/tcp-probe")
      .send({ host: "127.0.0.1", port: 4370 });
    expect(loopback.status).toBe(400);

    const metadata = await request(app)
      .post("/api/biometric/connector/tcp-probe")
      .send({ host: "169.254.169.254", port: 4370 });
    expect(metadata.status).toBe(400);
  });
});
