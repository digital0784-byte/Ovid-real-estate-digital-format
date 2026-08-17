import React, { useState, useEffect } from "react";
import { 
  Bell, 
  X, 
  ExternalLink, 
  Sparkles, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  Volume2, 
  VolumeX,
  Radio,
  Clock
} from "lucide-react";
import { EnterpriseNotification } from "../types";
import { NotificationService } from "../services/notificationService";

interface LiveNotificationToastProps {
  onNavigateToTab?: (tab: string) => void;
  isAmharic?: boolean;
}

export const LiveNotificationToast: React.FC<LiveNotificationToastProps> = ({
  onNavigateToTab,
  isAmharic = true
}) => {
  const [activeNotification, setActiveNotification] = useState<EnterpriseNotification | null>(null);
  const [progress, setProgress] = useState<number>(100);

  useEffect(() => {
    const handleLiveEvent = (e: CustomEvent<EnterpriseNotification>) => {
      const notif = e.detail;
      if (notif) {
        setActiveNotification(notif);
        setProgress(100);
      }
    };

    window.addEventListener("buildsync_live_notification" as any, handleLiveEvent);

    return () => {
      window.removeEventListener("buildsync_live_notification" as any, handleLiveEvent);
    };
  }, []);

  // Timer countdown for auto-dismiss
  useEffect(() => {
    if (!activeNotification) return;

    const duration = activeNotification.priority === "Critical" ? 10000 : 6500;
    const intervalTime = 50;
    const step = (intervalTime / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= step) {
          clearInterval(timer);
          setActiveNotification(null);
          return 0;
        }
        return prev - step;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [activeNotification]);

  if (!activeNotification) return null;

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case "Critical":
        return {
          border: "border-red-500/40",
          bg: "bg-slate-900/95 text-white",
          glow: "shadow-red-500/20",
          bar: "bg-red-500",
          iconBg: "bg-red-500/20 text-red-400 border-red-500/30",
          badge: "bg-red-500/20 text-red-300 border-red-500/30"
        };
      case "High":
        return {
          border: "border-amber-500/40",
          bg: "bg-slate-900/95 text-white",
          glow: "shadow-amber-500/20",
          bar: "bg-amber-500",
          iconBg: "bg-amber-500/20 text-amber-400 border-amber-500/30",
          badge: "bg-amber-500/20 text-amber-300 border-amber-500/30"
        };
      default:
        return {
          border: "border-blue-500/40",
          bg: "bg-slate-900/95 text-white",
          glow: "shadow-blue-500/20",
          bar: "bg-blue-500",
          iconBg: "bg-blue-500/20 text-blue-400 border-blue-500/30",
          badge: "bg-blue-500/20 text-blue-300 border-blue-500/30"
        };
    }
  };

  const style = getPriorityStyle(activeNotification.priority);

  const handleAction = () => {
    NotificationService.markAsRead(activeNotification.id);
    if (activeNotification.actionTab && onNavigateToTab) {
      onNavigateToTab(activeNotification.actionTab);
    }
    setActiveNotification(null);
  };

  return (
    <div 
      id="live-notification-toast-container"
      className="fixed top-5 right-4 sm:right-6 z-[9999] max-w-sm sm:max-w-md w-full animate-in fade-in slide-in-from-top-4 duration-200"
    >
      <div className={`relative rounded-2xl border ${style.border} ${style.bg} shadow-2xl ${style.glow} backdrop-blur-xl overflow-hidden p-4`}>
        {/* Top bar with channel badges & sound indicator */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1">
              <Radio className="w-3 h-3 text-amber-400 animate-pulse" />
              <span>{isAmharic ? "የቀጥታ ማስታወቂያ" : "Live Alert"}</span>
            </span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${style.badge}`}>
              {activeNotification.priority}
            </span>
          </div>

          <div className="flex items-center space-x-2 text-slate-400">
            <span className="text-[10px] text-slate-400 flex items-center gap-1" title="Notification sound played">
              <Volume2 className="w-3.5 h-3.5 text-amber-400" />
            </span>
            <button
              id="btn-dismiss-live-toast"
              onClick={() => setActiveNotification(null)}
              className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex items-start space-x-3">
          <div className={`p-2.5 rounded-xl border flex-shrink-0 mt-0.5 ${style.iconBg}`}>
            {activeNotification.priority === "Critical" ? (
              <ShieldAlert className="w-5 h-5" />
            ) : activeNotification.isAiGenerated ? (
              <Sparkles className="w-5 h-5" />
            ) : (
              <Bell className="w-5 h-5" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-slate-100 leading-snug">
              {isAmharic && activeNotification.titleAm ? activeNotification.titleAm : activeNotification.title}
            </h4>
            {isAmharic && activeNotification.titleAm && (
              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                {activeNotification.title}
              </p>
            )}

            <p className="text-xs text-slate-300 mt-1.5 line-clamp-2 leading-relaxed">
              {isAmharic && activeNotification.descriptionAm ? activeNotification.descriptionAm : activeNotification.description}
            </p>

            {/* Metadata tags */}
            <div className="flex flex-wrap items-center gap-2 mt-2 text-[10px] text-slate-400">
              <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                {activeNotification.category}
              </span>
              {activeNotification.projectName && (
                <span className="text-slate-400 truncate max-w-[150px]">
                  • {activeNotification.projectName}
                </span>
              )}
              <span className="flex items-center gap-1 text-slate-500">
                <Clock className="w-2.5 h-2.5" />
                {activeNotification.time || "Just now"}
              </span>
            </div>
          </div>
        </div>

        {/* Action Button if actionable */}
        <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between">
          <span className="text-[10px] text-slate-500">
            {isAmharic ? "መረጃው በቅጽበት ተመዝግቧል" : "Received via live cloud push"}
          </span>
          <div className="flex items-center space-x-2">
            <button
              id="btn-toast-view-action"
              onClick={handleAction}
              className="px-3 py-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 rounded-xl transition-all shadow-md flex items-center space-x-1"
            >
              <span>{isAmharic ? "ተመልከት / ክፈት" : "Open Module"}</span>
              <ExternalLink className="w-3 h-3 ml-1" />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800">
          <div 
            className={`h-full ${style.bar} transition-all duration-75 ease-linear`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
