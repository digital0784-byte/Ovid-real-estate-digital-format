import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Trash2 } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught ERP Runtime Error:", error, errorInfo);
    (this as any).setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleClearAndReset = () => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.clear();
      }
    } catch (e) {
      console.warn("Error clearing localStorage:", e);
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-slate-900 border border-red-500/30 rounded-2xl p-6 shadow-2xl text-center space-y-4">
            <div className="inline-flex p-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl">
              <AlertTriangle size={36} />
            </div>
            
            <h1 className="text-lg font-bold text-white tracking-tight">
              የሲስተም አፕሊኬሽን ማስተካከያ (ERP Recovery)
            </h1>
            <p className="text-xs text-slate-400 font-mono leading-relaxed">
              An unexpected display issue occurred in the browser preview. You can safely restart the application or reset stored memory below.
            </p>

            {this.state.error && (
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-left text-[11px] font-mono text-red-400 overflow-x-auto max-h-32">
                {this.state.error.toString()}
              </div>
            )}

            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <button
                onClick={this.handleReload}
                className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-lg shadow-red-600/20"
              >
                <RefreshCw size={14} />
                <span>አፕሊኬሽኑን እንደገና ክፈት (Reload App)</span>
              </button>
              
              <button
                onClick={this.handleClearAndReset}
                className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                title="Clear local state and restart"
              >
                <Trash2 size={14} />
                <span>ማህደረ-ትውስታ አጽዳ (Reset Cache)</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}



