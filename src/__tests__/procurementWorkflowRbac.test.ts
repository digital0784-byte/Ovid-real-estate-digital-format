import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { UserRole } from "../types";
import { createProcurementRouter, PROCUREMENT_COLLECTIONS } from "../server/procurementRouter";
import { InMemoryWarehouseStore } from "../server/warehouseStoreRouter";

function buildTestApp(store: InMemoryWarehouseStore) {
  const app = express();
  app.use(express.json());

  const { router } = createProcurementRouter({
    verifyAppCheck: (_req, _res, next) => next(),
    requireAuth: (req, res, next) => {
      const uid = req.header("x-test-uid");
      const role = req.header("x-test-role");
      const name = req.header("x-test-name") || role || "Test User";
      if (!uid || !role) {
        return res.status(401).json({ success: false, error: "unauthorized" });
      }
      (req as any).authUser = { uid, email: `${uid}@ovid.test` };
      (req as any).userProfile = { uid, role, displayName: name, status: "Active" };
      next();
    },
    requireActiveUser: (_req, _res, next) => next(),
    getProjectConfig: () => ({ projectId: "test-proj", databaseId: "(default)" }),
    store,
  });

  app.use(router);
  return app;
}

const OFFICER_HEADERS = {
  "x-test-uid": "uid-po-1",
  "x-test-role": UserRole.PROCUREMENT_OFFICER,
  "x-test-name": "Abebe Procurement",
};

const COMMITTEE_HEADERS = {
  "x-test-uid": "uid-ec-1",
  "x-test-role": UserRole.EVALUATION_COMMITTEE,
  "x-test-name": "Selamawit Chair",
};

const DIRECTOR_HEADERS = {
  "x-test-uid": "uid-dir-1",
  "x-test-role": UserRole.DIRECTOR,
  "x-test-name": "Dawit Director",
};

const FINANCE_HEADERS = {
  "x-test-uid": "uid-fin-1",
  "x-test-role": UserRole.FINANCE_MANAGER,
  "x-test-name": "Mulugeta Finance",
};

const HEAD_OFFICE_HEADERS = {
  "x-test-uid": "uid-ho-1",
  "x-test-role": UserRole.HEAD_OFFICE,
  "x-test-name": "Hanna HeadOffice",
};

const SUPER_ADMIN_HEADERS = {
  "x-test-uid": "uid-sa-1",
  "x-test-role": UserRole.SUPER_ADMIN,
  "x-test-name": "Admin User",
};

const VALID_PR_PAYLOAD = {
  title: "Deformed Rebar 16mm & Alignment Pins",
  projectId: "PRJ-BOLE-01",
  projectName: "OVID Bole Heights Tower A",
  requiredDeliveryDate: "2026-12-15",
  justification: "Critical structural slab pour requirement",
  submitImmediately: true,
  items: [
    {
      id: "ITEM-1",
      description: "Deformed Steel Rebar 16mm",
      quantity: 500,
      unit: "Bars",
      specification: "Grade 60 ASTM A615",
      estimatedUnitCostEtb: 1200,
    },
  ],
};

