import React, { useState, useEffect, useRef } from "react";
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Clock, 
  ExternalLink, 
  Sparkles, 
  AlertTriangle, 
  Info, 
  Filter, 
  X,
  ShieldAlert,
  ChevronRight,
  SlidersHorizontal,
  Archive,
  Volume2
} from "lucide-react";
import { EnterpriseNotification, UserRole, NotificationPriority } from "../types";
import { NotificationService, adaptToEnterpriseNotification } from "../services/notificationService";

interface NotificationBellDropdownProps {
  currentUserRole: UserRole | string;
  selectedProject: string;
  onNavigateToHub: () => void;
  onNavigateToTab?: (tabName: string) => void;
  systemNotifications?: any[];
  onMarkAsRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
  isAmharic?: boolean;
}

export const NotificationBellDropdown: React.FC<NotificationBellDropdownProps> = ({
  currentUserRole,
  selectedProject,
  onNavigateToHub,
  onNavigateToTab,
  systemNotifications,
  onMarkAsRead,
  onMarkAllAsRead,
  isAmharic = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<EnterpriseNotification[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "unread" | "ai">("unread");
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>(() => NotificationService.getBrowserPermission());
  const [isSoundOn, setIsSoundOn] = useState<boolean>(() => NotificationService.isSoundActive());
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setBrowserPermission(NotificationService.getBrowserPermission());
  }, [isOpen]);

  const handleRequestPermission = async () => {
    const perm = await NotificationService.requestBrowserPermission();
    setBrowserPermission(perm);
    if (perm === "granted") {
      NotificationService.createNotification({
        title: "Browser Push Notifications Active",
        titleAm: "የብሮውዘር/ስልክ የቀጥታ ማስታወቂያዎች ነቅተዋል",
        description: "You will now receive instant desktop and mobile sound alerts for critical events, requests, and syncs.",
        descriptionAm: "አሁን ጀምሮ ለአስቸኳይ ጉዳዮች፣ ለዕቃ ጥያቄዎችና ለደህንነት መረጃዎች በስልክዎ/ብሮውዘርዎ ላይ የቀጥታ ድምፅና ማስታወቂያ ይደርስዎታል።",
        category: "System Update Notifications",
        priority: "High",
        status: "Unread",
        projectName: selectedProject || "Global System",
        sender: "BuildSync Notification Engine",
        senderRole: "System Admin",
        receiver: String(currentUserRole),
        targetRoles: [currentUserRole as UserRole],
        deliveryChannels: { inApp: true, push: true, email: false, sms: false },
        actionTab: "notificationCenter"
      });
    }
  };

  const handleSendTestNotification = () => {
    NotificationService.createNotification({
      title: "Real Live Push Test Notification",
      titleAm: "የሙከራ የቀጥታ ማስታወቂያ (Live Test)",
      description: "Sound, browser system popup, and floating alert confirmed operational in real-time.",
      descriptionAm: "የድምፅ ቅላጼ፣ የብሮውዘር ሲስተም ፖፕ-አፕ እና ተንሳፋፊ የቀጥታ ማስታወቂያ በትክክል እየሰሩ መሆናቸው ተረጋግጧል።",
      category: "System Update Notifications",
      priority: "High",
      status: "Unread",
      projectName: selectedProject || "Addis Ababa Tower Block A",
      sender: "BuildSync Real-Time Test",
      senderRole: "System AI",
      receiver: String(currentUserRole),
      targetRoles: [currentUserRole as UserRole],
      deliveryChannels: { inApp: true, push: true, email: false, sms: true },
      actionTab: "notificationCenter"
    });
  };

  const toggleSound = () => {
    const next = !isSoundOn;
    setIsSoundOn(next);
    NotificationService.setSoundActive(next);
    if (next) {
      NotificationService.playAudioChime("Medium");
    }
  };

  useEffect(() => {
    const updateList = () => {
      let combined: EnterpriseNotification[] = [];
      if (systemNotifications && systemNotifications.length > 0) {
        combined = systemNotifications.map(n => adaptToEnterpriseNotification(n));
      }
      const serviceNotifs = NotificationService.getNotifications();
      const existingIds = new Set(combined.map(c => c.id));
      serviceNotifs.forEach(sn => {
        if (!existingIds.has(sn.id)) {
          combined.push(sn);
        }
      });

      const filtered = NotificationService.getNotificationsForRoleAndProject(
        currentUserRole,
        selectedProject,
        combined.length > 0 ? combined : undefined
      );
      setNotifications(filtered);
    };

    updateList();

    const unsubscribe = NotificationService.subscribe(() => {
      updateList();
    });

    return () => unsubscribe();
  }, [systemNotifications, currentUserRole, selectedProject]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isItemUnread = (n: EnterpriseNotification) => {
    if (n.status === "Read") return false;
    if ((n as any).read === true || (n as any).isRead === true) return false;
    return true;
  };

  const unreadCount = notifications.filter(n => isItemUnread(n) && !n.isArchived).length;
  const criticalCount = notifications.filter(
    n => n.priority === "Critical" && isItemUnread(n) && !n.isArchived
  ).length;

  const displayNotifications = notifications.filter(n => {
    if (n.isArchived) return false;
    if (activeTab === "unread") return isItemUnread(n);
    if (activeTab === "ai") return n.isAiGenerated;
    return true;
  }).slice(0, 10);

  const getPriorityBadgeClass = (priority: NotificationPriority) => {
    switch (priority) {
      case "Critical":
        return "bg-red-500/10 text-red-600 border-red-500/30 animate-pulse";
      case "High":
        return "bg-amber-500/10 text-amber-600 border-amber-500/30";
      case "Medium":
        return "bg-blue-500/10 text-blue-600 border-blue-500/30";
      default:
        return "bg-gray-500/10 text-gray-600 border-gray-500/30";
    }
  };

  const handleActionClick = (notif: EnterpriseNotification) => {
    NotificationService.markAsRead(notif.id);
    if (onMarkAsRead) onMarkAsRead(notif.id);
    if (notif.actionTab && onNavigateToTab) {
      onNavigateToTab(notif.actionTab);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        id="btn-notification-bell-trigger"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 hover:bg-amber-500/10 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all duration-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
        title="Enterprise Notification Center"
      >
        <Bell className="w-5 h-5 text-slate-700 dark:text-slate-200" />
        
        {unreadCount > 0 && (
          <span className={`absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white rounded-full border-2 border-white dark:border-slate-900 shadow-md ${
            criticalCount > 0 ? "bg-red-600 animate-bounce" : "bg-amber-600"
          }`}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div 
          id="popover-notification-panel"
          className="absolute right-0 mt-3 w-80 sm:w-96 md:w-[420px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[580px] animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400 border border-amber-500/30">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm tracking-wide text-amber-100 flex items-center gap-1.5">
                  <span>Notification Center</span>
                  <span className="text-[10px] text-amber-300 font-normal">| የማስታወቂያ ማዕከል</span>
                </h3>
                <p className="text-[11px] text-slate-300 flex items-center space-x-1">
                  <span>RBAC: {currentUserRole}</span>
                  {selectedProject !== "ALL" && (
                    <>
                      <span>•</span>
                      <span className="truncate max-w-[130px]">{selectedProject}</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={toggleSound}
                className={`p-1.5 rounded-lg border transition-colors ${
                  isSoundOn
                    ? "bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30"
                    : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                }`}
                title={isSoundOn ? "Mute notification sound" : "Unmute notification sound"}
              >
                <Volume2 className={`w-3.5 h-3.5 ${isSoundOn ? "text-amber-300" : "text-slate-500"}`} />
              </button>

              {unreadCount > 0 && (
                <button
                  id="btn-bell-mark-all-read"
                  onClick={() => {
                    NotificationService.markAllAsRead(currentUserRole, selectedProject);
                    if (onMarkAllAsRead) onMarkAllAsRead();
                  }}
                  className="px-2 py-1 text-[11px] font-medium bg-white/10 hover:bg-white/20 text-white rounded-md transition-colors flex items-center space-x-1"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5 text-amber-300" />
                  <span className="hidden sm:inline">ሁሉንም አንብብ</span>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Browser Push Permission Banner (Real Live Notifications) */}
          {browserPermission !== "granted" ? (
            <div className="px-3.5 py-2.5 bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent dark:bg-amber-950/40 border-b border-amber-500/30 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2 min-w-0 pr-2">
                <span className="relative flex h-2 w-2 flex-shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                <p className="text-[11px] text-amber-900 dark:text-amber-200 font-medium truncate">
                  {isAmharic ? "የቀጥታ ስልክ/ብሮውዘር ማስታወቂያዎችን ይፍቀዱ" : "Enable live device push notifications"}
                </p>
              </div>
              <button
                id="btn-enable-browser-push-dropdown"
                onClick={handleRequestPermission}
                className="px-2.5 py-1 text-[11px] font-bold bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 rounded-lg shadow-sm transition-all flex-shrink-0"
              >
                {isAmharic ? "አብራ / ፍቀድ" : "Enable Push"}
              </button>
            </div>
          ) : (
            <div className="px-3.5 py-1.5 bg-emerald-500/10 dark:bg-emerald-950/30 border-b border-emerald-500/20 flex items-center justify-between text-[11px]">
              <div className="flex items-center space-x-1.5 text-emerald-700 dark:text-emerald-300 font-medium">
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{isAmharic ? "የቀጥታ ማስታወቂያዎች ንቁ ናቸው (Real Push Active)" : "Real device push active"}</span>
              </div>
              <button
                id="btn-test-notification-bell"
                onClick={handleSendTestNotification}
                className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-800 dark:text-emerald-200 rounded border border-emerald-500/30 transition-colors"
                title="Send a real test notification with sound"
              >
                {isAmharic ? "የሙከራ ድምፅና ማስታወቂያ" : "Test Alert"}
              </button>
            </div>
          )}

          {/* Quick Filter Tabs */}
          <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs">
            <div className="flex space-x-1">
              <button
                onClick={() => setActiveTab("unread")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  activeTab === "unread"
                    ? "bg-amber-500 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                Unread ({unreadCount})
              </button>
              <button
                onClick={() => setActiveTab("all")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  activeTab === "all"
                    ? "bg-slate-800 text-white shadow-sm dark:bg-slate-700"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveTab("ai")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center space-x-1 ${
                  activeTab === "ai"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>AI Alerts</span>
              </button>
            </div>

            <button
              onClick={() => {
                setIsOpen(false);
                onNavigateToHub();
              }}
              className="text-amber-600 dark:text-amber-400 hover:underline text-[11px] font-semibold flex items-center space-x-0.5"
            >
              <span>Hub View</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {/* List Content */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80 overflow-y-auto flex-1 max-h-[380px]">
            {displayNotifications.length === 0 ? (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400 flex flex-col items-center">
                <CheckCheck className="w-10 h-10 text-emerald-500/40 mb-2" />
                <p className="text-sm font-semibold">No notifications</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  You are all caught up for {currentUserRole}!
                </p>
              </div>
            ) : (
              displayNotifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-3.5 transition-colors group relative ${
                    notif.status === "Unread"
                      ? "bg-amber-50/60 dark:bg-amber-950/20 hover:bg-amber-100/50 dark:hover:bg-amber-950/40"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    {/* Unread indicator dot or icon */}
                    <div className="pt-0.5 flex-shrink-0">
                      {notif.priority === "Critical" ? (
                        <div className="p-1.5 bg-red-500/10 text-red-600 rounded-full border border-red-500/30 animate-pulse">
                          <ShieldAlert className="w-4 h-4" />
                        </div>
                      ) : notif.isAiGenerated ? (
                        <div className="p-1.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-full border border-indigo-500/30">
                          <Sparkles className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className={`w-2.5 h-2.5 mt-1.5 rounded-full ${
                          notif.status === "Unread" ? "bg-amber-500 shadow-sm" : "bg-slate-300 dark:bg-slate-700"
                        }`} />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${getPriorityBadgeClass(notif.priority)}`}>
                          {notif.priority}
                        </span>
                        
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center space-x-1">
                          <Clock className="w-2.5 h-2.5 inline mr-0.5" />
                          <span>{notif.time}</span>
                        </span>
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 line-clamp-1 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                          {notif.title}
                        </h4>
                        {notif.titleAm && (
                          <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 line-clamp-1 mt-0.5">
                            {notif.titleAm}
                          </p>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 mt-0.5 leading-relaxed">
                        {notif.description}
                      </p>
                      {notif.descriptionAm && (
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 italic line-clamp-1 mt-0.5">
                          {notif.descriptionAm}
                        </p>
                      )}

                      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-1.5 border-t border-slate-100 dark:border-slate-800/60">
                        <span className="truncate max-w-[180px] font-medium text-slate-600 dark:text-slate-300">
                          📍 {notif.projectName}
                        </span>

                        <div className="flex items-center space-x-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                          {notif.status === "Unread" && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                NotificationService.markAsRead(notif.id);
                                if (onMarkAsRead) onMarkAsRead(notif.id);
                              }}
                              className="p-1 hover:bg-amber-200/60 dark:hover:bg-amber-900/50 rounded text-slate-600 dark:text-slate-300 hover:text-amber-800 dark:hover:text-amber-200 transition-colors"
                              title="Mark as Read"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              NotificationService.snooze(notif.id, 4);
                            }}
                            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                            title="Snooze 4 hrs"
                          >
                            <Clock className="w-3 h-3" />
                          </button>

                          {notif.actionTab && (
                            <button
                              onClick={() => handleActionClick(notif)}
                              className="px-2 py-0.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded text-[10px] flex items-center space-x-1 transition-colors"
                            >
                              <span>Open</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-3 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              In-App Notifications (Real-Time)
            </span>
            <button
              id="btn-open-full-notification-hub"
              onClick={() => {
                setIsOpen(false);
                onNavigateToHub();
              }}
              className="px-3 py-1.5 bg-slate-900 dark:bg-amber-500 hover:bg-slate-800 dark:hover:bg-amber-600 text-white dark:text-slate-950 font-bold rounded-xl shadow transition-all flex items-center space-x-1.5"
            >
              <span>View Enterprise Hub</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
