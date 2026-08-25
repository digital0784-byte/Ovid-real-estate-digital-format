import React, { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { X, Camera, AlertCircle, RefreshCw, CheckCircle2, Scan, Flashlight } from "lucide-react";

export interface ScannedQrPayload {
  raw: string;
  type?: "material" | "panel" | string;
  id?: string;
  name?: string;
  unit?: string;
  panelType?: string;
  zone?: string;
  category?: string;
  dimensions?: string;
  serialNumber?: string;
  [key: string]: any;
}

export interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (payload: ScannedQrPayload) => void;
  title?: string;
  description?: string;
  expectedType?: "material" | "panel" | "any";
  isAmharic?: boolean;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  title,
  description,
  expectedType = "any",
  isAmharic = false,
}) => {
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [scannedResult, setScannedResult] = useState<ScannedQrPayload | null>(null);
  const [availableCameras, setAvailableCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [supportsTorch, setSupportsTorch] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerElementId = "real-qr-camera-stream-viewport";

  // Stop scanner helper
  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (err) {
        console.warn("Scanner stop/clear warning:", err);
      } finally {
        scannerRef.current = null;
      }
    }
  }, []);

  // Parse decoded payload
  const handleDecodedString = useCallback((decodedText: string) => {
    let payload: ScannedQrPayload = { raw: decodedText };
    try {
      const parsed = JSON.parse(decodedText);
      if (parsed && typeof parsed === "object") {
        payload = { ...payload, ...parsed };
      }
    } catch {
      // Fallback: If it's a plain string like "AL-PNL-1200" or "PW-1650"
      payload.id = decodedText.trim();
    }

    setScannedResult(payload);

    // Stop scanning and trigger success callback after a brief visual confirmation
    stopScanner();
    setTimeout(() => {
      onScanSuccess(payload);
      onClose();
    }, 450);
  }, [onScanSuccess, onClose, stopScanner]);

  // Start scanner
  const startScanner = useCallback(async (cameraIdOrConfig?: string | { facingMode: string }) => {
    setIsInitializing(true);
    setCameraError(null);
    setScannedResult(null);

    await stopScanner();

    // Ensure DOM element is present
    const el = document.getElementById(readerElementId);
    if (!el) {
      setIsInitializing(false);
      return;
    }

    try {
      const html5QrCode = new Html5Qrcode(readerElementId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.UPC_A
        ],
        verbose: false
      });
      scannerRef.current = html5QrCode;

      // Query available cameras
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          setAvailableCameras(devices.map(d => ({ id: d.id, label: d.label || `Camera ${d.id.substring(0, 5)}` })));
          if (!selectedCameraId) {
            setSelectedCameraId(devices[0].id);
          }
        }
      } catch (camErr) {
        console.info("Camera enumeration info:", camErr);
      }

      const cameraConfig = cameraIdOrConfig || (selectedCameraId ? { deviceId: { exact: selectedCameraId } } : { facingMode: "environment" });

      await html5QrCode.start(
        cameraConfig,
        {
          fps: 15,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const qrboxSize = Math.floor(minEdge * 0.75);
            return { width: Math.max(220, qrboxSize), height: Math.max(220, qrboxSize) };
          },
          aspectRatio: 1.0
        },
        (decodedText: string) => {
          handleDecodedString(decodedText);
        },
        (_errorMessage: string) => {
          // Frame-level non-match (normal during camera stream)
        }
      );

      // Check if torch/flashlight is supported
      try {
        const capabilities = (html5QrCode as any).getRunningTrackCapabilities?.();
        if (capabilities && capabilities.torch) {
          setSupportsTorch(true);
        }
      } catch {
        setSupportsTorch(false);
      }

      setIsInitializing(false);
    } catch (err: any) {
      console.error("Camera scanner initialization error:", err);
      setIsInitializing(false);

      const errName = err?.name || "";
      const errMsg = err?.message || String(err);

      if (errName === "NotAllowedError" || errMsg.includes("Permission") || errMsg.includes("denied")) {
        setCameraError(
          isAmharic
            ? "የካሜራ ፈቃድ ተከልክሏል። እባክዎን በብራውዘርዎ የካሜራ ፍቃድ ይስጡ እና እንደገና ይሞክሩ።"
            : "Camera permission was denied. Please allow camera access in your browser settings to scan QR codes."
        );
      } else if (errName === "NotFoundError" || errMsg.includes("No device") || errMsg.includes("not found")) {
        setCameraError(
          isAmharic
            ? "ምንም አይነት ካሜራ አልተገኘም። እባክዎን ካሜራ የተገጠመለት መሳሪያ ይጠቀሙ።"
            : "No camera device was found on this system. Please use a device equipped with a camera."
        );
      } else if (errName === "NotReadableError" || errMsg.includes("in use") || errMsg.includes("Could not start")) {
        setCameraError(
          isAmharic
            ? "ካሜራውን መክፈት አልተቻለም (ምናልባት በሌላ ፕሮግራም እየተጠቀመበት ነው)።"
            : "Camera is currently busy or in use by another application. Please close other camera apps and retry."
        );
      } else {
        setCameraError(
          isAmharic
            ? `የካሜራ ስህተት፡ ${errMsg || "ካሜራውን መክፈት አልተቻለም"}`
            : `Camera initialization error: ${errMsg || "Could not start camera stream."}`
        );
      }
    }
  }, [handleDecodedString, isAmharic, selectedCameraId, stopScanner]);

  // Toggle torch / flash
  const toggleTorch = async () => {
    if (!scannerRef.current || !supportsTorch) return;
    try {
      await (scannerRef.current as any).applyVideoConstraints?.({
        advanced: [{ torch: !isTorchOn }]
      });
      setIsTorchOn(!isTorchOn);
    } catch (err) {
      console.warn("Failed to toggle torch:", err);
    }
  };

  // Mount/Unmount effect
  useEffect(() => {
    if (isOpen) {
      // Small timeout to guarantee DOM rendering of reader div
      const timer = setTimeout(() => {
        startScanner();
      }, 100);
      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
    }
  }, [isOpen, startScanner, stopScanner]);

  if (!isOpen) return null;

  const defaultTitle =
    expectedType === "material"
      ? (isAmharic ? "የእቃ / አክሰሰሪ ኪውአር ስካነር" : "Scan Material / Accessory QR Code")
      : expectedType === "panel"
      ? (isAmharic ? "የአሉሚኒየም ፎርምወርክ ፓነል ኪውአር ስካነር" : "Scan Aluminum Formwork Panel QR")
      : (isAmharic ? "የኪውአር ኮድ ካሜራ ስካነር" : "Live Camera QR / Barcode Scanner");

  const defaultDesc =
    expectedType === "material"
      ? (isAmharic ? "የእቃውን ወይም የአክሰሰሪውን የኪውአር መለያ ኮድ ወደ ካሜራው ያቅርቡ" : "Point device camera at the material QR sticker label to auto-fill details")
      : expectedType === "panel"
      ? (isAmharic ? "የፎርምወርክ ፓነሉን የኪውአር መለያ ታግ ወደ ካሜራው ያቅርቡ" : "Point device camera at the physical panel QR label to pull up record")
      : (isAmharic ? "ኮዱን በማእዘኑ ውስጥ ያስገቡ" : "Align the QR code or barcode within the live scanning viewfinder");

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Scan size={18} className="animate-pulse" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs font-black uppercase text-white truncate tracking-wide">
                {title || defaultTitle}
              </h3>
              <p className="text-[10px] text-slate-400 truncate">
                {description || defaultDesc}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer shrink-0 ml-2"
          >
            <X size={16} />
          </button>
        </div>

        {/* Camera Viewport Body */}
        <div className="p-4 space-y-3 flex-1 overflow-y-auto">
          {/* Camera switcher / Controls row if multiple cameras */}
          {availableCameras.length > 1 && !cameraError && (
            <div className="flex items-center justify-between text-[11px] bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800">
              <span className="text-slate-400 flex items-center space-x-1">
                <Camera size={12} />
                <span>{isAmharic ? "ካሜራ ምረጥ:" : "Select Camera:"}</span>
              </span>
              <select
                value={selectedCameraId}
                onChange={e => {
                  setSelectedCameraId(e.target.value);
                  startScanner(e.target.value);
                }}
                className="bg-slate-900 text-slate-200 border border-slate-700 rounded-lg px-2 py-0.5 text-[11px] font-sans focus:outline-none"
              >
                {availableCameras.map(cam => (
                  <option key={cam.id} value={cam.id}>
                    {cam.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Live Scanner Container */}
          <div className="relative w-full aspect-square bg-slate-950 rounded-2xl overflow-hidden border-2 border-slate-800 shadow-inner flex flex-col items-center justify-center">
            {/* The element HTML5-QRCode mounts into */}
            <div
              id={readerElementId}
              className="w-full h-full object-cover [&>video]:w-full [&>video]:h-full [&>video]:object-cover"
            />

            {/* Viewfinder Reticle Overlay (Only when scanning and no error) */}
            {!cameraError && !scannedResult && !isInitializing && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                {/* 4 Corner brackets */}
                <div className="relative w-56 h-56 border-2 border-amber-400/40 rounded-2xl">
                  {/* Corner accents */}
                  <span className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-amber-400 rounded-tl-lg" />
                  <span className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-amber-400 rounded-tr-lg" />
                  <span className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-amber-400 rounded-bl-lg" />
                  <span className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-amber-400 rounded-br-lg" />

                  {/* Animated Laser Scanning Line */}
                  <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_10px_#f59e0b] animate-scanLaser" />
                </div>
              </div>
            )}

            {/* Initializing Spinner */}
            {isInitializing && !cameraError && (
              <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center space-y-3 z-10">
                <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-mono text-amber-400 font-bold">
                  {isAmharic ? "ካሜራ በመክፈት ላይ..." : "Initializing Real Camera Stream..."}
                </p>
                <p className="text-[10px] text-slate-500">
                  {isAmharic ? "እባክዎን ካሜራ ፍቃድ ይጠብቁ" : "Requesting device video access..."}
                </p>
              </div>
            )}

            {/* Successful Scan Feedback Flash */}
            {scannedResult && (
              <div className="absolute inset-0 bg-emerald-950/90 flex flex-col items-center justify-center space-y-2 z-20 animate-scaleUp p-4 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 size={28} />
                </div>
                <p className="text-xs font-black uppercase text-emerald-300">
                  {isAmharic ? "ኮዱ በተሳካ ሁኔታ ተቃኝቷል!" : "Code Decoded Successfully!"}
                </p>
                <p className="text-xs font-mono text-white font-bold bg-slate-900/90 px-3 py-1 rounded-lg border border-emerald-500/40">
                  {scannedResult.id || scannedResult.name || scannedResult.raw}
                </p>
              </div>
            )}

            {/* Camera Permission / Hardware Error Screen */}
            {cameraError && (
              <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-6 text-center space-y-3 z-20">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <AlertCircle size={24} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-rose-400 uppercase">
                    {isAmharic ? "የካሜራ ፍቃድ / የግንኙነት ስህተት" : "Camera Access Unavailable"}
                  </h4>
                  <p className="text-[11px] text-slate-300 leading-relaxed max-w-xs">
                    {cameraError}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => startScanner()}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer shadow-lg shadow-amber-600/20"
                >
                  <RefreshCw size={13} />
                  <span>{isAmharic ? "እንደገና ሞክር" : "Retry Camera Access"}</span>
                </button>
              </div>
            )}
          </div>

          {/* Status & Quick Action Bar */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
            <div className="flex items-center space-x-1.5 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{isAmharic ? "የቀጥታ ካሜራ ፍተሻ ንቁ ነው" : "Hardware Camera Active"}</span>
            </div>

            {supportsTorch && (
              <button
                type="button"
                onClick={toggleTorch}
                className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold flex items-center space-x-1 transition cursor-pointer ${
                  isTorchOn
                    ? "bg-amber-500 text-slate-950 border-amber-400"
                    : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                }`}
              >
                <Flashlight size={12} />
                <span>{isTorchOn ? "Flash ON" : "Flash OFF"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition cursor-pointer"
          >
            {isAmharic ? "ዝጋ" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
};
