import React, { useMemo, useState } from "react";
import {
  Building2,
  Calculator,
  Calendar,
  Download,
  History,
  Layers,
  Plus,
  RefreshCw,
  ShieldAlert,
  Sliders,
  Trash2,
  Truck,
  Wrench,
  X,
} from "lucide-react";
import {
  AssetDepreciationScheduleRow,
  FinanceAssetCategory,
  FinanceFixedAssetRecord,
  FinancialAccount,
  FinancialPeriodCloseRecord,
  FinancialYearRecord,
  FixedAssetDepreciationMethod,
  FixedAssetEventRecord,
  JournalEntryRecord,
  UserRole,
} from "../../types";
import {
  computeFixedAssetsState,
  createFinanceFixedAssetMutation,
  generateAnnualDepreciationSchedule,
  revalueOrDisposeAssetMutation,
  runAssetDepreciationMutation,
} from "../../services/fixedAssetsService";
import { exportRowsToCsv, resolveUserFinancePermissions } from "../../services/financeService";
import { DbService } from "../../services/db";
import { formatCurrency } from "../../utils/formatters";

interface FixedAssetsDepreciationModuleProps {
  isAmharic: boolean;
  assets: FinanceFixedAssetRecord[];
  events: FixedAssetEventRecord[];
  accounts: FinancialAccount[];
  journals: JournalEntryRecord[];
  periods: FinancialPeriodCloseRecord[];
  financialYears: FinancialYearRecord[];
  projectsList: Array<{ id?: string; name?: string }>;
  currency: string;
  actorName: string;
  actorRole: UserRole | string;
  actorUid: string;
  onLogAction?: (action: string, details: string) => void;
}

const CATEGORIES: FinanceAssetCategory[] = [
  "Buildings & Structures",
  "Vehicles & Transport",
  "Heavy Machinery",
  "Construction Equipment",
  "Office Furniture & Fixtures",
  "IT & Engineering Hardware",
  "Aluminum Formwork System",
  "Other Capital Asset",
];

const METHODS: FixedAssetDepreciationMethod[] = [
  "Straight-Line",
  "Declining Balance",
  "Units of Production",
];

