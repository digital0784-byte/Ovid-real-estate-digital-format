import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Download,
  Edit3,
  Eye,
  Fingerprint,
  History,
  Lock,
  MapPin,
  Plus,
  Power,
  RefreshCw,
  RotateCcw,
  Search,
  Server,
  ShieldCheck,
  Upload,
  UserCheck,
  Users,
  Wifi,
  X,
} from "lucide-react";
import {
  AttendanceRecord,
  BiometricDeviceMapping,
  BiometricDeviceProtocolType,
  BiometricDeviceRecord,
  BiometricDeviceWorkLocationType,
  BiometricMappingAuditLog,
  BiometricMappingStatus,
  UnmappedBiometricEvent,
  UserRole,
  WorkScheduleConfig,
  Worker,
} from "../../types";
import { DbService } from "../../services/db";
import { authFetch } from "../../services/authService";
import {
  batchProcessZKTecoEvents,
  fetchBiometricConnectorStatus,
  formatAddisAbabaDateTime,
  processBiometricDeviceAttendanceEvent,
  pullAndProcessConnectorQueue,
  resolveBiometricMappingPermissions,
  resolveUnmappedBiometricEventRecord,
  saveValidatedBiometricDevice,
  saveValidatedBiometricMapping,
  toggleBiometricMappingStatus,
} from "../../services/biometricMappingService";
import {
  parseZKTecoAdmsAttLog,
  ZKTECO_VERIFIED_HARDWARE_PROFILES,
} from "../../services/zktecoConnector";
import { exportHrmReport } from "../../services/hrmService";

interface EmployeeBiometricMappingModuleProps {
  isAmharic?: boolean;
  currentUserRole: UserRole;
  currentUserProfile?: any;
  workers: Worker[];
  attendance: AttendanceRecord[];
  workSchedules: WorkScheduleConfig[];
  projectNames: string[];
  onAddAttendance: (a: AttendanceRecord) => Promise<void> | void;
  onLogAction: (action: string, details: string) => void;
}

const PAGE_SIZE = 10;

