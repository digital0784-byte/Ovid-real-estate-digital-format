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
import { tr } from "./warehouseI18n";

type WarehouseInventorySubTab = "warehouses" | "balances" | "catalog_items" | "categories";

export function MasterDataAndFacilitiesView({
  mode,
  snapshot,
  actor,
  onFeedback,
  isAmharic,
}: {
  mode: "warehouse_inventory" | "site_stores";
  snapshot: ErpWarehouseSnapshot;
  actor: WarehouseActorContext;
  onFeedback: (type: "success" | "error" | "info", message: string) => void;
  isAmharic?: boolean;
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
      onFeedback("success", tr(isAmharic, `Saved category ${cat.code} — ${cat.name}.`, `ምድብ ${cat.code} — ${cat.name} ተቀምጧል።`));
    } catch (err: any) {
      onFeedback("error", err?.message || tr(isAmharic, "Failed to save category.", "ምድቡን ማስቀመጥ አልተቻለም።"));
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
      onFeedback("success", tr(isAmharic, `Catalog item ${item.itemCode} — ${item.itemName} saved.`, `የካታሎግ እቃ ${item.itemCode} — ${item.itemName} ተቀምጧል።`));
    } catch (err: any) {
      onFeedback("error", err?.message || tr(isAmharic, "Failed to save item.", "እቃውን ማስቀመጥ አልተቻለም።"));
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
      onFeedback("success", tr(isAmharic, `Warehouse ${wh.name} registered & synced with ERP.`, `መጋዘን ${wh.name} ተመዝግቦ ከERP ጋር ተገናኝቷል።`));
    } catch (err: any) {
      onFeedback("error", err?.message || tr(isAmharic, "Failed to register warehouse.", "መጋዘኑን መመዝገብ አልተቻለም።"));
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
        storeOwnerName: psOwner.trim() || "Assigned Site Manager",
        status: "Active",
        createdAt: now,
        updatedAt: now,
      };
      await WarehouseStoreDataService.saveProjectStore(ps, actor);
      setPsCode("");
      setPsName("");
      setPsLoc("");
      onFeedback("success", tr(isAmharic, `Project Site Store ${ps.storeName} linked to ${ps.projectName}.`, `የሳይት ስቶር ${ps.storeName} ከ${ps.projectName} ጋር ተያይዟል።`));
    } catch (err: any) {
      onFeedback("error", err?.message || tr(isAmharic, "Failed to register project store.", "የፕሮጀክት ስቶሩን መመዝገብ አልተቻለም።"));
    }
  };

  if (mode === "site_stores") {
    return (
      <div className="space-y-4">
        {canEditMaster && (
          <form onSubmit={handleSaveProjectStore} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Store size={16} className="text-cyan-400" />
              <span>{tr(isAmharic, "Register Project Site Store (Linked to ERP Project)", "የፕሮጀክት ሳይት ስቶር መመዝገቢያ (ከERP ፕሮጀክት ጋር የተያያዘ)")}</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                required
                placeholder={tr(isAmharic, "Store Code (e.g. PS-BOLE-01)", "የስቶር ኮድ (ምሳሌ: PS-BOLE-01)")}
                value={psCode}
                onChange={(e) => setPsCode(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
              />
              <input
                required
                placeholder={tr(isAmharic, "Site Store Name", "የሳይት ስቶር ስም")}
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
                placeholder={tr(isAmharic, "Site Location / Zone", "የሳይት አድራሻ / ዞን")}
                value={psLoc}
                onChange={(e) => setPsLoc(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
              />
              <input
                required
                placeholder={tr(isAmharic, "Site Manager Name", "የሳይት ማናጀር ስም")}
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
              <span>{tr(isAmharic, "Register Site Store", "ሳይት ስቶሩን መዝግብ")}</span>
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
                <StatusBadge status={ps.status} isAmharic={isAmharic} />
              </div>
              <div className="text-xs text-amber-300 font-semibold">{tr(isAmharic, "Project:", "ፕሮጀክት:")} {ps.projectName}</div>
              <div className="text-xs text-slate-400">{tr(isAmharic, "Location:", "አድራሻ:")} {ps.location}</div>
              <div className="text-xs text-slate-300">{tr(isAmharic, "Site Manager:", "ሳይት ማናጀር:")} {ps.storeOwnerName || tr(isAmharic, "Unassigned", "ያልተመደበ")}</div>
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
            { id: "balances", label: `${tr(isAmharic, "Live Stock Balances", "የቀጥታ ክምችት ሚዛን")} (${snapshot.stockBalances.length})`, icon: Boxes },
            { id: "warehouses", label: `${tr(isAmharic, "Warehouses", "መጋዘኖች")} (${snapshot.warehouses.length})`, icon: Building2 },
            { id: "catalog_items", label: `${tr(isAmharic, "Master Catalog", "ዋና የእቃ ካታሎግ")} (${snapshot.items.length})`, icon: PackagePlus },
            { id: "categories", label: `${tr(isAmharic, "Categories", "ምድቦች")} (${snapshot.categories.length})`, icon: Layers },
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
              {tr(isAmharic, "Warehouse & Site Store Stock Balances", "የመጋዘን እና የሳይት ስቶር ክምችት ሚዛን")} ({filteredBalances.length})
            </span>
            <input
              placeholder={tr(isAmharic, "Search item or location...", "እቃ ወይም ቦታ ፈልግ...")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white w-60"
            />
          </div>
          <div className="overflow-x-auto max-h-[540px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] sticky top-0">
                <tr>
                  <th className="px-4 py-2.5">{tr(isAmharic, "Location", "ቦታ")}</th>
                  <th className="px-4 py-2.5">{tr(isAmharic, "Item", "እቃ")}</th>
                  <th className="px-4 py-2.5 text-right">{tr(isAmharic, "Received", "ገቢ")}</th>
                  <th className="px-4 py-2.5 text-right">{tr(isAmharic, "Issued", "ወጪ")}</th>
                  <th className="px-4 py-2.5 text-right">{tr(isAmharic, "Returned", "ተመላሽ")}</th>
                  <th className="px-4 py-2.5 text-right">{tr(isAmharic, "Usable Avail", "የሚገኝ ክምችት")}</th>
                  <th className="px-4 py-2.5 text-right">{tr(isAmharic, "Quarantine", "ኳራንቲን")}</th>
                  <th className="px-4 py-2.5 text-right">{tr(isAmharic, "Valuation (ETB)", "ዋጋ (ብር)")}</th>
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
                      {tr(isAmharic, "No stock balance records yet. Finalize a GRV to receive materials into a warehouse.", "እስካሁን ምንም የክምችት መዝገብ የለም። እቃ ወደ መጋዘን ለመቀበል GRV ያጠናቅቁ።")}
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
                <span>{tr(isAmharic, "Register Central / Regional Warehouse", "ዋና / ክልላዊ መጋዘን መመዝገቢያ")}</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  required
                  placeholder={tr(isAmharic, "Warehouse Code (e.g. WH-MAIN)", "የመጋዘን ኮድ (ምሳሌ: WH-MAIN)")}
                  value={whCode}
                  onChange={(e) => setWhCode(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                />
                <input
                  required
                  placeholder={tr(isAmharic, "Warehouse Name", "የመጋዘን ስም")}
                  value={whName}
                  onChange={(e) => setWhName(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                />
                <input
                  required
                  placeholder={tr(isAmharic, "Location / Subcity", "አድራሻ / ክፍለ ከተማ")}
                  value={whLoc}
                  onChange={(e) => setWhLoc(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                />
                <input
                  required
                  placeholder={tr(isAmharic, "Manager Name", "የመጋዘን ኃላፊ ስም")}
                  value={whMgr}
                  onChange={(e) => setWhMgr(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                />
                <input
                  placeholder={tr(isAmharic, "Capacity Note (e.g. 1000 Tons)", "የመያዝ አቅም (ምሳሌ: 1000 Tons)")}
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
                <span>{tr(isAmharic, "Save Warehouse Facility", "መጋዘኑን መዝግብ")}</span>
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
                  <StatusBadge status={wh.status} isAmharic={isAmharic} />
                </div>
                <div className="text-xs text-slate-400">{tr(isAmharic, "Location:", "አድራሻ:")} {wh.location}</div>
                <div className="text-xs text-slate-300">{tr(isAmharic, "Manager:", "ኃላፊ:")} {wh.managerName || "-"}</div>
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
                <span>{tr(isAmharic, "Register Consumable / Fixed Asset Master Item", "አላቂ እቃ / ቋሚ ንብረት በካታሎግ መመዝገቢያ")}</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <input
                  required
                  placeholder={tr(isAmharic, "Item Code (e.g. CEM-42.5)", "የእቃ ኮድ (ምሳሌ: CEM-42.5)")}
                  value={itemCode}
                  onChange={(e) => setItemCode(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                />
                <input
                  required
                  placeholder={tr(isAmharic, "Item Name (e.g. OPC Cement 50kg)", "የእቃ ስም (ምሳሌ: OPC Cement 50kg)")}
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                />
                <input
                  placeholder={tr(isAmharic, "Specification / Size / Brand", "ዝርዝር መግለጫ / መጠን / ብራንድ")}
                  value={spec}
                  onChange={(e) => setSpec(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                />
                <select
                  value={itemType}
                  onChange={(e) => setItemType(e.target.value as any)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                >
                  <option value="Consumable">{tr(isAmharic, "Consumable Material", "አላቂ እቃ (Consumable)")}</option>
                  <option value="Fixed Asset">{tr(isAmharic, "Fixed Asset / Equipment", "ቋሚ ንብረት / መሳሪያ")}</option>
                </select>
                <select
                  value={itemCatId}
                  onChange={(e) => setItemCatId(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                >
                  <option value="">{tr(isAmharic, "General Construction", "ጠቅላላ ግንባታ")}</option>
                  {snapshot.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <input
                  required
                  placeholder={tr(isAmharic, "Unit (bags, pcs, tons, m3)", "መለኪያ (ከረጢት, ቁጥር, ቶን)")}
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                />
                <input
                  type="number"
                  placeholder={tr(isAmharic, "Min Stock Level", "ዝቅተኛ ክምችት ገደብ")}
                  value={minStock}
                  onChange={(e) => setMinStock(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                />
                <input
                  type="number"
                  placeholder={tr(isAmharic, "Reorder Point", "ዳግም ማዘዣ ነጥብ")}
                  value={reorderPt}
                  onChange={(e) => setReorderPt(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder={tr(isAmharic, "Standard Unit Cost (ETB)", "መደበኛ የነጠላ ዋጋ (ብር)")}
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
                  {tr(isAmharic, "Track Batch Lot", "ባች/ሎት ተከታተል")}
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-300 px-2">
                  <input
                    type="checkbox"
                    checked={expiryTrackingEnabled}
                    onChange={(e) => setExpiryTrackingEnabled(e.target.checked)}
                  />
                  {tr(isAmharic, "Track Expiry Date", "የማብቂያ ቀን ተከታተል")}
                </label>
              </div>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} />
                <span>{tr(isAmharic, "Save Item to Master Catalog", "እቃውን በዋናው ካታሎግ አስቀምጥ")}</span>
              </button>
            </form>
          )}

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-bold text-slate-200 uppercase">
                {tr(isAmharic, `Unified Master Item Catalog (${filteredItems.length} — Reused from ERP Materials + Custom Items)`, `ዋና የእቃ ካታሎግ (${filteredItems.length} — ከERP እቃዎች እና አዲስ የተመዘገቡ)`)}
              </span>
              <input
                placeholder={tr(isAmharic, "Search code or name...", "ኮድ ወይም ስም ፈልግ...")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white w-60"
              />
            </div>
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] sticky top-0">
                  <tr>
                    <th className="px-4 py-2.5">{tr(isAmharic, "Item Code", "የእቃ ኮድ")}</th>
                    <th className="px-4 py-2.5">{tr(isAmharic, "Name & Spec", "ስም እና መግለጫ")}</th>
                    <th className="px-4 py-2.5">{tr(isAmharic, "Category", "ምድብ")}</th>
                    <th className="px-4 py-2.5">{tr(isAmharic, "Type", "ዓይነት")}</th>
                    <th className="px-4 py-2.5">{tr(isAmharic, "Unit", "መለኪያ")}</th>
                    <th className="px-4 py-2.5 text-right">{tr(isAmharic, "Min / Reorder", "ዝቅተኛ / ዳግም ማዘዣ")}</th>
                    <th className="px-4 py-2.5 text-right">{tr(isAmharic, "Std Cost", "መደበኛ ዋጋ")}</th>
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
                      <td className="px-4 py-2.5"><StatusBadge status={item.inventoryType} isAmharic={isAmharic} /></td>
                      <td className="px-4 py-2.5 text-slate-300">{item.unit}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-300 tabular-nums">
                        {item.minStockLevel} / {item.reorderPoint}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-emerald-300 tabular-nums">
                        {(item.standardUnitCost || 0).toLocaleString()} {tr(isAmharic, "ETB", "ብር")}
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
                <span>{tr(isAmharic, "Register Inventory Category", "የእቃ ምድብ መመዝገቢያ")}</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <input
                  required
                  placeholder={tr(isAmharic, "Code (e.g. CON-STL)", "ኮድ (ምሳሌ: CON-STL)")}
                  value={catCode}
                  onChange={(e) => setCatCode(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                />
                <input
                  required
                  placeholder={tr(isAmharic, "Category Name (e.g. Rebar & Steel)", "የምድብ ስም (ምሳሌ: ብረት እና ሪባር)")}
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white sm:col-span-2"
                />
                <select
                  value={catType}
                  onChange={(e) => setCatType(e.target.value as any)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                >
                  <option value="Consumable">{tr(isAmharic, "Consumable", "አላቂ እቃ")}</option>
                  <option value="Fixed Asset">{tr(isAmharic, "Fixed Asset", "ቋሚ ንብረት")}</option>
                </select>
              </div>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} />
                <span>{tr(isAmharic, "Save Category", "ምድቡን አስቀምጥ")}</span>
              </button>
            </form>
          )}

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 uppercase">
                {tr(isAmharic, "Inventory Categories", "የእቃ ምድቦች")} ({snapshot.categories.length})
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-2.5">{tr(isAmharic, "Code", "ኮድ")}</th>
                    <th className="px-4 py-2.5">{tr(isAmharic, "Category Name", "የምድብ ስም")}</th>
                    <th className="px-4 py-2.5">{tr(isAmharic, "Classification", "ምደባ")}</th>
                    <th className="px-4 py-2.5">{tr(isAmharic, "Created By UID", "መዝጋቢ መለያ")}</th>
                    {canEditMaster && <th className="px-4 py-2.5 text-right">{tr(isAmharic, "Action", "ድርጊት")}</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {snapshot.categories.map((cat) => (
                    <tr key={cat.id} className="hover:bg-slate-800/40">
                      <td className="px-4 py-2.5 font-mono text-amber-400 font-bold">{cat.code}</td>
                      <td className="px-4 py-2.5 text-white font-semibold">{cat.name}</td>
                      <td className="px-4 py-2.5"><StatusBadge status={cat.inventoryType} isAmharic={isAmharic} /></td>
                      <td className="px-4 py-2.5 text-slate-400 font-mono">{cat.createdByUid || "-"}</td>
                      {canEditMaster && (
                        <td className="px-4 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => WarehouseStoreDataService.deleteCategory(cat.id, actor)}
                            className="text-rose-400 hover:text-rose-300 p-1 cursor-pointer"
                            title={tr(isAmharic, "Delete Category", "ምድቡን ሰርዝ")}
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
                        {tr(isAmharic, "No custom inventory categories registered yet. Add one above to classify consumables & fixed assets.", "እስካሁን የተመዘገቡ ምድቦች የሉም። ከላይ አዲስ ምድብ ያክሉ።")}
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
