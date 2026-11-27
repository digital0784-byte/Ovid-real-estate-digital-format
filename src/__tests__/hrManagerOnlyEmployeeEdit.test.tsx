import React from "react";
import fs from "node:fs";
import path from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WorkerProfiles } from "../components/WorkerProfiles";
import { resolveHrmPermissions } from "../services/hrmService";
import { UserRole, Worker } from "../types";

const SAMPLE_WORKERS: Worker[] = [
  {
    id: "OVID-EMP-2026-0001",
    employeeId: "OVID-EMP-2026-0001",
    name: "Abebe Bikila",
    department: "Engineering",
    trade: "Site Engineer",
    position: "Site Engineer",
    company: "OVID Real Estate",
    phoneNumber: "+251911223344",
    joinedDate: "2025-01-10",
    status: "Active",
    teamId: "T-01",
  },
];

const NON_HR_MANAGER_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.HEAD_OFFICE,
  UserRole.DIRECTOR,
  UserRole.PROJECT_MANAGER,
  UserRole.HR,
  UserRole.FINANCE_MANAGER,
  UserRole.OPERATION_MANAGER,
  UserRole.OFFICE_MANAGER,
  UserRole.OFFICE_AND_TECHNICAL_ENGINEERING,
  UserRole.SECTION_HEAD,
  UserRole.SUPERVISOR,
  UserRole.TEAM_LEADER,
  UserRole.TIME_KEEPER,
  UserRole.SITE_ENGINEER,
  UserRole.WAREHOUSE_MANAGER,
  UserRole.AUDITOR,
  UserRole.EMPLOYEE,
  UserRole.WORKER,
];

describe("Company Policy: HR Manager ONLY Employee Information Editing", () => {
  it("grants employee profile editing and management permissions ONLY to UserRole.HR_MANAGER", () => {
    const hrMgrPerms = resolveHrmPermissions(UserRole.HR_MANAGER);
    expect(hrMgrPerms.canEditEmployeeProfiles).toBe(true);
    expect(hrMgrPerms.canManageEmployees).toBe(true);
    expect(hrMgrPerms.canRegisterApprovedEmployees).toBe(true);

    for (const role of NON_HR_MANAGER_ROLES) {
      const perms = resolveHrmPermissions(role);
      expect(perms.canEditEmployeeProfiles, `Expected ${role} canEditEmployeeProfiles=false`).toBe(false);
      expect(perms.canManageEmployees, `Expected ${role} canManageEmployees=false`).toBe(false);
      expect(perms.canRegisterApprovedEmployees, `Expected ${role} canRegisterApprovedEmployees=false`).toBe(false);
    }
  });

  it("allows HR Manager to edit worker details in WorkerProfiles UI", () => {
    const onUpdateWorker = vi.fn();
    render(
      <WorkerProfiles
        workers={SAMPLE_WORKERS}
        zones={[]}
        onAddWorker={vi.fn()}
        onUpdateWorker={onUpdateWorker}
        onDeleteWorker={vi.fn()}
        isAmharic={false}
        currentUserRole={UserRole.HR_MANAGER}
      />
    );

    expect(screen.getByText(/Write Permission Granted \(HR Manager\)/i)).toBeTruthy();
    expect(screen.getByText(/Add Worker Profile/i)).toBeTruthy();
    expect(screen.getByText(/Modify Credentials/i)).toBeTruthy();
    expect(screen.getByText(/Delete Worker/i)).toBeTruthy();

    fireEvent.click(screen.getByText(/Modify Credentials/i));
    const nameInput = screen.getByPlaceholderText("Worker Full Name") as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "Abebe Bikila Updated" } });
    fireEvent.click(screen.getByText(/Save Changes/i));

    expect(onUpdateWorker).toHaveBeenCalledTimes(1);
    expect(onUpdateWorker).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "OVID-EMP-2026-0001",
        name: "Abebe Bikila Updated",
      })
    );
  });

  it("blocks all non-HR-Manager roles in WorkerProfiles and renders the HR-Manager-only policy notice in Amharic and English", () => {
    for (const role of [
      UserRole.SUPER_ADMIN,
      UserRole.HEAD_OFFICE,
      UserRole.DIRECTOR,
      UserRole.PROJECT_MANAGER,
      UserRole.HR,
      UserRole.SECTION_HEAD,
      UserRole.SUPERVISOR,
      UserRole.TEAM_LEADER,
    ]) {
      const { unmount } = render(
        <WorkerProfiles
          workers={SAMPLE_WORKERS}
          zones={[]}
          onAddWorker={vi.fn()}
          onUpdateWorker={vi.fn()}
          onDeleteWorker={vi.fn()}
          isAmharic={true}
          currentUserRole={role}
        />
      );

      expect(screen.queryByText(/መገለጫውን አሻሽል/)).toBeNull();
      expect(screen.queryByText(/አዲስ ሰራተኛ መዝግብ/)).toBeNull();
      expect(screen.queryByText(/ሠራተኛውን ሰርዝ/)).toBeNull();
      expect(
        screen.getByText(/በድርጅቱ ሕግ መሠረት የሠራተኞችን መረጃ ማሻሻልና ማስተካከል የሚችለው HR manager ብቻ ነው።/)
      ).toBeTruthy();
      expect(screen.queryByText(/Super Admin/)).toBeNull();

      unmount();
    }
  });

  it("enforces HR-Manager-only writes in Firestore rules for employees, workers, transfers, and private profiles", () => {
    const rulesPath = path.resolve(process.cwd(), "firestore.rules");
    const rules = fs.readFileSync(rulesPath, "utf8");

    const employeesBlock = rules.match(/match \/employees\/\{employeeId\}\s*\{[\s\S]*?\n\s*\}/)?.[0] || "";
    expect(employeesBlock).toContain("isStrictHrManagerRole()");
    expect(employeesBlock).not.toContain("isSuperAdmin()");
    expect(employeesBlock).not.toContain("Head Office");

    const workersBlock = rules.match(/match \/workers\/\{workerId\}\s*\{[\s\S]*?\n\s*\}/)?.[0] || "";
    expect(workersBlock).toContain("isStrictHrManagerRole()");
    expect(workersBlock).not.toContain("isDirectorOrAdmin()");
    expect(workersBlock).not.toContain("Project Manager");
    expect(workersBlock).not.toContain("Section Head");

    const transfersBlock = rules.match(/match \/employeeTransfers\/\{transferId\}\s*\{[\s\S]*?\n\s*\}/)?.[0] || "";
    expect(transfersBlock).toContain("allow create, update, delete: if isStrictHrManagerRole() && mfaSafe();");

    const privateProfilesBlock = rules.match(/match \/hrmPrivateProfiles\/\{workerId\}\s*\{[\s\S]*?\n\s*\}/)?.[0] || "";
    expect(privateProfilesBlock).toContain("allow create, update, delete: if isStrictHrManagerRole() && mfaSafe();");
  });
});