export const FixedAssetsDepreciationModule: React.FC<FixedAssetsDepreciationModuleProps> = ({
  isAmharic,
  assets,
  events,
  accounts,
  journals,
  periods,
  financialYears,
  projectsList,
  currency,
  actorName,
  actorRole,
  actorUid,
  onLogAction,
}) => {
  const perms = useMemo(() => resolveUserFinancePermissions(actorRole), [actorRole]);
  const [subTab, setSubTab] = useState<"register" | "events" | "categories">("register");
  const [projectFilter, setProjectFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Modals
  const [showNewModal, setShowNewModal] = useState(false);
  const [scheduleAsset, setScheduleAsset] = useState<FinanceFixedAssetRecord | null>(null);
  const [depTargetAsset, setDepTargetAsset] = useState<FinanceFixedAssetRecord | null>(null);
  const [lifecycleModal, setLifecycleModal] = useState<{
    asset: FinanceFixedAssetRecord;
    mode: "Transfer" | "Assignment" | "Maintenance" | "Revaluation" | "Disposal";
  } | null>(null);

  // Forms
  const [form, setForm] = useState({
    assetCode: "",
    assetName: "",
    category: "Heavy Machinery" as FinanceAssetCategory,
    acquisitionDate: new Date().toISOString().slice(0, 10),
    acquisitionCost: "",
    salvageValue: "0",
    usefulLifeYears: "5",
    depreciationMethod: "Straight-Line" as FixedAssetDepreciationMethod,
    decliningRatePct: "25",
    totalEstimatedUnits: "10000",
    project: projectsList[0]?.name || "Head Office",
    department: "Operations",
    location: "Central Yard",
    assignedToName: "",
    fundingSource: "Bank" as "Bank" | "Accounts Payable" | "Opening Capital",
    bankAccountId: accounts[0]?.id || "",
    linkedWarehouseAssetId: "",
    linkedGrvNumber: "",
    notes: "",
  });

  const [depPeriod, setDepPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [depUnits, setDepUnits] = useState("250");

  const [lifeForm, setLifeForm] = useState({
    eventDate: new Date().toISOString().slice(0, 10),
    newProject: "",
    newLocation: "",
    newAssignee: "",
    maintenanceCost: "0",
    newFairValue: "0",
    disposalProceeds: "0",
    bankAccountId: accounts[0]?.id || "",
    description: "",
  });

  const computed = useMemo(
    () =>
      computeFixedAssetsState({
        assets,
        events,
        projectFilter,
      }),
    [assets, events, projectFilter]
  );

  const visibleAssets = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return computed.assets;
    return computed.assets.filter(
      (a) =>
        a.assetCode.toLowerCase().includes(q) ||
        a.assetName.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q) ||
        a.project.toLowerCase().includes(q) ||
        (a.assignedToName || "").toLowerCase().includes(q)
    );
  }, [computed.assets, searchTerm]);

  const scheduleRows: AssetDepreciationScheduleRow[] = useMemo(
    () => (scheduleAsset ? generateAnnualDepreciationSchedule(scheduleAsset) : []),
    [scheduleAsset]
  );

  const notify = (type: "ok" | "err", text: string) => {
    setBanner({ type, text });
    setTimeout(() => setBanner(null), 5000);
  };

  const handleImportFromWarehouse = async () => {
    if (!perms.canManageFixedAssets) return;
    setBusy(true);
    try {
      const whAssets = await DbService.getWarehouseFixedAssetsRaw();
      const existingLinkedIds = new Set(assets.map((a) => a.linkedWarehouseAssetId).filter(Boolean));
      const candidates = whAssets.filter((w: any) => !existingLinkedIds.has(w.id));
      if (candidates.length === 0) {
        notify("err", "All warehouse fixed assets are already linked in Finance Register.");
        return;
      }
      const first: any = candidates[0];
      const mappedCat: FinanceAssetCategory =
        String(first.category || "").toLowerCase().includes("veh")
          ? "Vehicles & Transport"
          : String(first.category || "").toLowerCase().includes("mach")
          ? "Heavy Machinery"
          : String(first.category || "").toLowerCase().includes("furn")
          ? "Office Furniture & Fixtures"
          : "Construction Equipment";
      setForm({
        ...form,
        assetCode: first.assetId || `WH-${String(first.id).slice(-5).toUpperCase()}`,
        assetName: first.itemName || first.name || "Warehouse Imported Asset",
        category: mappedCat,
        acquisitionCost: String(Number(first.unitCost || first.totalCost || first.value || 150000)),
        project: first.currentLocationName || first.projectName || "Head Office",
        location: first.currentLocationName || "Main Warehouse",
        linkedWarehouseAssetId: first.id,
        linkedGrvNumber: first.originalGrvNumber || "",
        fundingSource: "Opening Capital",
        notes: `Imported from Warehouse Asset ID ${first.assetId || first.id} (GRV: ${first.originalGrvNumber || "N/A"})`,
      });
      setShowNewModal(true);
      notify("ok", `Loaded unlinked warehouse asset (${first.itemName || first.assetId}) into capitalization form.`);
    } catch (e: any) {
      notify("err", e?.message || "Failed to read warehouse fixed assets.");
    } finally {
      setBusy(false);
    }
  };

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const selectedBank = accounts.find((a) => a.id === form.bankAccountId);
      const created = await createFinanceFixedAssetMutation({
        assetCode: form.assetCode,
        assetName: form.assetName,
        category: form.category,
        acquisitionDate: form.acquisitionDate,
        acquisitionCost: Number(form.acquisitionCost),
        salvageValue: Number(form.salvageValue || 0),
        usefulLifeYears: Number(form.usefulLifeYears || 5),
        depreciationMethod: form.depreciationMethod,
        decliningRatePct: Number(form.decliningRatePct || 25),
        totalEstimatedUnits: Number(form.totalEstimatedUnits || 10000),
        project: form.project,
        department: form.department,
        location: form.location,
        assignedToName: form.assignedToName,
        fundingSource: form.fundingSource,
        bankAccount: selectedBank,
        linkedWarehouseAssetId: form.linkedWarehouseAssetId || undefined,
        linkedGrvNumber: form.linkedGrvNumber || undefined,
        notes: form.notes,
        periods,
        financialYears,
        actorName,
        actorRole,
        actorUid,
      });
      setShowNewModal(false);
      onLogAction?.("Capitalize Fixed Asset", `${created.assetCode} — ${created.assetName} (${formatCurrency(created.acquisitionCost, currency)})`);
      notify("ok", `Capitalized ${created.assetCode} (${created.assetName}) & posted GL journal entry.`);
    } catch (err: any) {
      notify("err", err?.message || "Failed to capitalize fixed asset.");
    } finally {
      setBusy(false);
    }
  };

  const handleRunDepreciation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depTargetAsset) return;
    setBusy(true);
    try {
      const res = await runAssetDepreciationMutation({
        asset: depTargetAsset,
        periodMonth: depPeriod,
        unitsInPeriod:
          depTargetAsset.depreciationMethod === "Units of Production" ? Number(depUnits || 0) : undefined,
        existingJournals: journals,
        periods,
        financialYears,
        actorName,
        actorRole,
        actorUid,
      });
      setDepTargetAsset(null);
      onLogAction?.("Post Depreciation", `${res.asset.assetCode} ${depPeriod}: ${formatCurrency(res.depreciationAmount, currency)}`);
      notify("ok", `Posted ${depPeriod} depreciation (${formatCurrency(res.depreciationAmount, currency)}) to GL ${res.journal.journalNo}.`);
    } catch (err: any) {
      notify("err", err?.message || "Failed to post depreciation.");
    } finally {
      setBusy(false);
    }
  };

  const handleLifecycleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lifecycleModal) return;
    setBusy(true);
    try {
      const selectedBank = accounts.find((a) => a.id === lifeForm.bankAccountId);
      const updated = await revalueOrDisposeAssetMutation({
        mode: lifecycleModal.mode,
        asset: lifecycleModal.asset,
        eventDate: lifeForm.eventDate,
        newProject: lifeForm.newProject || lifecycleModal.asset.project,
        newLocation: lifeForm.newLocation || lifecycleModal.asset.location,
        newAssignee: lifeForm.newAssignee,
        maintenanceCost: Number(lifeForm.maintenanceCost || 0),
        newFairValue: Number(lifeForm.newFairValue || 0),
        disposalProceeds: Number(lifeForm.disposalProceeds || 0),
        bankAccount: selectedBank,
        description: lifeForm.description,
        periods,
        financialYears,
        actorName,
        actorRole,
        actorUid,
      });
      setLifecycleModal(null);
      onLogAction?.(`Fixed Asset ${lifecycleModal.mode}`, `${updated.assetCode} — ${lifeForm.description || lifecycleModal.mode}`);
      notify("ok", `${lifecycleModal.mode} completed for ${updated.assetCode} & synchronized to GL.`);
    } catch (err: any) {
      notify("err", err?.message || `Failed ${lifecycleModal.mode} operation.`);
    } finally {
      setBusy(false);
    }
  };

  const uniqueProjects = useMemo(() => {
    const set = new Set<string>();
    projectsList.forEach((p) => p.name && set.add(p.name));
    assets.forEach((a) => a.project && set.add(a.project));
    return Array.from(set);
  }, [projectsList, assets]);

  return (
    <div className="space-y-5" id="fixed-assets-depreciation-module">
      {/* Header */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-amber-400">
            <Truck size={20} />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white">
              {isAmharic ? "የቋሚ ንብረቶች እና የእርጅና (Depreciation) አስተዳደር" : "Fixed Assets & Depreciation Management"}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isAmharic
                ? "ህንጻዎች፣ ተሽከርካሪዎች፣ ማሽነሪዎች፣ ዝውውር፣ ግምት ማሻሻያ፣ ሽያጭ እና የሂሳብ መዝገብ ትስስር"
                : "Capitalization, Straight-Line / Declining Balance / Units-of-Production depreciation, transfers, revaluation & GL posting."}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              exportRowsToCsv(
                "fixed_assets_register",
                computed.assets.map((a) => ({
                  AssetCode: a.assetCode,
                  Name: a.assetName,
                  Category: a.category,
                  Project: a.project,
                  Location: a.location,
                  Method: a.depreciationMethod,
                  AcquisitionCost: a.acquisitionCost,
                  AccumDepreciation: a.accumulatedDepreciation,
                  NetBookValue: a.netBookValue,
                  Status: a.status,
                }))
              )
            }
            className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-200 flex items-center gap-1.5 cursor-pointer"
          >
            <Download size={14} className="text-emerald-400" />
            <span>CSV</span>
          </button>

          {perms.canManageFixedAssets && (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={handleImportFromWarehouse}
                className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-cyan-300 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw size={14} />
                <span>{isAmharic ? "ከመጋዘን አምጣ" : "Import Warehouse Asset"}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowNewModal(true)}
                className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} />
                <span>{isAmharic ? "አዲስ ቋሚ ንብረት መዝግብ" : "Capitalize Asset"}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {banner && (
        <div
          className={`px-4 py-3 rounded-xl text-xs font-bold border flex items-center justify-between ${
            banner.type === "ok"
              ? "bg-emerald-950/70 border-emerald-800 text-emerald-200"
              : "bg-red-950/70 border-red-800 text-red-200"
          }`}
        >
          <span>{banner.text}</span>
          <button type="button" onClick={() => setBanner(null)} className="cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Gross Capitalized Cost</span>
          <span className="text-lg font-black text-white font-mono tabular-nums mt-1 block">
            {formatCurrency(computed.kpis.grossAcquisitionCost, currency)}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">{computed.kpis.activeAssetsCount} active assets</span>
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Accum. Depreciation</span>
          <span className="text-lg font-black text-amber-400 font-mono tabular-nums mt-1 block">
            {formatCurrency(computed.kpis.totalAccumulatedDepreciation, currency)}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">Contra-Asset (1590/1595)</span>
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Net Book Value (NBV)</span>
          <span className="text-lg font-black text-emerald-400 font-mono tabular-nums mt-1 block">
            {formatCurrency(computed.kpis.totalNetBookValue, currency)}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">Carrying balance</span>
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Monthly Dep. Run Rate</span>
          <span className="text-lg font-black text-cyan-400 font-mono tabular-nums mt-1 block">
            {formatCurrency(computed.kpis.monthlyDepreciationRunRate, currency)}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">Per-period charge</span>
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Maintenance Spend</span>
          <span className="text-lg font-black text-orange-400 font-mono tabular-nums mt-1 block">
            {formatCurrency(computed.kpis.totalMaintenanceCost, currency)}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">Direct upkeep GL 5040</span>
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Disposal Gain / (Loss)</span>
          <span
            className={`text-lg font-black font-mono tabular-nums mt-1 block ${
              computed.kpis.netDisposalGainLoss >= 0 ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {formatCurrency(computed.kpis.netDisposalGainLoss, currency)}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">{computed.kpis.disposedCount} disposed</span>
        </div>
      </div>

      {/* Sub-navigation + Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950 border border-slate-800 rounded-2xl p-3">
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: "register", label: isAmharic ? "የንብረት መዝገብ" : "Asset Register", icon: Layers },
            { id: "categories", label: isAmharic ? "በምድብ ክፍፍል" : "By Category", icon: Building2 },
            { id: "events", label: isAmharic ? "የእንቅስቃሴ ታሪክ" : "Lifecycle & Depreciation Events", icon: History },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSubTab(t.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer border ${
                  subTab === t.id
                    ? "bg-red-600 text-white border-red-500"
                    : "bg-slate-900 text-slate-300 border-slate-800 hover:text-white"
                }`}
              >
                <Icon size={13} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-semibold"
          >
            <option value="ALL">All Projects / Sites</option>
            {uniqueProjects.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Search code, name, assignee..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 w-52"
          />
        </div>
      </div>

      {/* Subtab 1: Register */}
      {subTab === "register" && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                <th className="py-3 px-3">Asset</th>
                <th className="py-3 px-3">Category & Site</th>
                <th className="py-3 px-3">Method</th>
                <th className="py-3 px-3 text-right">Acq. Cost</th>
                <th className="py-3 px-3 text-right">Accum. Dep</th>
                <th className="py-3 px-3 text-right">Net Book Value</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900 text-slate-300">
              {visibleAssets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-500">
                    No fixed assets recorded in this scope. Capitalize an asset or import from Warehouse.
                  </td>
                </tr>
              ) : (
                visibleAssets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-slate-900/50">
                    <td className="py-3 px-3">
                      <span className="font-mono text-[10px] text-amber-400 block">{asset.assetCode}</span>
                      <span className="font-bold text-white block">{asset.assetName}</span>
                      {asset.assignedToName && (
                        <span className="text-[10px] text-slate-400">Assignee: {asset.assignedToName}</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-slate-200 block">{asset.category}</span>
                      <span className="text-[10px] text-slate-400">
                        {asset.project} · {asset.location}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-slate-200 block">{asset.depreciationMethod}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {asset.usefulLifeYears}y · Salvage {formatCurrency(asset.salvageValue, currency)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-white">
                      {formatCurrency(asset.acquisitionCost, currency)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-amber-400">
                      {formatCurrency(asset.accumulatedDepreciation, currency)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-emerald-400">
                      {formatCurrency(asset.netBookValue, currency)}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          asset.status === "Active"
                            ? "bg-emerald-950/60 border-emerald-800 text-emerald-300"
                            : asset.status === "Disposed"
                            ? "bg-red-950/60 border-red-800 text-red-300"
                            : "bg-slate-900 border-slate-700 text-slate-300"
                        }`}
                      >
                        {asset.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setScheduleAsset(asset)}
                          className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] font-bold text-slate-200 cursor-pointer"
                          title="Depreciation Schedule"
                        >
                          Schedule
                        </button>
                        {perms.canManageFixedAssets && asset.status !== "Disposed" && (
                          <>
                            <button
                              type="button"
                              onClick={() => setDepTargetAsset(asset)}
                              className="px-2 py-1 rounded-lg bg-blue-950/70 hover:bg-blue-900 border border-blue-800 text-[10px] font-bold text-blue-300 cursor-pointer"
                            >
                              Depreciate
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setLifeForm({
                                  ...lifeForm,
                                  newProject: asset.project,
                                  newLocation: asset.location,
                                  newAssignee: asset.assignedToName || "",
                                  newFairValue: String(asset.netBookValue),
                                  disposalProceeds: String(asset.netBookValue),
                                  description: "",
                                });
                                setLifecycleModal({ asset, mode: "Transfer" });
                              }}
                              className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] font-bold text-amber-300 cursor-pointer"
                            >
                              Lifecycle
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Subtab 2: Categories */}
      {subTab === "categories" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {computed.byCategory.map((cat) => (
            <div key={cat.category} className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-extrabold text-white">{cat.category}</span>
                <span className="text-[11px] font-mono text-slate-400">{cat.count} assets</span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Gross Carrying Value</span>
                  <span className="font-mono tabular-nums text-white font-bold">
                    {formatCurrency(cat.grossCost, currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Accumulated Depreciation</span>
                  <span className="font-mono tabular-nums text-amber-400">
                    {formatCurrency(cat.accumulatedDep, currency)}
                  </span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-slate-900">
                  <span className="text-slate-300 font-bold">Net Book Value</span>
                  <span className="font-mono tabular-nums font-bold text-emerald-400">
                    {formatCurrency(cat.netBookValue, currency)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Subtab 3: Lifecycle & Depreciation Events */}
      {subTab === "events" && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Asset</th>
                <th className="py-3 px-3">Event Type</th>
                <th className="py-3 px-3">Details</th>
                <th className="py-3 px-3 text-right">Amount</th>
                <th className="py-3 px-3 text-right">NBV After</th>
                <th className="py-3 px-3">GL Journal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900 text-slate-300">
              {computed.events.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    No asset lifecycle events recorded yet.
                  </td>
                </tr>
              ) : (
                computed.events.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-900/50">
                    <td className="py-2.5 px-3 font-mono">{ev.eventDate}</td>
                    <td className="py-2.5 px-3">
                      <span className="font-mono text-[10px] text-amber-400 block">{ev.assetCode}</span>
                      <span className="font-bold text-white">{ev.assetName}</span>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-200">{ev.eventType}</td>
                    <td className="py-2.5 px-3 text-slate-400 max-w-xs">{ev.description}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-white">
                      {formatCurrency(ev.amount, currency)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-emerald-400 font-bold">
                      {formatCurrency(ev.newNbv, currency)}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-cyan-400">
                      {ev.glJournalNo || "Non-GL"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Capitalize New Fixed Asset */}
      {showNewModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleCreateAsset}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-2xl w-full space-y-4 text-xs my-6"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-extrabold text-white">Capitalize Fixed Asset & Post to GL</h3>
              <button type="button" onClick={() => setShowNewModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Asset Code *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. FA-EXC-004"
                  value={form.assetCode}
                  onChange={(e) => setForm({ ...form, assetCode: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Asset Name *</label>
                <input
                  required
                  type="text"
                  placeholder="CAT 320D Hydraulic Excavator"
                  value={form.assetName}
                  onChange={(e) => setForm({ ...form, assetName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as FinanceAssetCategory })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Acquisition Date</label>
                <input
                  required
                  type="date"
                  value={form.acquisitionDate}
                  onChange={(e) => setForm({ ...form, acquisitionDate: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Acquisition Cost ({currency}) *</label>
                <input
                  required
                  type="number"
                  min={1}
                  step="0.01"
                  value={form.acquisitionCost}
                  onChange={(e) => setForm({ ...form, acquisitionCost: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Salvage Value ({currency})</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.salvageValue}
                  onChange={(e) => setForm({ ...form, salvageValue: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Depreciation Method</label>
                <select
                  value={form.depreciationMethod}
                  onChange={(e) => setForm({ ...form, depreciationMethod: e.target.value as FixedAssetDepreciationMethod })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                >
                  {METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Useful Life (Years)</label>
                <input
                  required
                  type="number"
                  min={1}
                  max={60}
                  value={form.usefulLifeYears}
                  onChange={(e) => setForm({ ...form, usefulLifeYears: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>

              {form.depreciationMethod === "Declining Balance" && (
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Annual Declining Rate (%)</label>
                  <input
                    type="number"
                    min={1}
                    max={90}
                    value={form.decliningRatePct}
                    onChange={(e) => setForm({ ...form, decliningRatePct: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
              )}

              {form.depreciationMethod === "Units of Production" && (
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Total Est. Capacity Units (hrs/km)</label>
                  <input
                    type="number"
                    min={1}
                    value={form.totalEstimatedUnits}
                    onChange={(e) => setForm({ ...form, totalEstimatedUnits: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Assigned Project / Site</label>
                <select
                  value={form.project}
                  onChange={(e) => setForm({ ...form, project: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                >
                  <option value="Head Office">Head Office</option>
                  {uniqueProjects.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Physical Location</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Custodian / Assignee</label>
                <input
                  type="text"
                  placeholder="Operator or Department Lead"
                  value={form.assignedToName}
                  onChange={(e) => setForm({ ...form, assignedToName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Funding GL Source</label>
                <select
                  value={form.fundingSource}
                  onChange={(e) => setForm({ ...form, fundingSource: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                >
                  <option value="Bank">Bank / Treasury Payment</option>
                  <option value="Accounts Payable">Vendor Invoice (AP 2010)</option>
                  <option value="Opening Capital">Opening Capital / Equity (3010)</option>
                </select>
              </div>
              {form.fundingSource === "Bank" && (
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Treasury Account</label>
                  <select
                    value={form.bankAccountId}
                    onChange={(e) => setForm({ ...form, bankAccountId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.accountName} ({formatCurrency(a.currentBalance, currency)})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold cursor-pointer disabled:opacity-50"
              >
                {busy ? "Posting..." : "Capitalize & Post GL"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Post Period Depreciation */}
      {depTargetAsset && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleRunDepreciation}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 text-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-white">Post Period Depreciation</h3>
                <p className="text-[11px] text-slate-400">
                  {depTargetAsset.assetCode} — {depTargetAsset.assetName} ({depTargetAsset.depreciationMethod})
                </p>
              </div>
              <button type="button" onClick={() => setDepTargetAsset(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Accounting Month (YYYY-MM)</label>
                <input
                  required
                  type="month"
                  value={depPeriod}
                  onChange={(e) => setDepPeriod(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>
              {depTargetAsset.depreciationMethod === "Units of Production" && (
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Units Produced / Operating Hours This Period
                  </label>
                  <input
                    required
                    type="number"
                    min={1}
                    value={depUnits}
                    onChange={(e) => setDepUnits(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
              )}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">Current NBV</span>
                  <span className="font-mono text-white">{formatCurrency(depTargetAsset.netBookValue, currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Salvage Floor</span>
                  <span className="font-mono text-slate-300">{formatCurrency(depTargetAsset.salvageValue, currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">GL Entry</span>
                  <span className="font-mono text-cyan-400">DR 6310 / CR {depTargetAsset.coaAccumDepCode}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDepTargetAsset(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <Calculator size={14} />
                <span>{busy ? "Posting..." : "Post Depreciation GL"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Lifecycle Action (Transfer / Assignment / Maintenance / Revaluation / Disposal) */}
      {lifecycleModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleLifecycleSubmit}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full space-y-4 text-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-white">Asset Lifecycle Action</h3>
                <p className="text-[11px] text-slate-400">
                  {lifecycleModal.asset.assetCode} — {lifecycleModal.asset.assetName}
                </p>
              </div>
              <button type="button" onClick={() => setLifecycleModal(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {(["Transfer", "Assignment", "Maintenance", "Revaluation", "Disposal"] as const).map((m) => {
                const restricted = (m === "Revaluation" || m === "Disposal") && !perms.isDirector && !perms.isFinanceManager;
                return (
                  <button
                    key={m}
                    type="button"
                    disabled={restricted}
                    onClick={() => setLifecycleModal({ ...lifecycleModal, mode: m })}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border cursor-pointer disabled:opacity-40 ${
                      lifecycleModal.mode === m
                        ? "bg-red-600 text-white border-red-500"
                        : "bg-slate-950 text-slate-300 border-slate-800"
                    }`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Event Date</label>
                <input
                  required
                  type="date"
                  value={lifeForm.eventDate}
                  onChange={(e) => setLifeForm({ ...lifeForm, eventDate: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>

              {(lifecycleModal.mode === "Transfer" || lifecycleModal.mode === "Assignment") && (
                <>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Destination Project</label>
                    <input
                      type="text"
                      value={lifeForm.newProject}
                      onChange={(e) => setLifeForm({ ...lifeForm, newProject: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Destination Location</label>
                    <input
                      type="text"
                      value={lifeForm.newLocation}
                      onChange={(e) => setLifeForm({ ...lifeForm, newLocation: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Assigned Custodian</label>
                    <input
                      type="text"
                      value={lifeForm.newAssignee}
                      onChange={(e) => setLifeForm({ ...lifeForm, newAssignee: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                </>
              )}

              {lifecycleModal.mode === "Maintenance" && (
                <>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Maintenance Cost ({currency})</label>
                    <input
                      required
                      type="number"
                      min={1}
                      step="0.01"
                      value={lifeForm.maintenanceCost}
                      onChange={(e) => setLifeForm({ ...lifeForm, maintenanceCost: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Payment Account</label>
                    <select
                      value={lifeForm.bankAccountId}
                      onChange={(e) => setLifeForm({ ...lifeForm, bankAccountId: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                    >
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.accountName}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {lifecycleModal.mode === "Revaluation" && (
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    New Fair Valuation ({currency})
                  </label>
                  <input
                    required
                    type="number"
                    min={0}
                    step="0.01"
                    value={lifeForm.newFairValue}
                    onChange={(e) => setLifeForm({ ...lifeForm, newFairValue: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
              )}

              {lifecycleModal.mode === "Disposal" && (
                <>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Disposal Proceeds ({currency})</label>
                    <input
                      required
                      type="number"
                      min={0}
                      step="0.01"
                      value={lifeForm.disposalProceeds}
                      onChange={(e) => setLifeForm({ ...lifeForm, disposalProceeds: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Deposit Proceeds To</label>
                    <select
                      value={lifeForm.bankAccountId}
                      onChange={(e) => setLifeForm({ ...lifeForm, bankAccountId: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                    >
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.accountName}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Audit Description / Authorization Note</label>
              <input
                required
                type="text"
                placeholder="Reason, inspection certificate or board approval reference..."
                value={lifeForm.description}
                onChange={(e) => setLifeForm({ ...lifeForm, description: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setLifecycleModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold cursor-pointer disabled:opacity-50"
              >
                {busy ? "Processing..." : `Execute ${lifecycleModal.mode}`}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Annual Depreciation Projection Schedule */}
      {scheduleAsset && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-2xl w-full space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-white">
                  Depreciation Schedule — {scheduleAsset.assetCode} ({scheduleAsset.depreciationMethod})
                </h3>
                <p className="text-[11px] text-slate-400">
                  Cost {formatCurrency(scheduleAsset.acquisitionCost, currency)} · Salvage{" "}
                  {formatCurrency(scheduleAsset.salvageValue, currency)} · {scheduleAsset.usefulLifeYears} Years
                </p>
              </div>
              <button type="button" onClick={() => setScheduleAsset(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto border border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase">
                  <tr>
                    <th className="py-2 px-3">Year</th>
                    <th className="py-2 px-3 text-right">Opening NBV</th>
                    <th className="py-2 px-3 text-right">Annual Dep.</th>
                    <th className="py-2 px-3 text-right">Accumulated Dep.</th>
                    <th className="py-2 px-3 text-right">Closing NBV</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200">
                  {scheduleRows.map((row) => (
                    <tr key={row.periodNumber}>
                      <td className="py-2 px-3 font-mono font-bold">{row.periodLabel}</td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums">
                        {formatCurrency(row.openingNbv, currency)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums text-amber-400">
                        {formatCurrency(row.depreciationExpense, currency)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums">
                        {formatCurrency(row.accumulatedDepreciation, currency)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums font-bold text-emerald-400">
                        {formatCurrency(row.closingNbv, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
