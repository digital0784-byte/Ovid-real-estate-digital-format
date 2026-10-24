import { describe, it, expect } from "vitest";
import { formatCurrency, formatNumber, safeToFixed, safeLowerCase, safeString, parseMoney } from "../utils/formatters";

describe("Data Formatting & Normalization Utilities", () => {
  describe("parseMoney", () => {
    it("should parse numeric values directly", () => {
      expect(parseMoney(18500000)).toBe(18500000);
      expect(parseMoney(0)).toBe(0);
    });

    it("should parse string currencies with formatting", () => {
      expect(parseMoney("ETB 18,500,000")).toBe(18500000);
      expect(parseMoney("240,000")).toBe(240000);
      expect(parseMoney("ETB 95,000")).toBe(95000);
    });

    it("should return null for missing or invalid values to prevent misrepresenting zero", () => {
      expect(parseMoney(undefined)).toBeNull();
      expect(parseMoney(null)).toBeNull();
      expect(parseMoney("")).toBeNull();
      expect(parseMoney("N/A")).toBeNull();
    });
  });

  describe("formatCurrency - Regression for poAmount", () => {
    it("should format valid poAmount properly", () => {
      expect(formatCurrency(18500000)).toBe("ETB 18,500,000");
      expect(formatCurrency(12000000)).toBe("ETB 12,000,000");
    });

    it("should not crash on undefined poAmount (Regression for Error 1)", () => {
      const record: { poAmount?: number } = {};
      // Calling formatCurrency on undefined record.poAmount
      expect(formatCurrency(record.poAmount)).toBe("ETB —");
    });

    it("should not crash on null or empty poAmount", () => {
      expect(formatCurrency(null)).toBe("ETB —");
      expect(formatCurrency("")).toBe("ETB —");
    });

    it("should preserve custom fallbacks when data is missing", () => {
      expect(formatCurrency(undefined, "ETB", "Pending Pricing")).toBe("Pending Pricing");
    });
  });

  describe("formatNumber", () => {
    it("should format numbers with commas", () => {
      expect(formatNumber(15000)).toBe("15,000");
      expect(formatNumber(0)).toBe("0");
    });

    it("should handle null and undefined safely", () => {
      expect(formatNumber(undefined)).toBe("—");
      expect(formatNumber(null)).toBe("—");
      expect(formatNumber(NaN)).toBe("—");
    });
  });

  describe("safeToFixed", () => {
    it("should format decimal precision correctly", () => {
      expect(safeToFixed(9.456, 2)).toBe("9.46");
      expect(safeToFixed(0, 2)).toBe("0.00");
    });

    it("should return fallback when value is undefined or null", () => {
      expect(safeToFixed(undefined, 2)).toBe("0.00");
      expect(safeToFixed(null, 2, "N/A")).toBe("N/A");
    });
  });

  describe("safeLowerCase - Regression for xe.name (Error 2)", () => {
    it("should lowercase strings properly", () => {
      expect(safeLowerCase("Abebe Kebede")).toBe("abebe kebede");
    });

    it("should not crash when object.name is undefined (Regression for Error 2)", () => {
      const worker: { name?: string } = {};
      expect(safeLowerCase(worker.name)).toBe("");
      expect(safeLowerCase(null)).toBe("");
      expect(safeLowerCase(undefined)).toBe("");
    });
  });

  describe("safeString", () => {
    it("should return string or fallback", () => {
      expect(safeString("Test Name")).toBe("Test Name");
      expect(safeString(undefined, "Unknown")).toBe("Unknown");
      expect(safeString(null, "Unnamed Worker")).toBe("Unnamed Worker");
    });
  });
});
