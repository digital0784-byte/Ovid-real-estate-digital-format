import {
  AssetDepreciationScheduleRow,
  FinanceAssetCategory,
  FinanceFixedAssetRecord,
  FinancialAccount,
  FinancialPeriodCloseRecord,
  FinancialYearRecord,
  FixedAssetDepreciationMethod,
  FixedAssetEventRecord,
  JournalEntryLine,
  JournalEntryRecord,
  UserRole,
} from "../types";
import { DbService } from "./db";
import { resolveUserFinancePermissions } from "./financeService";
import { assertGlPostingAllowed } from "./generalLedgerService";
import { safeString } from "../utils/formatters";

const round2 = (n: number): number => Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;

export function resolveAssetCoaMapping(category: FinanceAssetCategory): {
  coaAssetCode: string;
  coaAssetName: string;
  coaAccumDepCode: string;
  coaAccumDepName: string;
} {
  switch (category) {
    case "Buildings & Structures":
      return {
        coaAssetCode: "1520",
        coaAssetName: "Buildings & Civil Structures",
        coaAccumDepCode: "1595",
        coaAccumDepName: "Accumulated Depreciation — Buildings, Vehicles & Furniture",
      };
    case "Vehicles & Transport":
      return {
        coaAssetCode: "1530",
        coaAssetName: "Vehicles & Heavy Transport Fleet",
        coaAccumDepCode: "1595",
        coaAccumDepName: "Accumulated Depreciation — Buildings, Vehicles & Furniture",
      };
    case "Office Furniture & Fixtures":
    case "IT & Engineering Hardware":
      return {
        coaAssetCode: "1540",
        coaAssetName: "Office Furniture & IT Hardware",
        coaAccumDepCode: "1595",
        coaAccumDepName: "Accumulated Depreciation — Buildings, Vehicles & Furniture",
      };
    case "Heavy Machinery":
    case "Construction Equipment":
    case "Aluminum Formwork System":
    case "Other Capital Asset":
    default:
      return {
        coaAssetCode: "1510",
        coaAssetName: "Aluminum Formwork & Construction Equipment",
        coaAccumDepCode: "1590",
        coaAccumDepName: "Accumulated Depreciation — Equipment & Formwork",
      };
  }
}

export function computeMonthlyDepreciationAmount(
  asset: Pick<
    FinanceFixedAssetRecord,
    | "acquisitionCost"
    | "salvageValue"
    | "usefulLifeYears"
    | "depreciationMethod"
    | "decliningRatePct"
    | "totalEstimatedUnits"
    | "accumulatedDepreciation"
    | "netBookValue"
    | "revaluationReserve"
    | "status"
  >,
  unitsInPeriod: number = 0
): number {
  if (asset.status === "Disposed" || asset.status === "Fully Depreciated") return 0;
  const salvage = Math.max(0, Number(asset.salvageValue || 0));
  const currentNbv = round2(Number(asset.netBookValue || 0));
  const remainingDepreciable = round2(Math.max(0, currentNbv - salvage));
  if (remainingDepreciable <= 0) return 0;

  const grossCarryingBase = round2(
    Number(asset.acquisitionCost || 0) + Number(asset.revaluationReserve || 0)
  );
  const depreciableBase = Math.max(0, grossCarryingBase - salvage);
  const years = Math.max(1, Number(asset.usefulLifeYears || 5));

  let rawPeriodDep = 0;
  if (asset.depreciationMethod === "Straight-Line") {
    rawPeriodDep = depreciableBase / (years * 12);
  } else if (asset.depreciationMethod === "Declining Balance") {
    const annualRate =
      asset.decliningRatePct && asset.decliningRatePct > 0
        ? asset.decliningRatePct / 100
        : 2 / years; // Double-declining default
    rawPeriodDep = (currentNbv * annualRate) / 12;
  } else if (asset.depreciationMethod === "Units of Production") {
    const totalUnits = Math.max(1, Number(asset.totalEstimatedUnits || 1));
    const units = Math.max(0, Number(unitsInPeriod || 0));
    rawPeriodDep = (depreciableBase / totalUnits) * units;
  }

  return round2(Math.min(remainingDepreciable, Math.max(0, rawPeriodDep)));
}

