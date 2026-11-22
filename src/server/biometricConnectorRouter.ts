import express, { type NextFunction, type Request, type Response, type Router } from "express";
import crypto from "crypto";
import net from "net";
import {
  buildBiometricEventFingerprint,
  normalizeZKTecoTimestampToIso,
  parseZKTecoAdmsAttLog,
  sanitizeBiometricMetadata,
  ZKTECO_VERIFIED_HARDWARE_PROFILES,
  ZKTecoNormalizedEvent,
  ZKTecoPunchType,
} from "../services/zktecoConnector";

export interface StagedBiometricEvent extends ZKTecoNormalizedEvent {
  id: string;
  committed: boolean;
  committedAt?: string;
  committedBy?: string;
}

export interface SeenHardwareDeviceHeartbeat {
  serialNumber: string;
  protocol: "ADMS_PUSH_HTTP" | "TCP_4370_SITE_BRIDGE";
  lastHandshakeAt: string;
  lastTable: string;
  pushVer?: string;
  eventsReceivedCount: number;
}

export interface BiometricConnectorMiddlewareDeps {
  verifyAppCheck: (req: Request, res: Response, next: NextFunction) => any;
  requireAuth: (req: Request, res: Response, next: NextFunction) => any;
  requireActiveUser: (req: Request, res: Response, next: NextFunction) => any;
  getSharedKey?: () => string | undefined;
}

const VIEWER_ROLES = new Set([
  "Super Admin",
  "HR Manager",
  "HR",
  "Director",
  "Head Office",
  "Project Manager",
  "Section Head",
  "Operation Manager",
  "Office Manager",
  "Site Engineer",
]);

const SYNC_OPERATOR_ROLES = new Set(["Super Admin", "HR Manager", "HR"]);
const DEVICE_ADMIN_ROLES = new Set(["Super Admin", "HR Manager"]);

const MAX_STAGED_EVENTS = 2500;

function timingSafeMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || a.length === 0) return false;
  return crypto.timingSafeEqual(a, b);
}

function isSafeLanOrPublicIpv4(host: string): boolean {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host.trim());
  if (!m) return false;
  const octets = [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])];
  if (octets.some((o) => !Number.isInteger(o) || o < 0 || o > 255)) return false;
  // Block loopback (127.0.0.0/8), unspecified (0.0.0.0/8), cloud metadata link-local (169.254.0.0/16), multicast/reserved (>=224)
  if (octets[0] === 0 || octets[0] === 127 || octets[0] >= 224) return false;
  if (octets[0] === 169 && octets[1] === 254) return false;
  return true;
}

