import React, { useState } from "react";
import { DailyPanelMovementReportData } from "../../types";
import { PanelTraceabilityService } from "../../services/panelTraceabilityService";
import { 
  X, 
  FileText, 
  Printer, 
  Download, 
  CheckCircle, 
  Building2, 
  Calendar, 
  Layers, 
  Share2,
  Bell
} from "lucide-react";

interface Props {
  onClose: () => void;
  isAmharic: boolean;
  currentUser: { id: string; name: string; role: string };
}

export const DailyMovementReportModal: React.FC<Props> = ({
  onClose,
  isAmharic,
  currentUser
}) => {
  const [report, setReport] = useState<DailyPanelMovementReportData>(() =>
    PanelTraceabilityService.generateDailyMovementReport(
      { type: "ALL", id: "ALL-ENTERPRISE", name: "All Enterprise Facilities & Sites" },
      currentUser
    )
  );
  const [notificationSent, setNotificationSent] = useState(true);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400">
              <FileText size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {isAmharic ? "ዕለታዊ የፓነል እንቅስቃሴ ሪፖርት (Daily Panel Movement Report)" : "Daily Panel Movement Report"}
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Report ID: {report.reportId} • Date: {report.reportDate}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer"
            >
              <Printer size={13} />
              <span>{isAmharic ? "አትም" : "Print"}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Notification Status Banner */}
        {notificationSent && (
          <div className="p-3 bg-blue-950/40 border-b border-blue-800/80 text-blue-300 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bell size={14} className="text-blue-400" />
              <span>
                {isAmharic 
                  ? "ማሳሰቢያ ተልኳል፡ ለመጋዘን አስተዳዳሪ፣ ለዋና መ/ቤት ስራ አስኪያጅ፣ ለፕሮጀክት ስራ አስኪያጅ እና ለሱፐር አድሚን።" 
                  : "Automatic notifications dispatched to: Warehouse Manager, Head Office Manager, Project Manager, Super Admin."}
              </span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-blue-900/60 font-mono text-blue-200 font-bold">
              DELIVERED
            </span>
          </div>
        )}

        {/* Report Content Body */}
        <div className="p-5 overflow-y-auto flex-1 text-xs space-y-6">
          {/* Executive Summary Metrics */}
          <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 border-b border-slate-800 pb-2">
              {isAmharic ? "የዕለቱ የፓነል ሚዛን ማጠቃለያ (Movement Balance Summary)" : "Daily Movement Balance Summary"}
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 text-center">
              <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Opening Panels</span>
                <span className="text-base font-bold font-mono text-white">{report.openingPanels}</span>
              </div>
              <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                <span className="text-[10px] text-emerald-400 block">+ Received</span>
                <span className="text-base font-bold font-mono text-emerald-300">{report.received}</span>
              </div>
              <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                <span className="text-[10px] text-amber-400 block">- Issued</span>
                <span className="text-base font-bold font-mono text-amber-300">{report.issued}</span>
              </div>
              <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                <span className="text-[10px] text-teal-400 block">+ Returned</span>
                <span className="text-base font-bold font-mono text-teal-300">{report.returned}</span>
              </div>
              <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                <span className="text-[10px] text-blue-400 block">Installed</span>
                <span className="text-base font-bold font-mono text-blue-300">{report.installed}</span>
              </div>
              <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Closing Panels</span>
                <span className="text-base font-bold font-mono text-white">{report.closingPanels}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-3 text-center">
              <div className="p-2 bg-rose-950/40 border border-rose-900/60 rounded-lg">
                <span className="text-[10px] text-rose-300 block">Damaged Today</span>
                <span className="text-sm font-bold font-mono text-rose-400">{report.damaged}</span>
              </div>
              <div className="p-2 bg-red-950/40 border border-red-900/60 rounded-lg">
                <span className="text-[10px] text-red-300 block">Missing Today</span>
                <span className="text-sm font-bold font-mono text-red-400">{report.missing}</span>
              </div>
              <div className="p-2 bg-slate-900 border border-slate-800 rounded-lg">
                <span className="text-[10px] text-slate-400 block">Lost Unrecovered</span>
                <span className="text-sm font-bold font-mono text-slate-300">{report.lost}</span>
              </div>
            </div>
          </div>

          {/* Breakdown by Facilities and Projects */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl space-y-2">
              <h5 className="font-bold text-slate-300 text-xs border-b border-slate-800 pb-1.5 flex items-center space-x-1.5">
                <Building2 size={13} className="text-amber-400" />
                <span>{isAmharic ? "ስርጭት በፕሮጀክት" : "Breakdown by Project"}</span>
              </h5>
              <div className="space-y-1">
                {report.breakdownByProject.map((item) => (
                  <div key={item.name} className="flex justify-between items-center py-1 border-b border-slate-800/40">
                    <span className="text-slate-300">{item.name}</span>
                    <span className="font-mono bg-slate-900 px-2 py-0.5 rounded text-amber-300 font-bold">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl space-y-2">
              <h5 className="font-bold text-slate-300 text-xs border-b border-slate-800 pb-1.5 flex items-center space-x-1.5">
                <Layers size={13} className="text-blue-400" />
                <span>{isAmharic ? "ስርጭት በመጋዘን / ስቶር" : "Breakdown by Warehouse / Store"}</span>
              </h5>
              <div className="space-y-1">
                {[...report.breakdownByWarehouse, ...report.breakdownBySiteStore].map((item) => (
                  <div key={item.name} className="flex justify-between items-center py-1 border-b border-slate-800/40">
                    <span className="text-slate-300">{item.name}</span>
                    <span className="font-mono bg-slate-900 px-2 py-0.5 rounded text-blue-300 font-bold">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
