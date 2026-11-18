import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EmployeeBiometricMappingModule } from "../components/hrm/EmployeeBiometricMappingModule";
import { UserRole, Worker } from "../types";

vi.mock("../services/db", () => ({
  DbService: {
    subscribeBiometricDevices: (cb: any) => {
      cb([
        {
          id: "BIODEV-1",
          deviceCode: "DEV-01",
          deviceName: "Bole Gate G3 Pro",
          manufacturer: "ZKTeco",
          model: "G3 Pro",
          serialNumber: "ZKG3P-001",
          workLocationType: "Construction Site",
          projectId: "Bole Tower",
          projectName: "Bole Tower",
          deviceLocation: "Main Gate",
          status: "Active",
          createdBy: "Admin",
          createdByUid: "ADM-1",
          createdAt: "2026-07-01T00:00:00.000Z",
          updatedAt: "2026-07-01T00:00:00.000Z",
        },
      ]);
      return () => {};
    },
    subscribeBiometricDeviceMappings: (cb: any) => {
      cb([]);
      return () => {};
    },
    subscribeBiometricMappingAuditLogs: (cb: any) => {
      cb([]);
      return () => {};
    },
    subscribeUnmappedBiometricEvents: (cb: any) => {
      cb([]);
      return () => {};
    },
  },
}));

vi.mock("../services/biometricMappingService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/biometricMappingService")>();
  return {
    ...actual,
    fetchBiometricConnectorStatus: vi.fn().mockResolvedValue({
      success: true,
      hardwareConnected: false,
      sharedKeyConfigured: false,
      pendingQueueCount: 0,
      discardedTemplatePackets: 0,
      handshakenDevices: [],
    }),
  };
});

describe("EmployeeBiometricMappingModule UI Null-Safety & Auto-Fill Tests", () => {
  it("handles typing in employee search without crashing on partial workers and auto-fills Employee ID when selecting a registered employee", () => {
    const workersWithMissingFields = [
      { id: "W-PARTIAL-NO-NAME", status: "Active" } as unknown as Worker,
      {
        id: "W-101",
        employeeId: "OVID-EMP-2026-0101",
        name: "Mekdes Tadesse",
        company: "OVID Real Estate",
        department: "Engineering",
        trade: "Office Engineer",
        position: "Office Engineer",
        joinedDate: "2026-02-01",
        assignedProject: "Bole Tower",
        currentSite: "Bole Tower",
        status: "Active",
        teamId: "T-1",
      },
    ];

    render(
      <EmployeeBiometricMappingModule
        currentUserRole={UserRole.HR_MANAGER}
        currentUserProfile={{ uid: "HR-1", displayName: "HR Manager" }}
        workers={workersWithMissingFields}
        attendance={[]}
        workSchedules={[]}
        projectNames={["Bole Tower", "Head Office"]}
        onAddAttendance={vi.fn()}
        onLogAction={vi.fn()}
      />
    );

    // Open Add Biometric Mapping modal
    fireEvent.click(screen.getByRole("button", { name: /Add Biometric Mapping/i }));

    // Typing into Search Registered Employee must not crash even with partial worker missing `name`
    const searchInput = screen.getByPlaceholderText(/Search by Name or Employee ID/i);
    fireEvent.change(searchInput, { target: { value: "Mek" } });

    // Selecting registered employee automatically fills Employee ID, Name, Department, Position
    const selectEl = screen.getByDisplayValue("-- Select Registered Employee --");
    fireEvent.change(selectEl, { target: { value: "W-101" } });

    expect(screen.getByText("OVID-EMP-2026-0101")).toBeTruthy();
    expect(screen.getByText("Mekdes Tadesse")).toBeTruthy();
    expect(screen.getAllByText("Engineering").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Office Engineer")).toBeTruthy();
  });
});
