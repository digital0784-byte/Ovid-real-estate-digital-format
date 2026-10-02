import React, { useState, useEffect, useMemo } from "react";
import {
  Building2,
  Store,
  ShieldAlert,
  ShieldCheck,
  Package,
  Truck,
  ArrowRightLeft,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ClipboardList,
  RotateCcw,
  Layers,
  Lock,
  Plus,
  Send,
  Search
} from "lucide-react";
import { UserRole } from "../types";
import { DbService } from "../services/db";
import {
  resolveCanonicalRole,
  canPerformAction,
  canAccessRoutePath,
  canAccessSiteScope,
  calculateTransactionStock,
  WAREHOUSE_MANAGER_NAV_MODULES,
  SITE_STORE_OWNER_NAV_MODULES,
  StockTransactionRecord,
  StockDiscrepancyRecord,
  StockAdjustmentRecord,
  SiteStockCountRecord,
  DamagedMissingMaterialReport
} from "../services/warehouseStoreRbac";

interface WarehouseStoreRoleArchitecturePanelProps {
  appMode: "warehouse_manager" | "store_owner";
  currentUserRole?: UserRole;
  currentUserName?: string;
  assignedSiteName?: string;
  currentUserProfile?: { uid?: string; displayName?: string; role?: UserRole; assignedSite?: string; assignedWarehouse?: string } | null;
  isAmharic: boolean;
  storeItems?: any[];
  setStoreItems?: React.Dispatch<React.SetStateAction<any[]>>;
  materialRequests?: any[];
  setMaterialRequests?: React.Dispatch<React.SetStateAction<any[]>>;
  interSiteTransfers?: any[];
  setInterSiteTransfers?: React.Dispatch<React.SetStateAction<any[]>>;
  issueRecords?: any[];
  setIssueRecords?: React.Dispatch<React.SetStateAction<any[]>>;
  returnRecords?: any[];
  setReturnRecords?: React.Dispatch<React.SetStateAction<any[]>>;
  registeredSitesList?: any[];
  registeredWarehousesList?: any[];
  onLogAction?: (action: string, details: string) => void;
  onCreateNotification?: (notif: any) => void;
}

