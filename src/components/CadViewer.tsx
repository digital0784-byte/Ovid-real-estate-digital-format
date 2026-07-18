import React, { useState, useEffect, useRef } from "react";
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Ruler, 
  Layers, 
  Maximize2,
  Info
} from "lucide-react";

interface CadViewerProps {
  filename: string;
  fileType: string;
  isAmharic: boolean;
  onLogAction?: (action: string, details: string) => void;
}

export const CadViewer: React.FC<CadViewerProps> = ({
  filename,
  fileType,
  isAmharic,
  onLogAction
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  // Viewer states
  const [zoom, setZoom] = useState<number>(1.0);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  
  // Layer visibility toggles
  const [layers, setLayers] = useState({
    grid: true,
    formwork: true,
    shoring: true,
    rebar: false,
    dimensions: true
  });
  
  // Measurement ruler states
  const [rulerActive, setRulerActive] = useState<boolean>(false);
  const [rulerPoints, setRulerPoints] = useState<{ x: number; y: number }[]>([]);
  const [rulerLength, setRulerLength] = useState<number | null>(null);

  // Resize canvas to fill container
  const [dimensions, setDimensions] = useState({ width: 600, height: 350 });

  useEffect(() => {
    if (!containerRef.current) return;
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: 350
        });
      }
    };
    
    updateDimensions();
    const observer = new ResizeObserver(updateDimensions);
    observer.observe(containerRef.current);
    
    return () => observer.disconnect();
  }, []);

  // Main canvas drawing logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear background (Dark theme slate-950 blueprint vibe)
    ctx.fillStyle = "#020617";
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);

    ctx.save();
    // Apply pan & zoom transform
    ctx.translate(dimensions.width / 2 + panOffset.x, dimensions.height / 2 + panOffset.y);
    ctx.scale(zoom, zoom);

    // 1. Draw Axis Grid (Blueprint style)
    if (layers.grid) {
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 0.5;
      const gridSize = 40;
      const gridExtent = 800;

      for (let x = -gridExtent; x <= gridExtent; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, -gridExtent);
        ctx.lineTo(x, gridExtent);
        ctx.stroke();

        // X Axis Rulers
        if (x % (gridSize * 2) === 0 && Math.abs(x) < 400) {
          ctx.fillStyle = "#475569";
          ctx.font = "8px monospace";
          ctx.fillText(`X:${(x / 10).toFixed(0)}m`, x + 2, 12);
        }
      }

      for (let y = -gridExtent; y <= gridExtent; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(-gridExtent, y);
        ctx.lineTo(gridExtent, y);
        ctx.stroke();

        // Y Axis Rulers
        if (y % (gridSize * 2) === 0 && Math.abs(y) < 250) {
          ctx.fillStyle = "#475569";
          ctx.font = "8px monospace";
          ctx.fillText(`Y:${(-y / 10).toFixed(0)}m`, 4, y - 2);
        }
      }

      // Origin center mark
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 2. Draw Shear Walls (Structural Core elements)
    ctx.fillStyle = "#1e293b";
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 2;

    const walls = [
      { x: -160, y: -80, w: 20, h: 160 }, // Left wall
      { x: 140, y: -80, w: 20, h: 160 },  // Right wall
      { x: -140, y: -80, w: 280, h: 15 }, // Top beam/wall
      { x: -140, y: 65, w: 280, h: 15 },  // Bottom beam/wall
      { x: -40, y: -30, w: 80, h: 40 }    // Center lift core wall
    ];

    walls.forEach(w => {
      ctx.fillStyle = "#111827";
      ctx.fillRect(w.x, w.y, w.w, w.h);
      ctx.strokeRect(w.x, w.y, w.w, w.h);

      // Hatching patterns inside walls
      ctx.strokeStyle = "#334155";
      ctx.lineWidth = 0.5;
      for (let i = w.x; i < w.x + w.w; i += 8) {
        ctx.beginPath();
        ctx.moveTo(i, w.y);
        ctx.lineTo(Math.min(i + w.h, w.x + w.w), w.y + Math.min(w.h, w.x + w.w - i));
        ctx.stroke();
      }
    });

    // 3. Draw Aluminum Formwork Panels Grid
    if (layers.formwork) {
      ctx.strokeStyle = "#ef4444"; // Red outline for aluminum panels
      ctx.lineWidth = 0.8;
      ctx.fillStyle = "rgba(239, 68, 68, 0.05)";

      // Draw grid matrix inside the slab perimeter
      for (let x = -130; x < 130; x += 30) {
        for (let y = -55; y < 55; y += 20) {
          // Avoid the center lift core wall area
          if (x >= -50 && x <= 30 && y >= -40 && y <= 20) continue;

          ctx.fillRect(x, y, 28, 18);
          ctx.strokeRect(x, y, 28, 18);

          // Panel labels
          ctx.fillStyle = "#ef4444";
          ctx.font = "5px monospace";
          ctx.fillText(`AL-${Math.abs(x)}`, x + 2, y + 11);
        }
      }
    }

    // 4. Draw Supporting Shoring Props
    if (layers.shoring) {
      ctx.fillStyle = "#3b82f6"; // Blue props
      ctx.strokeStyle = "rgba(59, 130, 246, 0.4)";
      
      const props = [
        { x: -120, y: -45 }, { x: -60, y: -45 }, { x: 60, y: -45 }, { x: 120, y: -45 },
        { x: -120, y: 15 }, { x: -60, y: 15 }, { x: 60, y: 15 }, { x: 120, y: 15 },
        { x: -120, y: 45 }, { x: -60, y: 45 }, { x: 60, y: 45 }, { x: 120, y: 45 }
      ];

      props.forEach(p => {
        // Concentric circles indicating structural range
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // 5. Draw Rebar Layer (Reinforcement Steel mesh)
    if (layers.rebar) {
      ctx.strokeStyle = "#10b981"; // Green reinforcement mesh
      ctx.lineWidth = 0.4;
      const step = 8;
      
      ctx.beginPath();
      for (let x = -135; x <= 135; x += step) {
        ctx.moveTo(x, -60);
        ctx.lineTo(x, 60);
      }
      for (let y = -60; y <= 60; y += step) {
        ctx.moveTo(-135, y);
        ctx.lineTo(135, y);
      }
      ctx.stroke();
    }

    // 6. Dimensions and Marks
    if (layers.dimensions) {
      ctx.strokeStyle = "#e2e8f0";
      ctx.fillStyle = "#e2e8f0";
      ctx.lineWidth = 0.8;
      ctx.font = "7px sans-serif";

      // Horizontal overall dimension
      ctx.beginPath();
      ctx.moveTo(-160, -95);
      ctx.lineTo(160, -95);
      // Tick marks
      ctx.moveTo(-160, -98); ctx.lineTo(-160, -92);
      ctx.moveTo(160, -98); ctx.lineTo(160, -92);
      ctx.stroke();
      ctx.fillText("Span: 32.00 m", -30, -100);

      // Vertical overall dimension
      ctx.beginPath();
      ctx.moveTo(-175, -80);
      ctx.lineTo(-175, 80);
      // Tick marks
      ctx.moveTo(-178, -80); ctx.lineTo(-172, -80);
      ctx.moveTo(-178, 80); ctx.lineTo(-172, 80);
      ctx.stroke();
      
      ctx.save();
      ctx.translate(-182, 15);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText("Width: 16.00 m", 0, 0);
      ctx.restore();
    }

    // 7. Interactive Ruler Drawing
    if (rulerPoints.length > 0) {
      ctx.strokeStyle = "#10b981";
      ctx.fillStyle = "#10b981";
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.arc(rulerPoints[0].x, rulerPoints[0].y, 3, 0, Math.PI * 2);
      ctx.fill();

      if (rulerPoints.length === 1) {
        // Draw path to active cursor
        ctx.beginPath();
        ctx.setLineDash([4, 3]);
        ctx.moveTo(rulerPoints[0].x, rulerPoints[0].y);
        ctx.lineTo(mousePos.x, mousePos.y);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (rulerPoints.length === 2) {
        ctx.beginPath();
        ctx.arc(rulerPoints[1].x, rulerPoints[1].y, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(rulerPoints[0].x, rulerPoints[0].y);
        ctx.lineTo(rulerPoints[1].x, rulerPoints[1].y);
        ctx.stroke();

        // Length text popup
        if (rulerLength !== null) {
          const midX = (rulerPoints[0].x + rulerPoints[1].x) / 2;
          const midY = (rulerPoints[0].y + rulerPoints[1].y) / 2;
          ctx.fillStyle = "#020617";
          ctx.strokeStyle = "#10b981";
          ctx.lineWidth = 1;
          
          const text = `${rulerLength.toFixed(2)} m`;
          ctx.fillRect(midX - 25, midY - 14, 50, 14);
          ctx.strokeRect(midX - 25, midY - 14, 50, 14);

          ctx.fillStyle = "#10b981";
          ctx.font = "bold 8px monospace";
          ctx.fillText(text, midX - 18, midY - 4);
        }
      }
    }

    ctx.restore();
  }, [zoom, panOffset, layers, rulerPoints, mousePos, rulerLength, dimensions]);

  // Translate screen client coordinates to canvas workspace coordinates
  const getCanvasCoords = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;

    // Inverse transform
    const workspaceX = (screenX - dimensions.width / 2 - panOffset.x) / zoom;
    const workspaceY = (screenY - dimensions.height / 2 - panOffset.y) / zoom;
    return { x: workspaceX, y: workspaceY };
  };

  // Drag-to-pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (rulerActive) return; // Ruler takes priority
    setIsPanning(true);
    setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const coords = getCanvasCoords(e.clientX, e.clientY);
    setMousePos(coords);

    if (isPanning) {
      setPanOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Ruler clicking handler
  const handleCanvasClick = (e: React.MouseEvent) => {
    if (!rulerActive) return;
    const coords = getCanvasCoords(e.clientX, e.clientY);

    if (rulerPoints.length === 0) {
      setRulerPoints([coords]);
      setRulerLength(null);
    } else if (rulerPoints.length === 1) {
      const p1 = rulerPoints[0];
      const p2 = coords;
      const dx = p1.x - p2.x;
      const dy = p1.y - p2.y;
      
      // Scale coordinates to simulate real-world metric dimensions
      const pixelDist = Math.sqrt(dx * dx + dy * dy);
      const scaledDist = pixelDist / 10; // 10 pixels = 1 meter simulation
      
      setRulerPoints([p1, p2]);
      setRulerLength(scaledDist);
      
      if (onLogAction) {
        onLogAction("CAD Measurement", `Measured distance: ${scaledDist.toFixed(2)}m on ${filename}`);
      }
    } else {
      // Reset and start over
      setRulerPoints([coords]);
      setRulerLength(null);
    }
  };

  // View control actions
  const handleReset = () => {
    setZoom(1.0);
    setPanOffset({ x: 0, y: 0 });
    setRulerPoints([]);
    setRulerLength(null);
  };

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden flex flex-col h-full" id="cad_interactive_viewer">
      {/* Top controls menu */}
      <div className="bg-slate-950 p-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
          <span className="text-[10px] font-mono text-slate-300 font-bold tracking-tight uppercase truncate max-w-[200px]">
            {filename}
          </span>
          <span className="bg-slate-800 text-[8px] font-mono font-bold text-red-400 px-1.5 py-0.5 rounded border border-slate-700">
            {fileType} ENGINE
          </span>
        </div>

        {/* View adjustment buttons */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setZoom(prev => Math.min(prev + 0.15, 4.0))}
            title="Zoom In"
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 cursor-pointer transition-colors"
          >
            <ZoomIn size={12} />
          </button>
          
          <button
            onClick={() => setZoom(prev => Math.max(prev - 0.15, 0.5))}
            title="Zoom Out"
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 cursor-pointer transition-colors"
          >
            <ZoomOut size={12} />
          </button>

          <button
            onClick={handleReset}
            title="Reset View"
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 cursor-pointer transition-colors"
          >
            <RotateCcw size={12} />
          </button>

          <span className="h-4 w-[1px] bg-slate-800 mx-1"></span>

          {/* Ruler Button */}
          <button
            onClick={() => {
              setRulerActive(!rulerActive);
              setRulerPoints([]);
              setRulerLength(null);
            }}
            className={`px-2 py-1 rounded-lg border text-[10px] font-black flex items-center space-x-1 cursor-pointer transition-all ${
              rulerActive 
                ? "bg-emerald-600 border-emerald-500 text-white shadow-sm" 
                : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
            }`}
          >
            <Ruler size={11} />
            <span>{isAmharic ? "መቆጣጠሪያ ሩለር" : "CAD Ruler"}</span>
          </button>
        </div>
      </div>

      {/* Canvas view stage */}
      <div 
        ref={containerRef}
        className="relative bg-slate-950 flex-1 min-h-[350px] overflow-hidden cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleCanvasClick}
      >
        <canvas 
          ref={canvasRef}
          width={dimensions.width}
          height={dimensions.height}
          className="block"
        />

        {/* Real-time coordinates floating HUD */}
        <div className="absolute bottom-3 right-3 bg-slate-950/95 border border-slate-800 p-2 rounded-lg font-mono text-[9px] text-slate-300 space-y-0.5 pointer-events-none shadow-lg">
          <p className="font-bold text-red-400">🌐 Digital Construction ERP CAD COORDINATE CORE</p>
          <div className="grid grid-cols-2 gap-x-2">
            <span>X: <strong className="text-white">{(mousePos.x / 10).toFixed(2)}m</strong></span>
            <span>Y: <strong className="text-white">{(-mousePos.y / 10).toFixed(2)}m</strong></span>
          </div>
          <p className="text-slate-500 text-[8px] border-t border-slate-800/80 pt-1 mt-1">
            {rulerActive ? "RULER ON: Click 2 points to scale" : "DRAG: Hold to pan viewport"}
          </p>
        </div>

        {/* Floating Layers Selector Overlay */}
        <div className="absolute top-3 left-3 bg-slate-950/90 border border-slate-800 p-2.5 rounded-xl shadow-lg space-y-2 pointer-events-auto">
          <div className="flex items-center space-x-1 text-slate-400 border-b border-slate-800 pb-1.5">
            <Layers size={10} className="text-red-500" />
            <span className="text-[9px] font-bold uppercase tracking-wider">{isAmharic ? "ንብርብሮች" : "CAD LAYERS"}</span>
          </div>

          <div className="space-y-1 text-[9px] font-medium text-slate-300">
            {[
              { id: "grid", label: isAmharic ? "የአክሲስ መስመሮች" : "Grid Axis Lines" },
              { id: "formwork", label: isAmharic ? "የፎርምወርክ ፓነሎች" : "Formwork Layout" },
              { id: "shoring", label: isAmharic ? "ድጋፍ ምሰሶዎች" : "Shoring Props" },
              { id: "rebar", label: isAmharic ? "የብረት ማጠናከሪያ" : "Rebar Mesh" }
            ].map(layer => (
              <label key={layer.id} className="flex items-center space-x-1.5 cursor-pointer hover:text-white transition-colors">
                <input 
                  type="checkbox" 
                  checked={(layers as any)[layer.id]}
                  onChange={() => setLayers(prev => ({ ...prev, [layer.id]: !(prev as any)[layer.id] }))}
                  className="rounded border-slate-800 text-red-500 focus:ring-0 w-2.5 h-2.5 bg-slate-900"
                />
                <span>{layer.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive alert details panel */}
      <div className="bg-slate-900/95 p-2.5 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
        <div className="flex items-center space-x-1.5">
          <Info size={12} className="text-indigo-400" />
          <span>
            {isAmharic 
              ? "የካድ ሩለርን በመጠቀም በስዕሉ ላይ ያለውን ርዝመት መለካት ይችላሉ። (10 ፒክስል = 1 ሜትር)" 
              : "Use 'CAD Ruler' to measure actual blueprint lengths. Coordinate offset calibrated."}
          </span>
        </div>
        {rulerLength !== null && (
          <span className="bg-emerald-950 border border-emerald-800/60 text-emerald-400 px-2 py-0.5 rounded-md font-mono font-bold">
            Measured: {rulerLength.toFixed(2)}m
          </span>
        )}
      </div>
    </div>
  );
};
