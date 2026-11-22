import React, { useState } from "react";
import { Boxes, Building2, Layers, PackagePlus, Plus, Store, Trash2 } from "lucide-react";
import {
  InventoryCategoryRecord,
  InventoryItemRecord,
  ProjectStoreRecord,
  WarehouseRecord,
} from "../../types";
import {
  ErpWarehouseSnapshot,
  WarehouseActorContext,
  WarehouseStoreDataService,
} from "../../services/warehouseStoreDataService";
import { canPerformWarehouseModuleAction } from "../../services/warehouseStoreRbac";
import { StatusBadge } from "./WarehouseSharedUi";

type WarehouseInventorySubTab = "warehouses" | "balances" | "catalog_items" | "categories";

export function MasterDataAndFacilitiesView({
  mode,
  snapshot,
  actor,
  onFeedback,
}: {
  mode: "warehouse_inventory" | "site_stores";
  snapshot: ErpWarehouseSnapshot;
  actor: WarehouseActorContext;
  onFeedback: (type: "success" | "error" | "info", message: string) => void;
}) {
  const canEditMaster = canPerformWarehouseModuleAction(actor.role, "MANAGE_MASTER_DATA");

  const [subTab, setSubTab] = useState<WarehouseInventorySubTab>("balances");

  // Category Form
  const [catCode, setCatCode] = useState("");
  const [catName, setCatName] = useState("");
  const [catType, setCatType] = useState<"Consumable" | "Fixed Asset">("Consumable");

  // Item Form
  const [itemCode, setItemCode] = useState("");
  const [itemName, setItemName] = useState("");
  const [spec, setSpec] = useState("");
  const [itemCatId, setItemCatId] = useState("");
  const [itemType, setItemType] = useState<"Consumable" | "Fixed Asset">("Consumable");
  const [unit, setUnit] = useState("pcs");
  const [minStock, setMinStock] = useState("10");
  const [reorderPt, setReorderPt] = useState("20");
  const [stdCost, setStdCost] = useState("0");
  const [batchTrackingEnabled, setBatchTrackingEnabled] = useState(false);
  const [expiryTrackingEnabled, setExpiryTrackingEnabled] = useState(false);

  // Warehouse Form
  const [whCode, setWhCode] = useState("");
  const [whName, setWhName] = useState("");
  const [whLoc, setWhLoc] = useState("");
  const [whMgr, setWhMgr] = useState(actor.name);
  const [whCapNote, setWhCapNote] = useState("1000 Tons");

  // Project Store Form
  const [psCode, setPsCode] = useState("");
  const [psName, setPsName] = useState("");
  const [psProjId, setPsProjId] = useState(snapshot.erpProjects[0]?.id || "");
  const [psLoc, setPsLoc] = useState("");
  const [psOwner, setPsOwner] = useState("");

  const [search, setSearch] = useState("");

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const now = new Date().toISOString();
      const cat: InventoryCategoryRecord = {
        id: `CAT-${Date.now()}`,
        code: catCode.trim().toUpperCase(),
        name: catName.trim(),
        inventoryType: catType,
        isActive: true,
        createdByUid: actor.uid,
        createdAt: now,
        updatedAt: now,
      };
      await WarehouseStoreDataService.saveCategory(cat, actor);
      setCatCode("");
      setCatName("");
      onFeedback("success", `Saved category ${cat.code} — ${cat.name}.`);
    } catch (err: any) {
      onFeedback("error", err?.message || "Failed to save category.");
    }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const now = new Date().toISOString();
      const matchedCat = snapshot.categories.find((c) => c.id === itemCatId);
      const item: InventoryItemRecord = {
        id: `ITEM-${Date.now()}`,
        itemCode: itemCode.trim().toUpperCase(),
        itemName: itemName.trim(),
        specification: spec.trim(),
        categoryId: matchedCat?.id || "CAT-GEN",
        categoryName: matchedCat?.name || "General Construction",
        inventoryType: itemType,
        unit: unit.trim() || "pcs",
        minStockLevel: Number(minStock) || 0,
        reorderPoint: Number(reorderPt) || 0,
        standardUnitCost: Number(stdCost) || 0,
        batchTrackingEnabled,
        expiryTrackingEnabled,
        isActive: true,
        createdByUid: actor.uid,
        createdAt: now,
        updatedAt: now,
      };
      await WarehouseStoreDataService.saveItem(item, actor);
      setItemCode("");
      setItemName("");
      setSpec("");
      onFeedback("success", `Catalog item ${item.itemCode} — ${item.itemName} saved.`);
    } catch (err: any) {
      onFeedback("error", err?.message || "Failed to save item.");
    }
  };

  const handleSaveWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const now = new Date().toISOString();
      const wh: WarehouseRecord = {
        id: `WH-${Date.now()}`,
        code: whCode.trim().toUpperCase(),
        name: whName.trim(),
        location: whLoc.trim(),
        managerUid: actor.uid,
        managerName: whMgr.trim(),
        capacityNote: whCapNote.trim() || undefined,
        status: "Active",
        createdAt: now,
        updatedAt: now,
      };
      await WarehouseStoreDataService.saveWarehouse(wh, actor);
      setWhCode("");
      setWhName("");
      setWhLoc("");
      onFeedback("success", `Warehouse ${wh.name} registered & synced with ERP.`);
    } catch (err: any) {
      onFeedback("error", err?.message || "Failed to register warehouse.");
    }
  };

  const handleSaveProjectStore = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const now = new Date().toISOString();
      const proj = snapshot.erpProjects.find((p: any) => p.id === psProjId);
      const ps: ProjectStoreRecord = {
        id: `PS-${Date.now()}`,
        storeCode: psCode.trim().toUpperCase(),
        storeName: psName.trim(),
        projectId: proj?.id || psProjId || `PROJ-${Date.now()}`,
        projectName: proj?.name || proj?.title || psProjId || "Construction Project",
        location: psLoc.trim() || proj?.location || "",
        storeOwnerName: psOwner.trim() || "Assigned Store Owner",
        status: "Active",
        createdAt: now,
        updatedAt: now,
      };
      await WarehouseStoreDataService.saveProjectStore(ps, actor);
      setPsCode("");
      setPsName("");
      setPsLoc("");
      onFeedback("success", `Project Site Store ${ps.storeName} linked to ${ps.projectName}.`);
    } catch (err: any) {
      onFeedback("error", err?.message || "Failed to register project store.");
    }
  };

  if (mode === "site_stores") {
    return (
      <div className="space-y-4">
        {canEditMaster && (
          <form onSubmit={handleSaveProjectStore} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Store size={16} className="text-cyan-400" />
              <span>Register Project Site Store (Linked to ERP Project)</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                required
                placeholder="Store Code (e.g. PS-BOLE-01)"
                value={psCode}
                onChange={(e) => setPsCode(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
              />
              <input
                required
                placeholder="Site Store Name"
                value={psName}
                onChange={(e) => setPsName(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
              />
              <select
                value={psProjId}
                onChange={(e) => setPsProjId(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
              >
                {snapshot.erpProjects.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name || p.title || p.id}
                  </option>
                ))}
                {snapshot.erpProjects.length === 0 && <option value="PROJ-MAIN">OVID Main Construction Project</option>}
              </select>
              <input
                required
                placeholder="Site Location / Zone"
                value={psLoc}
                onChange={(e) => setPsLoc(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
              />
              <input
                required
                placeholder="Site Store Owner Name"
                value={psOwner}
                onChange={(e) => setPsOwner(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={14} />
              <span>Register Site Store</span>
            </button>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {snapshot.projectStores.map((ps) => (
            <div key={ps.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-mono text-cyan-400 font-bold">{ps.storeCode}</span>
                  <h4 className="text-sm font-bold text-white">{ps.storeName}</h4>
                </div>
                <StatusBadge status={ps.status} />
              </div>
              <div className="text-xs text-amber-300 font-semibold">Project: {ps.projectName}</div>
              <div className="text-xs text-slate-400">Location: {ps.location}</div>
              <div className="text-xs text-slate-300">Store Owner: {ps.storeOwnerName || "Unassigned"}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // mode === "warehouse_inventory" with 4 sub-tabs
  const filteredItems = snapshot.items.filter(
    (i) =>
      !search ||
      i.itemName.toLowerCase().includes(search.toLowerCase()) ||
      i.itemCode.toLowerCase().includes(search.toLowerCase())
  );

  const filteredBalances = snapshot.stockBalances.filter(
    (b) =>
      !search ||
      b.itemName.toLowerCase().includes(search.toLowerCase()) ||
      b.itemCode.toLowerCase().includes(search.toLowerCase()) ||
      b.locationName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2 flex flex-wrap gap-1.5">
        {(
          [
            { id: "balances", label: `Live Stock Balances (${snapshot.stockBalances.length})`, icon: Boxes },
            { id: "warehouses", label: `Warehouses (${snapshot.warehouses.length})`, icon: Building2 },
            { id: "catalog_items", label: `Master Catalog (${snapshot.items.length})`, icon: PackagePlus },
            { id: "categories", label: `Categories (${snapshot.categories.length})`, icon: Layers },
          ] as Array<{ id: WarehouseInventorySubTab; label: string; icon: React.ComponentType<any> }>
        ).map((tab) => {
          const Icon = tab.icon;
          const active = subTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                active ? "bg-amber-600 text-white" : "bg-slate-950/60 hover:bg-slate-800 text-slate-300"
              }`}
            >
              <Icon size={13} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {subTab === "balances" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-bold text-slate-200 uppercase">
              Warehouse & Site Store Stock Balances ({filteredBalances.length})
            </span>
            <input
              placeholder="Search item or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white w-60"
            />
          </div>
          <div className="overflow-x-auto max-h-[540px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] sticky top-0">
                <tr>
                  <th className="px-4 py-2.5">Location</th>
                  <th className="px-4 py-2.5">Item</th>
                  <th className="px-4 py-2.5 text-right">Received</th>
                  <th className="px-4 py-2.5 text-right">Issued</th>
                  <th className="px-4 py-2.5 text-right">Returned</th>
                  <th className="px-4 py-2.5 text-right">Usable Avail</th>
                  <th className="px-4 py-2.5 text-right">Quarantine</th>
                  <th className="px-4 py-2.5 text-right">Valuation (ETB)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredBalances.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-800/40">
                    <td className="px-4 py-2.5">
                      <div className="text-white font-semibold">{b.locationName}</div>
                      <div className="text-[11px] text-slate-400">
                        {b.locationType}{b.projectName ? ` · ${b.projectName}` : ""}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="text-white font-medium">{b.itemCode} — {b.itemName}</div>
                      <div className="text-[11px] text-slate-400">{b.categoryName} · {b.valuationMethod}</div>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-300">{b.receivedQty}</td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-300">{b.issuedQty}</td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-300">{b.returnedQty}</td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums font-bold text-emerald-300">
                      {b.availableQty} {b.unit}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-rose-400">
                      {b.quarantineQty}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-amber-300">
                      {b.totalValuation.toLocaleString()}
                    </td>
                  </tr>
                ))}
                {filteredBalances.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-slate-500">
                      No stock balance records yet. Finalize a GRV to receive materials into a warehouse.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subTab === "warehouses" && (
        <div className="space-y-4">
          {canEditMaster && (
            <form onSubmit={handleSaveWarehouse} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Building2 size={16} className="text-amber-400" />
                <span>Register Central / Regional Warehouse</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  required
                  placeholder="Warehouse Code (e.g. WH-MAIN)"
                  value={whCode}
                  onChange={(e) => setWhCode(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                />
                <input
                  required
                  placeholder="Warehouse Name"
                  value={whName}
                  onChange={(e) => setWhName(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                />
                <input
                  required
                  placeholder="Location / Subcity"
                  value={whLoc}
                  onChange={(e) => setWhLoc(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                />
                <input
                  required
                  placeholder="Manager Name"
                  value={whMgr}
                  onChange={(e) => setWhMgr(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                />
                <input
                  placeholder="Capacity Note (e.g. 1000 Tons)"
                  value={whCapNote}
                  onChange={(e) => setWhCapNote(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} />
                <span>Save Warehouse Facility</span>
              </button>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {snapshot.warehouses.map((wh) => (
              <div key={wh.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[11px] font-mono text-amber-400 font-bold">{wh.code}</span>
                    <h4 className="text-sm font-bold text-white">{wh.name}</h4>
                  </div>
                  <StatusBadge status={wh.status} />
                </div>
                <div className="text-xs text-slate-400">Location: {wh.location}</div>
                <div className="text-xs text-slate-300">Manager: {wh.managerName || "-"}</div>
                {wh.capacityNote && <div className="text-[11px] text-slate-400">{wh.capacityNote}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {subTab === "catalog_items" && (
        <div className="space-y-4">
          {canEditMaster && (
            <form onSubmit={handleSaveItem} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <PackagePlus size={16} className="text-amber-400" />
                <span>Register Consumable / Fixed Asset Master Item</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <input
                  required
                  placeholder="Item Code (e.g. CEM-42.5)"
                  value={itemCode}
                  onChange={(e) => setItemCode(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                />
                <input
                  required
                  placeholder="Item Name (e.g. OPC Cement 50kg)"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                />
                <input
                  placeholder="Specification / Size / Brand"
                  value={spec}
                  onChange={(e) => setSpec(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                />
                <select
                  value={itemType}
                  onChange={(e) => setItemType(e.target.value as any)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                >
                  <option value="Consumable">Consumable Material</option>
                  <option value="Fixed Asset">Fixed Asset / Equipment</option>
                </select>
                <select
                  value={itemCatId}
                  onChange={(e) => setItemCatId(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                >
                  <option value="">General Construction</option>
                  {snapshot.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <input
                  required
                  placeholder="Unit (bags, pcs, tons, m3)"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                />
                <input
                  type="number"
                  placeholder="Min Stock Level"
                  value={minStock}
                  onChange={(e) => setMinStock(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                />
                <input
                  type="number"
                  placeholder="Reorder Point"
                  value={reorderPt}
                  onChange={(e) => setReorderPt(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Standard Unit Cost (ETB)"
                  value={stdCost}
                  onChange={(e) => setStdCost(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                />
                <label className="flex items-center gap-2 text-xs text-slate-300 px-2">
                  <input
                    type="checkbox"
                    checked={batchTrackingEnabled}
                    onChange={(e) => setBatchTrackingEnabled(e.target.checked)}
                  />
                  Track Batch Lot
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-300 px-2">
                  <input
                    type="checkbox"
                    checked={expiryTrackingEnabled}
                    onChange={(e) => setExpiryTrackingEnabled(e.target.checked)}
                  />
                  Track Expiry Date
                </label>
              </div>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} />
                <span>Save Item to Master Catalog</span>
              </button>
            </form>
          )}

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-bold text-slate-200 uppercase">
                Unified Master Item Catalog ({filteredItems.length} — Reused from ERP Materials + Custom Items)
              </span>
              <input
                placeholder="Search code or name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white w-60"
              />
            </div>
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] sticky top-0">
                  <tr>
                    <th className="px-4 py-2.5">Item Code</th>
                    <th className="px-4 py-2.5">Name & Spec</th>
                    <th className="px-4 py-2.5">Category</th>
                    <th className="px-4 py-2.5">Type</th>
                    <th className="px-4 py-2.5">Unit</th>
                    <th className="px-4 py-2.5 text-right">Min / Reorder</th>
                    <th className="px-4 py-2.5 text-right">Std Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/40">
                      <td className="px-4 py-2.5 font-mono text-amber-400 font-bold">{item.itemCode}</td>
                      <td className="px-4 py-2.5">
                        <div className="text-white font-semibold">{item.itemName}</div>
                        {item.specification && <div className="text-[11px] text-slate-400">{item.specification}</div>}
                      </td>
                      <td className="px-4 py-2.5 text-slate-300">{item.categoryName}</td>
                      <td className="px-4 py-2.5"><StatusBadge status={item.inventoryType} /></td>
                      <td className="px-4 py-2.5 text-slate-300">{item.unit}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-300 tabular-nums">
                        {item.minStockLevel} / {item.reorderPoint}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-emerald-300 tabular-nums">
                        {(item.standardUnitCost || 0).toLocaleString()} ETB
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {subTab === "categories" && (
        <div className="space-y-4">
          {canEditMaster && (
            <form onSubmit={handleSaveCategory} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers size={16} className="text-amber-400" />
                <span>Register Inventory Category</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <input
                  required
                  placeholder="Code (e.g. CON-STL)"
                  value={catCode}
                  onChange={(e) => setCatCode(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                />
                <input
                  required
                  placeholder="Category Name (e.g. Rebar & Steel)"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white sm:col-span-2"
                />
                <select
                  value={catType}
                  onChange={(e) => setCatType(e.target.value as any)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                >
                  <option value="Consumable">Consumable</option>
                  <option value="Fixed Asset">Fixed Asset</option>
                </select>
              </div>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} />
                <span>Save Category</span>
              </button>
            </form>
          )}

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 uppercase">
                Inventory Categories ({snapshot.categories.length})
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-2.5">Code</th>
                    <th className="px-4 py-2.5">Category Name</th>
                    <th className="px-4 py-2.5">Classification</th>
                    <th className="px-4 py-2.5">Created By UID</th>
                    {canEditMaster && <th className="px-4 py-2.5 text-right">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {snapshot.categories.map((cat) => (
                    <tr key={cat.id} className="hover:bg-slate-800/40">
                      <td className="px-4 py-2.5 font-mono text-amber-400 font-bold">{cat.code}</td>
                      <td className="px-4 py-2.5 text-white font-semibold">{cat.name}</td>
                      <td className="px-4 py-2.5"><StatusBadge status={cat.inventoryType} /></td>
                      <td className="px-4 py-2.5 text-slate-400 font-mono">{cat.createdByUid || "-"}</td>
                      {canEditMaster && (
                        <td className="px-4 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => WarehouseStoreDataService.deleteCategory(cat.id, actor)}
                            className="text-rose-400 hover:text-rose-300 p-1 cursor-pointer"
                            title="Delete Category"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {snapshot.categories.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                        No custom inventory categories registered yet. Add one above to classify consumables & fixed assets.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
