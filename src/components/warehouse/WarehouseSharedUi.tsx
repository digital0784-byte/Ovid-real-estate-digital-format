import React from "react";
import { Printer, X, FileCheck2, AlertTriangle, CheckCircle2, Info } from "lucide-react";

export function PrintPreviewModal({
  title,
  html,
  onClose,
}: {
  title: string;
  html: string;
  onClose: () => void;
}) {
  const iframeRef = React.useRef<HTMLIFrameElement | null>(null);

  const handlePrint = () => {
    try {
      iframeRef.current?.contentWindow?.focus();
      iframeRef.current?.contentWindow?.print();
    } catch {
      // Safe fallback if iframe print is blocked by container policy
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2.5">
            <FileCheck2 size={18} className="text-amber-400" />
            <h3 className="text-sm font-bold text-white">{title}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Printer size={14} />
              <span>Print / Save PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              aria-label="Close Print Preview"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="flex-1 bg-white p-2 overflow-hidden">
          <iframe
            ref={iframeRef}
            title={title}
            srcDoc={html}
            className="w-full h-full border-0 rounded"
          />
        </div>
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const s = (status || "").toLowerCase();
  let cls = "bg-slate-800 text-slate-300 border-slate-700";
  if (
    s.includes("approved") ||
    s.includes("completed") ||
    s.includes("delivered") ||
    s.includes("confirmed") ||
    s.includes("active") ||
    s.includes("good") ||
    s.includes("verified") ||
    s.includes("entry verified") ||
    s.includes("in warehouse") ||
    s.includes("assigned")
  ) {
    cls = "bg-emerald-950/70 text-emerald-300 border-emerald-700/60";
  }
  if (
    s.includes("pending") ||
    s.includes("partial") ||
    s.includes("transit") ||
    s.includes("issued") ||
    s.includes("submitted") ||
    s.includes("review") ||
    s.includes("exit verified") ||
    s.includes("inspection")
  ) {
    cls = "bg-amber-950/70 text-amber-300 border-amber-700/60";
  }
  if (
    s.includes("disapproved") ||
    s.includes("rejected") ||
    s.includes("returned") ||
    s.includes("quarantine") ||
    s.includes("damaged") ||
    s.includes("defective") ||
    s.includes("discrepancy") ||
    s.includes("tamper") ||
    s.includes("blocked") ||
    s.includes("not reusable") ||
    s.includes("cancelled")
  ) {
    cls = "bg-rose-950/70 text-rose-300 border-rose-700/60";
  }
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border whitespace-nowrap ${cls}`}
    >
      {status}
    </span>
  );
}

export function ActionFeedbackBanner({
  feedback,
  onDismiss,
}: {
  feedback: { type: "success" | "error" | "info"; message: string } | null;
  onDismiss: () => void;
}) {
  if (!feedback) return null;
  const Icon =
    feedback.type === "success"
      ? CheckCircle2
      : feedback.type === "error"
      ? AlertTriangle
      : Info;
  const style =
    feedback.type === "success"
      ? "bg-emerald-950/60 border-emerald-700/70 text-emerald-200"
      : feedback.type === "error"
      ? "bg-rose-950/60 border-rose-700/70 text-rose-200"
      : "bg-sky-950/60 border-sky-700/70 text-sky-200";

  return (
    <div className={`flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border text-xs ${style}`}>
      <div className="flex items-center gap-2">
        <Icon size={15} className="shrink-0" />
        <span className="font-medium">{feedback.message}</span>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="p-1 rounded hover:bg-white/10 cursor-pointer"
        aria-label="Dismiss notification"
      >
        <X size={13} />
      </button>
    </div>
  );
}
