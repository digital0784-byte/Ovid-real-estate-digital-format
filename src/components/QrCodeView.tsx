import React, { useEffect, useState } from "react";
import QRCode from "qrcode";

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
 * High-performance, crisp QR code renderer that encodes real payload data into data URLs.
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
  const [dataUrl, setDataUrl] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setError(null);

    const textToEncode =
      typeof value === "object"
        ? JSON.stringify(value)
        : String(value || "");

    if (!textToEncode.trim()) {
      setDataUrl("");
      return;
    }

    QRCode.toDataURL(textToEncode, {
      width: Math.max(128, size * 2), // Render at higher resolution for razor-sharp physical printouts
      margin,
      color: {
        dark: darkColor,
        light: lightColor
      },
      errorCorrectionLevel: "M"
    })
      .then((url: string) => {
        if (isMounted) {
          setDataUrl(url);
        }
      })
      .catch((err: any) => {
        if (isMounted) {
          console.error("Failed to generate QR Code:", err);
          setError("QR Error");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [value, size, darkColor, lightColor, margin]);

  if (error) {
    return (
      <div
        className={`flex items-center justify-center bg-rose-50 text-rose-500 text-[10px] font-mono p-1 rounded border border-rose-200 ${className}`}
        style={{ width: size, height: size }}
      >
        {error}
      </div>
    );
  }

  if (!dataUrl) {
    return (
      <div
        className={`flex items-center justify-center bg-slate-100 rounded border border-slate-200 ${className}`}
        style={{ width: size, height: size }}
      >
        <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <img
      src={dataUrl}
      alt={alt}
      width={size}
      height={size}
      className={`block object-contain ${className}`}
    />
  );
};
