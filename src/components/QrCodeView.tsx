import React from "react";
import { QRCodeSVG } from "qrcode.react";

export interface QrCodeViewProps {
  value: string | object;
  size?: number;
  className?: string;
  darkColor?: string;
  lightColor?: string;
  margin?: number;
  alt?: string;
}

/**
 * High-performance, crisp QR code renderer powered by qrcode.react (QRCodeSVG).
 * Renders pure SVG vectors for instantaneous display and razor-sharp printouts.
 */
export const QrCodeView: React.FC<QrCodeViewProps> = ({
  value,
  size = 128,
  className = "",
  darkColor = "#000000",
  lightColor = "#ffffff",
  margin = 1,
  alt = "QR Code"
}) => {
  const textToEncode =
    typeof value === "object"
      ? JSON.stringify(value)
      : String(value || "");

  if (!textToEncode.trim()) {
    return (
      <div
        className={`flex items-center justify-center bg-slate-100 rounded border border-slate-200 text-[10px] text-slate-400 font-mono ${className}`}
        style={{ width: size, height: size }}
      >
        No Data
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      title={alt}
    >
      <QRCodeSVG
        value={textToEncode}
        size={size}
        fgColor={darkColor}
        bgColor={lightColor}
        level="M"
        includeMargin={margin > 0}
        title={alt}
      />
    </div>
  );
};