export const EmployeeBiometricMappingModule: React.FC<EmployeeBiometricMappingModuleProps> = ({
  isAmharic,
  currentUserRole,
  currentUserProfile,
  workers,
  attendance,
  workSchedules,
  projectNames,
  onAddAttendance,
  onLogAction,
}) => {
  const actorName =
    currentUserProfile?.displayName || currentUserProfile?.name || String(currentUserRole);
  const actorUid = currentUserProfile?.uid || currentUserProfile?.id || String(currentUserRole);
  const assignedSite =
    currentUserProfile?.assignedSite || currentUserProfile?.assignedProject || "";

  const perms = useMemo(
    () => resolveBiometricMappingPermissions(currentUserRole),
    [currentUserRole]
  );

  // Live Firestore state
  const [devices, setDevices] = useState<BiometricDeviceRecord[]>([]);
  const [mappings, setMappings] = useState<BiometricDeviceMapping[]>([]);
  const [auditLogs, setAuditLogs] = useState<BiometricMappingAuditLog[]>([]);
  const [unmappedEvents, setUnmappedEvents] = useState<UnmappedBiometricEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const [banner, setBanner] = useState<{ type: "success" | "error" | "info"; text: string } | null>(
    null
  );
  const [subView, setSubView] = useState<"mappings" | "devices" | "unmapped">("mappings");

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [deviceFilter, setDeviceFilter] = useState("ALL");
  const [locationFilter, setLocationFilter] = useState("ALL");
  const [projectFilter, setProjectFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  // Add/Edit Mapping Modal
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [editingMapping, setEditingMapping] = useState<BiometricDeviceMapping | null>(null);
  const [empPickerSearch, setEmpPickerSearch] = useState("");
  const [mappingFormError, setMappingFormError] = useState<string | null>(null);
  const [savingMapping, setSavingMapping] = useState(false);
  const [mappingForm, setMappingForm] = useState({
    employeeIdOrWorkerId: "",
    deviceId: "",
    biometricUserId: "",
    workLocationType: "Construction Site" as BiometricDeviceWorkLocationType,
    projectId: projectNames[0] || "Head Office",
    effectiveDate: new Date().toISOString().slice(0, 10),
    status: "Active" as BiometricMappingStatus,
    notes: "",
  });

  // View / Audit / Deactivate Modals
  const [viewingMapping, setViewingMapping] = useState<BiometricDeviceMapping | null>(null);
  const [auditModalMapping, setAuditModalMapping] = useState<BiometricDeviceMapping | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<BiometricDeviceMapping | null>(null);
  const [deactivateReason, setDeactivateReason] = useState("");

  // Register/Edit Biometric Device Modal
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [editingDevice, setEditingDevice] = useState<BiometricDeviceRecord | null>(null);
  const [deviceFormError, setDeviceFormError] = useState<string | null>(null);
  const [deviceForm, setDeviceForm] = useState({
    deviceCode: "",
    deviceName: "",
    manufacturer: "ZKTeco",
    model: "G3 Pro",
    serialNumber: "",
    workLocationType: "Construction Site" as BiometricDeviceWorkLocationType,
    projectName: projectNames[0] || "Head Office",
    deviceLocation: "Main Site Gate",
    protocolType: "ADMS_PUSH_HTTP" as BiometricDeviceProtocolType,
    networkTopology: "Separate Site Network (ADMS Cloud Push)",
    admsPath: "/iclock/cdata",
    supportedCapabilities: ["Face", "Fingerprint", "Palm"] as string[],
    status: "Active" as "Active" | "Inactive",
    notes: "",
  });

  // Hardware Connector Status & ZKTeco ATTLOG Batch Import State
  const [connectorStatus, setConnectorStatus] = useState<{
    hardwareConnected: boolean;
    sharedKeyConfigured: boolean;
    pendingQueueCount: number;
    discardedTemplatePackets: number;
    handshakenDevices: Array<{
      serialNumber: string;
      protocol: string;
      lastHandshakeAt: string;
      lastTable: string;
      eventsReceivedCount: number;
    }>;
  } | null>(null);
  const [connectorBusy, setConnectorBusy] = useState(false);
  const [tcpProbeHost, setTcpProbeHost] = useState("");
  const [tcpProbePort, setTcpProbePort] = useState(4370);
  const [tcpProbeResult, setTcpProbeResult] = useState<{
    reachable: boolean;
    message: string;
  } | null>(null);
  const [showAttlogModal, setShowAttlogModal] = useState(false);
  const [attlogForm, setAttlogForm] = useState({
    deviceId: "",
    rawText: "",
  });

  // Event Ingestion Modal (tests device->mapping->attendance pipeline cleanly)
  const [showEventIngestModal, setShowEventIngestModal] = useState(false);
  const [ingestForm, setIngestForm] = useState({
    deviceId: "",
    biometricUserId: "",
    eventTime: new Date().toISOString().slice(0, 16),
    punchType: "Check-In" as "Check-In" | "Check-Out",
  });

  useEffect(() => {
    if (!perms.canView) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    let devLoaded = false;
    let mapLoaded = false;
    const markDone = () => {
      if (devLoaded && mapLoaded) setLoading(false);
    };
    const onErr = (err: any) => {
      setLoadError(err?.message || "Failed to load biometric mapping records.");
      setLoading(false);
    };

    const u1 = DbService.subscribeBiometricDevices((list) => {
      setDevices(list);
      devLoaded = true;
      markDone();
    }, onErr);
    const u2 = DbService.subscribeBiometricDeviceMappings((list) => {
      setMappings(list);
      mapLoaded = true;
      markDone();
    }, onErr);
    const u3 = DbService.subscribeBiometricMappingAuditLogs(setAuditLogs, () => {});
    const u4 = DbService.subscribeUnmappedBiometricEvents(setUnmappedEvents, () => {});

    const fallbackTimer = setTimeout(() => setLoading(false), 1200);
    return () => {
      clearTimeout(fallbackTimer);
      u1();
      u2();
      u3();
      u4();
    };
  }, [perms.canView, refreshTick]);

  const showToast = (type: "success" | "error" | "info", text: string) => {
    setBanner({ type, text });
    setTimeout(() => setBanner((cur) => (cur?.text === text ? null : cur)), 6500);
  };

  // Scope records if Site/Project manager
  const scopedMappings = useMemo(() => {
    if (!perms.scopeToAssignedSite || !assignedSite) return mappings;
    return mappings.filter(
      (m) =>
        m.projectNameSnapshot.toLowerCase() === assignedSite.toLowerCase() ||
        m.projectId.toLowerCase() === assignedSite.toLowerCase()
    );
  }, [mappings, perms.scopeToAssignedSite, assignedSite]);

  const scopedWorkers = useMemo(() => {
    if (!perms.scopeToAssignedSite || !assignedSite) return workers;
    return workers.filter(
      (w) =>
        (w.assignedProject || w.currentSite || "").toLowerCase() === assignedSite.toLowerCase()
    );
  }, [workers, perms.scopeToAssignedSite, assignedSite]);

  const scopedDevices = useMemo(() => {
    if (!perms.scopeToAssignedSite || !assignedSite) return devices;
    return devices.filter(
      (d) =>
        (d.projectName || "").toLowerCase() === assignedSite.toLowerCase() ||
        (d.projectId || "").toLowerCase() === assignedSite.toLowerCase()
    );
  }, [devices, perms.scopeToAssignedSite, assignedSite]);

  const scopedUnmappedEvents = useMemo(() => {
    if (!perms.scopeToAssignedSite || !assignedSite) return unmappedEvents;
    const allowedDeviceIds = new Set(scopedDevices.map((d) => d.id));
    return unmappedEvents.filter(
      (u) =>
        allowedDeviceIds.has(u.deviceId) ||
        (u.projectName || "").toLowerCase() === assignedSite.toLowerCase()
    );
  }, [unmappedEvents, scopedDevices, perms.scopeToAssignedSite, assignedSite]);

  // Dashboard Metrics
  const kpis = useMemo(() => {
    const totalMappings = scopedMappings.length;
    const activeMappingsList = scopedMappings.filter((m) => m.status === "Active");
    const activeMappings = activeMappingsList.length;
    const inactiveMappings = scopedMappings.filter((m) => m.status === "Inactive").length;

    const mappedEmpKeys = new Set<string>();
    activeMappingsList.forEach((m) => {
      mappedEmpKeys.add(m.workerRecordId);
      mappedEmpKeys.add(m.employeeId);
    });

    const unmappedEmployeesList = scopedWorkers.filter(
      (w) =>
        w.status === "Active" &&
        !mappedEmpKeys.has(w.id) &&
        !(w.employeeId && mappedEmpKeys.has(w.employeeId))
    );
    const unmappedEventsCount = scopedUnmappedEvents.filter((e) => e.status === "Unmapped").length;

    return {
      totalMappings,
      activeMappings,
      inactiveMappings,
      unmappedEmployeesCount: unmappedEmployeesList.length,
      unmappedEmployeesList,
      unmappedEventsCount,
    };
  }, [scopedMappings, scopedWorkers, scopedUnmappedEvents]);

  const refreshConnectorStatus = async () => {
    try {
      const res = await fetchBiometricConnectorStatus();
      setConnectorStatus({
        hardwareConnected: res.hardwareConnected,
        sharedKeyConfigured: res.sharedKeyConfigured,
        pendingQueueCount: res.pendingQueueCount,
        discardedTemplatePackets: res.discardedTemplatePackets,
        handshakenDevices: res.handshakenDevices || [],
      });
    } catch {
      // Non-blocking when offline or unauthenticated in test harness
    }
  };

  useEffect(() => {
    if (perms.canView) {
      void refreshConnectorStatus();
    }
  }, [perms.canView, refreshTick]);

  const departments = useMemo(() => {
    const set = new Set<string>();
    scopedWorkers.forEach((w) => w.department && set.add(w.department));
    scopedMappings.forEach((m) => m.departmentSnapshot && set.add(m.departmentSnapshot));
    return Array.from(set).sort();
  }, [scopedWorkers, scopedMappings]);

  const filteredMappings = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return scopedMappings
      .filter((m) => {
        if (deptFilter !== "ALL" && m.departmentSnapshot !== deptFilter) return false;
        if (deviceFilter !== "ALL" && m.deviceId !== deviceFilter) return false;
        if (locationFilter !== "ALL" && m.workLocationType !== locationFilter) return false;
        if (projectFilter !== "ALL" && m.projectNameSnapshot !== projectFilter) return false;
        if (statusFilter !== "ALL" && m.status !== statusFilter) return false;
        if (!q) return true;
        return (
          m.employeeId.toLowerCase().includes(q) ||
          m.employeeNameSnapshot.toLowerCase().includes(q) ||
          m.biometricUserId.toLowerCase().includes(q) ||
          m.deviceNameSnapshot.toLowerCase().includes(q) ||
          m.deviceSerialNumberSnapshot.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt));
  }, [
    scopedMappings,
    searchTerm,
    deptFilter,
    deviceFilter,
    locationFilter,
    projectFilter,
    statusFilter,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredMappings.length / PAGE_SIZE));
  const paginatedMappings = useMemo(() => {
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredMappings.slice(start, start + PAGE_SIZE);
  }, [filteredMappings, page, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, deptFilter, deviceFilter, locationFilter, projectFilter, statusFilter]);

  const selectedWorkerForForm = useMemo(() => {
    if (!mappingForm.employeeIdOrWorkerId) return undefined;
    return workers.find(
      (w) =>
        w.id === mappingForm.employeeIdOrWorkerId ||
        w.employeeId === mappingForm.employeeIdOrWorkerId
    );
  }, [workers, mappingForm.employeeIdOrWorkerId]);

  const selectedDeviceForForm = useMemo(() => {
    if (!mappingForm.deviceId) return undefined;
    return devices.find((d) => d.id === mappingForm.deviceId);
  }, [devices, mappingForm.deviceId]);

  const pickerFilteredWorkers = useMemo(() => {
    const q = empPickerSearch.trim().toLowerCase();
    return workers
      .filter((w) => {
        if (!q) return true;
        return (
          w.name.toLowerCase().includes(q) ||
          String(w.employeeId || w.id).toLowerCase().includes(q) ||
          String(w.department || "").toLowerCase().includes(q) ||
          String(w.position || w.trade || "").toLowerCase().includes(q)
        );
      })
      .slice(0, 60);
  }, [workers, empPickerSearch]);

  const openAddMappingModal = (prefill?: {
    employeeIdOrWorkerId?: string;
    deviceId?: string;
    biometricUserId?: string;
  }) => {
    if (!perms.canCreateEdit) {
      return showToast("error", "You do not have permission to create biometric mappings.");
    }
    const firstActiveDevice = devices.find((d) => d.status === "Active");
    const targetDevice =
      (prefill?.deviceId && devices.find((d) => d.id === prefill.deviceId)) || firstActiveDevice;
    setEditingMapping(null);
    setMappingFormError(null);
    setEmpPickerSearch("");
    setMappingForm({
      employeeIdOrWorkerId: prefill?.employeeIdOrWorkerId || "",
      deviceId: targetDevice?.id || "",
      biometricUserId: prefill?.biometricUserId || "",
      workLocationType: targetDevice?.workLocationType || "Construction Site",
      projectId: targetDevice?.projectName || projectNames[0] || "Head Office",
      effectiveDate: new Date().toISOString().slice(0, 10),
      status: "Active",
      notes: "",
    });
    setShowMappingModal(true);
  };

  const openEditMappingModal = (m: BiometricDeviceMapping) => {
    if (!perms.canCreateEdit) {
      return showToast("error", "You do not have permission to edit biometric mappings.");
    }
    setEditingMapping(m);
    setMappingFormError(null);
    setEmpPickerSearch("");
    setMappingForm({
      employeeIdOrWorkerId: m.workerRecordId || m.employeeId,
      deviceId: m.deviceId,
      biometricUserId: m.biometricUserId,
      workLocationType: m.workLocationType,
      projectId: m.projectNameSnapshot || m.projectId || projectNames[0] || "Head Office",
      effectiveDate: m.effectiveDate,
      status: m.status,
      notes: m.notes || "",
    });
    setShowMappingModal(true);
  };

  const resetMappingForm = () => {
    if (editingMapping) {
      openEditMappingModal(editingMapping);
    } else {
      openAddMappingModal();
    }
  };

  const handleSaveMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    setMappingFormError(null);
    setSavingMapping(true);
    try {
      const res = await saveValidatedBiometricMapping({
        editingMapping,
        employeeIdOrWorkerId: mappingForm.employeeIdOrWorkerId,
        deviceId: mappingForm.deviceId,
        biometricUserId: mappingForm.biometricUserId,
        workLocationType: mappingForm.workLocationType,
        projectId: mappingForm.projectId,
        effectiveDate: mappingForm.effectiveDate,
        status: mappingForm.status,
        notes: mappingForm.notes,
        workers,
        devices,
        existingMappings: mappings,
        actorName,
        actorUid,
        actorRole: currentUserRole,
      });

      onLogAction(
        editingMapping ? "Biometric Mapping Updated" : "Biometric Mapping Created",
        `${res.mapping.employeeNameSnapshot} (${res.mapping.employeeId}) <-> ${res.mapping.deviceNameSnapshot} [BioID: ${res.mapping.biometricUserId}]`
      );
      showToast(
        "success",
        editingMapping
          ? `Updated biometric mapping for ${res.mapping.employeeNameSnapshot} (BioID ${res.mapping.biometricUserId}).`
          : `Mapped ${res.mapping.employeeNameSnapshot} (${res.mapping.employeeId}) to ${res.mapping.deviceNameSnapshot} as BioID ${res.mapping.biometricUserId}.`
      );
      setShowMappingModal(false);
    } catch (err: any) {
      setMappingFormError(err?.message || "Validation failed.");
    } finally {
      setSavingMapping(false);
    }
  };

  const handleConfirmToggleStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deactivateTarget) return;
    const nextStatus: BiometricMappingStatus =
      deactivateTarget.status === "Active" ? "Inactive" : "Active";
    try {
      const res = await toggleBiometricMappingStatus({
        mapping: deactivateTarget,
        targetStatus: nextStatus,
        reason: deactivateReason,
        workers,
        devices,
        existingMappings: mappings,
        actorName,
        actorUid,
        actorRole: currentUserRole,
      });
      onLogAction(
        `Biometric Mapping ${nextStatus === "Inactive" ? "Deactivated" : "Activated"}`,
        `${res.mapping.employeeNameSnapshot} (${res.mapping.employeeId}) on ${res.mapping.deviceNameSnapshot}`
      );
      showToast(
        "success",
        `Biometric mapping for ${res.mapping.employeeNameSnapshot} is now ${nextStatus}. Historical records preserved.`
      );
      setDeactivateTarget(null);
      setDeactivateReason("");
    } catch (err: any) {
      showToast("error", err?.message || "Failed to update mapping status.");
    }
  };

  const handleSaveDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeviceFormError(null);
    try {
      const saved = await saveValidatedBiometricDevice({
        editingDevice,
        deviceCode: deviceForm.deviceCode,
        deviceName: deviceForm.deviceName,
        manufacturer: deviceForm.manufacturer,
        model: deviceForm.model,
        serialNumber: deviceForm.serialNumber,
        workLocationType: deviceForm.workLocationType,
        projectName:
          deviceForm.workLocationType === "Head Office" ? "Head Office" : deviceForm.projectName,
        deviceLocation: deviceForm.deviceLocation,
        protocolType: deviceForm.protocolType,
        networkTopology: deviceForm.networkTopology,
        admsPath: deviceForm.admsPath,
        supportedCapabilities: deviceForm.supportedCapabilities,
        status: deviceForm.status,
        notes: deviceForm.notes,
        actorName,
        actorUid,
        actorRole: currentUserRole,
        existingDevices: devices,
      });
      onLogAction(
        editingDevice ? "Biometric Device Updated" : "Biometric Device Registered",
        `${saved.deviceName} (${saved.model}, S/N: ${saved.serialNumber}, Protocol: ${saved.protocolType || "ADMS_PUSH_HTTP"})`
      );
      showToast("success", `Biometric device "${saved.deviceName}" saved (${saved.status}).`);
      setShowDeviceModal(false);
    } catch (err: any) {
      setDeviceFormError(err?.message || "Failed to save biometric device.");
    }
  };

  const handlePullConnectorQueue = async () => {
    if (!perms.canResolveUnmappedEvents) {
      return showToast("error", "Only HR staff or Super Admin can sync device connector queues.");
    }
    setConnectorBusy(true);
    try {
      const res = await pullAndProcessConnectorQueue({
        devices,
        mappings,
        workers,
        schedules: workSchedules,
        existingAttendance: attendance,
        existingUnmappedEvents: unmappedEvents,
        onSaveAttendance: onAddAttendance,
      });
      await refreshConnectorStatus();
      if (res.total === 0) {
        showToast("info", "Connector staging queue is currently empty. No pending ADMS punches received.");
      } else {
        onLogAction(
          "Biometric Connector Queue Synced",
          `Total ${res.total}: ${res.matched} matched, ${res.duplicatesSkipped} duplicate(s) skipped, ${res.unmappedQueued} unmapped queued.`
        );
        showToast(
          res.unmappedQueued > 0 ? "info" : "success",
          `Processed ${res.total} hardware event(s): ${res.matched} logged to Attendance, ${res.duplicatesSkipped} duplicate(s) ignored, ${res.unmappedQueued} sent to Unmapped Queue.`
        );
        if (res.unmappedQueued > 0) setSubView("unmapped");
      }
    } catch (err: any) {
      showToast("error", err?.message || "Failed to sync biometric connector queue.");
    } finally {
      setConnectorBusy(false);
    }
  };

  const handleRunTcpProbe = async () => {
    if (!tcpProbeHost.trim()) {
      return showToast("error", "Enter terminal IPv4 address (e.g. 192.168.1.201) to test reachability.");
    }
    setConnectorBusy(true);
    setTcpProbeResult(null);
    try {
      const res = await authFetch("/api/biometric/connector/tcp-probe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host: tcpProbeHost.trim(), port: Number(tcpProbePort || 4370) }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "TCP probe failed.");
      }
      setTcpProbeResult({
        reachable: Boolean(json.reachable),
        message: json.reachable
          ? `Reachable on ${json.host}:${json.port} (TCP socket open). ${json.note}`
          : `Unreachable (${json.error || "no route"}). ${json.note}`,
      });
    } catch (err: any) {
      setTcpProbeResult({
        reachable: false,
        message: err?.message || "Could not execute TCP reachability probe.",
      });
    } finally {
      setConnectorBusy(false);
    }
  };

  const handleImportZktecoAttlog = async (e: React.FormEvent) => {
    e.preventDefault();
    const dev = devices.find((d) => d.id === attlogForm.deviceId);
    if (!dev) return showToast("error", "Select the registered ZKTeco device for this log batch.");
    if (!attlogForm.rawText.trim()) {
      return showToast("error", "Paste ZKTeco ATTLOG lines (PIN, Timestamp, Status, Verify) first.");
    }
    setConnectorBusy(true);
    try {
      const parsed = parseZKTecoAdmsAttLog(attlogForm.rawText, {
        deviceSerialNumber: dev.serialNumber,
        deviceId: dev.id,
        sourceProtocol: dev.protocolType || "MANUAL_IMPORT",
      });
      if (parsed.events.length === 0) {
        return showToast(
          "error",
          `No valid ATTLOG rows found (${parsed.rejectedMalformedLines} malformed, ${parsed.skippedTemplateLines} template lines stripped).`
        );
      }
      const res = await batchProcessZKTecoEvents({
        events: parsed.events,
        devices,
        mappings,
        workers,
        schedules: workSchedules,
        existingAttendance: attendance,
        existingUnmappedEvents: unmappedEvents,
        onSaveAttendance: onAddAttendance,
      });
      onLogAction(
        "ZKTeco ATTLOG Batch Processed",
        `${dev.deviceName} (${dev.model}): ${res.matched} matched, ${res.duplicatesSkipped} duplicate(s), ${res.unmappedQueued} unmapped (${parsed.skippedTemplateLines} template line(s) stripped)`
      );
      showToast(
        res.unmappedQueued > 0 ? "info" : "success",
        `Imported ${res.total} event(s) from ${dev.deviceName}: ${res.matched} attendance logged, ${res.duplicatesSkipped} duplicates prevented, ${res.unmappedQueued} unmapped queued.`
      );
      setShowAttlogModal(false);
      setAttlogForm({ deviceId: dev.id, rawText: "" });
      if (res.unmappedQueued > 0) setSubView("unmapped");
    } catch (err: any) {
      showToast("error", err?.message || "Failed to import ZKTeco ATTLOG batch.");
    } finally {
      setConnectorBusy(false);
    }
  };

  const handleIngestDeviceEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingestForm.deviceId || !ingestForm.biometricUserId.trim()) {
      return showToast("error", "Select a device and enter a Biometric User ID.");
    }
    try {
      const isoTime = new Date(ingestForm.eventTime).toISOString();
      const res = await processBiometricDeviceAttendanceEvent({
        deviceId: ingestForm.deviceId,
        biometricUserId: ingestForm.biometricUserId.trim(),
        eventTime: isoTime,
        punchType: ingestForm.punchType,
        devices,
        mappings,
        workers,
        schedules: workSchedules,
        existingAttendance: attendance,
        existingUnmappedEvents: unmappedEvents,
        onSaveAttendance: onAddAttendance,
      });
      if (res.resolved && res.attendanceRecord) {
        showToast(
          res.duplicatePrevented ? "info" : "success",
          res.duplicatePrevented
            ? `Duplicate device punch ignored for ${res.attendanceRecord.workerName} (${res.attendanceRecord.date}).`
            : `Attendance recorded via biometric mapping for ${res.attendanceRecord.workerName} (${res.attendanceRecord.status}).`
        );
      } else {
        showToast(
          "info",
          `Event queued in Unmapped Biometric Events: ${res.reason || "No active mapping found."}`
        );
        setSubView("unmapped");
      }
      setShowEventIngestModal(false);
    } catch (err: any) {
      showToast("error", err?.message || "Failed to process biometric event.");
    }
  };

  const handleResolveUnmappedEvent = async (evt: UnmappedBiometricEvent) => {
    try {
      const res = await resolveUnmappedBiometricEventRecord({
        unmappedEvent: evt,
        devices,
        mappings,
        workers,
        schedules: workSchedules,
        existingAttendance: attendance,
        actorName,
        actorUid,
        actorRole: currentUserRole,
        onSaveAttendance: onAddAttendance,
      });
      onLogAction(
        "Unmapped Biometric Event Resolved",
        `Event ${evt.id} (BioID ${evt.biometricUserId}) -> ${res.attendanceRecord.workerName} (${res.attendanceRecord.date})`
      );
      showToast(
        "success",
        `Resolved unmapped punch -> Attendance logged for ${res.attendanceRecord.workerName}.`
      );
    } catch (err: any) {
      showToast("error", err?.message || "Map an active employee to this Biometric User ID first.");
    }
  };

  const handleExportMappingsCsv = () => {
    const rows = filteredMappings.map((m) => ({
      EmployeeID: m.employeeId,
      EmployeeName: m.employeeNameSnapshot,
      Department: m.departmentSnapshot,
      Position: m.positionSnapshot,
      BiometricUserID: m.biometricUserId,
      DeviceName: m.deviceNameSnapshot,
      DeviceModel: m.deviceModelSnapshot,
      SerialNumber: m.deviceSerialNumberSnapshot,
      WorkLocation: m.workLocationType,
      ProjectSite: m.projectNameSnapshot,
      EffectiveDate: m.effectiveDate,
      MappingDateAddis: formatAddisAbabaDateTime(m.createdAt),
      Status: m.status,
      CreatedBy: m.createdBy,
    }));
    exportHrmReport({ reportName: "Employee_Biometric_Mappings", rows, format: "csv" });
  };

  if (!perms.canView) {
    return (
      <div className="bg-slate-950 border border-red-500/40 rounded-2xl p-8 text-center space-y-3">
        <Lock className="mx-auto text-red-400" size={32} />
        <h3 className="text-base font-extrabold text-white">
          {isAmharic ? "የባዮሜትሪክ ማጣመሪያ ፈቃድ የለዎትም" : "Access Denied — Employee Biometric Mapping"}
        </h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Your role ({currentUserRole}) is not authorized to view or manage Employee Biometric Device Mappings. Contact HR Manager or Super Admin.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-red-600/20 border border-red-500/30 text-red-400">
            <Fingerprint size={22} />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-white">
              {isAmharic
                ? "የሠራተኛ ባዮሜትሪክ መሳሪያ ማጣመሪያ (Employee Biometric Mapping)"
                : "Employee Biometric Mapping"}
            </h3>
            <p className="text-xs text-slate-400">
              {isAmharic
                ? "ያሉትን የERP ሠራተኞች ከባዮሜትሪክ መሳሪያ መለያ ቁጥሮች (Biometric User ID) ጋር ያገናኙ። ሰዓት እና ቀን በአዲስ አበባ ሰዓት (Africa/Addis_Ababa)።"
                : "Link existing ERP Employees to registered Biometric Device User IDs across Head Office & Construction Sites (Timezone: Africa/Addis_Ababa)."}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setRefreshTick((t) => t + 1)}
            className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw size={14} />
            <span>{isAmharic ? "አድስ" : "Refresh"}</span>
          </button>
          {perms.canExport && (
            <button
              type="button"
              onClick={handleExportMappingsCsv}
              className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 cursor-pointer"
            >
              <Download size={14} />
              <span>Export CSV</span>
            </button>
          )}
          {perms.canManageDevices && (
            <button
              type="button"
              onClick={() => {
                setEditingDevice(null);
                setDeviceFormError(null);
                setDeviceForm({
                  deviceCode: `DEV-${String(devices.length + 1).padStart(3, "0")}`,
                  deviceName: "",
                  manufacturer: "ZKTeco",
                  model: "G3 Pro",
                  serialNumber: "",
                  workLocationType: "Construction Site",
                  projectName: projectNames[0] || "Head Office",
                  deviceLocation: "Main Gate",
                  protocolType: "ADMS_PUSH_HTTP",
                  networkTopology: "Separate Site Network (ADMS Cloud Push)",
                  admsPath: "/iclock/cdata",
                  supportedCapabilities: ["Face", "Fingerprint", "Palm"],
                  status: "Active",
                  notes: "",
                });
                setShowDeviceModal(true);
              }}
              className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Cpu size={14} />
              <span>{isAmharic ? "መሳሪያ መዝግብ" : "Register Device"}</span>
            </button>
          )}
          {perms.canCreateEdit && (
            <button
              type="button"
              onClick={() => openAddMappingModal()}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={15} />
              <span>{isAmharic ? "አዲስ ማጣመሪያ ጨምር" : "Add Biometric Mapping"}</span>
            </button>
          )}
        </div>
      </div>

      {banner && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between gap-3 ${
            banner.type === "error"
              ? "bg-red-950/60 border-red-500/40 text-red-200"
              : banner.type === "info"
              ? "bg-amber-950/60 border-amber-500/40 text-amber-200"
              : "bg-emerald-950/60 border-emerald-500/40 text-emerald-200"
          }`}
        >
          <span>{banner.text}</span>
          <button
            type="button"
            onClick={() => setBanner(null)}
            className="text-slate-300 hover:text-white cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {loadError && (
        <div className="p-4 rounded-xl bg-red-950/50 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{loadError}</span>
        </div>
      )}

      {/* 5 Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
          <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
            Total Mappings
          </div>
          <div className="text-2xl font-black text-white mt-1 font-mono tabular-nums">
            {kpis.totalMappings}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">All registered device links</div>
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
          <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
            Active Mappings
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-1 font-mono tabular-nums">
            {kpis.activeMappings}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Resolving attendance punches</div>
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
          <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
            Inactive Mappings
          </div>
          <div className="text-2xl font-black text-slate-300 mt-1 font-mono tabular-nums">
            {kpis.inactiveMappings}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Historical audit preserved</div>
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
          <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
            Unmapped Employees
          </div>
          <div className="text-2xl font-black text-amber-400 mt-1 font-mono tabular-nums">
            {kpis.unmappedEmployeesCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Active staff needing BioID</div>
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
          <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
            Unmapped Biometric Events
          </div>
          <div className="text-2xl font-black text-red-400 mt-1 font-mono tabular-nums">
            {kpis.unmappedEventsCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Awaiting HR review</div>
        </div>
      </div>

      {/* Sub-view Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 border border-slate-800 rounded-2xl p-2">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSubView("mappings")}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
              subView === "mappings"
                ? "bg-red-600 text-white"
                : "bg-slate-900 text-slate-300 hover:bg-slate-800"
            }`}
          >
            <UserCheck size={14} />
            <span>Employee Mappings ({filteredMappings.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSubView("devices")}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
              subView === "devices"
                ? "bg-red-600 text-white"
                : "bg-slate-900 text-slate-300 hover:bg-slate-800"
            }`}
          >
            <Cpu size={14} />
            <span>Registered Biometric Devices ({devices.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSubView("unmapped")}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
              subView === "unmapped"
                ? "bg-red-600 text-white"
                : "bg-slate-900 text-slate-300 hover:bg-slate-800"
            }`}
          >
            <AlertTriangle size={14} />
            <span>Unmapped Events Queue ({kpis.unmappedEventsCount})</span>
          </button>
        </div>

        {perms.canResolveUnmappedEvents && (
          <button
            type="button"
            onClick={() => {
              setIngestForm({
                deviceId: devices.find((d) => d.status === "Active")?.id || "",
                biometricUserId: "",
                eventTime: new Date().toISOString().slice(0, 16),
                punchType: "Check-In",
              });
              setShowEventIngestModal(true);
            }}
            className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-emerald-300 cursor-pointer"
          >
            Ingest / Test Device Punch Event
          </button>
        )}
      </div>

      {/* ============================================================
          VIEW 1: EMPLOYEE BIOMETRIC MAPPINGS TABLE
         ============================================================ */}
      {subView === "mappings" && (
        <div className="space-y-4">
          {/* Search & Multi-Filters */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <div className="relative lg:col-span-2">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search Employee ID, Name, BioID, or Device..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
              />
            </div>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <select
              value={deviceFilter}
              onChange={(e) => setDeviceFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
            >
              <option value="ALL">All Biometric Devices</option>
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.deviceName} ({d.status})
                </option>
              ))}
            </select>
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
            >
              <option value="ALL">All Work Locations</option>
              <option value="Head Office">Head Office</option>
              <option value="Construction Site">Construction Site</option>
            </select>
            <div className="flex gap-2">
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="flex-1 px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
              >
                <option value="ALL">All Sites</option>
                {projectNames.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
              >
                <option value="ALL">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Unmapped Active Employees Quick Strip */}
          {kpis.unmappedEmployeesList.length > 0 && perms.canCreateEdit && (
            <div className="bg-amber-950/30 border border-amber-500/30 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-amber-200">
                <Users size={15} className="text-amber-400 shrink-0" />
                <span>
                  <strong>{kpis.unmappedEmployeesList.length}</strong> active ERP employee(s) have no active biometric device mapping yet (e.g.{" "}
                  {kpis.unmappedEmployeesList
                    .slice(0, 3)
                    .map((w) => w.name)
                    .join(", ")}
                  ).
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  openAddMappingModal({
                    employeeIdOrWorkerId: kpis.unmappedEmployeesList[0].id,
                  })
                }
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold cursor-pointer"
              >
                Map First Unmapped Employee
              </button>
            </div>
          )}

          {/* Mappings Table */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 overflow-x-auto">
            {loading ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Loading biometric device mappings...
              </div>
            ) : paginatedMappings.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <Fingerprint size={28} className="mx-auto text-slate-600" />
                <div className="text-sm font-bold text-slate-300">
                  No Employee Biometric Mappings Found
                </div>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {devices.length === 0
                    ? "Register a biometric device terminal first, then link existing ERP employees to their device Biometric User IDs."
                    : "Adjust filters or click Add Biometric Mapping to link an existing employee to a registered biometric terminal."}
                </p>
              </div>
            ) : (
              <>
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase text-[11px]">
                      <th className="py-2.5 px-3">Employee ID</th>
                      <th className="py-2.5 px-3">Employee Name</th>
                      <th className="py-2.5 px-3">Department</th>
                      <th className="py-2.5 px-3">Position</th>
                      <th className="py-2.5 px-3">Biometric User ID</th>
                      <th className="py-2.5 px-3">Device Name</th>
                      <th className="py-2.5 px-3">Device Model</th>
                      <th className="py-2.5 px-3">Work Location</th>
                      <th className="py-2.5 px-3">Project/Site</th>
                      <th className="py-2.5 px-3">Mapping Date</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Created By</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedMappings.map((m) => (
                      <tr key={m.id} className="border-b border-slate-900 hover:bg-slate-900/50">
                        <td className="py-3 px-3 font-mono font-bold text-white whitespace-nowrap">
                          {m.employeeId}
                        </td>
                        <td className="py-3 px-3 font-semibold text-white whitespace-nowrap">
                          {m.employeeNameSnapshot}
                        </td>
                        <td className="py-3 px-3 text-slate-300">{m.departmentSnapshot}</td>
                        <td className="py-3 px-3 text-slate-300">{m.positionSnapshot}</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono font-bold text-emerald-400">
                            {m.biometricUserId}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-200 font-semibold whitespace-nowrap">
                          {m.deviceNameSnapshot}
                        </td>
                        <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                          {m.deviceModelSnapshot}
                        </td>
                        <td className="py-3 px-3 text-slate-300 whitespace-nowrap">
                          {m.workLocationType}
                        </td>
                        <td className="py-3 px-3 text-slate-300 whitespace-nowrap">
                          {m.projectNameSnapshot}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-400 whitespace-nowrap">
                          {formatAddisAbabaDateTime(m.createdAt)}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              m.status === "Active"
                                ? "bg-emerald-950/70 border border-emerald-500/40 text-emerald-300"
                                : "bg-slate-900 border border-slate-700 text-slate-400"
                            }`}
                          >
                            {m.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-400 whitespace-nowrap">{m.createdBy}</td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              title="View Details"
                              onClick={() => setViewingMapping(m)}
                              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 cursor-pointer"
                            >
                              <Eye size={13} />
                            </button>
                            <button
                              type="button"
                              title="View Audit History"
                              onClick={() => setAuditModalMapping(m)}
                              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-blue-300 cursor-pointer"
                            >
                              <History size={13} />
                            </button>
                            {perms.canCreateEdit && (
                              <button
                                type="button"
                                title="Edit Mapping"
                                onClick={() => openEditMappingModal(m)}
                                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-300 cursor-pointer"
                              >
                                <Edit3 size={13} />
                              </button>
                            )}
                            {perms.canDeactivateReactivate && (
                              <button
                                type="button"
                                title={m.status === "Active" ? "Deactivate Mapping" : "Reactivate Mapping"}
                                onClick={() => {
                                  setDeactivateReason("");
                                  setDeactivateTarget(m);
                                }}
                                className={`p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 cursor-pointer ${
                                  m.status === "Active" ? "text-red-400" : "text-emerald-400"
                                }`}
                              >
                                <Power size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-900 text-xs text-slate-400">
                  <div>
                    Showing {paginatedMappings.length} of {filteredMappings.length} mapping(s) (Page{" "}
                    {page} of {totalPages})
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 disabled:opacity-40 cursor-pointer"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 disabled:opacity-40 cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ============================================================
          VIEW 2: REGISTERED BIOMETRIC DEVICES & ZKTECO CONNECTOR
         ============================================================ */}
      {subView === "devices" && (
        <div className="space-y-5">
          {/* ZKTeco G3 Pro & MB360 Plus Integration Connector Panel */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400">
                  <Server size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-white">
                    ZKTeco G3 Pro & MB360 Plus Device Integration Connector
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Supports cross-network ADMS HTTP/HTTPS Cloud Push (<code className="text-emerald-300">/iclock/cdata</code>) &amp; Site LAN Bridge (<code className="text-blue-300">TCP 4370 -&gt; /api/biometric/connector/ingest</code>).
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 border ${
                    connectorStatus?.hardwareConnected
                      ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                      : "bg-amber-950/60 border-amber-500/40 text-amber-300"
                  }`}
                >
                  <Activity size={12} />
                  {connectorStatus?.hardwareConnected
                    ? `Hardware Handshakes Verified (${connectorStatus.handshakenDevices.length})`
                    : "No Physical Device Connected / Verified Yet"}
                </span>
                {perms.canResolveUnmappedEvents && (
                  <>
                    <button
                      type="button"
                      disabled={connectorBusy}
                      onClick={handlePullConnectorQueue}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Wifi size={13} />
                      <span>
                        Sync ADMS Queue ({connectorStatus?.pendingQueueCount ?? 0})
                      </span>
                    </button>
                    <button
                      type="button"
                      disabled={connectorBusy}
                      onClick={() => {
                        setAttlogForm({
                          deviceId: scopedDevices.find((d) => d.status === "Active")?.id || "",
                          rawText: "",
                        });
                        setShowAttlogModal(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload size={13} />
                      <span>Import ZKTeco ATTLOG</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {ZKTECO_VERIFIED_HARDWARE_PROFILES.map((profile) => (
                <div
                  key={profile.id}
                  className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-white">{profile.displayName}</span>
                    <span className="font-mono text-[11px] text-blue-300">
                      ADMS Push + TCP:{profile.tcpDefaultPort}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-300">
                    <strong>Verified Modalities:</strong> {profile.supportedCapabilities.join(", ")}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {profile.networkGuidance}
                  </p>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[11px] text-emerald-300 break-all">
                    ADMS Server URL:{" "}
                    {typeof window !== "undefined" ? `${window.location.origin}${profile.admsPath}` : profile.admsPath}
                  </div>
                </div>
              ))}
            </div>

            {perms.canManageDevices && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="text-slate-300">
                  <strong>LAN TCP {tcpProbePort} Socket Probe:</strong> Test direct server-to-terminal reachability (only reachable when server is on same LAN/VPN).
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    value={tcpProbeHost}
                    onChange={(e) => setTcpProbeHost(e.target.value)}
                    placeholder="Device LAN IPv4 (e.g. 192.168.1.201)"
                    className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white font-mono w-56"
                  />
                  <input
                    type="number"
                    value={tcpProbePort}
                    onChange={(e) => setTcpProbePort(Number(e.target.value || 4370))}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white font-mono w-20"
                  />
                  <button
                    type="button"
                    disabled={connectorBusy}
                    onClick={handleRunTcpProbe}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                  >
                    Test TCP Reachability
                  </button>
                </div>
                {tcpProbeResult && (
                  <div
                    className={`w-full p-2.5 rounded-lg border text-[11px] ${
                      tcpProbeResult.reachable
                        ? "bg-emerald-950/60 border-emerald-500/30 text-emerald-200"
                        : "bg-amber-950/60 border-amber-500/30 text-amber-200"
                    }`}
                  >
                    {tcpProbeResult.message}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-500/30 text-xs text-blue-200 flex items-start gap-2">
              <ShieldCheck size={16} className="shrink-0 mt-0.5 text-blue-400" />
              <div>
                <strong>Security &amp; Hardware Gateway Policy:</strong> Device registry stores non-secret metadata only (model, serial number, protocol, location, active status). Device communication passwords/CommKeys and raw fingerprint/face templates are NEVER stored in Firestore or exposed to clients.
              </div>
            </div>
            {scopedDevices.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400">
                No biometric devices registered yet.{" "}
                {perms.canManageDevices && 'Click "Register Device" above to register a ZKTeco G3 Pro or MB360 Plus terminal.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase text-[11px]">
                      <th className="py-2.5 px-3">Device Code</th>
                      <th className="py-2.5 px-3">Device Name</th>
                      <th className="py-2.5 px-3">Manufacturer &amp; Model</th>
                      <th className="py-2.5 px-3">Serial Number</th>
                      <th className="py-2.5 px-3">Protocol / Network</th>
                      <th className="py-2.5 px-3">Work Location / Site</th>
                      <th className="py-2.5 px-3">Active Mapped Staff</th>
                      <th className="py-2.5 px-3">Status</th>
                      {perms.canManageDevices && <th className="py-2.5 px-3 text-right">Manage</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {scopedDevices.map((dev) => {
                      const mappedCount = mappings.filter(
                        (m) => m.deviceId === dev.id && m.status === "Active"
                      ).length;
                      const handshake = connectorStatus?.handshakenDevices.find(
                        (h) => h.serialNumber.toLowerCase() === dev.serialNumber.toLowerCase()
                      );
                      return (
                        <tr key={dev.id} className="border-b border-slate-900 hover:bg-slate-900/50">
                          <td className="py-3 px-3 font-mono font-bold text-white">{dev.deviceCode}</td>
                          <td className="py-3 px-3 font-semibold text-white">{dev.deviceName}</td>
                          <td className="py-3 px-3 text-slate-300">
                            {dev.manufacturer} {dev.model}
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-300">{dev.serialNumber}</td>
                          <td className="py-3 px-3 text-[11px]">
                            <div className="font-mono text-blue-300">
                              {dev.protocolType || "ADMS_PUSH_HTTP"}
                            </div>
                            <div className="text-slate-500">
                              {handshake
                                ? `Last ADMS ping: ${formatAddisAbabaDateTime(handshake.lastHandshakeAt)}`
                                : "Awaiting physical handshake"}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-slate-300">
                            <div>{dev.workLocationType}</div>
                            <div className="text-[11px] text-slate-500">
                              {dev.projectName || "Head Office"} · {dev.deviceLocation}
                            </div>
                          </td>
                          <td className="py-3 px-3 font-mono text-emerald-400 font-bold">
                            {mappedCount}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                dev.status === "Active"
                                  ? "bg-emerald-950/70 border border-emerald-500/40 text-emerald-300"
                                  : "bg-slate-900 border border-slate-700 text-slate-400"
                              }`}
                            >
                              {dev.status}
                            </span>
                          </td>
                          {perms.canManageDevices && (
                            <td className="py-3 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingDevice(dev);
                                  setDeviceFormError(null);
                                  setDeviceForm({
                                    deviceCode: dev.deviceCode,
                                    deviceName: dev.deviceName,
                                    manufacturer: dev.manufacturer,
                                    model: dev.model,
                                    serialNumber: dev.serialNumber,
                                    workLocationType: dev.workLocationType,
                                    projectName: dev.projectName || projectNames[0] || "Head Office",
                                    deviceLocation: dev.deviceLocation,
                                    protocolType: dev.protocolType || "ADMS_PUSH_HTTP",
                                    networkTopology:
                                      dev.networkTopology || "Separate Site Network (ADMS Cloud Push)",
                                    admsPath: dev.admsPath || "/iclock/cdata",
                                    supportedCapabilities:
                                      dev.supportedCapabilities || ["Fingerprint", "Face"],
                                    status: dev.status,
                                    notes: dev.notes || "",
                                  });
                                  setShowDeviceModal(true);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold cursor-pointer"
                              >
                                Edit
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================
          VIEW 3: UNMAPPED BIOMETRIC EVENTS QUEUE
         ============================================================ */}
      {subView === "unmapped" && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-400">
              Biometric punches from unknown or inactive <code className="text-amber-300">(Device, Biometric User ID)</code> pairs are quarantined here rather than guessed. Map the Biometric User ID to an employee first, then click <strong>Resolve to Attendance</strong>.
            </div>
            {perms.canResolveUnmappedEvents && (
              <button
                type="button"
                disabled={connectorBusy}
                onClick={handlePullConnectorQueue}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw size={13} />
                <span>Pull Incoming Hardware Events</span>
              </button>
            )}
          </div>
          {scopedUnmappedEvents.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400">
              No unmapped biometric events in queue.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[11px]">
                    <th className="py-2.5 px-3">Event Time (Addis Ababa)</th>
                    <th className="py-2.5 px-3">Device</th>
                    <th className="py-2.5 px-3">Biometric User ID</th>
                    <th className="py-2.5 px-3">Punch Type</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {scopedUnmappedEvents.map((ev) => {
                    const hasActiveMap = mappings.some(
                      (m) =>
                        m.status === "Active" &&
                        m.deviceId === ev.deviceId &&
                        m.biometricUserId.trim().toLowerCase() ===
                          ev.biometricUserId.trim().toLowerCase()
                    );
                    return (
                      <tr key={ev.id} className="border-b border-slate-900 hover:bg-slate-900/50">
                        <td className="py-3 px-3 font-mono text-white">
                          {formatAddisAbabaDateTime(ev.eventTime)}
                        </td>
                        <td className="py-3 px-3 text-slate-200">{ev.deviceName || ev.deviceId}</td>
                        <td className="py-3 px-3 font-mono font-bold text-amber-300">
                          {ev.biometricUserId}
                        </td>
                        <td className="py-3 px-3 text-slate-300">{ev.punchType}</td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              ev.status === "Resolved"
                                ? "bg-emerald-950/70 border border-emerald-500/40 text-emerald-300"
                                : "bg-red-950/70 border border-red-500/40 text-red-300"
                            }`}
                          >
                            {ev.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          {ev.status === "Unmapped" && perms.canResolveUnmappedEvents ? (
                            <div className="flex justify-end gap-1.5">
                              {!hasActiveMap && perms.canCreateEdit && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    openAddMappingModal({
                                      deviceId: ev.deviceId.startsWith("SN:") ? undefined : ev.deviceId,
                                      biometricUserId: ev.biometricUserId,
                                    })
                                  }
                                  className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold cursor-pointer"
                                >
                                  Map Employee
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleResolveUnmappedEvent(ev)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold cursor-pointer"
                              >
                                Resolve to Attendance
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-500">
                              {ev.resolvedEmployeeId ? `Resolved -> ${ev.resolvedEmployeeId}` : "—"}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          MODAL 1: ADD / EDIT EMPLOYEE BIOMETRIC MAPPING
         ============================================================ */}
      {showMappingModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleSaveMapping}
            className="bg-slate-950 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 space-y-5 my-8"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-white">
                  {editingMapping ? "Edit Employee Biometric Mapping" : "Add Employee Biometric Mapping"}
                </h3>
                <p className="text-xs text-slate-400">
                  Select an existing ERP employee and registered active biometric device. Duplicate active Biometric User IDs on the same device are blocked.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowMappingModal(false)}
                className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {mappingFormError && (
              <div className="p-3 rounded-xl bg-red-950/70 border border-red-500/40 text-red-200 text-xs font-semibold flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{mappingFormError}</span>
              </div>
            )}

            {/* Section 1: Employee Information */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="text-xs font-extrabold uppercase tracking-wider text-emerald-400">
                1. Existing Employee Information
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Filter Existing Employees
                  </label>
                  <input
                    value={empPickerSearch}
                    onChange={(e) => setEmpPickerSearch(e.target.value)}
                    placeholder="Type Employee ID or Name..."
                    disabled={Boolean(editingMapping)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Employee ID (Select Existing Employee) *
                  </label>
                  <select
                    required
                    disabled={Boolean(editingMapping)}
                    value={mappingForm.employeeIdOrWorkerId}
                    onChange={(e) =>
                      setMappingForm((p) => ({ ...p, employeeIdOrWorkerId: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white disabled:opacity-60"
                  >
                    <option value="">-- Select Registered Employee --</option>
                    {pickerFilteredWorkers.map((w) => (
                      <option key={w.id} value={w.id}>
                        {(w.employeeId || w.id)} — {w.name} ({w.status})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs pt-1">
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase">Employee Name</div>
                  <div className="font-bold text-white mt-0.5">
                    {selectedWorkerForForm?.name || "—"}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase">Department</div>
                  <div className="font-semibold text-slate-200 mt-0.5">
                    {selectedWorkerForForm?.department || "—"}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase">Position</div>
                  <div className="font-semibold text-slate-200 mt-0.5">
                    {selectedWorkerForForm?.position || selectedWorkerForForm?.trade || "—"}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase">Employment Status</div>
                  <div className="font-bold text-emerald-400 mt-0.5">
                    {selectedWorkerForForm?.status || "—"}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Biometric Device Information */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="text-xs font-extrabold uppercase tracking-wider text-blue-400">
                2. Biometric Device Information
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Registered Biometric Device *
                  </label>
                  <select
                    required
                    value={mappingForm.deviceId}
                    onChange={(e) => {
                      const dev = devices.find((d) => d.id === e.target.value);
                      setMappingForm((p) => ({
                        ...p,
                        deviceId: e.target.value,
                        workLocationType: dev?.workLocationType || p.workLocationType,
                        projectId: dev?.projectName || p.projectId,
                      }));
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                  >
                    <option value="">-- Select Registered Device --</option>
                    {devices.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.deviceName} ({d.model} · S/N: {d.serialNumber}) [{d.status}]
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Biometric User ID (on Selected Device) *
                  </label>
                  <input
                    required
                    value={mappingForm.biometricUserId}
                    onChange={(e) =>
                      setMappingForm((p) => ({ ...p, biometricUserId: e.target.value }))
                    }
                    placeholder="e.g. 1042"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Work Location *</label>
                  <select
                    value={mappingForm.workLocationType}
                    onChange={(e) =>
                      setMappingForm((p) => ({
                        ...p,
                        workLocationType: e.target.value as BiometricDeviceWorkLocationType,
                        projectId:
                          e.target.value === "Head Office"
                            ? "Head Office"
                            : projectNames[0] || "Bole Tower",
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                  >
                    <option value="Head Office">Head Office</option>
                    <option value="Construction Site">Construction Site</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Project / Site *</label>
                  <select
                    value={mappingForm.projectId}
                    onChange={(e) => setMappingForm((p) => ({ ...p, projectId: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                  >
                    {Array.from(new Set(["Head Office", ...projectNames])).map((pr) => (
                      <option key={pr} value={pr}>
                        {pr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase">Device Manufacturer & Model</div>
                  <div className="font-semibold text-white mt-0.5">
                    {selectedDeviceForForm
                      ? `${selectedDeviceForForm.manufacturer} ${selectedDeviceForForm.model}`
                      : "—"}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase">Device Serial Number</div>
                  <div className="font-mono font-bold text-slate-200 mt-0.5">
                    {selectedDeviceForForm?.serialNumber || "—"}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase">Device Placement</div>
                  <div className="font-semibold text-slate-200 mt-0.5">
                    {selectedDeviceForForm?.deviceLocation || "—"}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Mapping Metadata */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
                3. Mapping Status & Effective Date
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Mapping Status</label>
                  <select
                    value={mappingForm.status}
                    onChange={(e) =>
                      setMappingForm((p) => ({
                        ...p,
                        status: e.target.value as BiometricMappingStatus,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Effective Date *</label>
                  <input
                    type="date"
                    required
                    value={mappingForm.effectiveDate}
                    onChange={(e) =>
                      setMappingForm((p) => ({ ...p, effectiveDate: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Created By / Timestamp</label>
                  <div className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300 truncate">
                    {editingMapping?.createdBy || actorName}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={mappingForm.notes}
                  onChange={(e) => setMappingForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Optional enrollment / gate assignment notes..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={resetMappingForm}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-slate-300 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw size={13} />
                <span>Reset</span>
              </button>
              <button
                type="button"
                onClick={() => setShowMappingModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingMapping}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {savingMapping ? "Saving..." : "Save Mapping"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================
          MODAL 2: VIEW MAPPING DETAIL
         ============================================================ */}
      {viewingMapping && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-white">
                Biometric Mapping Detail — {viewingMapping.employeeId}
              </h3>
              <button
                type="button"
                onClick={() => setViewingMapping(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-slate-500">Employee</div>
                <div className="font-bold text-white">{viewingMapping.employeeNameSnapshot}</div>
              </div>
              <div>
                <div className="text-slate-500">Department / Position</div>
                <div className="text-slate-200">
                  {viewingMapping.departmentSnapshot} · {viewingMapping.positionSnapshot}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Biometric User ID</div>
                <div className="font-mono font-bold text-emerald-400">
                  {viewingMapping.biometricUserId}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Device</div>
                <div className="text-white">
                  {viewingMapping.deviceNameSnapshot} ({viewingMapping.deviceModelSnapshot})
                </div>
              </div>
              <div>
                <div className="text-slate-500">Serial Number</div>
                <div className="font-mono text-slate-300">
                  {viewingMapping.deviceSerialNumberSnapshot}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Location / Site</div>
                <div className="text-slate-200">
                  {viewingMapping.workLocationType} — {viewingMapping.projectNameSnapshot}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Effective Date</div>
                <div className="font-mono text-slate-200">{viewingMapping.effectiveDate}</div>
              </div>
              <div>
                <div className="text-slate-500">Created (Addis Ababa)</div>
                <div className="font-mono text-slate-300">
                  {formatAddisAbabaDateTime(viewingMapping.createdAt)} by {viewingMapping.createdBy}
                </div>
              </div>
            </div>
            {viewingMapping.notes && (
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
                <strong>Notes:</strong> {viewingMapping.notes}
              </div>
            )}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setViewingMapping(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold text-white cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL 3: AUDIT HISTORY
         ============================================================ */}
      {auditModalMapping && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-white">
                  Immutable Biometric Mapping Audit History
                </h3>
                <p className="text-xs text-slate-400">
                  {auditModalMapping.employeeNameSnapshot} ({auditModalMapping.employeeId}) · Device:{" "}
                  {auditModalMapping.deviceNameSnapshot}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAuditModalMapping(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto space-y-2.5">
              {auditLogs
                .filter(
                  (l) =>
                    l.mappingId === auditModalMapping.id ||
                    l.employeeId === auditModalMapping.employeeId
                )
                .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
                .map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-400">{log.action}</span>
                      <span className="font-mono text-[11px] text-slate-400">
                        {formatAddisAbabaDateTime(log.timestamp)}
                      </span>
                    </div>
                    <div className="text-slate-300">
                      Actor: <strong>{log.actorName}</strong> ({log.actorRole}) · BioID:{" "}
                      <span className="font-mono text-white">{log.biometricUserId}</span>
                    </div>
                    {log.reason && <div className="text-slate-400">Reason/Notes: {log.reason}</div>}
                    {(log.previousValue || log.newValue) && (
                      <div className="text-[11px] font-mono text-slate-400">
                        {log.previousValue && <span>Before: {JSON.stringify(log.previousValue)} </span>}
                        {log.newValue && <span>After: {JSON.stringify(log.newValue)}</span>}
                      </div>
                    )}
                  </div>
                ))}
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setAuditModalMapping(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold text-white cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL 4: CONFIRM DEACTIVATE / REACTIVATE
         ============================================================ */}
      {deactivateTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmToggleStatus}
            className="bg-slate-950 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4"
          >
            <h3 className="text-base font-extrabold text-white">
              {deactivateTarget.status === "Active"
                ? "Confirm Deactivate Biometric Mapping"
                : "Reactivate Biometric Mapping"}
            </h3>
            <p className="text-xs text-slate-300">
              Employee: <strong>{deactivateTarget.employeeNameSnapshot}</strong> ({deactivateTarget.employeeId})
              <br />
              Device: <strong>{deactivateTarget.deviceNameSnapshot}</strong> · BioID:{" "}
              <strong className="font-mono">{deactivateTarget.biometricUserId}</strong>
            </p>
            <p className="text-[11px] text-amber-300">
              {deactivateTarget.status === "Active"
                ? "Deactivating preserves all historical attendance and mapping records for audit compliance while stopping new punches from resolving to this mapping."
                : "Reactivating validates that the employee and device are Active and no duplicate BioID exists on this device."}
            </p>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Reason / Audit Notes</label>
              <input
                value={deactivateReason}
                onChange={(e) => setDeactivateReason(e.target.value)}
                placeholder="e.g. Site transfer, device replaced, seasonal contract end"
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeactivateTarget(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold text-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white cursor-pointer ${
                  deactivateTarget.status === "Active"
                    ? "bg-red-600 hover:bg-red-500"
                    : "bg-emerald-600 hover:bg-emerald-500"
                }`}
              >
                {deactivateTarget.status === "Active" ? "Confirm Deactivate" : "Confirm Reactivate"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================
          MODAL 5: REGISTER / EDIT BIOMETRIC DEVICE
         ============================================================ */}
      {showDeviceModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleSaveDevice}
            className="bg-slate-950 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 my-8"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-white">
                  {editingDevice ? "Edit Biometric Device" : "Register Biometric Device Terminal"}
                </h3>
                <p className="text-[11px] text-slate-400">
                  Verified ZKTeco G3 Pro &amp; MB360 Plus protocols supported. Zero passwords or templates stored in Firestore.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDeviceModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            {deviceFormError && (
              <div className="p-3 rounded-xl bg-red-950/70 border border-red-500/40 text-red-200 text-xs">
                {deviceFormError}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {ZKTECO_VERIFIED_HARDWARE_PROFILES.map((prof) => (
                <button
                  key={prof.id}
                  type="button"
                  onClick={() =>
                    setDeviceForm((p) => ({
                      ...p,
                      manufacturer: prof.manufacturer,
                      model: prof.model,
                      protocolType: prof.recommendedProtocol,
                      admsPath: prof.admsPath,
                      supportedCapabilities: prof.supportedCapabilities,
                    }))
                  }
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-blue-500/30 text-[11px] font-bold text-blue-300 cursor-pointer"
                >
                  Apply Preset: {prof.manufacturer} {prof.model}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Device Code *</label>
                <input
                  required
                  value={deviceForm.deviceCode}
                  onChange={(e) => setDeviceForm((p) => ({ ...p, deviceCode: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Device Name *</label>
                <input
                  required
                  value={deviceForm.deviceName}
                  onChange={(e) => setDeviceForm((p) => ({ ...p, deviceName: e.target.value }))}
                  placeholder="e.g. Bole Tower Gate A Terminal"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Manufacturer</label>
                <input
                  value={deviceForm.manufacturer}
                  onChange={(e) => setDeviceForm((p) => ({ ...p, manufacturer: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Device Model</label>
                <input
                  value={deviceForm.model}
                  onChange={(e) => setDeviceForm((p) => ({ ...p, model: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Serial Number (ADMS SN) *</label>
                <input
                  required
                  value={deviceForm.serialNumber}
                  onChange={(e) => setDeviceForm((p) => ({ ...p, serialNumber: e.target.value }))}
                  placeholder="e.g. ZKG3P-2026-0091"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Integration Protocol</label>
                <select
                  value={deviceForm.protocolType}
                  onChange={(e) =>
                    setDeviceForm((p) => ({
                      ...p,
                      protocolType: e.target.value as BiometricDeviceProtocolType,
                      networkTopology:
                        e.target.value === "ADMS_PUSH_HTTP"
                          ? "Separate Site Network (ADMS Cloud Push)"
                          : e.target.value === "TCP_4370_SITE_BRIDGE"
                          ? "Site LAN + Relay Bridge"
                          : "Offline USB / File Import",
                    }))
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                >
                  <option value="ADMS_PUSH_HTTP">ADMS HTTP/HTTPS Cloud Push (Multi-Network WAN)</option>
                  <option value="TCP_4370_SITE_BRIDGE">TCP 4370 Pull via Site LAN Relay Bridge</option>
                  <option value="MANUAL_IMPORT">Manual ATTLOG File / Batch Import</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Work Location</label>
                <select
                  value={deviceForm.workLocationType}
                  onChange={(e) =>
                    setDeviceForm((p) => ({
                      ...p,
                      workLocationType: e.target.value as BiometricDeviceWorkLocationType,
                    }))
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                >
                  <option value="Head Office">Head Office</option>
                  <option value="Construction Site">Construction Site</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Project / Site</label>
                <select
                  value={deviceForm.projectName}
                  onChange={(e) => setDeviceForm((p) => ({ ...p, projectName: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                >
                  {Array.from(new Set(["Head Office", ...projectNames])).map((pr) => (
                    <option key={pr} value={pr}>
                      {pr}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Gate / Floor Placement</label>
                <input
                  value={deviceForm.deviceLocation}
                  onChange={(e) => setDeviceForm((p) => ({ ...p, deviceLocation: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Device Status</label>
                <select
                  value={deviceForm.status}
                  onChange={(e) =>
                    setDeviceForm((p) => ({
                      ...p,
                      status: e.target.value as "Active" | "Inactive",
                    }))
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowDeviceModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold text-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer"
              >
                Save Device
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================
          MODAL 6: INGEST / VERIFY DEVICE PUNCH EVENT
         ============================================================ */}
      {showEventIngestModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleIngestDeviceEvent}
            className="bg-slate-950 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-white">
                Ingest Biometric Device Punch Event
              </h3>
              <button
                type="button"
                onClick={() => setShowEventIngestModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Resolves <code className="text-emerald-400">(Device, Biometric User ID)</code> against Active mappings to log attendance, or routes unknown IDs to Unmapped Events.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Biometric Device *</label>
                <select
                  required
                  value={ingestForm.deviceId}
                  onChange={(e) => setIngestForm((p) => ({ ...p, deviceId: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                >
                  <option value="">-- Select Device --</option>
                  {devices.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.deviceName} ({d.status})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Biometric User ID *</label>
                <input
                  required
                  value={ingestForm.biometricUserId}
                  onChange={(e) =>
                    setIngestForm((p) => ({ ...p, biometricUserId: e.target.value }))
                  }
                  placeholder="e.g. 1042"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Event Timestamp</label>
                  <input
                    type="datetime-local"
                    value={ingestForm.eventTime}
                    onChange={(e) => setIngestForm((p) => ({ ...p, eventTime: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Punch Type</label>
                  <select
                    value={ingestForm.punchType}
                    onChange={(e) =>
                      setIngestForm((p) => ({
                        ...p,
                        punchType: e.target.value as "Check-In" | "Check-Out",
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                  >
                    <option value="Check-In">Check-In</option>
                    <option value="Check-Out">Check-Out</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowEventIngestModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold text-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
              >
                Process Event
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================
          MODAL 7: IMPORT ZKTECO ATTLOG BATCH
         ============================================================ */}
      {showAttlogModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleImportZktecoAttlog}
            className="bg-slate-950 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-white">
                Import ZKTeco G3 Pro / MB360 Plus ATTLOG Batch
              </h3>
              <button
                type="button"
                onClick={() => setShowAttlogModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Paste tab-separated ADMS <code className="text-emerald-400">ATTLOG</code> or CSV export rows (<code className="text-slate-300">BiometricUserID[TAB]YYYY-MM-DD HH:MM:SS[TAB]Status(0=In,1=Out)[TAB]Verify</code>). Any biometric template lines are automatically stripped.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Source Biometric Device *</label>
                <select
                  required
                  value={attlogForm.deviceId}
                  onChange={(e) => setAttlogForm((p) => ({ ...p, deviceId: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                >
                  <option value="">-- Select Registered Device --</option>
                  {scopedDevices.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.deviceName} ({d.manufacturer} {d.model} · SN: {d.serialNumber})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">ATTLOG Lines *</label>
                <textarea
                  rows={6}
                  required
                  value={attlogForm.rawText}
                  onChange={(e) => setAttlogForm((p) => ({ ...p, rawText: e.target.value }))}
                  placeholder={"1042\t2026-07-20 08:04:12\t0\t15\t0\n1042\t2026-07-20 17:02:45\t1\t15\t0"}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowAttlogModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold text-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={connectorBusy}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {connectorBusy ? "Processing..." : "Parse & Process Attendance"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