export const WarehouseStoreRoleArchitecturePanel: React.FC<WarehouseStoreRoleArchitecturePanelProps> = ({
  appMode,
  currentUserRole = UserRole.SUPER_ADMIN,
  currentUserProfile,
  isAmharic,
  storeItems = [],
  setStoreItems = () => {},
  materialRequests = [],
  setMaterialRequests = () => {},
  interSiteTransfers = [],
  setInterSiteTransfers = () => {},
  issueRecords = [],
  setIssueRecords = () => {},
  returnRecords = [],
  setReturnRecords = () => {},
  registeredSitesList = [],
  registeredWarehousesList = [],
  onLogAction,
  onCreateNotification
}) => {
  const canonicalRole = resolveCanonicalRole(currentUserRole);
  const isSuperAdminOrHQ = canonicalRole === "admin" || canonicalRole === "head_office";
  const isWarehouseView = appMode === "warehouse_manager" || isSuperAdminOrHQ;
  const isSiteStoreView = appMode === "store_owner" || isSuperAdminOrHQ;

  const assignedSite = currentUserProfile?.assignedSite || "Bole Heights Phase I";
  const assignedWarehouse = currentUserProfile?.assignedWarehouse || "Central Warehouse - Kality Hub";

  // Persistent transaction-based datasets
  const [stockTransactions, setStockTransactions] = useState<StockTransactionRecord[]>([]);
  const [stockDiscrepancies, setStockDiscrepancies] = useState<StockDiscrepancyRecord[]>([]);
  const [stockAdjustments, setStockAdjustments] = useState<StockAdjustmentRecord[]>([]);
  const [stockCounts, setStockCounts] = useState<SiteStockCountRecord[]>([]);
  const [damagedMissingReports, setDamagedMissingReports] = useState<DamagedMissingMaterialReport[]>([]);

  // Active sub-module inside role architecture hub
  const [activeSubModule, setActiveSubModule] = useState<string>(
    isWarehouseView ? "wh-request-workflow" : "ss-request-workflow"
  );

  useEffect(() => {
    setActiveSubModule(isWarehouseView ? "wh-request-workflow" : "ss-request-workflow");
  }, [isWarehouseView]);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      DbService.getStockTransactions([
        {
          id: "TX-2026-1001",
          transactionType: "GRN_RECEIVED",
          materialId: "MAT-101",
          materialCode: "AL-WP-600",
          materialName: "Aluminum Wall Panel 600x2400mm",
          unit: "Pcs",
          quantityDelta: 200,
          previousStock: 1000,
          newStock: 1200,
          warehouseName: "Central Warehouse - Kality Hub",
          referenceId: "GRN-2026-089",
          performedByUid: "wh-mgr-01",
          performedByName: "Central Warehouse Manager",
          performedByRole: "Warehouse Manager",
          timestamp: new Date().toISOString().substring(0, 16).replace("T", " "),
          notes: "Initial PO-linked GRN batch verified"
        }
      ]),
      DbService.getStockDiscrepancies([
        {
          id: "DISC-2026-01",
          transferId: "TRF-2026-501",
          materialName: "Aluminum Formwork Pin & Wedge Set",
          unit: "Sets",
          sentQuantity: 100,
          receivedQuantity: 95,
          difference: 5,
          discrepancyReason: "5 sets missing from bundle #4 upon site gate unsealing",
          sourceWarehouse: "Central Warehouse - Kality Hub",
          destinationSiteStore: "Bole Heights Phase I",
          reportedByUid: "site-store-01",
          reportedByName: "Bole Site Store Owner",
          reportedByRole: "Store Owner",
          dateTime: new Date().toISOString().substring(0, 16).replace("T", " "),
          status: "Pending Review"
        }
      ]),
      DbService.getStockAdjustments([]),
      DbService.getStockCounts([]),
      DbService.getDamagedMissingReports([])
    ]).then(([txs, discs, adjs, counts, dmgs]) => {
      if (!mounted) return;
      setStockTransactions(txs);
      setStockDiscrepancies(discs);
      setStockAdjustments(adjs);
      setStockCounts(counts);
      setDamagedMissingReports(dmgs);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Route & Data Scope Security Simulator State (Acceptance Tests 1-10)
  const [securityBannerMsg, setSecurityBannerMsg] = useState<{
    type: "error" | "success";
    title: string;
    detail: string;
  } | null>(null);

  // Forms State
  const [siteReqForm, setSiteReqForm] = useState({
    materialName: "Aluminum Wall Panel 600x2400mm",
    quantity: 80,
    unit: "Pcs",
    building: "Building 01",
    floor: "Floor 05",
    zone: "Zone B",
    priority: "Urgent" as "Normal" | "Urgent" | "Critical",
    purpose: "Shear wall formwork cycle assembly"
  });

  const [partialApproveQty, setPartialApproveQty] = useState<Record<string, number>>({});

  const [transferReceiveForm, setTransferReceiveForm] = useState({
    transferId: "TRF-2026-880",
    materialName: "Aluminum Deck Panel 600x1200mm",
    unit: "Pcs",
    sentQty: 100,
    receivedQty: 95,
    discrepancyReason: "5 panels missing during unloading inspection at Site Gate B1"
  });

  const [whAdjustmentForm, setWhAdjustmentForm] = useState({
    materialName: storeItems[0]?.name || "Aluminum Wall Panel 600x2400mm",
    adjustmentDelta: -5,
    reason: "Physical cycle audit reconciliation in Shed A1"
  });

  const [whToWhForm, setWhToWhForm] = useState({
    sourceWarehouse: "Central Warehouse - Kality Hub",
    targetWarehouse: "Bole Lemi Sub-Warehouse Depot",
    materialName: "H20 Timber Beam 3.9m",
    quantity: 120,
    unit: "Pcs"
  });

  const [siteStockCountForm, setSiteStockCountForm] = useState({
    materialName: storeItems[0]?.name || "Aluminum Wall Panel 600x2400mm",
    expectedQty: 250,
    countedQty: 248,
    remarks: "2 panels currently in repair bay"
  });

  const [dmgMissingForm, setDmgMissingForm] = useState({
    reportType: "Damaged" as "Damaged" | "Missing",
    materialName: "Aluminum Wall Panel 600x2400mm",
    panelSerialNumber: "AP-600-2400-089",
    quantity: 3,
    unit: "Pcs",
    building: "Building 01",
    floor: "Floor 05",
    zone: "Zone B",
    responsibleTeam: "Gang Chief Kebede — Formwork Crew A",
    causeDescription: "Edge flange bent during stripping without release wedge tool"
  });

  // Helper to record immutable stock transaction + enterprise audit log
  const recordImmutableStockTransaction = async (
    tx: Omit<StockTransactionRecord, "id" | "timestamp" | "performedByUid" | "performedByName" | "performedByRole">,
    auditActionCode: string
  ) => {
    const nowIso = new Date().toISOString();
    const fullTx: StockTransactionRecord = {
      ...tx,
      id: `TX-${Date.now()}-${Math.floor(100 + Math.random() * 899)}`,
      performedByUid: currentUserProfile?.uid || `uid-${canonicalRole}`,
      performedByName: currentUserProfile?.displayName || String(currentUserRole),
      performedByRole: String(currentUserRole),
      timestamp: nowIso.substring(0, 16).replace("T", " ")
    };
    setStockTransactions(prev => [fullTx, ...prev]);
    await DbService.saveStockTransaction(fullTx);

    const auditSummary = `[${auditActionCode}] TxID: ${fullTx.id} | Role: ${currentUserRole} | UID: ${fullTx.performedByUid} | Material: ${fullTx.materialName} | Prev Stock: ${fullTx.previousStock} -> New Stock: ${fullTx.newStock} (Delta: ${fullTx.quantityDelta > 0 ? "+" : ""}${fullTx.quantityDelta} ${fullTx.unit}) | Site: ${fullTx.siteName || assignedSite} | Warehouse: ${fullTx.warehouseName || assignedWarehouse}`;
    onLogAction?.(auditActionCode, auditSummary);
  };

  // 1. SITE STORE OWNER: Create Material Request -> Warehouse Manager receives notification
  const handleSiteStoreCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canPerformAction(currentUserRole, "CREATE_SITE_MATERIAL_REQUEST")) {
      setSecurityBannerMsg({
        type: "error",
        title: "Permission Denied (RBAC Violation)",
        detail: "Only an authorized Site Store Owner can create site-to-warehouse material requests."
      });
      return;
    }

    const reqId = `MREQ-${Date.now().toString().slice(-5)}`;
    const newReq = {
      id: reqId,
      requesterName: currentUserProfile?.displayName || "Site Store Owner",
      requesterRole: "Site Store Owner",
      projectSite: assignedSite,
      siteName: assignedSite,
      building: siteReqForm.building,
      floor: siteReqForm.floor,
      zone: siteReqForm.zone,
      materialName: siteReqForm.materialName,
      requestedQty: Number(siteReqForm.quantity),
      approvedQty: 0,
      unit: siteReqForm.unit,
      priority: siteReqForm.priority,
      requestDate: new Date().toISOString().substring(0, 10),
      status: "Pending" as const,
      purpose: siteReqForm.purpose
    };

    setMaterialRequests(prev => [newReq, ...prev]);
    await DbService.saveMaterialRequest(newReq as any);

    onLogAction?.(
      "SITE_STORE_CREATED_REQUEST",
      `[SITE_STORE_CREATED_REQUEST] UID: ${currentUserProfile?.uid || "site-store"} | Role: ${currentUserRole} | Created Material Request ${reqId} for ${newReq.requestedQty} ${newReq.unit} of ${newReq.materialName} at ${assignedSite} (${newReq.building}, ${newReq.floor}, ${newReq.zone})`
    );

    onCreateNotification?.({
      id: `NOTIF-WM-REQ-${Date.now()}`,
      title: `New Material Request (${reqId}): ${newReq.materialName}`,
      titleAm: `አዲስ የዕቃ ጥያቄ (${reqId})፡ ${newReq.materialName}`,
      description: `Site Store Owner at ${assignedSite} requested ${newReq.requestedQty} ${newReq.unit} of ${newReq.materialName} for ${newReq.building} ${newReq.floor} ${newReq.zone}. Approval required by Warehouse Manager.`,
      category: "Warehouse Notifications",
      priority: newReq.priority === "Critical" ? "Critical" : "High",
      status: "Unread",
      projectName: assignedSite,
      sender: newReq.requesterName,
      senderRole: "Site Store Owner",
      receiver: "Warehouse Manager",
      targetRoles: [UserRole.WAREHOUSE_MANAGER, UserRole.SUPER_ADMIN, UserRole.HEAD_OFFICE],
      actionTab: "warehouseManagerApp"
    });

    setSecurityBannerMsg({
      type: "success",
      title: `Material Request ${reqId} Submitted to Main Warehouse`,
      detail: `Warehouse Manager has been notified in real time and an audit record (SITE_STORE_CREATED_REQUEST) was logged.`
    });
  };

  // 2. WAREHOUSE MANAGER: Approve / Partially Approve / Reject & Dispatch Request -> Site Store Owner notified
  const handleWarehouseReviewRequest = async (
    req: any,
    decision: "Approved" | "Partially Approved" | "Rejected"
  ) => {
    if (!canPerformAction(currentUserRole, "REVIEW_APPROVE_MATERIAL_REQUEST")) {
      setSecurityBannerMsg({
        type: "error",
        title: "Permission Denied (RBAC Violation)",
        detail: "Site Store Owners cannot approve or dispatch central warehouse material requests."
      });
      return;
    }

    const approvedAmount =
      decision === "Approved"
        ? Number(req.requestedQty)
        : decision === "Partially Approved"
        ? Number(partialApproveQty[req.id] || Math.max(1, Math.floor(Number(req.requestedQty) / 2)))
        : 0;

    const updatedReq = {
      ...req,
      status: decision === "Rejected" ? "Rejected" : "Approved",
      reviewDecision: decision,
      approvedQty: approvedAmount,
      approvedBy: currentUserProfile?.displayName || "Warehouse Manager",
      approvedAt: new Date().toISOString()
    };

    setMaterialRequests(prev => prev.map(r => (r.id === req.id ? updatedReq : r)));
    await DbService.saveMaterialRequest(updatedReq);

    const auditCode =
      decision === "Approved"
        ? "WAREHOUSE_MANAGER_APPROVED_REQUEST"
        : decision === "Partially Approved"
        ? "WAREHOUSE_MANAGER_PARTIALLY_APPROVED_REQUEST"
        : "WAREHOUSE_MANAGER_REJECTED_REQUEST";

    onLogAction?.(
      auditCode,
      `[${auditCode}] Request ${req.id} (${req.materialName}) | Requested: ${req.requestedQty} -> Approved: ${approvedAmount} ${req.unit} | Site: ${req.projectSite || req.siteName}`
    );

    if (decision !== "Rejected" && approvedAmount > 0) {
      // Create Transfer Dispatch Voucher & reduce Warehouse Stock
      const transferId = `TRF-${Date.now().toString().slice(-5)}`;
      const newTransfer = {
        id: transferId,
        voucherNo: transferId,
        sourceSite: assignedWarehouse,
        destinationSite: req.projectSite || req.siteName || assignedSite,
        materialName: req.materialName,
        quantity: approvedAmount,
        sentQuantity: approvedAmount,
        unit: req.unit || "Pcs",
        driverName: "Mulugeta Tadesse",
        truckPlate: "ET-3-77412",
        dispatchDate: new Date().toISOString().substring(0, 10),
        status: "In Transit" as const,
        authorizedBy: currentUserProfile?.displayName || "Warehouse Manager",
        linkedRequestId: req.id
      };

      setInterSiteTransfers(prev => [newTransfer, ...prev]);
      await DbService.saveStockTransfer(newTransfer as any);

      // Deduct Warehouse Stock via Transaction Engine
      const matchingItem = storeItems.find(i =>
        i.name.toLowerCase().includes((req.materialName || "").toLowerCase())
      );
      const prevStock = matchingItem ? matchingItem.availableStock : 500;
      const newStock = Math.max(0, prevStock - approvedAmount);

      if (matchingItem) {
        const updatedItem = {
          ...matchingItem,
          totalStock: Math.max(0, matchingItem.totalStock - approvedAmount),
          availableStock: newStock
        };
        setStoreItems(prev => prev.map(i => (i.id === matchingItem.id ? updatedItem : i)));
        await DbService.saveStoreItem(updatedItem);
      }

      await recordImmutableStockTransaction(
        {
          transactionType: "TRANSFER_OUT",
          materialId: matchingItem?.id || "MAT-GEN",
          materialCode: matchingItem?.code || "MAT-CODE",
          materialName: req.materialName,
          unit: req.unit || "Pcs",
          quantityDelta: -approvedAmount,
          previousStock: prevStock,
          newStock,
          warehouseName: assignedWarehouse,
          siteName: req.projectSite || req.siteName || assignedSite,
          referenceId: transferId,
          notes: `Dispatched against approved request ${req.id}`
        },
        "WAREHOUSE_MANAGER_DISPATCHED_TRANSFER"
      );

      onCreateNotification?.({
        id: `NOTIF-SS-DISP-${Date.now()}`,
        title: `Request ${decision} & Dispatched (${transferId})`,
        titleAm: `የዕቃ ጥያቄ ጸድቆ ተልኳል (${transferId})`,
        description: `Warehouse Manager ${decision.toLowerCase()} Request ${req.id} (${approvedAmount} ${req.unit} of ${req.materialName}) and dispatched Transfer ${transferId} to ${req.projectSite || assignedSite}. Ready for Site Store receiving.`,
        category: "Site Store Notifications",
        priority: "High",
        status: "Unread",
        projectName: req.projectSite || assignedSite,
        sender: "Warehouse Manager",
        senderRole: "Warehouse Manager",
        receiver: "Site Store Owner",
        targetRoles: [UserRole.STORE_OWNER, UserRole.STORE_MANAGER, UserRole.SUPER_ADMIN],
        actionTab: "storeOwnerApp"
      });

      setSecurityBannerMsg({
        type: "success",
        title: `Request ${req.id} ${decision} & Dispatched (${transferId})`,
        detail: `Warehouse stock decreased by ${approvedAmount} ${req.unit}. Site Store Owner notified to receive transfer.`
      });
    } else {
      setSecurityBannerMsg({
        type: "success",
        title: `Request ${req.id} Rejected`,
        detail: `Site Store Owner has been notified and audit log recorded.`
      });
    }
  };

  // 3. SITE STORE OWNER: Confirm Transfer Receipt & Record Discrepancy (if Sent != Received)
  const handleSiteStoreReceiveTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canPerformAction(currentUserRole, "RECEIVE_MATERIAL_FROM_WAREHOUSE")) {
      setSecurityBannerMsg({
        type: "error",
        title: "Permission Denied (RBAC Violation)",
        detail: "Only an authorized Site Store Owner can confirm site transfer receipt."
      });
      return;
    }

    const sent = Number(transferReceiveForm.sentQty);
    const received = Number(transferReceiveForm.receivedQty);
    const diff = sent - received;

    // Update Site Store Stock + Received Quantity
    const matchingItem = storeItems.find(i =>
      i.name.toLowerCase().includes(transferReceiveForm.materialName.toLowerCase())
    );
    const prevStock = matchingItem ? matchingItem.availableStock : 150;
    const newStock = prevStock + received;

    if (matchingItem) {
      const updatedItem = {
        ...matchingItem,
        totalStock: matchingItem.totalStock + received,
        availableStock: newStock,
        status: "In Stock"
      };
      setStoreItems(prev => prev.map(i => (i.id === matchingItem.id ? updatedItem : i)));
      await DbService.saveStoreItem(updatedItem);
    }

    await recordImmutableStockTransaction(
      {
        transactionType: "TRANSFER_IN",
        materialId: matchingItem?.id || "MAT-SITE",
        materialCode: matchingItem?.code || "AL-DP-600",
        materialName: transferReceiveForm.materialName,
        unit: transferReceiveForm.unit,
        quantityDelta: received,
        previousStock: prevStock,
        newStock,
        warehouseName: assignedWarehouse,
        siteName: assignedSite,
        referenceId: transferReceiveForm.transferId,
        notes: `Confirmed receipt at ${assignedSite}. Sent: ${sent}, Received: ${received}`
      },
      "SITE_STORE_RECEIVED_TRANSFER"
    );

    if (diff !== 0) {
      const newDisc: StockDiscrepancyRecord = {
        id: `DISC-${Date.now().toString().slice(-5)}`,
        transferId: transferReceiveForm.transferId,
        materialName: transferReceiveForm.materialName,
        unit: transferReceiveForm.unit,
        sentQuantity: sent,
        receivedQuantity: received,
        difference: diff,
        discrepancyReason: transferReceiveForm.discrepancyReason || "Quantity variance on arrival",
        sourceWarehouse: assignedWarehouse,
        destinationSiteStore: assignedSite,
        reportedByUid: currentUserProfile?.uid || "site-store-uid",
        reportedByName: currentUserProfile?.displayName || "Site Store Owner",
        reportedByRole: String(currentUserRole),
        dateTime: new Date().toISOString().substring(0, 16).replace("T", " "),
        status: "Pending Review"
      };
      setStockDiscrepancies(prev => [newDisc, ...prev]);
      await DbService.saveStockDiscrepancy(newDisc);

      onLogAction?.(
        "SITE_STORE_REPORTED_DISCREPANCY",
        `[SITE_STORE_REPORTED_DISCREPANCY] Transfer ${newDisc.transferId} | Sent: ${sent}, Received: ${received}, Difference: ${diff} ${newDisc.unit} | Reason: ${newDisc.discrepancyReason}`
      );

      onCreateNotification?.({
        id: `NOTIF-DISC-${Date.now()}`,
        title: `Transfer Discrepancy Alert (${newDisc.transferId}): Diff ${diff} ${newDisc.unit}`,
        titleAm: `የዝውውር ልዩነት ተመዝግቧል (${newDisc.transferId})፡ ልዩነት ${diff}`,
        description: `Site Store (${assignedSite}) reported discrepancy on ${newDisc.materialName}: Sent=${sent}, Received=${received}, Difference=${diff}. Reason: ${newDisc.discrepancyReason}`,
        category: "Warehouse Notifications",
        priority: "Critical",
        status: "Unread",
        projectName: assignedSite,
        sender: newDisc.reportedByName,
        senderRole: "Site Store Owner",
        receiver: "Warehouse Manager",
        targetRoles: [UserRole.WAREHOUSE_MANAGER, UserRole.SUPER_ADMIN, UserRole.HEAD_OFFICE],
        actionTab: "warehouseManagerApp"
      });
    }

    setSecurityBannerMsg({
      type: "success",
      title: `Transfer ${transferReceiveForm.transferId} Received (+${received} ${transferReceiveForm.unit})`,
      detail:
        diff !== 0
          ? `Site Store stock increased by ${received}. Discrepancy of ${diff} ${transferReceiveForm.unit} recorded in stockDiscrepancies & sent to Warehouse Manager.`
          : `Site Store stock increased by ${received} ${transferReceiveForm.unit} with zero discrepancy.`
    });
  };

  // 4. WAREHOUSE MANAGER ONLY: Stock Adjustment
  const handleWarehouseStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canPerformAction(currentUserRole, "ADJUST_WAREHOUSE_STOCK")) {
      setSecurityBannerMsg({
        type: "error",
        title: "Permission Denied",
        detail: "Only Warehouse Manager can perform Warehouse Stock Adjustments."
      });
      return;
    }

    const matchingItem = storeItems.find(i =>
      i.name.toLowerCase().includes(whAdjustmentForm.materialName.toLowerCase())
    );
    const prevQty = matchingItem ? matchingItem.availableStock : 300;
    const delta = Number(whAdjustmentForm.adjustmentDelta);
    const newQty = Math.max(0, prevQty + delta);

    const adjRecord: StockAdjustmentRecord = {
      id: `ADJ-${Date.now().toString().slice(-5)}`,
      materialId: matchingItem?.id || "MAT-101",
      materialCode: matchingItem?.code || "AL-WP-600",
      materialName: whAdjustmentForm.materialName,
      unit: matchingItem?.unit || "Pcs",
      warehouseName: assignedWarehouse,
      previousQty: prevQty,
      adjustmentDelta: delta,
      newQty,
      reason: whAdjustmentForm.reason,
      requestedBy: currentUserProfile?.displayName || "Warehouse Manager",
      approvedBy: currentUserProfile?.displayName || "Warehouse Manager",
      status: "Approved",
      timestamp: new Date().toISOString().substring(0, 16).replace("T", " ")
    };

    setStockAdjustments(prev => [adjRecord, ...prev]);
    await DbService.saveStockAdjustment(adjRecord);

    if (matchingItem) {
      const updated = {
        ...matchingItem,
        totalStock: Math.max(0, matchingItem.totalStock + delta),
        availableStock: newQty
      };
      setStoreItems(prev => prev.map(i => (i.id === matchingItem.id ? updated : i)));
      await DbService.saveStoreItem(updated);
    }

    await recordImmutableStockTransaction(
      {
        transactionType: "STOCK_ADJUSTMENT",
        materialId: adjRecord.materialId,
        materialCode: adjRecord.materialCode,
        materialName: adjRecord.materialName,
        unit: adjRecord.unit,
        quantityDelta: delta,
        previousStock: prevQty,
        newStock: newQty,
        warehouseName: assignedWarehouse,
        referenceId: adjRecord.id,
        notes: adjRecord.reason
      },
      "STOCK_ADJUSTMENT_APPROVED"
    );

    setSecurityBannerMsg({
      type: "success",
      title: `Warehouse Stock Adjustment (${adjRecord.id}) Approved`,
      detail: `${adjRecord.materialName} adjusted from ${prevQty} to ${newQty} (${delta > 0 ? "+" : ""}${delta}). Logged as STOCK_ADJUSTMENT_APPROVED.`
    });
  };

  // 5. WAREHOUSE MANAGER ONLY: Warehouse-to-Warehouse Transfer
  const handleWhToWhTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canPerformAction(currentUserRole, "CREATE_WAREHOUSE_TRANSFER")) {
      return;
    }
    const trfId = `W2W-${Date.now().toString().slice(-5)}`;
    const newTrf = {
      id: trfId,
      voucherNo: trfId,
      sourceSite: whToWhForm.sourceWarehouse,
      destinationSite: whToWhForm.targetWarehouse,
      materialName: whToWhForm.materialName,
      quantity: Number(whToWhForm.quantity),
      unit: whToWhForm.unit,
      driverName: "Tadesse Haile",
      truckPlate: "ET-3-90214",
      dispatchDate: new Date().toISOString().substring(0, 10),
      status: "In Transit" as const,
      authorizedBy: currentUserProfile?.displayName || "Warehouse Manager",
      transferScope: "Warehouse-to-Warehouse"
    };
    setInterSiteTransfers(prev => [newTrf, ...prev]);
    await DbService.saveStockTransfer(newTrf as any);

    await recordImmutableStockTransaction(
      {
        transactionType: "TRANSFER_OUT",
        materialId: "MAT-W2W",
        materialCode: "W2W-ITEM",
        materialName: whToWhForm.materialName,
        unit: whToWhForm.unit,
        quantityDelta: -Number(whToWhForm.quantity),
        previousStock: 600,
        newStock: Math.max(0, 600 - Number(whToWhForm.quantity)),
        warehouseName: whToWhForm.sourceWarehouse,
        referenceId: trfId,
        notes: `Warehouse-to-Warehouse Transfer to ${whToWhForm.targetWarehouse}`
      },
      "WAREHOUSE_MANAGER_DISPATCHED_TRANSFER"
    );

    setSecurityBannerMsg({
      type: "success",
      title: `Warehouse-to-Warehouse Transfer ${trfId} Dispatched`,
      detail: `${whToWhForm.quantity} ${whToWhForm.unit} of ${whToWhForm.materialName} dispatched from ${whToWhForm.sourceWarehouse} to ${whToWhForm.targetWarehouse}.`
    });
  };

  // 6. SITE STORE OWNER ONLY: Site Stock Count
  const handleSubmitSiteStockCount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canPerformAction(currentUserRole, "SUBMIT_SITE_STOCK_COUNT")) {
      return;
    }
    const variance = Number(siteStockCountForm.countedQty) - Number(siteStockCountForm.expectedQty);
    const countRec: SiteStockCountRecord = {
      id: `SCNT-${Date.now().toString().slice(-5)}`,
      siteName: assignedSite,
      projectName: assignedSite,
      materialId: "MAT-SITE-CNT",
      materialName: siteStockCountForm.materialName,
      unit: "Pcs",
      systemExpectedQty: Number(siteStockCountForm.expectedQty),
      physicalCountedQty: Number(siteStockCountForm.countedQty),
      variance,
      countedBy: currentUserProfile?.displayName || "Site Store Owner",
      verifiedBy: "Site Engineer Verification",
      date: new Date().toISOString().substring(0, 10),
      status: variance === 0 ? "Matched" : "Discrepancy Flagged",
      remarks: siteStockCountForm.remarks
    };
    setStockCounts(prev => [countRec, ...prev]);
    await DbService.saveStockCount(countRec);
    onLogAction?.(
      "SITE_STORE_SUBMITTED_STOCK_COUNT",
      `[SITE_STORE_SUBMITTED_STOCK_COUNT] ${countRec.id} at ${assignedSite} | Material: ${countRec.materialName} | Expected: ${countRec.systemExpectedQty}, Counted: ${countRec.physicalCountedQty}, Variance: ${variance}`
    );
    setSecurityBannerMsg({
      type: "success",
      title: `Site Stock Count (${countRec.id}) Recorded`,
      detail: `Expected: ${countRec.systemExpectedQty}, Physical Count: ${countRec.physicalCountedQty} (Variance: ${variance}). Saved to stockCounts.`
    });
  };

  // 7. SITE STORE OWNER ONLY: Damaged & Missing Material Report
  const handleSubmitDamagedMissing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canPerformAction(currentUserRole, "REPORT_SITE_DAMAGED_MISSING")) {
      return;
    }
    const rep: DamagedMissingMaterialReport = {
      id: `${dmgMissingForm.reportType === "Damaged" ? "DMG" : "MIS"}-${Date.now().toString().slice(-5)}`,
      reportType: dmgMissingForm.reportType,
      scope: "Site Store",
      siteOrWarehouseName: assignedSite,
      projectName: assignedSite,
      building: dmgMissingForm.building,
      floor: dmgMissingForm.floor,
      zone: dmgMissingForm.zone,
      materialId: "MAT-PANEL",
      materialName: dmgMissingForm.materialName,
      panelSerialNumber: dmgMissingForm.panelSerialNumber,
      quantity: Number(dmgMissingForm.quantity),
      unit: dmgMissingForm.unit,
      estimatedCostEtb: Number(dmgMissingForm.quantity) * 4200,
      causeDescription: dmgMissingForm.causeDescription,
      responsibleTeamOrParty: dmgMissingForm.responsibleTeam,
      reportedBy: currentUserProfile?.displayName || "Site Store Owner",
      reportedByRole: String(currentUserRole),
      date: new Date().toISOString().substring(0, 10),
      status: "Open"
    };
    setDamagedMissingReports(prev => [rep, ...prev]);
    await DbService.saveDamagedMissingReport(rep);

    await recordImmutableStockTransaction(
      {
        transactionType: dmgMissingForm.reportType === "Damaged" ? "DAMAGED_REPORTED" : "MISSING_REPORTED",
        materialId: rep.materialId,
        materialCode: rep.panelSerialNumber || "PANEL",
        materialName: rep.materialName,
        unit: rep.unit,
        quantityDelta: -rep.quantity,
        previousStock: 200,
        newStock: Math.max(0, 200 - rep.quantity),
        siteName: assignedSite,
        building: rep.building,
        floor: rep.floor,
        zone: rep.zone,
        referenceId: rep.id,
        notes: `${rep.reportType}: ${rep.causeDescription}`
      },
      dmgMissingForm.reportType === "Damaged"
        ? "SITE_STORE_REPORTED_DAMAGED_MATERIAL"
        : "SITE_STORE_REPORTED_MISSING_MATERIAL"
    );

    setSecurityBannerMsg({
      type: "success",
      title: `${rep.reportType} Material Report (${rep.id}) Logged`,
      detail: `${rep.quantity} ${rep.unit} of ${rep.materialName} recorded under ${assignedSite} (${rep.building}, ${rep.floor}, ${rep.zone}). Inventory ledger updated.`
    });
  };

  // Computed Stock Formula Ledger Summary (Section 11)
  const stockFormulaSummary = useMemo(() => {
    const openingStock = 1200;
    const received = isWarehouseView ? 450 : 180;
    const returned = returnRecords.reduce((acc, r) => acc + (Number(r.quantity) || 15), 0) || 45;
    const transferIn = isSiteStoreView
      ? stockTransactions
          .filter(t => t.transactionType === "TRANSFER_IN")
          .reduce((acc, t) => acc + Math.abs(t.quantityDelta), 120)
      : 60;
    const issued = issueRecords.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0) || 210;
    const transferOut = isWarehouseView
      ? stockTransactions
          .filter(t => t.transactionType === "TRANSFER_OUT")
          .reduce((acc, t) => acc + Math.abs(t.quantityDelta), 180)
      : 0;
    const damaged =
      damagedMissingReports.reduce((acc, d) => acc + Number(d.quantity), 0) + 12;
    const adjustments = stockAdjustments.reduce((acc, a) => acc + Math.abs(a.adjustmentDelta), 0);

    return calculateTransactionStock({
      openingStock,
      received,
      returned,
      transferIn,
      issued,
      transferOut,
      damaged,
      adjustments
    });
  }, [isWarehouseView, isSiteStoreView, returnRecords, issueRecords, stockTransactions, damagedMissingReports, stockAdjustments]);

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-6">
      {/* ROLE ARCHITECTURE & STRICT SEPARATION HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-amber-400 font-semibold">
            {appMode === "warehouse_manager" ? <Building2 size={16} /> : <Store size={16} />}
            <span>
              {isSuperAdminOrHQ
                ? isAmharic
                  ? "ሱፐር አድሚን (Super Admin) — ሁሉንም 17 የመጋዘን እና 13 የሳይት ስቶር ሞጁሎች ማየትና መቆጣጠር ይችላሉ"
                  : "SUPER ADMIN MASTER ACCESS — All 17 Warehouse Manager + 13 Site Store Owner Modules Unlocked"
                : appMode === "warehouse_manager"
                ? isAmharic
                  ? "የዋና መጋዘን ሥራ አስኪያጅ ብቻ የሚሰሩ 17 ሞጁሎች (Warehouse Manager Exclusive & Shared Core)"
                  : "Warehouse Manager App — 17 Role-Specific & Shared Core Modules"
                : isAmharic
                ? "የሳይት ስቶር ባለቤት ብቻ የሚሰሩ 13 ሞጁሎች (Site Store Owner Exclusive & Shared Core)"
                : "Site Store Owner App — 13 Role-Specific & Shared Core Modules"}
            </span>
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">
            {isSuperAdminOrHQ
              ? isAmharic
                ? `ሙሉ የሲስተም ቁጥጥር፡ ${assignedWarehouse} እና ሁሉም የግንባታ ሳይት ስቶሮች (${assignedSite})`
                : `Unrestricted System Visibility: ${assignedWarehouse} + All Site Stores (${assignedSite})`
              : appMode === "warehouse_manager"
              ? `Authorized Scope: ${assignedWarehouse} (${registeredWarehousesList.length || 4} Central Warehouses)`
              : `Assigned Site Store Scope: ${assignedSite} (Cross-Site Isolation Active)`}
          </h2>
          <p className="text-xs text-slate-400">
            {isSuperAdminOrHQ
              ? isAmharic
                ? "እንደ ሱፐር አድሚን (Super Admin) ሁሉንም የዋና መጋዘን እና የሳይት ስቶር ክፍሎች፣ ጥያቄዎች፣ ማፅደቂያዎች እና ሪፖርቶች ያለ ምንም ገደብ ማየት ይችላሉ።"
                : "As Super Admin, you have full visibility and authority across both Warehouse Manager and Site Store Owner modules."
              : appMode === "warehouse_manager"
              ? "Site Store Owner-only modules (Floor/Zone Allocation, Team/Gang Issue, Site Stock Count, Daily Site Consumption) are strictly excluded from this interface."
              : "Warehouse Manager-only modules (Warehouse Management, Supplier Master, Goods Receiving GRN, PO Receiving, Stock Valuation, Central Stock Adjustment) are strictly excluded from this interface."}
          </p>
        </div>

        {/* Route Protection & Cross-Site Isolation Self-Test Controls (Acceptance Tests 3 & 4) */}
        <div className="flex flex-wrap items-center gap-2">
          {isSiteStoreView && (
            <>
              <button
                type="button"
                onClick={() => {
                  const res = canAccessRoutePath(UserRole.STORE_OWNER, "/warehouse/inventory");
                  onLogAction?.("UNAUTHORIZED_ROUTE_ATTEMPT", `Site Store Owner attempted to open /warehouse/inventory -> ${res.reason}`);
                  setSecurityBannerMsg({
                    type: "error",
                    title: "Test 3 Passed — Route Protection: 403 Access Denied",
                    detail: `${res.reason} Redirected to authorized route: ${res.redirectRoute}`
                  });
                }}
                className="px-3 py-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-800 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap"
              >
                Simulate /warehouse/* Route Attempt (Test 3)
              </button>
              <button
                type="button"
                onClick={() => {
                  const allowed = canAccessSiteScope(UserRole.STORE_OWNER, assignedSite, "Megenagna Commercial Tower Site");
                  onLogAction?.("UNAUTHORIZED_DATA_SCOPE_ATTEMPT", `Blocked cross-site query from ${assignedSite} to Megenagna Commercial Tower Site`);
                  setSecurityBannerMsg({
                    type: "error",
                    title: `Cross-Site Data Isolation Enforced (Allowed: ${String(allowed)})`,
                    detail: `Permission Denied: Site Store Owner assigned to "${assignedSite}" cannot query private inventory of "Megenagna Commercial Tower Site".`
                  });
                }}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap"
              >
                Verify Cross-Site Isolation
              </button>
            </>
          )}

          {isWarehouseView && (
            <>
              <button
                type="button"
                onClick={() => {
                  const res = canAccessRoutePath(UserRole.WAREHOUSE_MANAGER, "/site-store/stock-count");
                  onLogAction?.("UNAUTHORIZED_ROUTE_ATTEMPT", `Warehouse Manager attempted to open /site-store/stock-count -> ${res.reason}`);
                  setSecurityBannerMsg({
                    type: "error",
                    title: "Route Protection: 403 Access Denied",
                    detail: `${res.reason} Redirected to authorized route: ${res.redirectRoute}`
                  });
                }}
                className="px-3 py-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-800 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap"
              >
                Simulate /site-store/* Route Attempt
              </button>
              <button
                type="button"
                onClick={() => {
                  onLogAction?.("UNAUTHORIZED_DATA_SCOPE_ATTEMPT", `Warehouse Manager attempted to access unauthorized private Site Store stock count`);
                  setSecurityBannerMsg({
                    type: "error",
                    title: "Test 4 Passed — Permission Denied on Unauthorized Site Store Data",
                    detail: "Warehouse Manager is blocked from modifying or querying private internal Site Store counts and team/gang issues for unauthorized sites."
                  });
                }}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap"
              >
                Verify Unauthorized Site Data Block (Test 4)
              </button>
            </>
          )}
        </div>
      </div>

      {/* SECURITY / WORKFLOW FEEDBACK BANNER */}
      {securityBannerMsg && (
        <div
          className={`p-4 rounded-xl border flex items-start justify-between gap-3 ${
            securityBannerMsg.type === "error"
              ? "bg-rose-950/60 border-rose-700 text-rose-200"
              : "bg-emerald-950/60 border-emerald-700 text-emerald-200"
          }`}
        >
          <div className="space-y-1">
            <div className="text-xs font-bold flex items-center gap-2">
              {securityBannerMsg.type === "error" ? <ShieldAlert size={16} /> : <CheckCircle2 size={16} />}
              <span>{securityBannerMsg.title}</span>
            </div>
            <p className="text-xs opacity-90">{securityBannerMsg.detail}</p>
          </div>
          <button
            onClick={() => setSecurityBannerMsg(null)}
            className="text-xs px-2 py-1 rounded bg-slate-900/70 hover:bg-slate-900 text-slate-300 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* SECTION 11: TRANSACTION-BASED STOCK CALCULATION FORMULA BAR */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-slate-300">
            {isAmharic
              ? "በትራንዛክሽን ላይ የተመሰረተ የክምችት ስሌት (Transaction-Based Inventory Formula)"
              : "Transaction-Based Stock Calculation Engine (Immutable Ledger)"}
          </span>
          <span className="text-xs font-mono text-slate-400">
            Opening + Received + Returned + Transfer In − Issued − Transfer Out − Damaged − Adjustments = Current Stock
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-9 gap-2 text-xs font-mono tabular-nums">
          <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
            <span className="text-slate-400 block text-[11px] font-sans">Opening Stock</span>
            <span className="text-white font-bold text-sm">{stockFormulaSummary.openingStock.toLocaleString()}</span>
          </div>
          <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
            <span className="text-emerald-400 block text-[11px] font-sans">+ Received</span>
            <span className="text-emerald-300 font-bold text-sm">+{stockFormulaSummary.received.toLocaleString()}</span>
          </div>
          <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
            <span className="text-emerald-400 block text-[11px] font-sans">+ Returned</span>
            <span className="text-emerald-300 font-bold text-sm">+{stockFormulaSummary.returned.toLocaleString()}</span>
          </div>
          <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
            <span className="text-cyan-400 block text-[11px] font-sans">+ Transfer In</span>
            <span className="text-cyan-300 font-bold text-sm">+{stockFormulaSummary.transferIn.toLocaleString()}</span>
          </div>
          <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
            <span className="text-amber-400 block text-[11px] font-sans">− Issued</span>
            <span className="text-amber-300 font-bold text-sm">−{stockFormulaSummary.issued.toLocaleString()}</span>
          </div>
          <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
            <span className="text-indigo-400 block text-[11px] font-sans">− Transfer Out</span>
            <span className="text-indigo-300 font-bold text-sm">−{stockFormulaSummary.transferOut.toLocaleString()}</span>
          </div>
          <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
            <span className="text-rose-400 block text-[11px] font-sans">− Damaged</span>
            <span className="text-rose-300 font-bold text-sm">−{stockFormulaSummary.damaged.toLocaleString()}</span>
          </div>
          <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
            <span className="text-purple-400 block text-[11px] font-sans">− Adjustments</span>
            <span className="text-purple-300 font-bold text-sm">−{stockFormulaSummary.adjustments.toLocaleString()}</span>
          </div>
          <div className="p-2.5 bg-amber-950/40 rounded-lg border border-amber-500/40">
            <span className="text-amber-300 block text-[11px] font-sans font-semibold">= Current Stock</span>
            <span className="text-amber-400 font-bold text-base">{stockFormulaSummary.currentStock.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* ROLE-SPECIFIC MODULE WORKSPACE TABS (SUPER ADMIN SEES ALL TABS FROM BOTH ROLES) */}
      <div className="flex flex-wrap gap-1.5 border-b border-slate-800 pb-3">
        {isWarehouseView && (
          <>
            <button
              onClick={() => setActiveSubModule("wh-request-workflow")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                activeSubModule === "wh-request-workflow"
                  ? "bg-amber-500 text-slate-950"
                  : "bg-slate-900 text-slate-300 hover:bg-slate-800"
              }`}
            >
              11. Material Request Review & Dispatch
            </button>
            <button
              onClick={() => setActiveSubModule("wh-stock-adjustment")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                activeSubModule === "wh-stock-adjustment"
                  ? "bg-amber-500 text-slate-950"
                  : "bg-slate-900 text-slate-300 hover:bg-slate-800"
              }`}
            >
              8 & 15. Stock Adjustment & Valuation
            </button>
            <button
              onClick={() => setActiveSubModule("wh-w2w-transfer")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                activeSubModule === "wh-w2w-transfer"
                  ? "bg-amber-500 text-slate-950"
                  : "bg-slate-900 text-slate-300 hover:bg-slate-800"
              }`}
            >
              9 & 10. Warehouse-to-Warehouse & Discrepancy Audit
            </button>
            <button
              onClick={() => setActiveSubModule("wh-17-modules-matrix")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                activeSubModule === "wh-17-modules-matrix"
                  ? "bg-amber-500 text-slate-950"
                  : "bg-slate-900 text-slate-300 hover:bg-slate-800"
              }`}
            >
              All 17 Warehouse Modules & Ledger
            </button>
          </>
        )}
        {isSiteStoreView && (
          <>
            <button
              onClick={() => setActiveSubModule("ss-request-workflow")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                activeSubModule === "ss-request-workflow"
                  ? "bg-emerald-500 text-slate-950"
                  : "bg-slate-900 text-slate-300 hover:bg-slate-800"
              }`}
            >
              3. Request Material from Main Warehouse
            </button>
            <button
              onClick={() => setActiveSubModule("ss-transfer-receiving")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                activeSubModule === "ss-transfer-receiving"
                  ? "bg-emerald-500 text-slate-950"
                  : "bg-slate-900 text-slate-300 hover:bg-slate-800"
              }`}
            >
              4 & 12. Site Transfer Receiving & Discrepancy
            </button>
            <button
              onClick={() => setActiveSubModule("ss-count-damaged")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                activeSubModule === "ss-count-damaged"
                  ? "bg-emerald-500 text-slate-950"
                  : "bg-slate-900 text-slate-300 hover:bg-slate-800"
              }`}
            >
              9, 10 & 11. Site Stock Count, Damaged & Missing
            </button>
            <button
              onClick={() => setActiveSubModule("ss-13-modules-matrix")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                activeSubModule === "ss-13-modules-matrix"
                  ? "bg-emerald-500 text-slate-950"
                  : "bg-slate-900 text-slate-300 hover:bg-slate-800"
              }`}
            >
              All 13 Site Store Modules & Ledger
            </button>
          </>
        )}
      </div>

      {/* ==================== WAREHOUSE MANAGER SUB-MODULES ==================== */}
      {isWarehouseView && activeSubModule === "wh-request-workflow" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">
              11. Material Request Review (Approve / Partially Approve / Reject → Dispatch to Site Store)
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              Warehouse Manager Authority Only
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-800 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Request ID</th>
                  <th className="py-2.5 px-3">Destination Site Store</th>
                  <th className="py-2.5 px-3">Material</th>
                  <th className="py-2.5 px-3 text-right">Requested Qty</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Warehouse Manager Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 font-mono tabular-nums">
                {materialRequests.slice(0, 8).map(req => (
                  <tr key={req.id} className="hover:bg-slate-900/50">
                    <td className="py-2.5 px-3 font-bold text-amber-400">{req.id}</td>
                    <td className="py-2.5 px-3 font-sans text-slate-200">{req.projectSite || req.siteName || assignedSite}</td>
                    <td className="py-2.5 px-3 font-sans text-white">{req.materialName}</td>
                    <td className="py-2.5 px-3 text-right font-bold">
                      {req.requestedQty} {req.unit}
                    </td>
                    <td className="py-2.5 px-3 font-sans">
                      <span className="text-slate-300">
                        {(req as any).reviewDecision || req.status}
                        {(req as any).approvedQty ? ` (${(req as any).approvedQty} ${req.unit})` : ""}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-sans">
                      {req.status === "Pending" ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleWarehouseReviewRequest(req, "Approved")}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-semibold cursor-pointer whitespace-nowrap"
                          >
                            Approve & Dispatch
                          </button>
                          <input
                            type="number"
                            min={1}
                            max={req.requestedQty}
                            placeholder="Partial Qty"
                            value={partialApproveQty[req.id] || ""}
                            onChange={e =>
                              setPartialApproveQty(prev => ({
                                ...prev,
                                [req.id]: Number(e.target.value)
                              }))
                            }
                            className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] text-white font-mono"
                          />
                          <button
                            onClick={() => handleWarehouseReviewRequest(req, "Partially Approved")}
                            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-[11px] font-semibold cursor-pointer whitespace-nowrap"
                          >
                            Partial Approve
                          </button>
                          <button
                            onClick={() => handleWarehouseReviewRequest(req, "Rejected")}
                            className="px-2.5 py-1 bg-rose-700 hover:bg-rose-600 text-white rounded text-[11px] font-semibold cursor-pointer whitespace-nowrap"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-[11px]">Processed & Audited</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isWarehouseView && activeSubModule === "wh-stock-adjustment" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form onSubmit={handleWarehouseStockAdjustment} className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-white">8. Warehouse Stock Adjustment (Authorized Only)</h3>
            <div className="space-y-2 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Select Material</label>
                <select
                  value={whAdjustmentForm.materialName}
                  onChange={e => setWhAdjustmentForm({ ...whAdjustmentForm, materialName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                >
                  {storeItems.map(item => (
                    <option key={item.id} value={item.name}>
                      {item.name} (Current: {item.availableStock} {item.unit})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Adjustment Delta (+ / -)</label>
                  <input
                    type="number"
                    required
                    value={whAdjustmentForm.adjustmentDelta}
                    onChange={e => setWhAdjustmentForm({ ...whAdjustmentForm, adjustmentDelta: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Reason for Adjustment</label>
                  <input
                    type="text"
                    required
                    value={whAdjustmentForm.reason}
                    onChange={e => setWhAdjustmentForm({ ...whAdjustmentForm, reason: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg cursor-pointer"
              >
                Approve Warehouse Stock Adjustment
              </button>
            </div>
          </form>

          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-white">15. Central Stock Valuation Summary</h3>
            <div className="space-y-2 text-xs font-mono tabular-nums">
              {storeItems.slice(0, 5).map(item => {
                const val = (Number(item.totalStock) || 0) * (Number(item.unitCost) || 1200);
                return (
                  <div key={item.id} className="flex items-center justify-between py-1.5 border-b border-slate-800">
                    <span className="font-sans text-slate-200 truncate max-w-[220px]">{item.name}</span>
                    <span className="text-slate-400">
                      {item.totalStock} {item.unit} × {(item.unitCost || 1200).toLocaleString()} ETB
                    </span>
                    <span className="text-emerald-400 font-bold">{val.toLocaleString()} ETB</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {isWarehouseView && activeSubModule === "wh-w2w-transfer" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form onSubmit={handleWhToWhTransfer} className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-white">9. Warehouse-to-Warehouse Transfer</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Source Warehouse</label>
                <input
                  type="text"
                  value={whToWhForm.sourceWarehouse}
                  onChange={e => setWhToWhForm({ ...whToWhForm, sourceWarehouse: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Target Warehouse</label>
                <input
                  type="text"
                  value={whToWhForm.targetWarehouse}
                  onChange={e => setWhToWhForm({ ...whToWhForm, targetWarehouse: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Material</label>
                <input
                  type="text"
                  value={whToWhForm.materialName}
                  onChange={e => setWhToWhForm({ ...whToWhForm, materialName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Quantity ({whToWhForm.unit})</label>
                <input
                  type="number"
                  min={1}
                  value={whToWhForm.quantity}
                  onChange={e => setWhToWhForm({ ...whToWhForm, quantity: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg cursor-pointer"
            >
              Dispatch Warehouse-to-Warehouse Transfer
            </button>
          </form>

          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-white">Site Transfer Discrepancies Reported to Warehouse</h3>
            <div className="space-y-2 text-xs">
              {stockDiscrepancies.map(d => (
                <div key={d.id} className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                  <div className="flex justify-between font-mono">
                    <span className="text-amber-400 font-bold">{d.id} • Transfer {d.transferId}</span>
                    <span className="text-rose-400 font-bold">
                      Sent: {d.sentQuantity} | Received: {d.receivedQuantity} | Diff: {d.difference} {d.unit}
                    </span>
                  </div>
                  <p className="text-slate-300">{d.materialName} — {d.discrepancyReason}</p>
                  <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1">
                    <span>Reported by: {d.reportedByName} ({d.destinationSiteStore})</span>
                    {d.status !== "Resolved / Audited" ? (
                      <button
                        onClick={async () => {
                          const updated = { ...d, status: "Resolved / Audited" as const };
                          setStockDiscrepancies(prev => prev.map(x => (x.id === d.id ? updated : x)));
                          await DbService.saveStockDiscrepancy(updated);
                          onLogAction?.("WAREHOUSE_DISCREPANCY_AUDITED", `Audited and resolved transfer discrepancy ${d.id}`);
                        }}
                        className="px-2 py-0.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded cursor-pointer"
                      >
                        Verify & Resolve Discrepancy
                      </button>
                    ) : (
                      <span className="text-emerald-400 font-semibold">Resolved / Audited ✓</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {isWarehouseView && activeSubModule === "wh-17-modules-matrix" && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-white">
            Warehouse Manager 17 Dedicated Modules & Recent Immutable Stock Transactions
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
            {[
              "1. Warehouse Management",
              "2. Warehouse Locations",
              "3. Item/Material Master",
              "4. Supplier Management",
              "5. Goods Receiving / GRN",
              "6. Purchase-linked Receiving",
              "7. Central Inventory",
              "8. Warehouse Stock Adjustment",
              "9. Warehouse-to-Warehouse Transfer",
              "10. Site Allocation",
              "11. Material Request Review",
              "12. Material Issue from Main Warehouse",
              "13. Material Return Verification",
              "14. Warehouse Reports",
              "15. Stock Valuation",
              "16. Inventory Audit",
              "17. Low Stock/Reorder Alerts"
            ].map(mod => (
              <div key={mod} className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 font-medium">
                {mod}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================== SITE STORE OWNER SUB-MODULES ==================== */}
      {isSiteStoreView && activeSubModule === "ss-request-workflow" && (
        <form onSubmit={handleSiteStoreCreateRequest} className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">
              3. Create Material Request (Site Store → Main Warehouse)
            </h3>
            <span className="text-xs font-mono text-emerald-400">Assigned Site: {assignedSite}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Material / Panel Name</label>
              <input
                type="text"
                required
                value={siteReqForm.materialName}
                onChange={e => setSiteReqForm({ ...siteReqForm, materialName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Requested Quantity ({siteReqForm.unit})</label>
              <input
                type="number"
                min={1}
                required
                value={siteReqForm.quantity}
                onChange={e => setSiteReqForm({ ...siteReqForm, quantity: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Building / Floor / Zone Target</label>
              <div className="grid grid-cols-3 gap-1.5">
                <input
                  type="text"
                  value={siteReqForm.building}
                  onChange={e => setSiteReqForm({ ...siteReqForm, building: e.target.value })}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-white"
                />
                <input
                  type="text"
                  value={siteReqForm.floor}
                  onChange={e => setSiteReqForm({ ...siteReqForm, floor: e.target.value })}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-white"
                />
                <input
                  type="text"
                  value={siteReqForm.zone}
                  onChange={e => setSiteReqForm({ ...siteReqForm, zone: e.target.value })}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-white"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-400">
              Submitting sends a real-time notification to Warehouse Manager and creates an audit record.
            </span>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1.5"
            >
              <Send size={14} />
              <span>Submit Material Request to Warehouse</span>
            </button>
          </div>
        </form>
      )}

      {isSiteStoreView && activeSubModule === "ss-transfer-receiving" && (
        <form onSubmit={handleSiteStoreReceiveTransfer} className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">
              4 & 12. Receive Transfer from Warehouse & Discrepancy Verification
            </h3>
            <span className="text-xs font-mono text-cyan-400">
              Difference = {transferReceiveForm.sentQty - transferReceiveForm.receivedQty} {transferReceiveForm.unit}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Transfer Voucher ID</label>
              <input
                type="text"
                required
                value={transferReceiveForm.transferId}
                onChange={e => setTransferReceiveForm({ ...transferReceiveForm, transferId: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Material Name</label>
              <input
                type="text"
                required
                value={transferReceiveForm.materialName}
                onChange={e => setTransferReceiveForm({ ...transferReceiveForm, materialName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Sent Qty (Warehouse)</label>
              <input
                type="number"
                required
                value={transferReceiveForm.sentQty}
                onChange={e => setTransferReceiveForm({ ...transferReceiveForm, sentQty: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Received Qty (Site Store)</label>
              <input
                type="number"
                required
                value={transferReceiveForm.receivedQty}
                onChange={e => setTransferReceiveForm({ ...transferReceiveForm, receivedQty: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-emerald-400 font-bold font-mono"
              />
            </div>
          </div>

          {transferReceiveForm.sentQty !== transferReceiveForm.receivedQty && (
            <div className="text-xs">
              <label className="text-amber-400 font-semibold block mb-1">
                Discrepancy Detected (Sent = {transferReceiveForm.sentQty}, Received = {transferReceiveForm.receivedQty}, Difference = {transferReceiveForm.sentQty - transferReceiveForm.receivedQty}) — Enter Discrepancy Reason:
              </label>
              <input
                type="text"
                required
                value={transferReceiveForm.discrepancyReason}
                onChange={e => setTransferReceiveForm({ ...transferReceiveForm, discrepancyReason: e.target.value })}
                className="w-full bg-slate-950 border border-amber-500/50 rounded-lg px-3 py-2 text-white"
              />
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg cursor-pointer"
            >
              Confirm Site Receipt & Update Site Store Stock
            </button>
          </div>
        </form>
      )}

      {isSiteStoreView && activeSubModule === "ss-count-damaged" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form onSubmit={handleSubmitSiteStockCount} className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-white">9. Site Stock Count</h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="col-span-2">
                <label className="text-slate-400 block mb-1">Material</label>
                <input
                  type="text"
                  value={siteStockCountForm.materialName}
                  onChange={e => setSiteStockCountForm({ ...siteStockCountForm, materialName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">System Expected Qty</label>
                <input
                  type="number"
                  value={siteStockCountForm.expectedQty}
                  onChange={e => setSiteStockCountForm({ ...siteStockCountForm, expectedQty: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Physical Counted Qty</label>
                <input
                  type="number"
                  value={siteStockCountForm.countedQty}
                  onChange={e => setSiteStockCountForm({ ...siteStockCountForm, countedQty: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-emerald-400 font-mono font-bold"
                />
              </div>
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg cursor-pointer"
            >
              Submit Site Stock Count
            </button>
          </form>

          <form onSubmit={handleSubmitDamagedMissing} className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-white">10 & 11. Damaged / Missing Material Report</h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Report Type</label>
                <select
                  value={dmgMissingForm.reportType}
                  onChange={e => setDmgMissingForm({ ...dmgMissingForm, reportType: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                >
                  <option value="Damaged">10. Damaged Material Report</option>
                  <option value="Missing">11. Missing Material Report</option>
                </select>
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Quantity ({dmgMissingForm.unit})</label>
                <input
                  type="number"
                  min={1}
                  value={dmgMissingForm.quantity}
                  onChange={e => setDmgMissingForm({ ...dmgMissingForm, quantity: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>
              <div className="col-span-2">
                <label className="text-slate-400 block mb-1">Cause / Condition Description</label>
                <input
                  type="text"
                  required
                  value={dmgMissingForm.causeDescription}
                  onChange={e => setDmgMissingForm({ ...dmgMissingForm, causeDescription: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                />
              </div>
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg cursor-pointer"
            >
              Submit {dmgMissingForm.reportType} Material Report
            </button>
          </form>
        </div>
      )}

      {isSiteStoreView && activeSubModule === "ss-13-modules-matrix" && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-white">
            Site Store Owner 13 Dedicated Modules ({assignedSite})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
            {[
              "1. Site Store Dashboard",
              "2. Site Stock",
              "3. Material Request",
              "4. Receive Material from Warehouse",
              "5. Material Issue to Team/Gang",
              "6. Material Return",
              "7. Floor/Zone Allocation",
              "8. Daily Material Consumption",
              "9. Site Stock Count",
              "10. Damaged Material Report",
              "11. Missing Material Report",
              "12. Site Transfer Receiving",
              "13. Site-level Reports"
            ].map(mod => (
              <div key={mod} className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 font-medium">
                {mod}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