export function createBiometricConnectorRouter(
  deps: BiometricConnectorMiddlewareDeps
): {
  router: Router;
  getConnectorSnapshot: () => {
    stagedCount: number;
    pendingCount: number;
    handshakenCount: number;
    discardedTemplatePackets: number;
  };
} {
  const router = express.Router();
  const stagedQueue: StagedBiometricEvent[] = [];
  const seenFingerprints = new Set<string>();
  const seenHandshakes = new Map<string, SeenHardwareDeviceHeartbeat>();
  let discardedTemplatePackets = 0;

  const getSharedKey = () => (deps.getSharedKey ? deps.getSharedKey() : process.env.BIOMETRIC_CONNECTOR_SHARED_KEY)?.trim() || "";

  const recordHeartbeat = (
    serialNumber: string,
    protocol: "ADMS_PUSH_HTTP" | "TCP_4370_SITE_BRIDGE",
    lastTable: string,
    pushVer?: string,
    addedEvents = 0
  ) => {
    const key = serialNumber.trim().toUpperCase();
    const prev = seenHandshakes.get(key);
    seenHandshakes.set(key, {
      serialNumber: serialNumber.trim(),
      protocol,
      lastHandshakeAt: new Date().toISOString(),
      lastTable,
      pushVer: pushVer || prev?.pushVer,
      eventsReceivedCount: (prev?.eventsReceivedCount || 0) + addedEvents,
    });
  };

  const enqueueNormalizedEvents = (events: ZKTecoNormalizedEvent[]) => {
    const accepted: StagedBiometricEvent[] = [];
    let duplicateCount = 0;
    for (const evt of events) {
      if (seenFingerprints.has(evt.eventFingerprint)) {
        duplicateCount += 1;
        continue;
      }
      seenFingerprints.add(evt.eventFingerprint);
      const item: StagedBiometricEvent = {
        ...evt,
        id: `ZKEVT-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`,
        committed: false,
      };
      stagedQueue.push(item);
      accepted.push(item);
      if (stagedQueue.length > MAX_STAGED_EVENTS) {
        const removed = stagedQueue.shift();
        if (removed) {
          seenFingerprints.delete(removed.eventFingerprint);
        }
      }
    }
    return { accepted, duplicateCount };
  };

  // =========================================================================
  // 1. ZKTeco ADMS / PUSH SDK ENDPOINTS (G3 Pro & MB360 Plus Cross-Network)
  // =========================================================================
  const checkOptionalAdmsToken = (req: Request): boolean => {
    if (process.env.BIOMETRIC_ADMS_REQUIRE_TOKEN !== "true") return true;
    const expected = getSharedKey();
    if (!expected) return false;
    const supplied =
      String(req.header("X-Biometric-Connector-Key") || req.query.token || "").trim();
    return timingSafeMatch(supplied, expected);
  };

  router.get("/iclock/cdata", (req: Request, res: Response) => {
    if (!checkOptionalAdmsToken(req)) {
      return res.status(401).type("text/plain").send("ERROR: Unauthorized ADMS token");
    }
    const sn = String(req.query.SN || req.query.sn || "").trim();
    if (!sn || sn.length > 120) {
      return res.status(400).type("text/plain").send("ERROR: Missing SN");
    }
    const pushVer = String(req.query.pushver || "").trim() || undefined;
    recordHeartbeat(sn, "ADMS_PUSH_HTTP", "HANDSHAKE", pushVer, 0);

    // Standard ZKTeco ADMS GET configuration payload (disables template/photo auto-upload flags)
    return res
      .status(200)
      .type("text/plain")
      .send(
        [
          `GET OPTION FROM: ${sn}`,
          "ATTLOGStamp=0",
          "OPERLOGStamp=9999",
          "ATTPHOTOStamp=9999",
          "ErrorDelay=30",
          "Delay=10",
          "TransTimes=00:00;14:05",
          "TransInterval=1",
          "TransFlag=TransData AttLog\tOpLog",
          "Realtime=1",
          "Encrypt=0",
          "",
        ].join("\n")
      );
  });

  router.post(
    "/iclock/cdata",
    express.text({ type: ["text/plain", "application/octet-stream", "*/*"], limit: "2mb" }),
    (req: Request, res: Response) => {
      if (!checkOptionalAdmsToken(req)) {
        return res.status(401).type("text/plain").send("ERROR: Unauthorized ADMS token");
      }
      const sn = String(req.query.SN || req.query.sn || "").trim();
      const table = String(req.query.table || req.query.Table || "ATTLOG").trim().toUpperCase();
      if (!sn || sn.length > 120) {
        return res.status(400).type("text/plain").send("ERROR: Missing SN");
      }

      // Strictly block and discard biometric template/face/photo packets without storing them
      if (
        ["BIODATA", "FACE", "FINGERTMP", "FP", "TMP", "ATTPHOTO", "USERPIC"].includes(table)
      ) {
        discardedTemplatePackets += 1;
        recordHeartbeat(sn, "ADMS_PUSH_HTTP", `${table}_DISCARDED`, undefined, 0);
        return res.status(200).type("text/plain").send("OK: 0");
      }

      const rawBody = typeof req.body === "string" ? req.body : "";
      if (table !== "ATTLOG") {
        // Non-attendance operation logs are acknowledged without storing templates or passwords
        recordHeartbeat(sn, "ADMS_PUSH_HTTP", table, undefined, 0);
        return res.status(200).type("text/plain").send("OK");
      }

      const parsed = parseZKTecoAdmsAttLog(rawBody, {
        deviceSerialNumber: sn,
        sourceProtocol: "ADMS_PUSH_HTTP",
      });
      discardedTemplatePackets += parsed.skippedTemplateLines;

      const { accepted } = enqueueNormalizedEvents(parsed.events);
      recordHeartbeat(sn, "ADMS_PUSH_HTTP", "ATTLOG", undefined, accepted.length);

      return res.status(200).type("text/plain").send(`OK: ${parsed.events.length}`);
    }
  );

  router.post(
    "/iclock/registry",
    express.text({ type: "*/*", limit: "256kb" }),
    (req: Request, res: Response) => {
      if (!checkOptionalAdmsToken(req)) {
        return res.status(401).type("text/plain").send("ERROR: Unauthorized ADMS token");
      }
      const sn = String(req.query.SN || req.query.sn || "").trim();
      if (!sn || sn.length > 120) {
        return res.status(400).type("text/plain").send("ERROR: Missing SN");
      }
      recordHeartbeat(sn, "ADMS_PUSH_HTTP", "REGISTRY", undefined, 0);
      const registryCode = crypto.createHash("sha256").update(`OVID-${sn}`).digest("hex").slice(0, 12).toUpperCase();
      return res.status(200).type("text/plain").send(`RegistryCode=${registryCode}`);
    }
  );

  router.get("/iclock/getrequest", (req: Request, res: Response) => {
    const sn = String(req.query.SN || req.query.sn || "").trim();
    if (sn) {
      recordHeartbeat(sn, "ADMS_PUSH_HTTP", "POLL", undefined, 0);
    }
    return res.status(200).type("text/plain").send("OK");
  });

  router.post("/iclock/devicecmd", (_req: Request, res: Response) => {
    return res.status(200).type("text/plain").send("OK");
  });

  // =========================================================================
  // 2. AUTHENTICATED ERP CONNECTOR MANAGEMENT ENDPOINTS
  // =========================================================================
  router.get(
    "/api/biometric/connector/status",
    deps.verifyAppCheck,
    deps.requireAuth,
    deps.requireActiveUser,
    (req: Request, res: Response) => {
      const role = String((req as any).userProfile?.role || "");
      if (!VIEWER_ROLES.has(role)) {
        return res.status(403).json({
          success: false,
          error: "forbidden",
          message: "Your role is not authorized to view biometric connector status.",
        });
      }
      const handshakenDevices = Array.from(seenHandshakes.values());
      const pendingQueueCount = stagedQueue.filter((e) => !e.committed).length;
      return res.json({
        success: true,
        hardwareConnected: handshakenDevices.length > 0,
        sharedKeyConfigured: Boolean(getSharedKey()),
        admsEndpoints: {
          cdata: "/iclock/cdata",
          registry: "/iclock/registry",
          getrequest: "/iclock/getrequest",
          devicecmd: "/iclock/devicecmd",
        },
        siteBridgeEndpoint: "/api/biometric/connector/ingest",
        verifiedHardwareProfiles: ZKTECO_VERIFIED_HARDWARE_PROFILES,
        handshakenDevices,
        pendingQueueCount,
        totalStagedCount: stagedQueue.length,
        discardedTemplatePackets,
      });
    }
  );

  router.get(
    "/api/biometric/connector/queue",
    deps.verifyAppCheck,
    deps.requireAuth,
    deps.requireActiveUser,
    (req: Request, res: Response) => {
      const role = String((req as any).userProfile?.role || "");
      if (!SYNC_OPERATOR_ROLES.has(role)) {
        return res.status(403).json({
          success: false,
          error: "forbidden",
          message: "Only HR staff or Super Admin can access staged biometric connector events.",
        });
      }
      const includeCommitted = req.query.includeCommitted === "true";
      const items = (includeCommitted
        ? stagedQueue
        : stagedQueue.filter((e) => !e.committed)
      ).map((item) => sanitizeBiometricMetadata(item));

      return res.json({
        success: true,
        events: items,
        pendingCount: stagedQueue.filter((e) => !e.committed).length,
      });
    }
  );

  router.post(
    "/api/biometric/connector/ack",
    deps.verifyAppCheck,
    deps.requireAuth,
    deps.requireActiveUser,
    (req: Request, res: Response) => {
      const role = String((req as any).userProfile?.role || "");
      if (!SYNC_OPERATOR_ROLES.has(role)) {
        return res.status(403).json({
          success: false,
          error: "forbidden",
          message: "Only HR staff or Super Admin can acknowledge staged biometric events.",
        });
      }
      const ids = Array.isArray(req.body?.eventIds)
        ? new Set(req.body.eventIds.map((id: any) => String(id)))
        : null;
      if (!ids || ids.size === 0) {
        return res.status(400).json({
          success: false,
          error: "invalid_request",
          message: "eventIds array is required.",
        });
      }
      const nowIso = new Date().toISOString();
      const actor = String((req as any).userProfile?.displayName || (req as any).authUser?.uid || role);
      let acknowledged = 0;
      for (const evt of stagedQueue) {
        if (ids.has(evt.id) && !evt.committed) {
          evt.committed = true;
          evt.committedAt = nowIso;
          evt.committedBy = actor;
          acknowledged += 1;
        }
      }
      return res.json({
        success: true,
        acknowledged,
        remainingPending: stagedQueue.filter((e) => !e.committed).length,
      });
    }
  );

  // Supports either an authenticated HR/SuperAdmin ERP session OR an authorized Site LAN Relay Bridge using X-Site-Relay-Key
  const authorizeIngestCaller = (req: Request, res: Response, next: NextFunction) => {
    const relayKeyHeader = String(req.header("X-Site-Relay-Key") || "").trim();
    const expectedShared = getSharedKey();
    if (relayKeyHeader) {
      if (!expectedShared || !timingSafeMatch(relayKeyHeader, expectedShared)) {
        return res.status(401).json({
          success: false,
          error: "invalid_relay_key",
          message: "Invalid X-Site-Relay-Key for Site LAN Bridge ingestion.",
        });
      }
      (req as any).ingestActor = { type: "site_bridge" };
      return next();
    }
    return deps.verifyAppCheck(req, res, () => {
      deps.requireAuth(req, res, () => {
        deps.requireActiveUser(req, res, () => {
          const role = String((req as any).userProfile?.role || "");
          if (!SYNC_OPERATOR_ROLES.has(role)) {
            return res.status(403).json({
              success: false,
              error: "forbidden",
              message: "Only HR staff, Super Admin, or an authorized Site Bridge can ingest connector events.",
            });
          }
          (req as any).ingestActor = { type: "erp_user", role };
          return next();
        });
      });
    });
  };

  router.post("/api/biometric/connector/ingest", authorizeIngestCaller, (req: Request, res: Response) => {
    const sanitizedBody = sanitizeBiometricMetadata(req.body || {});
    const serialNumber = String(sanitizedBody.deviceSerialNumber || "").trim();
    const deviceId = sanitizedBody.deviceId ? String(sanitizedBody.deviceId).trim() : undefined;
    const sourceProtocol =
      sanitizedBody.sourceProtocol === "TCP_4370_SITE_BRIDGE" ||
      sanitizedBody.sourceProtocol === "MANUAL_IMPORT"
        ? sanitizedBody.sourceProtocol
        : "ADMS_PUSH_HTTP";

    if (!serialNumber && !deviceId) {
      return res.status(400).json({
        success: false,
        error: "missing_device_identifier",
        message: "deviceSerialNumber or deviceId is required.",
      });
    }

    const normalizedEvents: ZKTecoNormalizedEvent[] = [];
    let skippedTemplateLines = 0;
    let rejectedMalformedLines = 0;

    if (typeof sanitizedBody.rawAttLog === "string" && sanitizedBody.rawAttLog.trim()) {
      const parsed = parseZKTecoAdmsAttLog(sanitizedBody.rawAttLog, {
        deviceSerialNumber: serialNumber || deviceId || "",
        deviceId,
        sourceProtocol,
      });
      normalizedEvents.push(...parsed.events);
      skippedTemplateLines += parsed.skippedTemplateLines;
      rejectedMalformedLines += parsed.rejectedMalformedLines;
    }

    if (Array.isArray(sanitizedBody.events)) {
      const nowIso = new Date().toISOString();
      for (const rawItem of sanitizedBody.events) {
        const cleanItem = sanitizeBiometricMetadata(rawItem || {});
        const bioId = String(cleanItem.biometricUserId || cleanItem.pin || "").trim();
        const isoTs = normalizeZKTecoTimestampToIso(String(cleanItem.eventTime || cleanItem.timestamp || ""));
        if (!bioId || !isoTs) {
          rejectedMalformedLines += 1;
          continue;
        }
        const punchType: ZKTecoPunchType =
          cleanItem.punchType === "Check-In" ||
          cleanItem.punchType === "Check-Out" ||
          cleanItem.punchType === "Lunch-Out" ||
          cleanItem.punchType === "Lunch-In"
            ? cleanItem.punchType
            : "Unknown";

        normalizedEvents.push({
          eventFingerprint: buildBiometricEventFingerprint(
            deviceId || serialNumber,
            bioId,
            isoTs,
            punchType
          ),
          deviceSerialNumber: serialNumber || String(cleanItem.deviceSerialNumber || ""),
          deviceId: deviceId || (cleanItem.deviceId ? String(cleanItem.deviceId) : undefined),
          biometricUserId: bioId,
          eventTime: isoTs,
          rawDeviceTimestamp: String(cleanItem.eventTime || cleanItem.timestamp || isoTs),
          punchType,
          verifyModeLabel: String(cleanItem.verifyModeLabel || "Terminal"),
          sourceProtocol,
          receivedAt: nowIso,
        });
      }
    }

    discardedTemplatePackets += skippedTemplateLines;
    const { accepted, duplicateCount } = enqueueNormalizedEvents(normalizedEvents);
    if (serialNumber) {
      recordHeartbeat(
        serialNumber,
        sourceProtocol === "TCP_4370_SITE_BRIDGE" ? "TCP_4370_SITE_BRIDGE" : "ADMS_PUSH_HTTP",
        "CONNECTOR_INGEST",
        undefined,
        accepted.length
      );
    }

    return res.json({
      success: true,
      acceptedCount: accepted.length,
      duplicateCount,
      skippedTemplateLines,
      rejectedMalformedLines,
      stagedEvents: accepted,
    });
  });

  // Honest TCP 4370 LAN reachability diagnostic (never simulates a hardware connection)
  router.post(
    "/api/biometric/connector/tcp-probe",
    deps.verifyAppCheck,
    deps.requireAuth,
    deps.requireActiveUser,
    async (req: Request, res: Response) => {
      const role = String((req as any).userProfile?.role || "");
      if (!DEVICE_ADMIN_ROLES.has(role)) {
        return res.status(403).json({
          success: false,
          error: "forbidden",
          message: "Only Super Admin or HR Manager can run device TCP reachability probes.",
        });
      }
      const host = String(req.body?.host || "").trim();
      const port = Number(req.body?.port || 4370);
      if (!isSafeLanOrPublicIpv4(host)) {
        return res.status(400).json({
          success: false,
          error: "invalid_host",
          message: "Supply a valid non-loopback IPv4 terminal address (e.g., 192.168.1.201).",
        });
      }
      if (!Number.isInteger(port) || port < 1 || port > 65535) {
        return res.status(400).json({
          success: false,
          error: "invalid_port",
          message: "Port must be between 1 and 65535 (ZKTeco default is 4370).",
        });
      }

      const probeResult = await new Promise<{ reachable: boolean; error?: string }>((resolve) => {
        const socket = new net.Socket();
        let settled = false;
        const finish = (reachable: boolean, error?: string) => {
          if (settled) return;
          settled = true;
          try {
            socket.destroy();
          } catch {}
          resolve({ reachable, error });
        };
        socket.setTimeout(2000);
        socket.once("connect", () => finish(true));
        socket.once("timeout", () => finish(false, "TCP connection timed out after 2000ms"));
        socket.once("error", (err: any) => finish(false, err?.code || err?.message || "Connection failed"));
        socket.connect(port, host);
      });

      return res.json({
        success: true,
        host,
        port,
        protocol: "TCP-4370",
        reachable: probeResult.reachable,
        error: probeResult.error,
        note: probeResult.reachable
          ? "TCP socket accepted connection on target port. Configure on-site Pull Bridge or ADMS HTTP Push to sync attendance logs."
          : "Device is unreachable from this server network (typical when terminal is behind site NAT/router). Use ADMS HTTP/HTTPS Push (/iclock/cdata) or an on-site LAN Relay Bridge.",
      });
    }
  );

  return {
    router,
    getConnectorSnapshot: () => ({
      stagedCount: stagedQueue.length,
      pendingCount: stagedQueue.filter((e) => !e.committed).length,
      handshakenCount: seenHandshakes.size,
      discardedTemplatePackets,
    }),
  };
}
