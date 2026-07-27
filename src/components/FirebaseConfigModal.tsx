import React, { useState } from "react";
import { Key, Database, Shield, Globe, Check, RefreshCw, X, Server, Copy, ExternalLink, HardDrive } from "lucide-react";
import { getFirebaseConfigDetails, saveCustomFirebaseConfig, resetFirebaseConfig } from "../firebase";

interface FirebaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAmharic?: boolean;
}

export const FirebaseConfigModal: React.FC<FirebaseConfigModalProps> = ({
  isOpen,
  onClose,
  isAmharic = true
}) => {
  const currentDetails = getFirebaseConfigDetails();

  const [apiKey, setApiKey] = useState(currentDetails.apiKey || "");
  const [authDomain, setAuthDomain] = useState(currentDetails.authDomain || "");
  const [projectId, setProjectId] = useState(currentDetails.projectId || "");
  const [storageBucket, setStorageBucket] = useState(currentDetails.storageBucket || "");
  const [messagingSenderId, setMessagingSenderId] = useState(currentDetails.messagingSenderId || "");
  const [appId, setAppId] = useState(currentDetails.appId || "");
  const [firestoreDatabaseId, setFirestoreDatabaseId] = useState(currentDetails.firestoreDatabaseId || "");

  const [copied, setCopied] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const currentHost = typeof window !== "undefined" ? window.location.host : "";
  const autoSuggestedAuthDomain = projectId ? `${projectId}.firebaseapp.com` : "";

  const handleCopyHost = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.hostname);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleAutoFillDomain = () => {
    if (autoSuggestedAuthDomain) {
      setAuthDomain(autoSuggestedAuthDomain);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(true);
    saveCustomFirebaseConfig({
      apiKey: apiKey.trim(),
      authDomain: authDomain.trim(),
      projectId: projectId.trim(),
      storageBucket: storageBucket.trim(),
      messagingSenderId: messagingSenderId.trim(),
      appId: appId.trim(),
      firestoreDatabaseId: firestoreDatabaseId.trim()
    });
  };

  const handleReset = () => {
    if (confirm(isAmharic ? "እርግጠኛ ነዎት ወደ ነባሪው የፋየርቤዝ ማዋቀሪያ መመለስ ይፈልጋሉ?" : "Reset Firebase config to auto-provisioned defaults?")) {
      resetFirebaseConfig();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden my-8">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
              <Key size={22} className="animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-black uppercase tracking-wider text-white">
                {isAmharic ? "የፋየርቤዝ ኤፒአይ ቁልፍ እና ደመና ማዋቀሪያ" : "Firebase API Keys & Credentials Setup"}
              </h3>
              <p className="text-xs text-slate-300 font-mono">
                {isAmharic ? "Firebase API Key, Domain, Project ID, Storage Bucket ማስገቢያ" : "Configure Custom Firebase Credentials & Authorized Domains"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Status Badge */}
        <div className="bg-slate-50 dark:bg-slate-950 px-6 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center space-x-2">
            <Server size={14} className={currentDetails.isFirebaseReady ? "text-emerald-500" : "text-amber-500"} />
            <span className="text-slate-600 dark:text-slate-400 font-bold">{isAmharic ? "የግንኙነት ሁኔታ:" : "Connection Status:"}</span>
            <span className={`font-bold px-2 py-0.5 rounded ${currentDetails.isFirebaseReady ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"}`}>
              {currentDetails.isFirebaseReady ? (isAmharic ? "በቀጥታ ተገናኝቷል (Ready)" : "Connected") : (isAmharic ? "ያልተሟላ / Local Mode" : "Pending Credentials")}
            </span>
          </div>
          {currentDetails.isCustom && (
            <span className="text-[10px] bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 px-2 py-0.5 rounded font-bold">
              {isAmharic ? "በተጠቃሚ የተገባ ቁልፍ" : "Custom User Config"}
            </span>
          )}
        </div>

        {/* Body Form */}
        <form onSubmit={handleSave} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          
          {/* Domain Authorization Info Box */}
          <div className="p-4 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 rounded-xl space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                <Globe size={15} className="text-indigo-600 dark:text-indigo-400" />
                {isAmharic ? "የአሁኑ መተግበሪያ ጎራ (Current Domain):" : "Authorized Domain Notice:"}
              </span>
              <button
                type="button"
                onClick={handleCopyHost}
                className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[11px] font-bold flex items-center space-x-1 transition-all cursor-pointer"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                <span>{copied ? (isAmharic ? "ተኮፒ አድርጓል!" : "Copied!") : (isAmharic ? "ጎራውን ኮፒ አድርግ" : "Copy Domain")}</span>
              </button>
            </div>
            <p className="font-mono bg-white dark:bg-slate-900 p-2 rounded border border-indigo-200 dark:border-indigo-900 text-indigo-950 dark:text-indigo-300 break-all select-all font-bold">
              {currentHost}
            </p>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              {isAmharic
                ? "💡 በስልክ ማረጋገጫ (Phone Auth) ጊዜ 'auth/invalid-app-credential' ስህተት ካጋጠመዎት በላይ ያለውን ጎራ ኮፒ አድርገው በ Firebase Console -> Authentication -> Settings -> Authorized domains ውስጥ ያክሉት።"
                : "💡 If Phone Auth throws 'auth/invalid-app-credential', copy the domain above and add it under Firebase Console > Authentication > Settings > Authorized domains."}
            </p>
          </div>

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            
            {/* API Key */}
            <div className="md:col-span-2 space-y-1">
              <label className="block font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>1. Firebase API Key (VITE_FIREBASE_API_KEY)</span>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-normal">* {isAmharic ? "አስፈላጊ" : "Required"}</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIzaSyD..."
                  required
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <Key size={15} className="absolute left-3 top-2.5 text-slate-400" />
              </div>
            </div>

            {/* Auth Domain */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block font-bold text-slate-700 dark:text-slate-300">
                  2. Auth Domain (authDomain)
                </label>
                {projectId && (
                  <button
                    type="button"
                    onClick={handleAutoFillDomain}
                    className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                  >
                    {isAmharic ? "በራስ-ሰር ሙላ" : "Auto fill"}
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={authDomain}
                  onChange={(e) => setAuthDomain(e.target.value)}
                  placeholder="your-project.firebaseapp.com"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <Globe size={15} className="absolute left-3 top-2.5 text-slate-400" />
              </div>
            </div>

            {/* Project ID */}
            <div className="space-y-1">
              <label className="block font-bold text-slate-700 dark:text-slate-300">
                3. Project ID (projectId)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  placeholder="your-project-id"
                  required
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <Database size={15} className="absolute left-3 top-2.5 text-slate-400" />
              </div>
            </div>

            {/* Storage Bucket */}
            <div className="space-y-1">
              <label className="block font-bold text-slate-700 dark:text-slate-300">
                4. Storage Bucket (storageBucket)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={storageBucket}
                  onChange={(e) => setStorageBucket(e.target.value)}
                  placeholder="your-project.appspot.com"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <HardDrive size={15} className="absolute left-3 top-2.5 text-slate-400" />
              </div>
            </div>

            {/* Messaging Sender ID */}
            <div className="space-y-1">
              <label className="block font-bold text-slate-700 dark:text-slate-300">
                5. Messaging Sender ID (messagingSenderId)
              </label>
              <input
                type="text"
                value={messagingSenderId}
                onChange={(e) => setMessagingSenderId(e.target.value)}
                placeholder="123456789012"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* App ID */}
            <div className="space-y-1">
              <label className="block font-bold text-slate-700 dark:text-slate-300">
                6. App ID (appId)
              </label>
              <input
                type="text"
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                placeholder="1:123456789012:web:abc123def456"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Firestore Database ID */}
            <div className="space-y-1">
              <label className="block font-bold text-slate-700 dark:text-slate-300">
                7. Firestore Database ID (firestoreDatabaseId)
              </label>
              <input
                type="text"
                value={firestoreDatabaseId}
                onChange={(e) => setFirestoreDatabaseId(e.target.value)}
                placeholder="(default) or custom database ID"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="w-full sm:w-auto px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <RefreshCw size={14} />
              <span>{isAmharic ? "ወደ ነባሪ መልስ (Reset Defaults)" : "Reset Defaults"}</span>
            </button>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="w-1/2 sm:w-auto px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                {isAmharic ? "ዝጋ" : "Cancel"}
              </button>
              <button
                type="submit"
                className="w-1/2 sm:w-auto px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center space-x-1.5 shadow-md cursor-pointer"
              >
                <Check size={15} />
                <span>{isAmharic ? "ያስቀምጡ እና ሰርቨሩን ያድሱ" : "Save & Reload"}</span>
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
};