describe("Procurement Authority, Backend RBAC & End-to-End Workflow", () => {
  let store: InMemoryWarehouseStore;
  let app: express.Express;

  beforeEach(() => {
    store = new InMemoryWarehouseStore();
    app = buildTestApp(store);
  });

  it("executes the full 7-stage procurement workflow from PR Creation to Execution with audit logs and role-targeted notifications", async () => {
    // 1. Procurement Officer creates & submits PR
    const createRes = await request(app)
      .post("/api/procurement/requests")
      .set(OFFICER_HEADERS)
      .send(VALID_PR_PAYLOAD);

    expect(createRes.status).toBe(201);
    const pr = createRes.body.request;
    expect(pr.status).toBe("Submitted for Evaluation");
    expect(pr.estimatedTotalEtb).toBe(600000);

    // Notification emitted strictly to Evaluation Committee
    const notifsAfterSubmit = Array.from(store.collections.get(PROCUREMENT_COLLECTIONS.NOTIFICATIONS)?.values() || []);
    expect(notifsAfterSubmit.length).toBe(1);
    expect(notifsAfterSubmit[0]?.targetRoles).toEqual([UserRole.EVALUATION_COMMITTEE]);

    // 2. Evaluation Committee collects two supplier quotations
    const q1Res = await request(app)
      .post(`/api/procurement/requests/${pr.id}/quotations`)
      .set(COMMITTEE_HEADERS)
      .send({
        supplierName: "Abyssinia Steel PLC",
        supplierContact: "+251-911-000111",
        totalAmountEtb: 585000,
        deliveryLeadTimeDays: 5,
        paymentTerms: "30% Advance / 70% Delivery",
        technicalComplianceNotes: "Full ASTM A615 Mill Certificate",
        attachmentName: "Abyssinia_Quote.pdf",
        attachmentUrlOrRef: "DOC-Q-001",
      });
    expect(q1Res.status).toBe(201);
    expect(q1Res.body.request.status).toBe("Quotation Collection");

    const q2Res = await request(app)
      .post(`/api/procurement/requests/${pr.id}/quotations`)
      .set(COMMITTEE_HEADERS)
      .send({
        supplierName: "East Africa Metals",
        supplierContact: "+251-911-222333",
        totalAmountEtb: 615000,
        deliveryLeadTimeDays: 9,
        paymentTerms: "Net 30",
        technicalComplianceNotes: "Compliant",
        attachmentName: "EastAfrica_Quote.pdf",
        attachmentUrlOrRef: "DOC-Q-002",
      });
    expect(q2Res.status).toBe(201);
    expect(q2Res.body.request.quotationCount).toBe(2);

    // 3. Evaluation Committee evaluates quotations, documents committee members, scores, reasons & supporting docs, and recommends winner
    const evalRes = await request(app)
      .post(`/api/procurement/requests/${pr.id}/evaluate`)
      .set(COMMITTEE_HEADERS)
      .send({
        committeeMembers: [
          { name: "Selamawit T.", role: "Chair" },
          { name: "Kebede M.", role: "Senior Structural Engineer" },
          { name: "Tigist A.", role: "Cost Controller" },
        ],
        quotationScores: [
          {
            quotationId: q1Res.body.quotation.id,
            supplierName: "Abyssinia Steel PLC",
            technicalScore: 94,
            financialScore: 92,
            remarks: "Best technical compliance and lowest price",
          },
          {
            quotationId: q2Res.body.quotation.id,
            supplierName: "East Africa Metals",
            technicalScore: 84,
            financialScore: 78,
            remarks: "Higher cost and longer lead time",
          },
        ],
        recommendedQuotationId: q1Res.body.quotation.id,
        recommendationReasons: "Abyssinia Steel PLC scored 93.2/100 weighted and delivers in 5 days within budget.",
        evaluationReportSummary: "Unanimous committee award recommendation",
        supportingDocuments: [
          {
            id: "EDOC-1",
            name: "Committee_Evaluation_Report.pdf",
            category: "Evaluation Report",
            urlOrRef: "ARCH-EVAL-2026-01",
          },
        ],
      });

    expect(evalRes.status).toBe(201);
    expect(evalRes.body.request.status).toBe("Award Recommended");
    expect(evalRes.body.request.recommendedSupplierName).toBe("Abyssinia Steel PLC");

    // Notification sent to Director
    const notifsAfterEval = Array.from(store.collections.get(PROCUREMENT_COLLECTIONS.NOTIFICATIONS)?.values() || []);
    expect(notifsAfterEval.some((n) => n.targetRoles.includes(UserRole.DIRECTOR))).toBe(true);

    // Execution must still be blocked before Director budget + PO authorization
    const prematureExec = await request(app)
      .post(`/api/procurement/requests/${pr.id}/execute`)
      .set(OFFICER_HEADERS)
      .send({});
    expect(prematureExec.status).toBe(409);

    // 4. Director allocates & approves project procurement budget
    const budgetRes = await request(app)
      .post(`/api/procurement/requests/${pr.id}/director-budget`)
      .set(DIRECTOR_HEADERS)
      .send({
        decision: "Approved",
        allocatedBudgetEtb: 585000,
        budgetLine: "CAPEX-STRUCTURAL-BOLE",
        costCenter: "Bole Tower A",
        comments: "Approved against Q4 structural steel budget line.",
      });
    expect(budgetRes.status).toBe(200);
    expect(budgetRes.body.request.status).toBe("Budget Approved");
    expect(budgetRes.body.request.allocatedBudgetEtb).toBe(585000);

    // Execution must still be blocked before PO authorization
    const prePoExec = await request(app)
      .post(`/api/procurement/requests/${pr.id}/execute`)
      .set(OFFICER_HEADERS)
      .send({});
    expect(prePoExec.status).toBe(409);

    // 5. Director authorizes Contract / Purchase Order
    const poRes = await request(app)
      .post(`/api/procurement/requests/${pr.id}/authorize-po`)
      .set(DIRECTOR_HEADERS)
      .send({
        deliveryTerms: "Site delivery with GRV & mill certificate",
      });
    expect(poRes.status).toBe(201);
    expect(poRes.body.request.status).toBe("PO Authorized");
    expect(poRes.body.order.poNumber).toMatch(/^PO-/);

    // 6. Procurement Execution unlocked
    const execRes = await request(app)
      .post(`/api/procurement/requests/${pr.id}/execute`)
      .set(OFFICER_HEADERS)
      .send({
        executionReference: "EXEC-BOLE-001",
        executionNotes: "PO dispatched to Abyssinia Steel PLC for delivery",
      });
    expect(execRes.status).toBe(200);
    expect(execRes.body.request.status).toBe("Executed");
    expect(execRes.body.order.status).toBe("Executed");

    // 7. Complete immutable audit history exists across all stages
    const logs = Array.from(store.collections.get(PROCUREMENT_COLLECTIONS.AUDIT_LOGS)?.values() || []);
    expect(logs.map((l) => l.action)).toEqual(
      expect.arrayContaining([
        "PR_SUBMITTED",
        "QUOTATION_COLLECTED",
        "WINNER_RECOMMENDED",
        "BUDGET_APPROVED",
        "PO_AUTHORIZED",
        "PROCUREMENT_EXECUTED",
      ])
    );
  });

  it("strictly blocks Procurement Officer from collecting quotations, evaluating offers, selecting winners, or approving budget", async () => {
    const createRes = await request(app)
      .post("/api/procurement/requests")
      .set(OFFICER_HEADERS)
      .send(VALID_PR_PAYLOAD);
    const pr = createRes.body.request;

    const quoteAttempt = await request(app)
      .post(`/api/procurement/requests/${pr.id}/quotations`)
      .set(OFFICER_HEADERS)
      .send({
        supplierName: "Self Vendor",
        supplierContact: "0911000000",
        totalAmountEtb: 500000,
        attachmentName: "q.pdf",
        attachmentUrlOrRef: "ref",
      });
    expect(quoteAttempt.status).toBe(403);

    const evalAttempt = await request(app)
      .post(`/api/procurement/requests/${pr.id}/evaluate`)
      .set(OFFICER_HEADERS)
      .send({
        committeeMembers: [{ name: "Abebe", role: "Officer" }],
        recommendedQuotationId: "QT-1",
        recommendationReasons: "Self eval",
        supportingDocuments: [{ name: "doc", urlOrRef: "ref" }],
      });
    expect(evalAttempt.status).toBe(403);

    const budgetAttempt = await request(app)
      .post(`/api/procurement/requests/${pr.id}/director-budget`)
      .set(OFFICER_HEADERS)
      .send({ decision: "Approved", allocatedBudgetEtb: 500000 });
    expect(budgetAttempt.status).toBe(403);
  });

  it("enforces that ONLY the Director can authorize budget allocation and PO issuance", async () => {
    const pr = (
      await request(app).post("/api/procurement/requests").set(OFFICER_HEADERS).send(VALID_PR_PAYLOAD)
    ).body.request;

    const q = (
      await request(app)
        .post(`/api/procurement/requests/${pr.id}/quotations`)
        .set(COMMITTEE_HEADERS)
        .send({
          supplierName: "Ethio Supply",
          supplierContact: "0911123456",
          totalAmountEtb: 550000,
          attachmentName: "Quote.pdf",
          attachmentUrlOrRef: "Q-REF-1",
        })
    ).body.quotation;

    await request(app)
      .post(`/api/procurement/requests/${pr.id}/evaluate`)
      .set(COMMITTEE_HEADERS)
      .send({
        committeeMembers: [{ name: "Selam", role: "Chair" }],
        quotationScores: [{ quotationId: q.id, supplierName: q.supplierName, technicalScore: 90, financialScore: 90 }],
        recommendedQuotationId: q.id,
        recommendationReasons: "Lowest compliant offer",
        supportingDocuments: [{ id: "D1", name: "EvalReport.pdf", category: "Evaluation Report", urlOrRef: "R1" }],
      });

    // Finance Manager, Head Office, Evaluation Committee, Procurement Officer, and even Super Admin must get 403 for Director-only budget allocation
    for (const nonDirector of [FINANCE_HEADERS, HEAD_OFFICE_HEADERS, COMMITTEE_HEADERS, OFFICER_HEADERS, SUPER_ADMIN_HEADERS]) {
      const res = await request(app)
        .post(`/api/procurement/requests/${pr.id}/director-budget`)
        .set(nonDirector)
        .send({ decision: "Approved", allocatedBudgetEtb: 550000, budgetLine: "L1", costCenter: "C1" });
      expect(res.status).toBe(403);
    }

    // Director succeeds
    const dirRes = await request(app)
      .post(`/api/procurement/requests/${pr.id}/director-budget`)
      .set(DIRECTOR_HEADERS)
      .send({ decision: "Approved", allocatedBudgetEtb: 550000, budgetLine: "L1", costCenter: "C1" });
    expect(dirRes.status).toBe(200);

    // Non-Director cannot authorize PO
    const finPoRes = await request(app)
      .post(`/api/procurement/requests/${pr.id}/authorize-po`)
      .set(FINANCE_HEADERS)
      .send({});
    expect(finPoRes.status).toBe(403);
  });

  it("blocks Evaluation Committee from creating PRs or submitting undocumented evaluations", async () => {
    const committeePrAttempt = await request(app)
      .post("/api/procurement/requests")
      .set(COMMITTEE_HEADERS)
      .send(VALID_PR_PAYLOAD);
    expect(committeePrAttempt.status).toBe(403);

    const pr = (
      await request(app).post("/api/procurement/requests").set(OFFICER_HEADERS).send(VALID_PR_PAYLOAD)
    ).body.request;

    const q = (
      await request(app)
        .post(`/api/procurement/requests/${pr.id}/quotations`)
        .set(COMMITTEE_HEADERS)
        .send({
          supplierName: "Ethio Supply",
          supplierContact: "0911123456",
          totalAmountEtb: 550000,
          attachmentName: "Quote.pdf",
          attachmentUrlOrRef: "Q-REF-1",
        })
    ).body.quotation;

    // Missing committeeMembers / supportingDocuments / reasons -> 400
    const missingDocsEval = await request(app)
      .post(`/api/procurement/requests/${pr.id}/evaluate`)
      .set(COMMITTEE_HEADERS)
      .send({
        committeeMembers: [],
        quotationScores: [{ quotationId: q.id, supplierName: q.supplierName, technicalScore: 90, financialScore: 90 }],
        recommendedQuotationId: q.id,
        recommendationReasons: "",
        supportingDocuments: [],
      });
    expect(missingDocsEval.status).toBe(400);
  });

  it("enforces mandatory comments on rejection and supports Procurement Officer resubmission", async () => {
    const pr = (
      await request(app).post("/api/procurement/requests").set(OFFICER_HEADERS).send(VALID_PR_PAYLOAD)
    ).body.request;

    // Reject without comment -> 400
    const noCommentReject = await request(app)
      .post(`/api/procurement/requests/${pr.id}/reject`)
      .set(COMMITTEE_HEADERS)
      .send({ comment: "" });
    expect(noCommentReject.status).toBe(400);

    // Reject with valid comment -> Rejected
    const validReject = await request(app)
      .post(`/api/procurement/requests/${pr.id}/reject`)
      .set(COMMITTEE_HEADERS)
      .send({ comment: "Technical specification missing rebar tensile grade standard." });
    expect(validReject.status).toBe(200);
    expect(validReject.body.request.status).toBe("Rejected");

    // Resubmit without comment -> 400
    const noCommentResubmit = await request(app)
      .post(`/api/procurement/requests/${pr.id}/submit`)
      .set(OFFICER_HEADERS)
      .send({ comment: "" });
    expect(noCommentResubmit.status).toBe(400);

    // Resubmit with revision comment -> Submitted for Evaluation
    const validResubmit = await request(app)
      .post(`/api/procurement/requests/${pr.id}/submit`)
      .set(OFFICER_HEADERS)
      .send({ comment: "Updated specification to ASTM A615 Grade 60 with BOQ ref." });
    expect(validResubmit.status).toBe(200);
    expect(validResubmit.body.request.status).toBe("Submitted for Evaluation");
    expect(validResubmit.body.request.rejectionHistory.length).toBe(1);
    expect(validResubmit.body.request.rejectionHistory[0].resubmissionComment).toContain("ASTM A615");
  });
});