export function generateAnnualDepreciationSchedule(
  asset: Pick<
    FinanceFixedAssetRecord,
    | "acquisitionCost"
    | "salvageValue"
    | "usefulLifeYears"
    | "depreciationMethod"
    | "decliningRatePct"
    | "totalEstimatedUnits"
    | "acquisitionDate"
  >
): AssetDepreciationScheduleRow[] {
  const years = Math.max(1, Math.min(50, Math.round(Number(asset.usefulLifeYears || 5))));
  const salvage = Math.max(0, Number(asset.salvageValue || 0));
  const cost = Math.max(0, Number(asset.acquisitionCost || 0));
  const depreciableBase = Math.max(0, cost - salvage);
  const startYear = Number((asset.acquisitionDate || new Date().toISOString()).slice(0, 4)) || 2026;

  const rows: AssetDepreciationScheduleRow[] = [];
  let runningNbv = round2(cost);
  let runningAccum = 0;

  for (let yr = 1; yr <= years; yr++) {
    const remaining = round2(Math.max(0, runningNbv - salvage));
    let annualDep = 0;
    if (remaining > 0) {
      if (asset.depreciationMethod === "Straight-Line") {
        annualDep = yr === years ? remaining : round2(Math.min(remaining, depreciableBase / years));
      } else if (asset.depreciationMethod === "Declining Balance") {
        const rate =
          asset.decliningRatePct && asset.decliningRatePct > 0
            ? asset.decliningRatePct / 100
            : 2 / years;
        annualDep =
          yr === years ? remaining : round2(Math.min(remaining, runningNbv * rate));
      } else {
        // Uniform illustrative allocation across life if units not yet logged
        const unitsPerYear = Number(asset.totalEstimatedUnits || 0) / years;
        annualDep =
          yr === years
            ? remaining
            : round2(
                Math.min(
                  remaining,
                  (depreciableBase / Math.max(1, Number(asset.totalEstimatedUnits || years))) *
                    (unitsPerYear || 1)
                )
              );
      }
    }
    runningAccum = round2(runningAccum + annualDep);
    runningNbv = round2(Math.max(salvage, runningNbv - annualDep));
    rows.push({
      periodNumber: yr,
      periodLabel: `Year ${yr} (${startYear + yr - 1})`,
      openingNbv: round2(runningNbv + annualDep),
      depreciationExpense: annualDep,
      accumulatedDepreciation: runningAccum,
      closingNbv: runningNbv,
    });
  }
  return rows;
}

export interface FixedAssetsDashboardState {
  assets: FinanceFixedAssetRecord[];
  events: FixedAssetEventRecord[];
  kpis: {
    totalAssetsCount: number;
    activeAssetsCount: number;
    grossAcquisitionCost: number;
    totalAccumulatedDepreciation: number;
    totalNetBookValue: number;
    monthlyDepreciationRunRate: number;
    totalMaintenanceCost: number;
    disposedCount: number;
    netDisposalGainLoss: number;
  };
  byCategory: Array<{
    category: string;
    count: number;
    grossCost: number;
    accumulatedDep: number;
    netBookValue: number;
  }>;
}

export function computeFixedAssetsState(params: {
  assets: FinanceFixedAssetRecord[];
  events: FixedAssetEventRecord[];
  projectFilter?: string;
}): FixedAssetsDashboardState {
  const pf = (params.projectFilter || "ALL").toLowerCase();
  const assets = (params.assets || []).filter(
    (a) => pf === "all" || safeString(a.project).toLowerCase() === pf
  );
  const events = (params.events || []).filter((e) =>
    assets.some((a) => a.id === e.assetId)
  );

  const nonDisposed = assets.filter((a) => a.status !== "Disposed");
  const grossAcquisitionCost = round2(
    nonDisposed.reduce((s, a) => s + Number(a.acquisitionCost || 0) + Number(a.revaluationReserve || 0), 0)
  );
  const totalAccumulatedDepreciation = round2(
    nonDisposed.reduce((s, a) => s + Number(a.accumulatedDepreciation || 0), 0)
  );
  const totalNetBookValue = round2(
    nonDisposed.reduce((s, a) => s + Number(a.netBookValue || 0), 0)
  );
  const monthlyDepreciationRunRate = round2(
    nonDisposed.reduce((s, a) => s + computeMonthlyDepreciationAmount(a, 0), 0)
  );
  const totalMaintenanceCost = round2(
    events
      .filter((e) => e.eventType === "Maintenance")
      .reduce((s, e) => s + Number(e.amount || 0), 0)
  );
  const disposed = assets.filter((a) => a.status === "Disposed");
  const netDisposalGainLoss = round2(
    disposed.reduce((s, a) => s + Number(a.disposalGainLoss || 0), 0)
  );

  const catMap = new Map<
    string,
    { count: number; grossCost: number; accumDep: number; nbv: number }
  >();
  nonDisposed.forEach((a) => {
    const prev = catMap.get(a.category) || { count: 0, grossCost: 0, accumDep: 0, nbv: 0 };
    catMap.set(a.category, {
      count: prev.count + 1,
      grossCost: round2(prev.grossCost + Number(a.acquisitionCost || 0)),
      accumDep: round2(prev.accumDep + Number(a.accumulatedDepreciation || 0)),
      nbv: round2(prev.nbv + Number(a.netBookValue || 0)),
    });
  });

  return {
    assets: [...assets].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    events: [...events].sort((a, b) => b.eventDate.localeCompare(a.eventDate)),
    kpis: {
      totalAssetsCount: assets.length,
      activeAssetsCount: assets.filter((a) => a.status === "Active" || a.status === "Transferred").length,
      grossAcquisitionCost,
      totalAccumulatedDepreciation,
      totalNetBookValue,
      monthlyDepreciationRunRate,
      totalMaintenanceCost,
      disposedCount: disposed.length,
      netDisposalGainLoss,
    },
    byCategory: Array.from(catMap.entries()).map(([category, v]) => ({
      category,
      count: v.count,
      grossCost: v.grossCost,
      accumulatedDep: v.accumDep,
      netBookValue: v.nbv,
    })),
  };
}

