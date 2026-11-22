import React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  Boxes,
  Building2,
  CheckCircle2,
  ClipboardList,
  DollarSign,
  FileCheck2,
  Filter,
  PackageCheck,
  QrCode,
  ShieldAlert,
  Store,
  Truck,
  Wrench,
} from "lucide-react";
import { WarehouseDashboardFilters } from "../../types";
import { ErpWarehouseSnapshot } from "../../services/warehouseStoreDataService";
import { computeDashboardKpisAndCharts } from "../../services/warehouseManagementService";
import { WarehouseSectionKey } from "../../services/warehouseStoreRbac";
import { StatusBadge } from "./WarehouseSharedUi";

const PIE_COLORS = ["#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#8b5cf6", "#64748b"];

export function InventoryDashboardView({
  snapshot,
  filters,
  onChangeFilters,
  onNavigateSection,
  authorizedSections,
}: {
  snapshot: ErpWarehouseSnapshot;
  filters: WarehouseDashboardFilters;
  onChangeFilters: (next: WarehouseDashboardFilters) => void;
  onNavigateSection: (section: any) => void;
  authorizedSections?: WarehouseSectionKey[];
}) {
  const { kpis, charts } = React.useMemo(
    () =>
      computeDashboardKpisAndCharts(
        {
          warehouses: snapshot.warehouses,
          projectStores: snapshot.projectStores,
          categories: snapshot.categories,
          items: snapshot.items,
          stockBalances: snapshot.stockBalances,
          stockLedger: snapshot.stockLedger,
          materialPlans: snapshot.materialPlans,
          materialRequests: snapshot.materialRequests,
          grvs: snapshot.grvs,
          givs: snapshot.givs,
          mrvs: snapshot.mrvs,
          fixedAssets: snapshot.fixedAssets,
          fatovs: snapshot.fatovs,
          fativs: snapshot.fativs,
          transports: snapshot.transports,
          gatePasses: snapshot.gatePasses,
          commercialInvoices: snapshot.commercialInvoices,
          auditLogs: snapshot.auditLogs,
        },
        filters
      ),
    [snapshot, filters]
  );

  const lowStockRows = React.useMemo(
    () =>
      snapshot.stockBalances
        .filter((b) => b.availableQty <= (b.reorderPoint || b.minStockLevel || 0))
        .slice(0, 6),
    [snapshot.stockBalances]
  );

  const quarantineRows = React.useMemo(
    () => snapshot.stockBalances.filter((b) => (b.quarantineQty || 0) > 0).slice(0, 6),
    [snapshot.stockBalances]
  );

  const projectOptions = React.useMemo(() => {
    const map = new Map<string, string>();
    snapshot.erpProjects.forEach((p: any) => map.set(p.id, p.name || p.title || p.id));
    snapshot.projectStores.forEach((ps) => {
      if (ps.projectId) map.set(ps.projectId, ps.projectName);
    });
    return Array.from(map.entries());
  }, [snapshot.erpProjects, snapshot.projectStores]);

  const locationOptions = React.useMemo(() => {
    const list: Array<{ id: string; label: string }> = [];
    snapshot.warehouses.forEach((w) => list.push({ id: w.id, label: `Warehouse: ${w.name}` }));
    snapshot.projectStores.forEach((s) => list.push({ id: s.id, label: `Site Store: ${s.storeName}` }));
    return list;
  }, [snapshot.warehouses, snapshot.projectStores]);

  const kpiCards = [
    {
      label: "Total Inventory Items",
      value: kpis.totalInventoryItems,
      icon: Boxes,
      tone: "text-sky-400",
      target: "warehouse_inventory",
    },
    {
      label: "Warehouse Consumables Qty",
      value: kpis.totalWarehouseConsumableStock.toLocaleString(),
      icon: Building2,
      tone: "text-emerald-400",
      target: "reports",
    },
    {
      label: "Project Store Consumables",
      value: kpis.totalProjectStoreConsumableStock.toLocaleString(),
      icon: Store,
      tone: "text-cyan-400",
      target: "giv_dispatch",
    },
    {
      label: `Valuation (${snapshot.valuationSettings.valuationMethod})`,
      value: `${kpis.totalInventoryValuation.toLocaleString()} ETB`,
      icon: DollarSign,
      tone: "text-amber-400",
      target: "settings",
    },
    {
      label: "Fixed Assets (BIG BALANCE)",
      value: kpis.totalFixedAssetsBigBalance,
      icon: Wrench,
      tone: "text-indigo-400",
      target: "fixed_assets_big_balance",
    },
    {
      label: "Assets in Warehouse",
      value: kpis.fixedAssetsInWarehouse,
      icon: PackageCheck,
      tone: "text-emerald-300",
      target: "fixed_assets_big_balance",
    },
    {
      label: "Assets Assigned to Projects",
      value: kpis.fixedAssetsInProjects,
      icon: Store,
      tone: "text-teal-400",
      target: "project_fixed_assets",
    },
    {
      label: "Pending Material Requests",
      value: kpis.pendingMaterialRequests,
      icon: ClipboardList,
      tone: "text-amber-300",
      target: "material_requests",
    },
    {
      label: "Pending Director Approvals",
      value: kpis.pendingDirectorApprovals,
      icon: ShieldAlert,
      tone: "text-rose-400",
      target: "director_approvals",
    },
    {
      label: "Approved Pending Dispatch",
      value: kpis.approvedRequestsPendingDispatch,
      icon: Truck,
      tone: "text-sky-300",
      target: "giv_dispatch",
    },
    {
      label: "Dispatched / In Transit",
      value: kpis.dispatchedInTransitCount,
      icon: Truck,
      tone: "text-amber-400",
      target: "transportation",
    },
    {
      label: "Pending Gate Passes",
      value: kpis.pendingGatePasses,
      icon: QrCode,
      tone: "text-cyan-300",
      target: "gate_pass",
    },
    {
      label: "Low Stock Alerts",
      value: kpis.lowStockAlertsCount,
      icon: AlertTriangle,
      tone: kpis.lowStockAlertsCount > 0 ? "text-rose-400" : "text-slate-400",
      target: "reports",
    },
    {
      label: "Damaged / Quarantine Qty",
      value: kpis.damagedQuarantineStockCount,
      icon: AlertTriangle,
      tone: kpis.damagedQuarantineStockCount > 0 ? "text-rose-400" : "text-slate-400",
      target: "quarantine_stock",
    },
    {
      label: "GRVs w/ Commercial Invoice",
      value: kpis.totalGrvsWithCommercialInvoices,
      icon: FileCheck2,
      tone: "text-emerald-400",
      target: "grv",
    },
  ];

  return (
    <div className="space-y-5">
      {/* 5 Interactive Dashboard Filters */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wider">
            <Filter size={14} className="text-amber-400" />
            <span>Global Inventory Filters (5 Dimensions)</span>
          </div>
          <button
            type="button"
            onClick={() =>
              onChangeFilters({
                dateFrom: "",
                dateTo: "",
                projectId: "ALL",
                locationId: "ALL",
                categoryId: "ALL",
                inventoryType: "ALL",
              })
            }
            className="text-xs text-amber-400 hover:text-amber-300 font-semibold cursor-pointer"
          >
            Reset All Filters
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Date From</label>
            <input
              type="date"
              value={filters.dateFrom || ""}
              onChange={(e) => onChangeFilters({ ...filters, dateFrom: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
            />
          </div>
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Date To</label>
            <input
              type="date"
              value={filters.dateTo || ""}
              onChange={(e) => onChangeFilters({ ...filters, dateTo: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
            />
          </div>
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Project</label>
            <select
              value={filters.projectId || "ALL"}
              onChange={(e) => onChangeFilters({ ...filters, projectId: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
            >
              <option value="ALL">All Projects</option>
              {projectOptions.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Warehouse / Site Store</label>
            <select
              value={filters.locationId || "ALL"}
              onChange={(e) => onChangeFilters({ ...filters, locationId: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
            >
              <option value="ALL">All Warehouses & Site Stores</option>
              {locationOptions.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Category</label>
            <select
              value={filters.categoryId || "ALL"}
              onChange={(e) => onChangeFilters({ ...filters, categoryId: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
            >
              <option value="ALL">All Categories</option>
              {snapshot.categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Item Classification</label>
            <select
              value={filters.inventoryType}
              onChange={(e) =>
                onChangeFilters({ ...filters, inventoryType: e.target.value as any })
              }
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
            >
              <option value="ALL">All Types</option>
              <option value="Consumable">Consumables Only</option>
              <option value="Fixed Asset">Fixed Assets Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Live Operational KPI Cards (Filtered by Role Authorization) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {kpiCards
          .filter((card) => !authorizedSections || authorizedSections.includes(card.target as WarehouseSectionKey))
          .map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.label}
              type="button"
              onClick={() => onNavigateSection(card.target)}
              className="bg-slate-900 border border-slate-800 hover:border-amber-500/60 rounded-xl p-3.5 text-left transition-colors cursor-pointer flex flex-col justify-between"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium text-slate-400 leading-tight">
                  {card.label}
                </span>
                <Icon size={16} className={`${card.tone} shrink-0`} />
              </div>
              <div className="mt-2 text-lg font-extrabold text-white tabular-nums font-mono">
                {card.value}
              </div>
            </button>
          );
        })}
      </div>

      {/* 6 Analytical Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart 1 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-3">
            1. Consumables Stock vs Fixed Assets by Category
          </h4>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.stockByCategoryChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="category" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="consumablesQty" name="Consumables Qty" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="fixedAssetsCount" name="Fixed Assets Count" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-3">
            2. Warehouse vs Project Store Stock Distribution
          </h4>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.locationDistributionChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="location" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="availableQty" name="Usable Available Qty" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                <Bar dataKey="quarantineQty" name="Quarantined Qty" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-3">
            3. Material Plan vs Requested vs Dispatched
          </h4>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.planCompareChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="plan" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="planned" name="Planned" fill="#64748b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="requested" name="Requested" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="dispatched" name="Dispatched" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-3">
            4. Inward vs Outward vs Return Movement Trend
          </h4>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.movementTrendChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="received" name="GRV Received" stroke="#10b981" fill="#10b98133" />
                <Area type="monotone" dataKey="dispatched" name="GIV/FATOV Out" stroke="#f59e0b" fill="#f59e0b33" />
                <Area type="monotone" dataKey="returned" name="MRV Returned" stroke="#06b6d4" fill="#06b6d433" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 5 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-3">
            5. Fixed Assets Condition Breakdown
          </h4>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts.fixedAssetConditionChart}
                  dataKey="count"
                  nameKey="condition"
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  label
                >
                  {charts.fixedAssetConditionChart.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 6 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-3">
            6. Two-Way Transportation & Gate Pass Status Summary
          </h4>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.transportStatusChart} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <YAxis dataKey="status" type="category" width={120} tick={{ fill: "#94a3b8", fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", fontSize: 12 }} />
                <Bar dataKey="count" name="Shipments" fill="#f59e0b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Live Alerts Summary: Low Stock & Quarantine */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle size={14} />
              <span>Low Stock & Reorder Threshold Alerts</span>
            </h4>
            <span className="text-[11px] font-mono text-slate-400">{lowStockRows.length} Active</span>
          </div>
          {lowStockRows.length === 0 ? (
            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-400" />
              All inventoried items are currently above minimum reorder levels.
            </p>
          ) : (
            <div className="space-y-2">
              {lowStockRows.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-2 text-xs"
                >
                  <div>
                    <div className="font-semibold text-white">
                      {b.itemCode} — {b.itemName}
                    </div>
                    <div className="text-[11px] text-slate-400">{b.locationName}</div>
                  </div>
                  <div className="text-right font-mono tabular-nums">
                    <div className="text-rose-400 font-bold">
                      {b.availableQty} {b.unit}
                    </div>
                    <div className="text-[10px] text-slate-500">Min: {b.reorderPoint || b.minStockLevel}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert size={14} />
              <span>Segregated Quarantine & Damaged Stock</span>
            </h4>
            {(!authorizedSections || authorizedSections.includes("quarantine_stock")) && (
              <button
                type="button"
                onClick={() => onNavigateSection("quarantine_stock")}
                className="text-xs text-amber-400 hover:text-amber-300 font-semibold cursor-pointer"
              >
                Inspect Queue
              </button>
            )}
          </div>
          {quarantineRows.length === 0 ? (
            <p className="text-xs text-slate-400">No items currently held in quarantine storage.</p>
          ) : (
            <div className="space-y-2">
              {quarantineRows.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between bg-slate-950/80 border border-rose-900/40 rounded-lg px-3 py-2 text-xs"
                >
                  <div>
                    <div className="font-semibold text-white">{b.itemName}</div>
                    <div className="text-[11px] text-slate-400">{b.locationName}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-rose-300 font-bold">
                      {b.quarantineQty} {b.unit}
                    </span>
                    <StatusBadge status="Quarantined" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
