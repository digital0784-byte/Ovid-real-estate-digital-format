import React, { useState, useRef, useEffect } from "react";
import { Sliders, Maximize2, AlertTriangle, CheckCircle, ArrowRightLeft } from "lucide-react";

interface CadComparisonSliderProps {
  isAmharic: boolean;
  revAFilename: string;
  revBFilename: string;
  revAUploader: string;
  revBUploader: string;
  revADate: string;
  revBDate: string;
  mode: "drawing_v_drawing" | "cad_v_photo";
  photoUrl?: string;
  cadPreviewUrl?: string;
}

export const CadComparisonSlider: React.FC<CadComparisonSliderProps> = ({
  isAmharic,
  revAFilename,
  revBFilename,
  revAUploader,
  revBUploader,
  revADate,
  revBDate,
  mode,
  photoUrl,
  cadPreviewUrl
}) => {
  const [sliderPos, setSliderPos] = useState<number>(50); // percentage 0 to 100
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Drag interaction handler
  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(percentage);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    handleMove(e.clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    if (e.touches[0]) {
      handleMove(e.touches[0].clientX);
    }
  };

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchend", handleMouseUp);
    return () => {
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchend", handleMouseUp);
    };
  }, []);

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 space-y-4" id="cad_comparison_slider">
      {mode === "drawing_v_drawing" ? (
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div>
            <span className="text-[9px] text-red-400 font-bold block uppercase font-mono">LEFT VIEW (REVISION A)</span>
            <p className="text-xs font-bold text-slate-300 truncate max-w-[200px]">{revAFilename}</p>
          </div>
          <ArrowRightLeft size={14} className="text-slate-500" />
          <div className="text-right">
            <span className="text-[9px] text-emerald-400 font-bold block uppercase font-mono">RIGHT VIEW (REVISION B)</span>
            <p className="text-xs font-bold text-slate-300 truncate max-w-[200px]">{revBFilename}</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div>
            <span className="text-[9px] text-blue-400 font-bold block uppercase font-mono">LEFT VIEW (BLUEPRINT TEMPLATE)</span>
            <p className="text-xs font-bold text-slate-300">CAD CAD Vector Layout</p>
          </div>
          <ArrowRightLeft size={14} className="text-slate-500" />
          <div className="text-right">
            <span className="text-[9px] text-yellow-400 font-bold block uppercase font-mono">RIGHT VIEW (SITE PROGRESS PHOTO)</span>
            <p className="text-xs font-bold text-slate-300">Daily Camera Reality Frame</p>
          </div>
        </div>
      )}

      {/* Slider Viewport */}
      <div 
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouchMove}
        className="relative aspect-video bg-slate-950 rounded-xl overflow-hidden select-none border border-slate-800 cursor-ew-resize"
      >
        {/* Underlay (Right side content - Revision B / Site Photo) */}
        <div className="absolute inset-0 w-full h-full">
          {mode === "drawing_v_drawing" ? (
            <div className="w-full h-full bg-slate-950 flex items-center justify-center relative p-8">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:16px_16px] opacity-40"></div>
              {/* Revision B Drawing Visual representation with green correct walls */}
              <div className="w-4/5 h-4/5 rounded-lg border border-slate-700 bg-slate-950 flex flex-col justify-between p-4 font-mono text-[9px] text-slate-400 relative">
                <span className="text-[8px] bg-emerald-950/80 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full absolute top-2 right-2 font-bold uppercase">REVISION B (CORRECTED)</span>
                <div>
                  <p className="text-slate-500 font-bold border-b border-slate-800 pb-1">AXIS A-D FRAMEWORK PLAN</p>
                  <p className="text-emerald-400 font-black mt-2">✓ AXIS D SEGMENT: INCLUDED & RE-STIFFENED</p>
                  <p className="text-slate-600 mt-0.5">Slab Formwork Panels: 184 units</p>
                  <p className="text-slate-600">Shoring Posts Layout: 60 jacks (Standard 1.2m intervals)</p>
                </div>
                <div className="bg-emerald-950/20 border border-emerald-900/60 p-2 rounded text-[8px] text-emerald-300">
                  ⚡ Revision comparison notes: Slab expansion gaps configured to 2.0mm. Plumbness deviations corrected.
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full h-full relative">
              <img 
                src={photoUrl || "https://images.unsplash.com/photo-1590069261209-f8e9b8642343?w=800&auto=format&fit=crop&q=60"} 
                alt="Reality captured progress" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-2 right-2 bg-yellow-950/95 text-yellow-400 border border-yellow-800/80 px-2 py-0.5 rounded text-[8px] font-bold">REALITY PHOTO FIELD VIEW</div>
            </div>
          )}
        </div>

        {/* Overlay (Left side content - Revision A / CAD Blueprint) */}
        <div 
          className="absolute inset-y-0 left-0 overflow-hidden"
          style={{ width: `${sliderPos}%` }}
        >
          <div className="absolute inset-0 w-[100vw] h-full" style={{ width: containerRef.current?.clientWidth || "500px" }}>
            {mode === "drawing_v_drawing" ? (
              <div className="w-full h-full bg-slate-950 flex items-center justify-center relative p-8">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:16px_16px] opacity-40"></div>
                {/* Revision A Drawing Visual representation with red missing/erroneous walls */}
                <div className="w-4/5 h-4/5 rounded-lg border border-red-900/80 bg-slate-950 flex flex-col justify-between p-4 font-mono text-[9px] text-slate-400 relative">
                  <span className="text-[8px] bg-red-950/80 text-red-400 border border-red-900 px-2 py-0.5 rounded-full absolute top-2 right-2 font-bold uppercase">REVISION A (OUTDATED)</span>
                  <div>
                    <p className="text-slate-500 font-bold border-b border-slate-800 pb-1">AXIS A-D FRAMEWORK PLAN</p>
                    <p className="text-red-500 font-black mt-2">✗ AXIS D SEGMENT: EXCLUDED (STRUCTURAL OFFSET ERROR)</p>
                    <p className="text-slate-600 mt-0.5">Slab Formwork Panels: 168 units</p>
                    <p className="text-slate-600">Shoring Posts Layout: 48 jacks</p>
                  </div>
                  <div className="bg-red-950/20 border border-red-900/60 p-2 rounded text-[8px] text-red-300">
                    ⚠ Warning: Missing critical alignment profiles. High pouring structural burst risk detected.
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full h-full relative bg-slate-950 flex items-center justify-center p-8">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:12px_12px] opacity-35"></div>
                {/* Render full CAD blueprint layout */}
                <div className="w-5/6 h-5/6 rounded-lg border border-dashed border-red-500/40 p-4 font-mono text-[9px] text-red-400/80 flex flex-col justify-between relative">
                  <span className="text-[8px] bg-red-950/90 text-red-400 border border-red-800 px-2 py-0.5 rounded-full absolute top-2 right-2 font-bold uppercase">CAD REFERENCE TEMPLATE</span>
                  <div>
                    <p className="text-red-400/70 border-b border-red-900/40 pb-1 font-bold">Digital Construction ERP STRUCTURAL CORE - AXIS C</p>
                    <p className="mt-2 text-slate-500">Slab Deck Boundaries: 12.4m x 16.0m</p>
                    <p className="text-slate-500">Panel Target: 100% Surface Coverage</p>
                  </div>
                  <div className="text-[7px] text-slate-500">
                    Coordinate datum calibrated with GPS beacon (9.0118° N, 38.7954° E)
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sliding Separator Line */}
        <div 
          className="absolute inset-y-0 w-1 bg-red-500 cursor-ew-resize flex items-center justify-center"
          style={{ left: `${sliderPos}%` }}
          onMouseDown={() => setIsDragging(true)}
          onTouchStart={() => setIsDragging(true)}
        >
          <div className="w-6 h-6 rounded-full bg-red-600 border border-white text-white flex items-center justify-center shadow-md select-none transform -translate-x-1/2">
            <Sliders size={10} className="animate-pulse" />
          </div>
        </div>
      </div>

      {/* Descriptive legend and log info */}
      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[10px] space-y-2">
        <p className="text-slate-400 leading-normal">
          {isAmharic 
            ? "እጅዎን ወይም ማውዝዎን መስመር ላይ በመጫን ወደ ግራና ቀኝ በማንሸራተት በስዕሎች መካከል ያለውን ልዩነት ማነጻጸር ይችላሉ።" 
            : "Drag the circular sliding button to review exact vector and alignment offsets."}
        </p>

        {mode === "drawing_v_drawing" ? (
          <div className="grid grid-cols-2 gap-4 border-t border-slate-800/80 pt-2 text-[9px] font-mono">
            <div className="text-red-400 border-r border-slate-800/80 pr-2">
              <span className="font-bold">REV A (Outdated):</span>
              <p>Uploaded: {revADate}</p>
              <p>Author: {revAUploader}</p>
            </div>
            <div className="text-emerald-400 pl-2">
              <span className="font-bold">REV B (Corrected):</span>
              <p>Uploaded: {revBDate}</p>
              <p>Author: {revBUploader}</p>
            </div>
          </div>
        ) : (
          <div className="flex justify-between items-center text-[9px] font-mono border-t border-slate-800/80 pt-2">
            <span className="text-slate-500">Overlay mismatch delta:</span>
            <span className="bg-amber-950 border border-amber-800 text-amber-400 px-1.5 py-0.5 rounded">12% offset detected on Axis-D wall segment</span>
          </div>
        )}
      </div>
    </div>
  );
};