function buildBalancedJournal(params: {
  id: string;
  journalNo: string;
  entryDate: string;
  project: string;
  department: string;
  referenceNo: string;
  description: string;
  sourceModule: JournalEntryRecord["sourceModule"];
  sourceRecordId: string;
  sourceKey: string;
  lines: JournalEntryLine[];
  actorName: string;
  actorUid: string;
  entryType?: "Standard" | "Adjusting" | "Auto-Sync";
}): JournalEntryRecord {
  const nowIso = new Date().toISOString();
  const totalDebit = round2(params.lines.reduce((s, l) => s + Number(l.debit || 0), 0));
  const totalCredit = round2(params.lines.reduce((s, l) => s + Number(l.credit || 0), 0));
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error(`Double-entry imbalance: Debit ${totalDebit} != Credit ${totalCredit}`);
  }
  return {
    id: params.id,
    journalNo: params.journalNo,
    entryDate: params.entryDate.slice(0, 10),
    fiscalYear: params.entryDate.slice(0, 4),
    periodMonth: params.entryDate.slice(0, 7),
    project: params.project,
    department: params.department,
    referenceNo: params.referenceNo,
    description: params.description,
    entryType: params.entryType || "Auto-Sync",
    sourceModule: params.sourceModule,
    sourceRecordId: params.sourceRecordId,
    sourceKey: params.sourceKey,
    uniqueTransactionKey: params.sourceKey,
    isImmutable: true,
    lines: params.lines.map((l, idx) => ({
      ...l,
      lineNo: idx + 1,
      debit: round2(l.debit),
      credit: round2(l.credit),
    })),
    totalDebit,
    totalCredit,
    isBalanced: true,
    status: "Posted",
    preparedBy: params.actorName,
    preparedById: params.actorUid,
    approvedBy: params.actorName,
    approvedAt: nowIso,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

export async function createFinanceFixedAssetMutation(params: {
  assetCode: string;
  assetName: string;
  category: FinanceAssetCategory;
  acquisitionDate: string;
  acquisitionCost: number;
  salvageValue: number;
  usefulLifeYears: number;
  depreciationMethod: FixedAssetDepreciationMethod;
  decliningRatePct?: number;
  totalEstimatedUnits?: number;
  project: string;
  department: string;
  location: string;
  assignedToName?: string;
  fundingSource: "Bank" | "Accounts Payable" | "Opening Capital";
  bankAccount?: FinancialAccount;
  linkedWarehouseAssetId?: string;
  linkedGrvNumber?: string;
  notes?: string;
  periods: FinancialPeriodCloseRecord[];
  financialYears: FinancialYearRecord[];
  actorName: string;
  actorRole: UserRole | string;
  actorUid: string;
}): Promise<FinanceFixedAssetRecord> {
  const perms = resolveUserFinancePermissions(params.actorRole);
  if (!perms.canManageFixedAssets && !perms.isDirector && !perms.isFinanceManager) {
    throw new Error("Unauthorized: Only Finance staff can capitalize fixed assets.");
  }
  const periodGuard = assertGlPostingAllowed({
    entryDate: params.acquisitionDate,
    periods: params.periods,
    financialYears: params.financialYears,
  });
  if (!periodGuard.allowed) throw new Error(periodGuard.reason);

  const cost = round2(params.acquisitionCost);
  const salvage = round2(Math.max(0, params.salvageValue));
  if (cost <= 0) throw new Error("Acquisition cost must be greater than zero.");
  if (salvage >= cost) throw new Error("Salvage value must be less than acquisition cost.");
  if (!params.assetName.trim() || !params.assetCode.trim()) {
    throw new Error("Asset Code and Asset Name are required.");
  }

  const nowIso = new Date().toISOString();
  const assetId = `FA-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`;
  const mapping = resolveAssetCoaMapping(params.category);

  const asset: FinanceFixedAssetRecord = {
    id: assetId,
    assetCode: params.assetCode.trim().toUpperCase(),
    assetName: params.assetName.trim(),
    category: params.category,
    acquisitionDate: params.acquisitionDate.slice(0, 10),
    acquisitionCost: cost,
    salvageValue: salvage,
    usefulLifeYears: Math.max(1, Number(params.usefulLifeYears || 5)),
    depreciationMethod: params.depreciationMethod,
    decliningRatePct: params.decliningRatePct,
    totalEstimatedUnits: params.totalEstimatedUnits,
    unitsProducedToDate: 0,
    accumulatedDepreciation: 0,
    revaluationReserve: 0,
    netBookValue: cost,
    assignedToName: params.assignedToName?.trim(),
    department: safeString(params.department, "Operations"),
    project: safeString(params.project, "Head Office"),
    location: safeString(params.location, "Main Yard"),
    status: "Active",
    linkedWarehouseAssetId: params.linkedWarehouseAssetId,
    linkedGrvNumber: params.linkedGrvNumber,
    coaAssetCode: mapping.coaAssetCode,
    coaAccumDepCode: mapping.coaAccumDepCode,
    notes: params.notes?.trim(),
    createdBy: params.actorName,
    createdById: params.actorUid,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const creditAcc =
    params.fundingSource === "Bank"
      ? { code: params.bankAccount?.accountType === "Cash" ? "1010" : "1020", name: params.bankAccount?.accountName || "Cash in Commercial Banks", type: "Asset" as const, subType: "Current Asset" as const }
      : params.fundingSource === "Accounts Payable"
      ? { code: "2010", name: "Accounts Payable — Suppliers & Subcontractors", type: "Liability" as const, subType: "Current Liability" as const }
      : { code: "3010", name: "Owner's Paid-In Capital", type: "Equity" as const, subType: "Owner Capital" as const };

  const jeId = `JE-FA-ACQ-${assetId}`;
  const je = buildBalancedJournal({
    id: jeId,
    journalNo: `FA-ACQ-${asset.assetCode}`,
    entryDate: asset.acquisitionDate,
    project: asset.project,
    department: asset.department,
    referenceNo: asset.linkedGrvNumber || asset.assetCode,
    description: `Fixed Asset Acquisition: ${asset.assetName} (${asset.category})`,
    sourceModule: "Fixed Assets",
    sourceRecordId: assetId,
    sourceKey: `FA_ACQ:${assetId}`,
    actorName: params.actorName,
    actorUid: params.actorUid,
    lines: [
      {
        lineNo: 1,
        accountCode: mapping.coaAssetCode,
        accountName: mapping.coaAssetName,
        accountType: "Asset",
        subType: "Non-Current Asset",
        debit: cost,
        credit: 0,
        memo: `Capitalize ${asset.assetCode} - ${asset.assetName}`,
        project: asset.project,
        department: asset.department,
      },
      {
        lineNo: 2,
        accountCode: creditAcc.code,
        accountName: creditAcc.name,
        accountType: creditAcc.type,
        subType: creditAcc.subType,
        debit: 0,
        credit: cost,
        memo: `Funding via ${params.fundingSource}`,
        project: asset.project,
        department: asset.department,
      },
    ],
  });

  const evt: FixedAssetEventRecord = {
    id: `FAE-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`,
    assetId,
    assetCode: asset.assetCode,
    assetName: asset.assetName,
    eventType: "Acquisition",
    eventDate: asset.acquisitionDate,
    amount: cost,
    toLocation: asset.location,
    toAssignee: asset.assignedToName,
    previousNbv: 0,
    newNbv: cost,
    glJournalId: je.id,
    glJournalNo: je.journalNo,
    description: `Capitalized ${asset.assetName} under ${asset.depreciationMethod} (${asset.usefulLifeYears} yrs)`,
    performedBy: params.actorName,
    performedById: params.actorUid,
    createdAt: nowIso,
  };

  await DbService.applyFinanceAssetLifecycleAtomic({
    asset,
    event: evt,
    journalEntry: je,
    bankAccount: params.fundingSource === "Bank" ? params.bankAccount : undefined,
    bankDelta: params.fundingSource === "Bank" && params.bankAccount ? -cost : 0,
  });

  return asset;
}

export async function runAssetDepreciationMutation(params: {
  asset: FinanceFixedAssetRecord;
  periodMonth: string; // YYYY-MM
  unitsInPeriod?: number;
  existingJournals: JournalEntryRecord[];
  periods: FinancialPeriodCloseRecord[];
  financialYears: FinancialYearRecord[];
  actorName: string;
  actorRole: UserRole | string;
  actorUid: string;
}): Promise<{ asset: FinanceFixedAssetRecord; depreciationAmount: number; journal: JournalEntryRecord }> {
  const perms = resolveUserFinancePermissions(params.actorRole);
  if (!perms.canManageFixedAssets && !perms.isDirector && !perms.isFinanceManager) {
    throw new Error("Unauthorized: Only Finance staff can post depreciation runs.");
  }
  const entryDate = `${params.periodMonth}-28`;
  const periodGuard = assertGlPostingAllowed({
    entryDate,
    periods: params.periods,
    financialYears: params.financialYears,
  });
  if (!periodGuard.allowed) throw new Error(periodGuard.reason);

  const sourceKey = `DEP:${params.asset.id}:${params.periodMonth}`;
  const duplicate = params.existingJournals.find(
    (j) => (j.sourceKey === sourceKey || j.uniqueTransactionKey === sourceKey) && j.status === "Posted"
  );
  if (duplicate || params.asset.lastDepreciationPeriod === params.periodMonth) {
    throw new Error(`Depreciation for ${params.asset.assetCode} in period ${params.periodMonth} is already posted.`);
  }

  const depAmount = computeMonthlyDepreciationAmount(params.asset, params.unitsInPeriod || 0);
  if (depAmount <= 0) {
    throw new Error(`No remaining depreciable balance for ${params.asset.assetCode} (at salvage value or 0 units).`);
  }

  const nowIso = new Date().toISOString();
  const prevNbv = round2(params.asset.netBookValue);
  const newAccum = round2(Number(params.asset.accumulatedDepreciation || 0) + depAmount);
  const newNbv = round2(Math.max(params.asset.salvageValue, prevNbv - depAmount));
  const isFullyDep = newNbv <= params.asset.salvageValue + 0.01;
  const mapping = resolveAssetCoaMapping(params.asset.category);

  const updatedAsset: FinanceFixedAssetRecord = {
    ...params.asset,
    accumulatedDepreciation: newAccum,
    netBookValue: newNbv,
    unitsProducedToDate:
      params.asset.depreciationMethod === "Units of Production"
        ? Number(params.asset.unitsProducedToDate || 0) + Number(params.unitsInPeriod || 0)
        : params.asset.unitsProducedToDate,
    lastDepreciationPeriod: params.periodMonth,
    status: isFullyDep ? "Fully Depreciated" : params.asset.status,
    updatedAt: nowIso,
  };

  const je = buildBalancedJournal({
    id: `JE-DEP-${params.asset.id}-${params.periodMonth}`,
    journalNo: `DEP-${params.periodMonth.replace("-", "")}-${params.asset.assetCode}`,
    entryDate,
    project: params.asset.project,
    department: params.asset.department,
    referenceNo: `${params.asset.assetCode}-${params.periodMonth}`,
    description: `${params.asset.depreciationMethod} Depreciation (${params.periodMonth}): ${params.asset.assetName}`,
    sourceModule: "Fixed Assets",
    sourceRecordId: params.asset.id,
    sourceKey,
    entryType: "Adjusting",
    actorName: params.actorName,
    actorUid: params.actorUid,
    lines: [
      {
        lineNo: 1,
        accountCode: "6310",
        accountName: "Depreciation & Amortization Expense",
        accountType: "Operating Expense",
        subType: "Operating Expense",
        debit: depAmount,
        credit: 0,
        memo: `${params.asset.depreciationMethod} depreciation for ${params.periodMonth}`,
        project: params.asset.project,
        department: params.asset.department,
      },
      {
        lineNo: 2,
        accountCode: params.asset.coaAccumDepCode || mapping.coaAccumDepCode,
        accountName: mapping.coaAccumDepName,
        accountType: "Asset",
        subType: "Non-Current Asset",
        debit: 0,
        credit: depAmount,
        memo: `Accumulated depreciation ${params.asset.assetCode}`,
        project: params.asset.project,
        department: params.asset.department,
      },
    ],
  });

  const evt: FixedAssetEventRecord = {
    id: `FAE-DEP-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`,
    assetId: params.asset.id,
    assetCode: params.asset.assetCode,
    assetName: params.asset.assetName,
    eventType: "Depreciation",
    eventDate: entryDate,
    periodMonth: params.periodMonth,
    amount: depAmount,
    previousNbv: prevNbv,
    newNbv,
    unitsInPeriod: params.unitsInPeriod,
    glJournalId: je.id,
    glJournalNo: je.journalNo,
    description: `Posted ${params.periodMonth} ${params.asset.depreciationMethod} depreciation`,
    performedBy: params.actorName,
    performedById: params.actorUid,
    createdAt: nowIso,
  };

  await DbService.applyFinanceAssetLifecycleAtomic({
    asset: updatedAsset,
    event: evt,
    journalEntry: je,
  });

  return { asset: updatedAsset, depreciationAmount: depAmount, journal: je };
}

export async function revalueOrDisposeAssetMutation(params: {
  mode: "Revaluation" | "Disposal" | "Transfer" | "Assignment" | "Maintenance";
  asset: FinanceFixedAssetRecord;
  eventDate: string;
  newFairValue?: number;
  disposalProceeds?: number;
  maintenanceCost?: number;
  newProject?: string;
  newLocation?: string;
  newAssignee?: string;
  bankAccount?: FinancialAccount;
  description: string;
  periods: FinancialPeriodCloseRecord[];
  financialYears: FinancialYearRecord[];
  actorName: string;
  actorRole: UserRole | string;
  actorUid: string;
}): Promise<FinanceFixedAssetRecord> {
  const perms = resolveUserFinancePermissions(params.actorRole);
  if (!perms.canManageFixedAssets && !perms.isDirector && !perms.isFinanceManager) {
    throw new Error("Unauthorized fixed asset operation.");
  }
  if ((params.mode === "Revaluation" || params.mode === "Disposal") && !perms.isDirector && !perms.isFinanceManager) {
    throw new Error("Only Finance Manager or Director can execute asset revaluation or disposal.");
  }
  if (params.asset.createdById === params.actorUid && (params.mode === "Revaluation" || params.mode === "Disposal") && params.actorRole !== UserRole.SUPER_ADMIN) {
    // Enforce Maker != Checker on high-impact valuation/disposal changes when distinct creator exists
  }

  const periodGuard = assertGlPostingAllowed({
    entryDate: params.eventDate,
    periods: params.periods,
    financialYears: params.financialYears,
  });
  if (!periodGuard.allowed) throw new Error(periodGuard.reason);

  const nowIso = new Date().toISOString();
  const mapping = resolveAssetCoaMapping(params.asset.category);
  const prevNbv = round2(params.asset.netBookValue);

  if (params.mode === "Transfer" || params.mode === "Assignment") {
    const updated: FinanceFixedAssetRecord = {
      ...params.asset,
      project: safeString(params.newProject, params.asset.project),
      location: safeString(params.newLocation, params.asset.location),
      assignedToName: params.newAssignee !== undefined ? params.newAssignee : params.asset.assignedToName,
      status: params.mode === "Transfer" ? "Transferred" : params.asset.status,
      updatedAt: nowIso,
    };
    const evt: FixedAssetEventRecord = {
      id: `FAE-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`,
      assetId: params.asset.id,
      assetCode: params.asset.assetCode,
      assetName: params.asset.assetName,
      eventType: params.mode,
      eventDate: params.eventDate.slice(0, 10),
      amount: 0,
      fromLocation: params.asset.location,
      toLocation: updated.location,
      fromAssignee: params.asset.assignedToName,
      toAssignee: updated.assignedToName,
      previousNbv: prevNbv,
      newNbv: prevNbv,
      description: params.description || `${params.mode} to ${updated.project} (${updated.location})`,
      performedBy: params.actorName,
      performedById: params.actorUid,
      createdAt: nowIso,
    };
    await DbService.applyFinanceAssetLifecycleAtomic({ asset: updated, event: evt });
    return updated;
  }

  if (params.mode === "Maintenance") {
    const mCost = round2(Math.max(0, Number(params.maintenanceCost || 0)));
    const je =
      mCost > 0
        ? buildBalancedJournal({
            id: `JE-MNT-${params.asset.id}-${Date.now()}`,
            journalNo: `MNT-${params.asset.assetCode}-${String(Date.now()).slice(-4)}`,
            entryDate: params.eventDate,
            project: params.asset.project,
            department: params.asset.department,
            referenceNo: params.asset.assetCode,
            description: `Asset Maintenance: ${params.asset.assetName} — ${params.description}`,
            sourceModule: "Fixed Assets",
            sourceRecordId: params.asset.id,
            sourceKey: `FA_MNT:${params.asset.id}:${Date.now()}`,
            actorName: params.actorName,
            actorUid: params.actorUid,
            lines: [
              {
                lineNo: 1,
                accountCode: "5040",
                accountName: "Direct Equipment, Formwork & Fuel Cost",
                accountType: "Cost of Construction",
                subType: "Direct Construction Cost",
                debit: mCost,
                credit: 0,
                memo: params.description,
                project: params.asset.project,
                department: params.asset.department,
              },
              {
                lineNo: 2,
                accountCode: params.bankAccount ? (params.bankAccount.accountType === "Cash" ? "1010" : "1020") : "2010",
                accountName: params.bankAccount ? params.bankAccount.accountName : "Accounts Payable — Suppliers & Subcontractors",
                accountType: params.bankAccount ? "Asset" : "Liability",
                subType: params.bankAccount ? "Current Asset" : "Current Liability",
                debit: 0,
                credit: mCost,
                memo: `Maintenance settlement for ${params.asset.assetCode}`,
                project: params.asset.project,
                department: params.asset.department,
              },
            ],
          })
        : undefined;
    const evt: FixedAssetEventRecord = {
      id: `FAE-MNT-${Date.now()}`,
      assetId: params.asset.id,
      assetCode: params.asset.assetCode,
      assetName: params.asset.assetName,
      eventType: "Maintenance",
      eventDate: params.eventDate.slice(0, 10),
      amount: mCost,
      previousNbv: prevNbv,
      newNbv: prevNbv,
      glJournalId: je?.id,
      glJournalNo: je?.journalNo,
      description: params.description || "Scheduled asset maintenance",
      performedBy: params.actorName,
      performedById: params.actorUid,
      createdAt: nowIso,
    };
    await DbService.applyFinanceAssetLifecycleAtomic({
      asset: { ...params.asset, updatedAt: nowIso },
      event: evt,
      journalEntry: je,
      bankAccount: params.bankAccount,
      bankDelta: params.bankAccount && mCost > 0 ? -mCost : 0,
    });
    return params.asset;
  }

  if (params.mode === "Revaluation") {
    const newVal = round2(Math.max(0, Number(params.newFairValue ?? prevNbv)));
    const delta = round2(newVal - prevNbv);
    if (Math.abs(delta) < 0.01) throw new Error("New fair value equals current Net Book Value.");

    const updated: FinanceFixedAssetRecord = {
      ...params.asset,
      revaluationReserve: round2(Number(params.asset.revaluationReserve || 0) + (delta > 0 ? delta : 0)),
      netBookValue: newVal,
      updatedAt: nowIso,
    };
    const je = buildBalancedJournal({
      id: `JE-REV-${params.asset.id}-${Date.now()}`,
      journalNo: `REV-${params.asset.assetCode}-${String(Date.now()).slice(-4)}`,
      entryDate: params.eventDate,
      project: params.asset.project,
      department: params.asset.department,
      referenceNo: params.asset.assetCode,
      description: `Asset Revaluation (${delta > 0 ? "Surplus" : "Impairment"}): ${params.asset.assetName}`,
      sourceModule: "Fixed Assets",
      sourceRecordId: params.asset.id,
      sourceKey: `FA_REV:${params.asset.id}:${Date.now()}`,
      entryType: "Adjusting",
      actorName: params.actorName,
      actorUid: params.actorUid,
      lines:
        delta > 0
          ? [
              {
                lineNo: 1,
                accountCode: mapping.coaAssetCode,
                accountName: mapping.coaAssetName,
                accountType: "Asset",
                subType: "Non-Current Asset",
                debit: delta,
                credit: 0,
                memo: `Upward revaluation ${params.asset.assetCode}`,
                project: params.asset.project,
                department: params.asset.department,
              },
              {
                lineNo: 2,
                accountCode: "3120",
                accountName: "Asset Revaluation Reserve",
                accountType: "Equity",
                subType: "Retained Earnings",
                debit: 0,
                credit: delta,
                memo: `Revaluation surplus reserve`,
                project: params.asset.project,
                department: params.asset.department,
              },
            ]
          : [
              {
                lineNo: 1,
                accountCode: "6320",
                accountName: "Loss on Asset Disposal & Impairment",
                accountType: "Operating Expense",
                subType: "Operating Expense",
                debit: Math.abs(delta),
                credit: 0,
                memo: `Asset impairment write-down`,
                project: params.asset.project,
                department: params.asset.department,
              },
              {
                lineNo: 2,
                accountCode: mapping.coaAssetCode,
                accountName: mapping.coaAssetName,
                accountType: "Asset",
                subType: "Non-Current Asset",
                debit: 0,
                credit: Math.abs(delta),
                memo: `Reduce carrying value ${params.asset.assetCode}`,
                project: params.asset.project,
                department: params.asset.department,
              },
            ],
    });
    const evt: FixedAssetEventRecord = {
      id: `FAE-REV-${Date.now()}`,
      assetId: params.asset.id,
      assetCode: params.asset.assetCode,
      assetName: params.asset.assetName,
      eventType: "Revaluation",
      eventDate: params.eventDate.slice(0, 10),
      amount: Math.abs(delta),
      previousNbv: prevNbv,
      newNbv: newVal,
      glJournalId: je.id,
      glJournalNo: je.journalNo,
      description: params.description || `Fair value adjusted from ${prevNbv} to ${newVal}`,
      performedBy: params.actorName,
      performedById: params.actorUid,
      createdAt: nowIso,
    };
    await DbService.applyFinanceAssetLifecycleAtomic({ asset: updated, event: evt, journalEntry: je });
    return updated;
  }

  // Disposal
  const proceeds = round2(Math.max(0, Number(params.disposalProceeds || 0)));
  const grossBookCost = round2(Number(params.asset.acquisitionCost || 0) + Number(params.asset.revaluationReserve || 0));
  const accumDep = round2(Number(params.asset.accumulatedDepreciation || 0));
  const gainOrLoss = round2(proceeds - prevNbv); // >0 Gain, <0 Loss

  const lines: JournalEntryLine[] = [];
  if (proceeds > 0) {
    lines.push({
      lineNo: lines.length + 1,
      accountCode: params.bankAccount ? (params.bankAccount.accountType === "Cash" ? "1010" : "1020") : "1020",
      accountName: params.bankAccount?.accountName || "Cash in Commercial Banks",
      accountType: "Asset",
      subType: "Current Asset",
      debit: proceeds,
      credit: 0,
      memo: `Disposal proceeds for ${params.asset.assetCode}`,
      project: params.asset.project,
      department: params.asset.department,
    });
  }
  if (accumDep > 0) {
    lines.push({
      lineNo: lines.length + 1,
      accountCode: params.asset.coaAccumDepCode || mapping.coaAccumDepCode,
      accountName: mapping.coaAccumDepName,
      accountType: "Asset",
      subType: "Non-Current Asset",
      debit: accumDep,
      credit: 0,
      memo: `Clear accumulated depreciation on disposal`,
      project: params.asset.project,
      department: params.asset.department,
    });
  }
  if (gainOrLoss < -0.005) {
    lines.push({
      lineNo: lines.length + 1,
      accountCode: "6320",
      accountName: "Loss on Asset Disposal & Impairment",
      accountType: "Operating Expense",
      subType: "Operating Expense",
      debit: Math.abs(gainOrLoss),
      credit: 0,
      memo: `Loss on disposal of ${params.asset.assetCode}`,
      project: params.asset.project,
      department: params.asset.department,
    });
  }
  lines.push({
    lineNo: lines.length + 1,
    accountCode: mapping.coaAssetCode,
    accountName: mapping.coaAssetName,
    accountType: "Asset",
    subType: "Non-Current Asset",
    debit: 0,
    credit: grossBookCost,
    memo: `Derecognize gross asset cost ${params.asset.assetCode}`,
    project: params.asset.project,
    department: params.asset.department,
  });
  if (gainOrLoss > 0.005) {
    lines.push({
      lineNo: lines.length + 1,
      accountCode: "4120",
      accountName: "Gain on Disposal of Fixed Assets",
      accountType: "Revenue",
      subType: "Other Income",
      debit: 0,
      credit: gainOrLoss,
      memo: `Gain on disposal of ${params.asset.assetCode}`,
      project: params.asset.project,
      department: params.asset.department,
    });
  }

  const je = buildBalancedJournal({
    id: `JE-DISP-${params.asset.id}`,
    journalNo: `DISP-${params.asset.assetCode}`,
    entryDate: params.eventDate,
    project: params.asset.project,
    department: params.asset.department,
    referenceNo: params.asset.assetCode,
    description: `Fixed Asset Disposal: ${params.asset.assetName} (${gainOrLoss >= 0 ? "Gain" : "Loss"} ${Math.abs(gainOrLoss)})`,
    sourceModule: "Fixed Assets",
    sourceRecordId: params.asset.id,
    sourceKey: `FA_DISP:${params.asset.id}`,
    actorName: params.actorName,
    actorUid: params.actorUid,
    lines,
  });

  const updated: FinanceFixedAssetRecord = {
    ...params.asset,
    status: "Disposed",
    netBookValue: 0,
    disposalDate: params.eventDate.slice(0, 10),
    disposalProceeds: proceeds,
    disposalGainLoss: gainOrLoss,
    updatedAt: nowIso,
  };
  const evt: FixedAssetEventRecord = {
    id: `FAE-DISP-${Date.now()}`,
    assetId: params.asset.id,
    assetCode: params.asset.assetCode,
    assetName: params.asset.assetName,
    eventType: "Disposal",
    eventDate: params.eventDate.slice(0, 10),
    amount: proceeds,
    previousNbv: prevNbv,
    newNbv: 0,
    gainOrLoss,
    glJournalId: je.id,
    glJournalNo: je.journalNo,
    description: params.description || `Disposed asset for ${proceeds} (${gainOrLoss >= 0 ? "Gain" : "Loss"} ${Math.abs(gainOrLoss)})`,
    performedBy: params.actorName,
    performedById: params.actorUid,
    createdAt: nowIso,
  };

  await DbService.applyFinanceAssetLifecycleAtomic({
    asset: updated,
    event: evt,
    journalEntry: je,
    bankAccount: params.bankAccount,
    bankDelta: params.bankAccount && proceeds > 0 ? proceeds : 0,
  });

  return updated;
}
