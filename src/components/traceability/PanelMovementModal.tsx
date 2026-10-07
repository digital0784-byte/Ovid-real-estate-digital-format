import React, { useState } from "react";
import { 
  TraceablePanel, 
  PanelTraceabilityStatus, 
  PanelPhysicalCondition, 
  PanelTraceabilityAction 
} from "../../types";
import { PanelTraceabilityService } from "../../services/panelTraceabilityService";
import { 
  X, 
  ArrowRight, 
  Building2, 
  MapPin, 
  AlertTriangle, 
  CheckCircle, 
  Calendar, 
  User, 
  RotateCcw,
  Camera,
  Layers
} from "lucide-react";

interface Props {
  panel: TraceablePanel;
  action: PanelTraceabilityAction;
  onClose: () => void;
  onSuccess: () => void;
  isAmharic: boolean;
  currentUser: { id: string; name: string; role: string };
}

export const PanelMovementModal: React.FC<Props> = ({
  panel,
  action,
  onClose,
  onSuccess,
  isAmharic,
  currentUser
}) => {
  // Destination location fields (Hierarchy: Warehouse → Site → Store → Project → Building → Floor → Zone)
  const [project, setProject] = useState(panel.currentProjectId || "PRJ-001");
  const [building, setBuilding] = useState(panel.currentBuildingId || "Tower A");
  const [floor, setFloor] = useState(panel.currentFloorId || "Floor 12");
  const [zone, setZone] = useState(panel.currentZoneId || "Zone 02");
  const [customLocation, setCustomLocation] = useState("");
  
  // Status & condition
  const [targetStatus, setTargetStatus] = useState<PanelTraceabilityStatus>(() => {
    switch (action) {
      case "ISSUE": return "ISSUED";
      case "RETURN": return "RETURNED";
      case "INSTALL": return "INSTALLED";
      case "TRANSFER": return "IN_TRANSIT";
      case "DAMAGE_REPORT": return "DAMAGED";
      case "MISSING_REPORT": return "MISSING";
      default: return panel.status;
    }
  });

  const [condition, setCondition] = useState<PanelPhysicalCondition>(panel.condition);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [expectedReturnDate, setExpectedReturnDate] = useState("2026-10-20");
  const [requesterName, setRequesterName] = useState("Kassahun Tadesse (Team Leader)");
  
  // Damage fields
  const [damageType, setDamageType] = useState<string>("Bent / Deformed");
  const [damageDescription, setDamageDescription] = useState("");
  const [damageSeverity, setDamageSeverity] = useState<"MINOR" | "MODERATE" | "CRITICAL" | "SCRAP">("MINOR");

  // Error state
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!reason.trim()) {
      setError(isAmharic ? "እባክዎን የእንቅስቃሴውን ምክንያት ያስገቡ" : "Please provide a valid movement reason / directive.");
      return;
    }

    // Determine target location
    let toLocation = customLocation;
    if (!toLocation) {
      if (action === "RETURN") {
        toLocation = "Bole Heights Site Store 01 (Returned & Inspected)";
      } else if (action === "ISSUE" || action === "INSTALL") {
        toLocation = `${project} → ${building} → ${floor} → ${zone}`;
      } else if (action === "TRANSFER") {
        toLocation = `In Transit to Destination Site (${project})`;
      } else {
        toLocation = panel.currentLocation;
      }
    }

    // If Damage report
    if (action === "DAMAGE_REPORT") {
      const res = PanelTraceabilityService.reportDamage(
        {
          inspectionId: `DMG-${Date.now()}`,
          panelId: panel.panelId,
          serialNumber: panel.serialNumber,
          panelCode: panel.panelCode,
          damageType: damageType as any,
          damageDescription: damageDescription || reason,
          severity: damageSeverity,
          reportedBy: currentUser.name,
          reportedByRole: currentUser.role,
          dateTime: new Date().toISOString(),
          currentLocation: panel.currentLocation,
          repairDecision: damageSeverity === "SCRAP" ? "RETIRE_AND_SCRAP" : "TRANSFER_TO_CENTRAL_WORKSHOP",
          repairStatus: "PENDING_ASSESSMENT"
        },
        currentUser
      );

      if (!res.success) {
        setError(res.error || "Failed to record damage");
        return;
      }
    } 
    // If Return
    else if (action === "RETURN") {
      const res = PanelTraceabilityService.returnPanel(
        {
          returnId: `RET-${Date.now()}`,
          panelSerial: panel.serialNumber,
          panelCode: panel.panelCode,
          panelId: panel.panelId,
          returnDateTime: new Date().toISOString(),
          returnedBy: requesterName,
          returnedByRole: "Team Leader",
          condition,
          damageStatus: condition === "DAMAGED" || condition === "CRITICAL_DAMAGE" ? "CRITICAL_DAMAGE" : "NO_DAMAGE",
          missingAccessories: [],
          inspectionResult: condition === "DAMAGED" ? "QUARANTINED_FOR_REPAIR" : "ACCEPTED_BACK_TO_STOCK",
          inspectorName: currentUser.name,
          inspectorRole: currentUser.role,
          destinationStoreOrWarehouse: toLocation,
          notes
        },
        currentUser
      );

      if (!res.success) {
        setError(res.error || "Failed to return panel");
        return;
      }
    } 
    // If Issue
    else if (action === "ISSUE") {
      const res = PanelTraceabilityService.issuePanel(
        {
          issueId: `ISS-${Date.now()}`,
          panelSerial: panel.serialNumber,
          panelCode: panel.panelCode,
          panelId: panel.panelId,
          requesterId: "USER-REQ-01",
          requesterName,
          requesterRole: "Team Leader",
          project,
          projectId: project,
          site: "Bole Heights Phase 1 Site",
          siteId: "SITE-01",
          building,
          floor,
          zone,
          issueDateTime: new Date().toISOString(),
          expectedReturnDate,
          condition,
          issuedBy: currentUser.name,
          issuedByRole: currentUser.role,
          notes
        },
        currentUser
      );

      if (!res.success) {
        setError(res.error || "Failed to issue panel");
        return;
      }
    } 
    // General movement
    else {
      const res = PanelTraceabilityService.recordMovement({
        panelId: panel.panelId,
        action,
        toLocation,
        newStatus: targetStatus,
        newCondition: condition,
        projectId: project,
        buildingId: building,
        floorId: floor,
        zoneId: zone,
        reason,
        notes,
        user: currentUser
      });

      if (!res.success) {
        setError(res.error || "Movement rejected by system rules");
        return;
      }
    }

    onSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <span className="text-red-500 font-mono">[{action}]</span>
              <span>{panel.serialNumber}</span>
              <span className="text-slate-400 font-normal">({panel.panelCode})</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Current: <strong className="text-slate-200">{panel.currentLocation}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-red-950/70 border border-red-800 text-red-300 rounded-lg flex items-start space-x-2">
              <AlertTriangle size={15} className="shrink-0 mt-0.5 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Location Hierarchy Selectors for Issue / Install */}
          {(action === "ISSUE" || action === "INSTALL" || action === "TRANSFER") && (
            <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl space-y-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {isAmharic ? "የመዳረሻ ቦታ ተዋረድ (Destination Hierarchy)" : "Destination Location Hierarchy"}
              </span>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Project</label>
                  <select
                    value={project}
                    onChange={(e) => setProject(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                  >
                    <option value="PRJ-001">Bole Heights Luxury Tower</option>
                    <option value="PRJ-002">CMC Central Business District</option>
                    <option value="PRJ-003">Kazanchis Finance Tower</option>
                    <option value="PRJ-004">Sarbet Mixed-Use Complex</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Building</label>
                  <input
                    type="text"
                    value={building}
                    onChange={(e) => setBuilding(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Floor</label>
                  <input
                    type="text"
                    value={floor}
                    onChange={(e) => setFloor(e.target.value)}
                    placeholder="e.g. Floor 12"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Zone</label>
                  <input
                    type="text"
                    value={zone}
                    onChange={(e) => setZone(e.target.value)}
                    placeholder="e.g. Zone 02 Core Walls"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Condition Inspection (Required on Return / Damage) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">
                {isAmharic ? "አካላዊ ይዞታ (Condition)" : "Physical Condition"}
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white"
              >
                <option value="NEW">NEW (አዲስ)</option>
                <option value="GOOD">GOOD (ጥሩ)</option>
                <option value="USED_GOOD">USED_GOOD (ያገለገለ-ጥሩ)</option>
                <option value="MINOR_DAMAGE">MINOR_DAMAGE (ቀላል ብልሽት)</option>
                <option value="DAMAGED">DAMAGED (የተጎዳ)</option>
                <option value="CRITICAL_DAMAGE">CRITICAL_DAMAGE (ከባድ ጉዳት)</option>
                <option value="UNDER_REPAIR">UNDER_REPAIR (በጥገና ላይ)</option>
                <option value="UNUSABLE">UNUSABLE (ከጥቅም ውጪ)</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block mb-1">
                {isAmharic ? "ኢላማ ሁኔታ (Target Status)" : "Target Status"}
              </label>
              <input
                type="text"
                readOnly
                value={targetStatus}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-400 font-mono"
              />
            </div>
          </div>

          {/* Damage Specifics if reporting damage */}
          {action === "DAMAGE_REPORT" && (
            <div className="bg-rose-950/20 border border-rose-900/60 p-3 rounded-xl space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-rose-300 block mb-1">Damage Classification</label>
                  <select
                    value={damageType}
                    onChange={(e) => setDamageType(e.target.value)}
                    className="w-full bg-slate-950 border border-rose-800 rounded px-2.5 py-1.5 text-white"
                  >
                    <option value="Bent / Deformed">Bent / Deformed</option>
                    <option value="Cracked Weld">Cracked Weld</option>
                    <option value="Face Dent">Face Dent</option>
                    <option value="Corner Damaged">Corner Damaged</option>
                    <option value="Pin Hole Enlarged">Pin Hole Enlarged</option>
                    <option value="Coating Stripped">Coating Stripped</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-rose-300 block mb-1">Severity</label>
                  <select
                    value={damageSeverity}
                    onChange={(e) => setDamageSeverity(e.target.value as any)}
                    className="w-full bg-slate-950 border border-rose-800 rounded px-2.5 py-1.5 text-white"
                  >
                    <option value="MINOR">MINOR (ቀላል)</option>
                    <option value="MODERATE">MODERATE (መካከለኛ)</option>
                    <option value="CRITICAL">CRITICAL (ከባድ)</option>
                    <option value="SCRAP">SCRAP (ከጥቅም ውጪ)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Movement Reason (Mandatory for audit trail) */}
          <div>
            <label className="text-[10px] text-slate-400 block mb-1 font-bold">
              {isAmharic ? "የእንቅስቃሴ ምክንያት (Movement Reason) *" : "Movement Reason / Official Directive *"}
            </label>
            <input
              type="text"
              required
              placeholder={isAmharic ? "ምክንያቱን በግልጽ ያስገቡ..." : "e.g. Formwork erection for 12th floor core shear wall"}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
            />
          </div>

          <div>
            <label className="text-[10px] text-slate-400 block mb-1">
              {isAmharic ? "ተጨማሪ ማስታወሻ (Notes)" : "Additional Notes"}
            </label>
            <input
              type="text"
              placeholder="e.g. Verified with optical plumb line"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white placeholder-slate-500"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-3 border-t border-slate-800 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
            >
              {isAmharic ? "ሰርዝ" : "Cancel"}
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-red-950/40 cursor-pointer flex items-center space-x-1.5"
            >
              <CheckCircle size={14} />
              <span>{isAmharic ? "እንቅስቃሴውን መዝግብ" : "Commit Movement"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
