// ============================================================
// DIGITAL CONSTRUCTION ERP SYSTEM - NAVIGATION CONTEXT
// React Navigation Provider & Hook with Android Back & Unsaved Protection
// ============================================================

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import {
  NavLocation,
  UnsavedChangesGuard,
  SubViewBackHandler,
  ERP_TAB_METADATA,
  navigationService
} from "../services/appNavigationService";
import { UserRole } from "../types";

export interface NavigationContextValue {
  currentTab: string;
  currentLocation: NavLocation;
  historyStack: NavLocation[];
  canGoBack: boolean;
  previousLocation: NavLocation | null;
  navigate: (
    tab: string,
    options?: {
      subView?: string;
      params?: Record<string, any>;
      titleEn?: string;
      titleAm?: string;
      replace?: boolean;
    }
  ) => void;
  goBack: () => void;
  registerUnsavedGuard: (guard: UnsavedChangesGuard) => () => void;
  registerSubViewBack: (handler: SubViewBackHandler) => () => void;
  activeUnsavedGuard: UnsavedChangesGuard | null;
  confirmDiscardAndLeave: () => void;
  confirmSaveAndLeave: () => Promise<void>;
  cancelNavigation: () => void;
  isUnsavedModalOpen: boolean;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

interface NavigationProviderProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  hasAccess: (tab: string) => boolean;
  currentUserRole?: UserRole;
  isAmharic?: boolean;
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({
  children,
  activeTab,
  setActiveTab,
  hasAccess,
  currentUserRole,
  isAmharic = true
}) => {
  const [currentLocation, setCurrentLocation] = useState<NavLocation>(() =>
    navigationService.getCurrentLocation()
  );
  const [historyStack, setHistoryStack] = useState<NavLocation[]>(() =>
    navigationService.getHistory()
  );
  const [activeUnsavedGuard, setActiveUnsavedGuard] = useState<UnsavedChangesGuard | null>(null);
  const [isUnsavedModalOpen, setIsUnsavedModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // Sync initial tab into navigationService if differs
  useEffect(() => {
    const cur = navigationService.getCurrentLocation();
    if (cur.tab !== activeTab) {
      const loc = navigationService.pushLocation(activeTab);
      setCurrentLocation(loc);
      setHistoryStack(navigationService.getHistory());
    }
  }, [activeTab]);

  // Configure unsaved confirmation callback on navigationService
  useEffect(() => {
    navigationService.setUnsavedConfirmCallback((guard, proceed, cancel) => {
      setActiveUnsavedGuard(guard);
      setIsUnsavedModalOpen(true);
      setPendingAction(() => proceed);
    });
  }, []);

  // Main Navigate Function
  const navigate = useCallback(
    (
      tab: string,
      options?: {
        subView?: string;
        params?: Record<string, any>;
        titleEn?: string;
        titleAm?: string;
        replace?: boolean;
      }
    ) => {
      // Role-based protection check
      if (!hasAccess(tab)) {
        console.warn(`[Navigation] Role ${currentUserRole} unauthorized for tab '${tab}'`);
        return;
      }

      const proceed = () => {
        const newLoc = navigationService.pushLocation(tab, options);
        setCurrentLocation(newLoc);
        setHistoryStack(navigationService.getHistory());
        setActiveTab(tab);

        // Push state into browser history for Android Back gesture and Browser Back button
        if (typeof window !== "undefined" && window.history) {
          try {
            window.history.pushState(
              { tab, subView: options?.subView, navId: newLoc.id },
              "",
              `#${tab}${options?.subView ? `/${options.subView}` : ""}`
            );
          } catch (e) {
            // ignore sandboxed iframe history errors
          }
        }
      };

      navigationService.checkUnsavedBeforeProceeding(proceed);
    },
    [hasAccess, currentUserRole, setActiveTab]
  );

  // Main GoBack Function
  const goBack = useCallback(() => {
    // 1. First give nested sub-views & modals priority to handle back action
    if (navigationService.hasActiveSubViewHandler()) {
      const handled = navigationService.executeSubViewBack();
      if (handled) {
        return;
      }
    }

    const proceed = () => {
      // 2. Pop from navigation history
      const prev = navigationService.popLocation();
      if (prev) {
        // Verify role access for previous screen
        if (hasAccess(prev.tab)) {
          setCurrentLocation(prev);
          setHistoryStack(navigationService.getHistory());
          setActiveTab(prev.tab);
        } else {
          // If unauthorized (e.g. role changed), find nearest authorized ancestor
          let target: NavLocation | null = null;
          while (navigationService.getHistory().length > 1) {
            const candidate = navigationService.popLocation();
            if (candidate && hasAccess(candidate.tab)) {
              target = candidate;
              break;
            }
          }
          if (target) {
            setCurrentLocation(target);
            setHistoryStack(navigationService.getHistory());
            setActiveTab(target.tab);
          } else {
            // Fallback to dashboard
            navigationService.clearToRoot();
            const root = navigationService.getCurrentLocation();
            setCurrentLocation(root);
            setHistoryStack(navigationService.getHistory());
            setActiveTab("dashboard");
          }
        }
      } else {
        // If stack is at root, stay on dashboard or default
        if (currentLocation.tab !== "dashboard") {
          navigationService.clearToRoot();
          const root = navigationService.getCurrentLocation();
          setCurrentLocation(root);
          setHistoryStack(navigationService.getHistory());
          setActiveTab("dashboard");
        }
      }
    };

    navigationService.checkUnsavedBeforeProceeding(proceed);
  }, [hasAccess, currentLocation, setActiveTab]);

  // Support for Android Hardware Back Button & Browser Back (popstate)
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Push initial history state so back button has an entry
    try {
      if (!window.history.state) {
        window.history.replaceState({ tab: activeTab, navId: "root" }, "", `#${activeTab}`);
      }
    } catch (e) {}

    const handlePopState = (event: PopStateEvent) => {
      // Prevent browser default exit and handle through our navigation stack
      if (navigationService.canGoBack()) {
        goBack();
      } else {
        // Already at root; ensure state remains at root
        if (activeTab !== "dashboard") {
          setActiveTab("dashboard");
        }
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [goBack, activeTab, setActiveTab]);

  // Unsaved Changes Modal Actions
  const confirmDiscardAndLeave = useCallback(() => {
    if (activeUnsavedGuard?.onDiscard) {
      activeUnsavedGuard.onDiscard();
    }
    setIsUnsavedModalOpen(false);
    setActiveUnsavedGuard(null);
    if (pendingAction) {
      const action = pendingAction;
      setPendingAction(null);
      action();
    }
  }, [activeUnsavedGuard, pendingAction]);

  const confirmSaveAndLeave = useCallback(async () => {
    if (activeUnsavedGuard?.onSave) {
      try {
        const saved = await activeUnsavedGuard.onSave();
        if (saved !== false) {
          setIsUnsavedModalOpen(false);
          setActiveUnsavedGuard(null);
          if (pendingAction) {
            const action = pendingAction;
            setPendingAction(null);
            action();
          }
          return;
        }
      } catch (err) {
        console.error("Failed to save before navigating:", err);
      }
    }
  }, [activeUnsavedGuard, pendingAction]);

  const cancelNavigation = useCallback(() => {
    setIsUnsavedModalOpen(false);
    setActiveUnsavedGuard(null);
    setPendingAction(null);
  }, []);

  const registerUnsavedGuard = useCallback((guard: UnsavedChangesGuard) => {
    return navigationService.registerUnsavedGuard(guard);
  }, []);

  const registerSubViewBack = useCallback((handler: SubViewBackHandler) => {
    return navigationService.registerSubViewBackHandler(handler);
  }, []);

  const canGoBack = useMemo(() => {
    return navigationService.canGoBack();
  }, [historyStack, currentLocation]);

  const previousLocation = useMemo(() => {
    return navigationService.getPreviousLocation();
  }, [historyStack]);

  const value = useMemo(
    () => ({
      currentTab: activeTab,
      currentLocation,
      historyStack,
      canGoBack,
      previousLocation,
      navigate,
      goBack,
      registerUnsavedGuard,
      registerSubViewBack,
      activeUnsavedGuard,
      confirmDiscardAndLeave,
      confirmSaveAndLeave,
      cancelNavigation,
      isUnsavedModalOpen
    }),
    [
      activeTab,
      currentLocation,
      historyStack,
      canGoBack,
      previousLocation,
      navigate,
      goBack,
      registerUnsavedGuard,
      registerSubViewBack,
      activeUnsavedGuard,
      confirmDiscardAndLeave,
      confirmSaveAndLeave,
      cancelNavigation,
      isUnsavedModalOpen
    ]
  );

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
};

export const useNavigation = (): NavigationContextValue => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error("useNavigation must be used within a NavigationProvider");
  }
  return context;
};
