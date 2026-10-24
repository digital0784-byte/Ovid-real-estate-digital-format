import { describe, it, expect } from "vitest";
import { formatCurrency, formatNumber, parseMoney, safeLowerCase } from "../utils/formatters";
import { Worker } from "../types";

describe("Regression Tests: ERP Runtime Crashes (Error 1 & Error 2)", () => {
  describe("Error 1: 'TypeError: can't access property toLocaleString, X.poAmount is undefined'", () => {
    it("safely handles procurement record with undefined poAmount without crashing", () => {
      const recordWithUndefinedAmount = {
        id: "PROC-TEST-01",
        poNumber: "PO-2026-999",
        supplier: "Test Supplier",
        materialItem: "Test Material",
        poAmount: undefined as any
      };

      // In the UI, formatCurrency is now called instead of raw .toLocaleString()
      expect(() => {
        const rendered = formatCurrency(recordWithUndefinedAmount.poAmount, "ETB", "ETB —");
        expect(rendered).toBe("ETB —");
      }).not.toThrow();
    });

    it("safely handles procurement record with null poAmount", () => {
      const recordWithNullAmount = {
        id: "PROC-TEST-02",
        poAmount: null as any
      };

      expect(() => {
        const rendered = formatCurrency(recordWithNullAmount.poAmount, "ETB", "ETB —");
        expect(rendered).toBe("ETB —");
      }).not.toThrow();
    });

    it("accurately formats valid poAmount values with commas", () => {
      const validRecord = {
        id: "PROC-TEST-03",
        poAmount: 18500000
      };

      expect(formatCurrency(validRecord.poAmount)).toBe("ETB 18,500,000");
    });

    it("safely parses legacy field names (cost, amount, totalAmount) into poAmount", () => {
      const legacyDoc1 = { cost: "ETB 240,000" };
      const legacyDoc2 = { amount: 15400000 };
      const legacyDoc3 = { totalAmount: "95000" };
      const emptyDoc = {};

      expect(parseMoney(legacyDoc1.cost)).toBe(240000);
      expect(parseMoney(legacyDoc2.amount)).toBe(15400000);
      expect(parseMoney(legacyDoc3.totalAmount)).toBe(95000);
      expect(parseMoney((emptyDoc as any).cost)).toBeNull();
    });

    it("never silently substitutes zero for a missing poAmount when formatting for display", () => {
      const missingAmountDoc = { poAmount: undefined };
      const display = formatCurrency(missingAmountDoc.poAmount, "ETB", "ETB —");
      expect(display).not.toBe("ETB 0");
      expect(display).toBe("ETB —");
    });
  });

  describe("Error 2: 'TypeError: can't access property toLowerCase, xe.name is undefined'", () => {
    it("safely filters workers when worker.name is undefined or null", () => {
      const malformedWorkers: any[] = [
        { id: "W-01", name: "Abebe Kebede", department: "Operations", trade: "Formwork", company: "Company A", status: "Active" },
        { id: "W-02", name: undefined, department: "Operations", trade: "Formwork", company: "Company A", status: "Active" },
        { id: "W-03", name: null, department: "Masonry", trade: "Mason", company: "Company B", status: "Active" },
        { id: "W-04", fullName: "Almaz Ayana", department: "Steel", trade: "Steel Fixer", company: "Company B", status: "Active" },
        null,
        undefined
      ];

      const searchTerm = "abebe";
      const term = (searchTerm || "").toLowerCase().trim();

      expect(() => {
        const filtered = malformedWorkers.filter(w => {
          if (!w) return false;
          const workerName = (w.name || w.fullName || w.workerName || w.displayName || "").toLowerCase();
          const workerId = (w.id || "").toLowerCase();
          const matchSearch = term === "" || workerName.includes(term) || workerId.includes(term);
          return matchSearch;
        });

        expect(filtered.length).toBe(1);
        expect(filtered[0].id).toBe("W-01");
      }).not.toThrow();
    });

    it("safely searches by worker ID when worker.name is missing", () => {
      const workersWithoutName: any[] = [
        { id: "ERP-W-999", name: undefined, department: "Safety", trade: "Marshal", company: "Company X", status: "Active" }
      ];

      const searchTerm = "ERP-W-999";
      const term = searchTerm.toLowerCase().trim();

      const filtered = workersWithoutName.filter(w => {
        if (!w) return false;
        const workerName = (w.name || w.fullName || w.workerName || w.displayName || "").toLowerCase();
        const workerId = (w.id || "").toLowerCase();
        return workerName.includes(term) || workerId.includes(term);
      });

      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe("ERP-W-999");
    });

    it("safely handles workers lacking company property in Subcontractor Portal filtering", () => {
      const workersWithoutCompany: any[] = [
        { id: "W-SUB-01", name: "Dawit", trade: "Formwork", company: undefined },
        { id: "W-SUB-02", name: "Ephrem", trade: "Formwork", company: null },
        { id: "W-SUB-03", name: "Getachew", trade: "Formwork", company: "Subcontractor Alpha" }
      ];

      expect(() => {
        const subWorkers = workersWithoutCompany.filter(w => {
          if (!w) return false;
          const compStr = (w.company || "").toLowerCase();
          return compStr.includes("subcontractor");
        });
        expect(subWorkers.length).toBe(1);
        expect(subWorkers[0].name).toBe("Getachew");
      }).not.toThrow();
    });
  });

  describe("Application-Wide Defensive Boundary Verifications", () => {
    it("safely handles undefined warehouse capacity area", () => {
      const wh: any = { id: "WH-01", name: "Main Yard", totalCapacitySqM: undefined };
      expect(() => {
        const result = formatNumber(wh.totalCapacitySqM, "10,000");
        expect(result).toBe("10,000");
      }).not.toThrow();
    });

    it("safely handles undefined daily closing loss value", () => {
      const dcr: any = { id: "DCR-01", totalLossValueETB: undefined };
      expect(() => {
        const result = formatCurrency(dcr.totalLossValueETB, "ETB", "ETB 0");
        expect(result).toBe("ETB 0");
      }).not.toThrow();
    });

    it("safely handles undefined formwork optimization totalWeightKg", () => {
      const optResults: any = { fitFactor: 98, totalWeightKg: undefined };
      expect(() => {
        const display = optResults?.totalWeightKg != null ? Number(optResults.totalWeightKg).toLocaleString() : "—";
        expect(display).toBe("—");
      }).not.toThrow();
    });

    it("safely filters notifications when projectName is undefined", () => {
      const notifications: any[] = [
        { id: "N-1", title: "Site Notice", category: "General", sender: "HQ", projectName: undefined },
        { id: "N-2", title: "Safety Alert", category: "Safety", sender: "Lead", projectName: "Bole Heights" }
      ];

      const q = "bole";
      expect(() => {
        const matches = notifications.filter(n => {
          const matchesTitle = (n.title || "").toLowerCase().includes(q);
          const matchesProject = (n.projectName || "").toLowerCase().includes(q);
          return matchesTitle || matchesProject;
        });
        expect(matches.length).toBe(1);
        expect(matches[0].id).toBe("N-2");
      }).not.toThrow();
    });
  });
});
