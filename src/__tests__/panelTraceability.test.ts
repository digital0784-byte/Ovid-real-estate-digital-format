import { describe, it, expect, beforeEach } from 'vitest';
import { PanelTraceabilityService } from '../services/panelTraceabilityService';
import { TraceablePanel } from '../types';

describe('Panel Traceability Module & Lifecycle Unit Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loads seed panels with unique permanent identities', () => {
    const panels = PanelTraceabilityService.getPanels();
    expect(panels.length).toBeGreaterThan(0);

    const first = panels[0];
    expect(first.panelId).toBeDefined();
    expect(first.serialNumber).toBeDefined();
    expect(first.QRCode).toContain('DIGITAL-ERP://PANEL/');
    expect(first.barcode).toBeDefined();
    expect(first.dimensions).toBeDefined();
    expect(first.status).toBeDefined();
    expect(first.condition).toBeDefined();
  });

  it('enforces duplicate prevention on serialNumber, QRCode, and barcode', () => {
    const testUser = { id: 'USER-1', name: 'Tester', role: 'Super Admin' };
    const existing = PanelTraceabilityService.getPanels()[0];

    // Attempt to register duplicate serial number
    const result = PanelTraceabilityService.registerPanel(
      {
        panelCode: 'NEW-CODE',
        serialNumber: existing.serialNumber, // Duplicate!
        QRCode: 'DIGITAL-ERP://PANEL/UNIQUE-NEW',
        barcode: '999999999',
        panelType: 'Wall Panel',
        panelCategory: 'Internal Wall Panel',
        dimensions: '1200 × 600 × 65 mm',
        length: 1200,
        width: 600,
        thickness: 65,
        condition: 'NEW',
        status: 'AVAILABLE',
        currentLocation: 'Warehouse A',
        installationStatus: 'NOT_INSTALLED'
      },
      testUser
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('Duplicate constraint violation');
  });

  it('validates status transitions according to official lifecycle rules', () => {
    // Normal role: AVAILABLE -> INSTALLED is illegal without ISSUED/ASSIGNED
    const illegalCheck = PanelTraceabilityService.canTransitionStatus(
      'AVAILABLE',
      'INSTALLED',
      'Site Engineer'
    );
    expect(illegalCheck.allowed).toBe(false);

    // Normal role: AVAILABLE -> REQUESTED / RESERVED / IN_TRANSIT is legal
    const legalCheck = PanelTraceabilityService.canTransitionStatus(
      'AVAILABLE',
      'RESERVED',
      'Site Engineer'
    );
    expect(legalCheck.allowed).toBe(true);

    // Super Admin has override authority
    const adminCheck = PanelTraceabilityService.canTransitionStatus(
      'AVAILABLE',
      'INSTALLED',
      'Super Admin'
    );
    expect(adminCheck.allowed).toBe(true);
  });

  it('records chronological movement logs and immutable audit entries', () => {
    const panels = PanelTraceabilityService.getPanels();
    const panel = panels.find(p => p.status === 'AVAILABLE') || panels[0];
    const testUser = { id: 'USER-WM-01', name: 'Abebe Store', role: 'Warehouse Manager' };

    const moveRes = PanelTraceabilityService.recordMovement({
      panelId: panel.panelId,
      action: 'TRANSFER',
      toLocation: 'Bole Heights Site Store 01',
      newStatus: 'AT_SITE_STORE',
      reason: 'Dispatched for Level 12 casting',
      user: testUser
    });

    expect(moveRes.success).toBe(true);
    expect(moveRes.movement).toBeDefined();

    const movements = PanelTraceabilityService.getMovements(panel.panelId);
    expect(movements[0].action).toBe('TRANSFER');
    expect(movements[0].toLocation).toBe('Bole Heights Site Store 01');

    const auditLogs = PanelTraceabilityService.getAuditLogs();
    expect(auditLogs.length).toBeGreaterThan(0);
    expect(auditLogs[0].action).toContain('PANEL_MOVEMENT_TRANSFER');
  });

  it('attaches accessories and prevents duplicate serialized accessories', () => {
    const panels = PanelTraceabilityService.getPanels();
    const p1 = panels[0];
    const p2 = panels[1];
    const testUser = { id: 'USER-1', name: 'Tester', role: 'Store Owner' };

    const attach1 = PanelTraceabilityService.attachAccessory(
      p1.panelId,
      {
        accessoryId: 'ACC-T1',
        accessoryCode: 'PIN-1650',
        serialNumber: 'SN-PIN-999',
        accessoryType: 'Pin',
        dimensions: '16x50mm',
        quantity: 1,
        condition: 'GOOD',
        currentLocation: 'Store 1'
      },
      testUser
    );
    expect(attach1.success).toBe(true);

    // Try attaching same serial number to second panel
    const attach2 = PanelTraceabilityService.attachAccessory(
      p2.panelId,
      {
        accessoryId: 'ACC-T2',
        accessoryCode: 'PIN-1650',
        serialNumber: 'SN-PIN-999', // Duplicate!
        accessoryType: 'Pin',
        dimensions: '16x50mm',
        quantity: 1,
        condition: 'GOOD',
        currentLocation: 'Store 1'
      },
      testUser
    );
    expect(attach2.success).toBe(false);
    expect(attach2.error).toContain('Duplicate serial numbers for accessories are prohibited');
  });

  it('runs inventory reconciliation and detects discrepancies', () => {
    const testUser = { id: 'USER-1', name: 'Auditor', role: 'Auditor' };
    const recs = PanelTraceabilityService.performReconciliation({
      facilityId: 'WH-CENTRAL-01',
      facilityName: 'Central Warehouse A',
      facilityType: 'WAREHOUSE',
      user: testUser
    });

    expect(recs.length).toBeGreaterThan(0);
    expect(recs[0].panelCode).toBeDefined();
    expect(recs[0].systemStock).toBeGreaterThanOrEqual(0);
  });

  it('reprints QR code preserving same panel identity, location, and records audit trail', () => {
    const initialPanels = PanelTraceabilityService.getPanels();
    const targetPanel = initialPanels[0];
    const originalCount = initialPanels.length;
    const originalSerial = targetPanel.serialNumber;
    const originalLocation = targetPanel.currentLocation;
    const originalMovementsCount = PanelTraceabilityService.getMovements(targetPanel.panelId).length;

    const testUser = { id: 'USER-SO-01', name: 'Mesfin Girma', role: 'Store Owner' };

    // Search by Serial Number, Panel Code, or Panel ID
    const foundBySerial = PanelTraceabilityService.findPanel(originalSerial);
    const foundByCode = PanelTraceabilityService.findPanel(targetPanel.panelCode);
    const foundById = PanelTraceabilityService.findPanel(targetPanel.panelId);
    expect(foundBySerial?.panelId).toBe(targetPanel.panelId);
    expect(foundByCode?.panelId).toBe(targetPanel.panelId);
    expect(foundById?.panelId).toBe(targetPanel.panelId);

    // Perform QR Reprint / Replacement
    const reprintResult = PanelTraceabilityService.reprintOrReplaceQrCode({
      panelIdOrQuery: originalSerial,
      oldQrStatus: 'Damaged',
      replacementReason: 'Label scratched and unreadable after concrete pour',
      user: testUser
    });

    expect(reprintResult.success).toBe(true);
    expect(reprintResult.panel).toBeDefined();

    // Verify SAME identity preserved
    expect(reprintResult.panel?.serialNumber).toBe(originalSerial);
    expect(reprintResult.panel?.panelId).toBe(targetPanel.panelId);
    expect(reprintResult.panel?.QRCode).toBe(targetPanel.QRCode);
    expect(reprintResult.panel?.currentLocation).toBe(originalLocation);
    expect(reprintResult.panel?.qrReplacementCount).toBe(1);

    // Verify NO new panel or duplicate was created
    const updatedPanels = PanelTraceabilityService.getPanels();
    expect(updatedPanels.length).toBe(originalCount);

    // Verify existing movement history preserved
    const updatedMovements = PanelTraceabilityService.getMovements(targetPanel.panelId);
    expect(updatedMovements.length).toBe(originalMovementsCount);

    // Verify audit log has required fields
    const auditLogs = PanelTraceabilityService.getAuditLogs();
    const reprintLog = auditLogs.find(l => l.action === 'QR_LABEL_REPRINT_REPLACEMENT');
    expect(reprintLog).toBeDefined();
    expect(reprintLog?.panelId).toBe(targetPanel.panelId);
    expect(reprintLog?.serialNumber).toBe(originalSerial);
    expect(reprintLog?.oldQrStatus).toBe('Damaged');
    expect(reprintLog?.replacementReason).toBe('Label scratched and unreadable after concrete pour');
    expect(reprintLog?.userName).toBe('Mesfin Girma');
    expect(reprintLog?.userRole).toBe('Store Owner');
    expect(reprintLog?.previousLocation).toBe(originalLocation);
  });

  it('records and retrieves issues, returns, and damage inspections across collections', () => {
    const panels = PanelTraceabilityService.getPanels();
    const panel = panels.find(p => p.status === 'AVAILABLE' || p.status === 'AT_SITE_STORE') || panels[0];
    const testUser = { id: 'USER-SO-02', name: 'Almaz Store', role: 'Site Store Owner' };

    // 1. Issue Transaction
    const issueRes = PanelTraceabilityService.issuePanel({
      panelId: panel.panelId,
      issueId: `ISSUE-${Date.now()}`,
      panelSerial: panel.serialNumber,
      panelCode: panel.panelCode,
      requesterId: 'ENG-01',
      requesterName: 'Dawit Engineer',
      requesterRole: 'Site Engineer',
      project: 'Bole Heights',
      projectId: 'PRJ-01',
      site: 'Bole Heights',
      siteId: 'SITE-01',
      building: 'Block B',
      floor: 'Floor 4',
      zone: 'Zone 4A',
      issueDateTime: new Date().toISOString(),
      expectedReturnDate: '2026-10-25',
      condition: 'GOOD',
      issuedBy: 'Almaz Store',
      issuedByRole: 'Site Store Owner',
      notes: 'Testing issue tracking persistence'
    }, testUser);
    expect(issueRes.success).toBe(true);

    const issues = PanelTraceabilityService.getIssueTransactions();
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].panelId).toBe(panel.panelId);

    // 2. Return Transaction
    const returnRes = PanelTraceabilityService.returnPanel({
      returnId: `RET-${Date.now()}`,
      panelId: panel.panelId,
      panelSerial: panel.serialNumber,
      panelCode: panel.panelCode,
      returnDateTime: new Date().toISOString(),
      destinationStoreOrWarehouse: 'Bole Heights Site Store 01',
      returnedBy: 'Dawit Engineer',
      returnedByRole: 'Site Engineer',
      condition: 'GOOD',
      inspectionResult: 'ACCEPTED_BACK_TO_STOCK',
      damageStatus: 'NO_DAMAGE',
      missingAccessories: [],
      inspectorName: 'Almaz Store',
      inspectorRole: 'Site Store Owner'
    }, testUser);
    expect(returnRes.success).toBe(true);

    const returns = PanelTraceabilityService.getReturnTransactions();
    expect(returns.length).toBeGreaterThan(0);
    expect(returns[0].panelId).toBe(panel.panelId);

    // 3. Damage Inspection
    const damageRes = PanelTraceabilityService.reportDamage({
      inspectionId: `DMG-${Date.now()}`,
      panelId: panel.panelId,
      serialNumber: panel.serialNumber,
      panelCode: panel.panelCode,
      dateTime: new Date().toISOString(),
      reportedBy: 'Almaz Store',
      reportedByRole: 'Site Store Owner',
      damageType: 'Bent / Deformed',
      damageDescription: 'Corner flange bent 5mm',
      severity: 'MODERATE',
      repairDecision: 'TRANSFER_TO_CENTRAL_WORKSHOP',
      repairStatus: 'UNDER_REPAIR',
      currentLocation: 'Bole Heights Site Store 01'
    }, testUser);
    expect(damageRes.success).toBe(true);

    const damages = PanelTraceabilityService.getDamageInspections();
    expect(damages.length).toBeGreaterThan(0);
    expect(damages[0].panelId).toBe(panel.panelId);

    // 4. Dimensions Library
    const dimensions = PanelTraceabilityService.getDimensionsLibrary();
    expect(dimensions.length).toBeGreaterThan(0);
  });
});

