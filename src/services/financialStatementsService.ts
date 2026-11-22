import * as XLSX from "xlsx";
import {
  ActualCostEntry,
  BankTransactionRecord,
  CashTransactionRecord,
  ChartAccountRecord,
  ChartAccountSubType,
  ChartAccountType,
  Expense,
  FinancialAccount,
  FinancialInvoiceRecord,
  FinancialPaymentRecord,
  FinancialPeriodCloseRecord,
  FinancialSettingsConfig,
  JournalEntryLine,
  JournalEntryRecord,
  Part7StatementTypeId,
  PayrollRecord,
  UserRole,
} from "../types";
import { DbService } from "./db";
import {
  DEFAULT_FINANCIAL_SETTINGS,
  NormalizedExpense,
  NormalizedInvoice,
  ResolvedDateRange,
  UserFinancePermissions,
  classifyAgingCategory,
  exportRowsToCsv,
  isConfirmedCashStatus,
  isReversedOrRejectedStatus,
  resolveDateRange,
  resolveUserFinancePermissions,
} from "./financeService";
import { parseMoney, safeString } from "../utils/formatters";

// ============================================================================
// PART 7 CONSTANTS & DEFAULT CHART OF ACCOUNTS
// ============================================================================

export const PART7_REPORTING_COMPANY_DEFAULT = "Digital Construction ERP System";

export const SYSTEM_CHART_OF_ACCOUNTS: ChartAccountRecord[] = [
  // Current Assets (1000-1499)
  {
    id: "COA-1010",
    accountCode: "1010",
    accountName: "Cash on Hand & Site Vaults",
    accountNameAm: "በእጅ እና በካዝና ያለ ጥሬ ገንዘብ",
    accountType: "Asset",
    subType: "Current Asset",
    normalBalance: "Debit",
    cashFlowSection: "Operating",
    isSystemAccount: true,
    isActive: true,
    openingBalance: 0,
    currency: "ETB",
    description: "Physical cash boxes and petty cash vaults across head office and project sites.",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "COA-1020",
    accountCode: "1020",
    accountName: "Cash in Commercial Banks",
    accountNameAm: "በንግድ ባንኮች ያለ ገንዘብ",
    accountType: "Asset",
    subType: "Current Asset",
    normalBalance: "Debit",
    cashFlowSection: "Operating",
    isSystemAccount: true,
    isActive: true,
    openingBalance: 0,
    currency: "ETB",
    description: "Checking, escrow, payroll, and project bank accounts.",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "COA-1110",
    accountCode: "1110",
    accountName: "Accounts Receivable — Clients & Certified Billing",
    accountNameAm: "ከደንበኞች የሚሰበሰብ ሂሳብ",
    accountType: "Asset",
    subType: "Current Asset",
    normalBalance: "Debit",
    cashFlowSection: "Operating",
    isSystemAccount: true,
    isActive: true,
    openingBalance: 0,
    currency: "ETB",
    description: "Verified client contract invoices and certified payment receivables.",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "COA-1120",
    accountCode: "1120",
    accountName: "Retention Money Receivable",
    accountNameAm: "የዋስትና ተቀናሽ ተሰብሳቢ",
    accountType: "Asset",
    subType: "Current Asset",
    normalBalance: "Debit",
    cashFlowSection: "Operating",
    isSystemAccount: true,
    isActive: true,
    openingBalance: 0,
    currency: "ETB",
    description: "Client retention receivable held pending defects liability release.",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "COA-1015",
    accountCode: "1015",
    accountName: "Petty Cash Funds (Head Office & Sites)",
    accountNameAm: "የጥቃቅን ወጪ ካዝና ገንዘብ",
    accountType: "Asset",
    subType: "Current Asset",
    normalBalance: "Debit",
    cashFlowSection: "Operating",
    isSystemAccount: true,
    isActive: true,
    openingBalance: 0,
    currency: "ETB",
    description: "Custodian imprest petty cash funds at Head Office and construction sites.",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "COA-1130",
    accountCode: "1130",
    accountName: "Employee Loans & Salary Advances Receivable",
    accountNameAm: "የሰራተኞች ብድር እና ቅድመ ክፍያ ተሰብሳቢ",
    accountType: "Asset",
    subType: "Current Asset",
    normalBalance: "Debit",
    cashFlowSection: "Operating",
    isSystemAccount: true,
    isActive: true,
    openingBalance: 0,
    currency: "ETB",
    description: "Recoverable staff salary advances and employee loan receivables.",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "COA-1140",
    accountCode: "1140",
    accountName: "Input VAT Recoverable",
    accountNameAm: "ተመላሽ የሚደረግ የተጨማሪ እሴት ታክስ (Input VAT)",
    accountType: "Asset",
    subType: "Current Asset",
    normalBalance: "Debit",
    cashFlowSection: "Operating",
    isSystemAccount: true,
    isActive: true,
    openingBalance: 0,
    currency: "ETB",
    description: "Creditable input Value Added Tax paid on approved supplier purchases.",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "COA-1210",
    accountCode: "1210",
    accountName: "Construction Materials Inventory",
    accountNameAm: "የግንባታ ቁሳቁስ ክምችት",
    accountType: "Asset",
    subType: "Current Asset",
    normalBalance: "Debit",
    cashFlowSection: "Operating",
    isSystemAccount: true,
    isActive: true,
    openingBalance: 0,
    currency: "ETB",
    description: "Warehouse and site store construction materials inventory.",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  // Non-Current Assets (1500-1999)
  {
    id: "COA-1510",
    accountCode: "1510",
    accountName: "Aluminum Formwork & Construction Equipment",
    accountNameAm: "የአሉሚኒየም ፎርምወርክ እና የግንባታ ማሽነሪዎች",
    accountType: "Asset",
    subType: "Non-Current Asset",
    normalBalance: "Debit",
    cashFlowSection: "Investing",
    isSystemAccount: true,
    isActive: true,
    openingBalance: 0,
    currency: "ETB",
    description: "Capitalized aluminum formwork systems, cranes, mixers, and plant.",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "COA-1520",
    accountCode: "1520",
    accountName: "Buildings & Civil Structures",
    accountNameAm: "ህንፃዎች እና የሲቪል መዋቅሮች",
    accountType: "Asset",
    subType: "Non-Current Asset",
    normalBalance: "Debit",
    cashFlowSection: "Investing",
    isSystemAccount: true,
    isActive: true,
    openingBalance: 0,
    currency: "ETB",
    description: "Company-owned buildings, yards, warehouses, and permanent facilities.",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "COA-1530",
    accountCode: "1530",
    accountName: "Vehicles & Heavy Transport Fleet",
    accountNameAm: "ተሽከርካሪዎች እና ከባድ ትራንስፖርት",
    accountType: "Asset",
    subType: "Non-Current Asset",
    normalBalance: "Debit",
    cashFlowSection: "Investing",
    isSystemAccount: true,
    isActive: true,
    openingBalance: 0,
    currency: "ETB",
    description: "Dump trucks, mixer trucks, site pickups, and logistics vehicles.",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "COA-1540",
    accountCode: "1540",
    accountName: "Office Furniture & IT Hardware",
    accountNameAm: "የቢሮ ዕቃዎች እና የአይቲ መሣሪያዎች",
    accountType: "Asset",
    subType: "Non-Current Asset",
    normalBalance: "Debit",
    cashFlowSection: "Investing",
    isSystemAccount: true,
    isActive: true,
    openingBalance: 0,
    currency: "ETB",
    description: "Office desks, survey instruments, computers, and engineering workstations.",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "COA-1590",
    accountCode: "1590",
    accountName: "Accumulated Depreciation — Equipment & Formwork",
    accountNameAm: "የተጠራቀመ የማሽነሪ እርጅና",
    accountType: "Asset",
    subType: "Non-Current Asset",
    normalBalance: "Credit",
    cashFlowSection: "Non-Cash",
    isSystemAccount: true,
    isActive: true,
    openingBalance: 0,
    currency: "ETB",
    description: "Contra-asset tracking cumulative depreciation on construction plant.",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "COA-1595",
    accountCode: "1595",
    accountName: "Accumulated Depreciation — Buildings, Vehicles & Furniture",
    accountNameAm: "የተጠራቀመ የህንፃ፣ የተሽከርካሪ እና የቢሮ ዕቃ እርጅና",
    accountType: "Asset",
    subType: "Non-Current Asset",
    normalBalance: "Credit",
    cashFlowSection: "Non-Cash",
    isSystemAccount: true,
    isActive: true,
    openingBalance: 0,
    currency: "ETB",
    description: "Contra-asset tracking cumulative depreciation on buildings, vehicles, and IT/furniture.",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  // Current Liabilities (2000-2499)
  {
    id: "COA-2010",
    accountCode: "2010",
    accountName: "Accounts Payable — Suppliers & Subcontractors",
    accountNameAm: "ለአቅራቢዎች እና ለንዑስ ተቋራጮች የሚከፈል",
    accountType: "Liability",
    subType: "Current Liability",
    normalBalance: "Credit",
    cashFlowSection: "Operating",
    isSystemAccount: true,
    isActive: true,
    openingBalance: 0,
    currency: "ETB",
    description: "Verified vendor invoices, subcontractor certificates, and equipment rentals payable.",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "COA-2020",
    accountCode: "2020",
    accountName: "Accrued Payroll & Employee Payables",
    accountNameAm: "የሰራተኞች ደሞዝ እና ጥቅማጥቅም ተከፋይ",
    accountType: "Liability",
    subType: "Current Liability",
    normalBalance: "Credit",
    cashFlowSection: "Operating",
    isSystemAccount: true,
    isActive: true,
    openingBalance: 0,
    currency: "ETB",
    description: "Approved site labor wages and permanent staff salaries awaiting disbursement.",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "COA-2030",
    accountCode: "2030",
    accountName: "Tax & Statutory Payables",
    accountNameAm: "የግብር እና የመንግስት ክፍያዎች",
    accountType: "Liability",
    subType: "Current Liability",
    normalBalance: "Credit",
    cashFlowSection: "Operating",
    isSystemAccount: true,
    isActive: true,
    openingBalance: 0,
    currency: "ETB",
    description: "VAT, withholding tax, customs duties, and payroll income tax obligations.",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "COA-2031",
    accountCode: "2031",
    accountName: "Output VAT Payable",
    accountNameAm: "የሚከፈል የተጨማሪ እሴት ታክስ (Output VAT)",
    accountType: "Liability",
    subType: "Current Liability",
    normalBalance: "Credit",
    cashFlowSection: "Operating",
    isSystemAccount: true,
    isActive: true,
    openingBalance: 0,
    currency: "ETB",
    description: "Output Value Added Tax collected on client construction invoices.",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "COA-2032",
    accountCode: "2032",
    accountName: "Withholding Tax Payable",
    accountNameAm: "ተቀናሽ የግብር ተከፋይ (Withholding Tax)",
    accountType: "Liability",
    subType: "Current Liability",
    normalBalance: "Credit",
    cashFlowSection: "Operating",
    isSystemAccount: true,
    isActive: true,
    openingBalance: 0,
    currency: "ETB",
    description: "2%–3% withholding tax retained from vendor and subcontractor payments.",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "COA-2033",
    accountCode: "2033",
    accountName: "Corporate Income Tax Payable",
    accountNameAm: "የድርጅት የገቢ ግብር ተከፋይ",
    accountType: "Liability",
    subType: "Current Liability",
    normalBalance: "Credit",
    cashFlowSection: "Operating",
    isSystemAccount: true,
    isActive: true,
    openingBalance: 0,
    currency: "ETB",
    description: "Corporate business profit tax accrual and periodic filing liability.",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "COA-2110",
    accountCode: "2110",
    accountName: "Short-Term Loans & Working Capital Credit",
    accountNameAm: "የአጭር ጊዜ ብድር እና የስራ ማስኬጃ ፋይናንሲንግ",
    accountType: "Liability",
    subType: "Current Liability",
    normalBalance: "Credit",
    cashFlowSection: "Financing",
    isSystemAccount: true,
    isActive: true,
    openingBalance: 0,
    currency: "ETB",
    description: "Revolving working capital lines and short-term bank credit facilities.",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  // Non-Current Liabilities (2500-2999)
  {
    id: "COA-2510",
    accountCode: "2510",
    accountName: "Long-Term Loans & Equipment Financing",
    accountNameAm: "የረጅም ጊዜ ብድር እና የማሽነሪ ፋይናንሲንግ",
    accountType: "Liability",
    subType: "Non-Current Liability",
    normalBalance: "Credit",
    cashFlowSection: "Financing",
    isSystemAccount: true,
    isActive: true,
    openingBalance: 0,
    currency: "ETB",
    description: "Bank term loans and long-term lease obligations.",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  // Equity (3000-3999)
  {
    id: "COA-3010",
    accountCode: "3010",
    accountName: "Owner's Paid-In Capital",
    accountNameAm: "የባለቤቶች ካፒታል",
    accountType: "Equity",
    subType: "Owner Capital",
    normalBalance: "Credit",
    cashFlowSection: "Financing",
    isSystemAccount: true,
    isActive: true,
    openingBalance: 0,
    currency: "ETB",
    description: "Shareholder paid-in capital and initial treasury opening balances.",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "COA-3110",
    accountCode: "3110",
    accountName: "Retained Earnings",
    accountNameAm: "የተጠራቀመ ትርፍ",
    accountType: "Equity",
    subType: "Retained Earnings",
    normalBalance: "Credit",
    cashFlowSection: "Non-Cash",
    isSystemAccount: true,
    isActive: true,
    openingBalance: 0,
    currency: "ETB",
    description: "Cumulative undistributed corporate net income across closed periods.",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "COA-3120",
    accountCode: "3120",
    accountName: "Asset Revaluation Reserve",
    accountNameAm: "የንብረት እንደገና ግምት መጠባበቂያ",
    accountType: "Equity",
    subType: "Retained Earnings",
    normalBalance: "Credit",
    cashFlowSection: "Non-Cash",
    isSystemAccount: true,
    isActive: true,
    openingBalance: 0,
    currency: "ETB",
    description: "Unrealized revaluation surplus on buildings, machinery, and fixed assets.",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "COA-3210",
    accountCode: "3210",
    accountName: "Owner Drawings & Dividends Declared",
    accountNameAm: "የባለቤቶች የትርፍ ክፍፍል",
    accountType: "Equity",
    subType: "Dividends / Drawings",
    normalBalance: "Debit",
    cashFlowSection: "Financing",
    isSystemAccount: true,
    isActive: true,
    openingBalance: 0,
    currency: "ETB",
    description: "Distributions of equity or dividends to owners.",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  // Revenue (4000-4999)
  {
    id: "COA-4010",
    accountCode: "4010",
    accountName: "Construction Contract & Project Revenue",
    accountNameAm: "የኮንስትራክሽን ውል እና ፕሮጀክት ገቢ",
    accountType: "Revenue",
    subType: "Project Revenue",
    normalBalance: "Credit",
    cashFlowSection: "Operating",
    isSystemAccount: true,
    isActive: true,
    openingBalance: 0,
    currency: "ETB",
    description: "Recognized revenue from approved client invoices and progress certificates.",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "COA-4110",
    accountCode: "4110",
    accountName: "Other Operating & Interest Income",
    accountNameAm: "ሌላ የስራ እና የወለድ ገቢ",
    accountType: "Revenue",
    subType: "Other Income",
    normalBalance: "Credit",
    cashFlowSection: "Operating",
    isSystemAccount: true,
    isActive: true,
    openingBalance: 0,
    currency: "ETB",
    description: "Bank interest income, scrap sales, and non-contract other income.",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "COA-4120",
    accountCode: "4120",
    accountName: "Gain on Disposal of Fixed Assets",
    accountNameAm: "ከቋሚ ንብረት ሽያጭ የተገኘ ትርፍ",
    accountType: "Revenue",
    subType: "Other Income",
    normalBalance: "Credit",
    cashFlowSection: "Non-Cash",
    isSystemAccount: true,
    isActive: true,
    openingBalance: 0,
    currency: "ETB",
    description: "Net gain realized when fixed asset disposal proceeds exceed net book value.",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  // Direct Construction Costs (5000-5999)
  {
    id: "COA-5010",
    accountCode: "5010",
    accountName: "Direct Materials & Procurement Cost",
    accountNameAm: "ቀጥተኛ የግንባታ ቁሳቁስ እና ግዢ ወጪ",
    accountType: "Cost of Construction",
    subType: "Direct Construction Cost",
    normalBalance: "Debit",
    cashFlowSection: "Operating",
    isSystemAccount: true,
    isActive: true,
    openingBalance: 0,
    currency: "ETB",
    description: "Cement, rebar, concrete, formwork consumables, and customs procurement costs.",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "COA-5020",
    accountCode: "5020",
    accountName: "Direct Site Labor & Payroll Cost",
    accountNameAm: "ቀጥተኛ የሳይት ሰራተኞች ደሞዝ ወጪ",
    accountType: "Cost of Construction",
    subType: "Direct Construction Cost",
    normalBalance: "Debit",
    cashFlowSection: "Operating",
    isSystemAccount: true,
    isActive: true,
    openingBalance: 0,
    currency: "ETB",
    description: "Approved direct site engineering, skilled trades, and daily labor payroll.",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "COA-5030",
    accountCode: "5030",
    accountName: "Direct Subcontractor & Consultant Cost",
    accountNameAm: "የንዑስ ተቋራጮች እና አማካሪዎች ወጪ",
    accountType: "Cost of Construction",
    subType: "Direct Construction Cost",
    normalBalance: "Debit",
    cashFlowSection: "Operating",
    isSystemAccount: true,
    isActive: true,
    openingBalance: 0,
    currency: "ETB",
    description: "MEP, finishing, structural subcontractors, and engineering consultants.",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "COA-5040",
    accountCode: "5040",
    accountName: "Direct Equipment, Formwork & Fuel Cost",
    accountNameAm: "የማሽነሪ፣ ፎርምወርክ እና ነዳጅ ወጪ",
    accountType: "Cost of Construction",
    subType: "Direct Construction Cost",
    normalBalance: "Debit",
    cashFlowSection: "Operating",
    isSystemAccount: true,
    isActive: true,
    openingBalance: 0,
    currency: "ETB",
    description: "Heavy machinery rental, diesel fuel, panel repair, and site transportation.",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  // Operating & Administrative Expenses (6000-6999)
  {
    id: "COA-6010",
    accountCode: "6010",
    accountName: "Operating Site Overhead & Utilities",
    accountNameAm: "የሳይት አጠቃላይ ወጪዎች እና መገልገያዎች",
    accountType: "Operating Expense",
    subType: "Operating Expense",
    normalBalance: "Debit",
    cashFlowSection: "Operating",
    isSystemAccount: true,
    isActive: true,
    openingBalance: 0,
    currency: "ETB",
    description: "Site mobilization, utilities, safety gear, and logistics overhead.",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "COA-6110",
    accountCode: "6110",
    accountName: "Administrative & General Expenses",
    accountNameAm: "የአስተዳደር እና አጠቃላይ ወጪዎች",
    accountType: "Administrative Expense",
    subType: "Administrative Expense",
    normalBalance: "Debit",
    cashFlowSection: "Operating",
    isSystemAccount: true,
    isActive: true,
    openingBalance: 0,
    currency: "ETB",
    description: "Head office rent, administrative staff, insurance, and corporate compliance.",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "COA-6210",
    accountCode: "6210",
    accountName: "Bank Charges & Finance Costs",
    accountNameAm: "የባንክ አገልግሎት ክፍያዎች",
    accountType: "Operating Expense",
    subType: "Operating Expense",
    normalBalance: "Debit",
    cashFlowSection: "Operating",
    isSystemAccount: true,
    isActive: true,
    openingBalance: 0,
    currency: "ETB",
    description: "Bank transfer fees, LC commissions, CPO charges, and loan interest.",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "COA-6310",
    accountCode: "6310",
    accountName: "Depreciation & Amortization Expense",
    accountNameAm: "የንብረት እርጅና ወጪ",
    accountType: "Operating Expense",
    subType: "Operating Expense",
    normalBalance: "Debit",
    cashFlowSection: "Non-Cash",
    isSystemAccount: true,
    isActive: true,
    openingBalance: 0,
    currency: "ETB",
    description: "Periodic non-cash depreciation on formwork systems and equipment.",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "COA-6220",
    accountCode: "6220",
    accountName: "Loan Interest & Financing Expense",
    accountNameAm: "የብድር ወለድ እና የፋይናንሲንግ ወጪ",
    accountType: "Operating Expense",
    subType: "Operating Expense",
    normalBalance: "Debit",
    cashFlowSection: "Operating",
    isSystemAccount: true,
    isActive: true,
    openingBalance: 0,
    currency: "ETB",
    description: "Interest expense on bank term loans, project credit lines, and equipment leases.",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "COA-6320",
    accountCode: "6320",
    accountName: "Loss on Asset Disposal & Impairment",
    accountNameAm: "ከቋሚ ንብረት ሽያጭ እና ዋጋ መቀነስ ኪሳራ",
    accountType: "Operating Expense",
    subType: "Operating Expense",
    normalBalance: "Debit",
    cashFlowSection: "Non-Cash",
    isSystemAccount: true,
    isActive: true,
    openingBalance: 0,
    currency: "ETB",
    description: "Net loss on fixed asset disposal or downward impairment revaluation.",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "COA-6410",
    accountCode: "6410",
    accountName: "Corporate Income Tax Expense",
    accountNameAm: "የድርጅት የገቢ ግብር ወጪ",
    accountType: "Administrative Expense",
    subType: "Administrative Expense",
    normalBalance: "Debit",
    cashFlowSection: "Operating",
    isSystemAccount: true,
    isActive: true,
    openingBalance: 0,
    currency: "ETB",
    description: "Provision for corporate profit income tax expense.",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

// ============================================================================
// FILTER & DATA INTERFACES
// ============================================================================

export type Part7ReportingFrequency =
  | "Daily"
  | "Monthly"
  | "Quarterly"
  | "Annual"
  | "Custom";

export interface Part7StatementsFilterState {
  reportingFrequency: Part7ReportingFrequency;
  financialYear: string; // "ALL" or "2026"
  project: string;
  department: string;
  startDate: string;
  endDate: string;
  searchTerm?: string;
  companyName?: string;
}

export interface ComputePart7Input {
  chartOfAccounts?: ChartAccountRecord[];
  journalEntries?: JournalEntryRecord[];
  financialPeriods?: FinancialPeriodCloseRecord[];
  invoices?: FinancialInvoiceRecord[];
  expenses?: Expense[];
  cashTransactions?: CashTransactionRecord[];
  bankTransactions?: BankTransactionRecord[];
  paymentRecords?: FinancialPaymentRecord[];
  financialAccounts?: FinancialAccount[];
  payrollRecords?: PayrollRecord[];
  actualCostEntries?: ActualCostEntry[];
  procurements?: Array<{
    id: string;
    poNumber?: string;
    supplier?: string;
    materialItem?: string;
    poAmount?: number;
    customsTax?: number;
    deliveryCost?: number;
    status?: string;
    date?: string;
    project?: string;
  }>;
  projects?: any[];
  filterState: Part7StatementsFilterState;
  userRole?: UserRole | string;
  userProfile?: any;
  settings?: FinancialSettingsConfig;
  referenceToday?: string;
}

export interface GeneralLedgerRow {
  id: string;
  journalId: string;
  journalNo: string;
  entryDate: string;
  accountCode: string;
  accountName: string;
  accountType: ChartAccountType;
  subType: ChartAccountSubType;
  project: string;
  department: string;
  sourceModule: string;
  referenceNo: string;
  description: string;
  entryType: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

export interface TrialBalanceRow {
  accountCode: string;
  accountName: string;
  accountNameAm: string;
  accountType: ChartAccountType;
  subType: ChartAccountSubType;
  normalBalance: "Debit" | "Credit";
  openingDebit: number;
  openingCredit: number;
  periodDebit: number;
  periodCredit: number;
  endingDebit: number;
  endingCredit: number;
  netBalance: number;
}

export interface StatementLineAmount {
  code: string;
  label: string;
  labelAm: string;
  amount: number;
}

export interface IncomeStatementData {
  periodStart: string;
  periodEnd: string;
  projectRevenue: number;
  otherIncome: number;
  totalRevenue: number;
  revenueBreakdown: StatementLineAmount[];
  directMaterialsCost: number;
  directLaborCost: number;
  directSubcontractorCost: number;
  directEquipmentCost: number;
  directConstructionCosts: number;
  directCostBreakdown: StatementLineAmount[];
  grossProfit: number;
  operatingExpenses: number;
  administrativeExpenses: number;
  operatingExpenseBreakdown: StatementLineAmount[];
  adminExpenseBreakdown: StatementLineAmount[];
  totalExpenses: number;
  operatingProfit: number;
  netProfitLoss: number;
}

export interface BalanceSheetData {
  asOfDate: string;
  currentAssets: StatementLineAmount[];
  totalCurrentAssets: number;
  nonCurrentAssets: StatementLineAmount[];
  totalNonCurrentAssets: number;
  totalAssets: number;
  currentLiabilities: StatementLineAmount[];
  totalCurrentLiabilities: number;
  nonCurrentLiabilities: StatementLineAmount[];
  totalNonCurrentLiabilities: number;
  totalLiabilities: number;
  ownersEquity: number;
  priorRetainedEarnings: number;
  currentPeriodNetProfit: number;
  drawings: number;
  retainedEarnings: number;
  equityBreakdown: StatementLineAmount[];
  totalEquity: number;
  totalLiabilitiesAndEquity: number;
  balanceDifference: number;
  isBalanced: boolean;
}

export interface CashFlowStatementLine {
  label: string;
  labelAm: string;
  inflow: number;
  outflow: number;
  net: number;
}

export interface CashFlowStatementData {
  periodStart: string;
  periodEnd: string;
  openingCashBalance: number;
  operatingLines: CashFlowStatementLine[];
  netOperatingCashFlow: number;
  investingLines: CashFlowStatementLine[];
  netInvestingCashFlow: number;
  financingLines: CashFlowStatementLine[];
  netFinancingCashFlow: number;
  totalCashInflows: number;
  totalCashOutflows: number;
  netCashFlow: number;
  closingCashBalance: number;
  internalTransfersTotal: number;
}

export interface StatementOfChangesInEquityData {
  periodStart: string;
  periodEnd: string;
  openingOwnerCapital: number;
  openingRetainedEarnings: number;
  openingTotalEquity: number;
  capitalContributions: number;
  netProfitForPeriod: number;
  dividendsOrDrawings: number;
  otherEquityAdjustments: number;
  closingOwnerCapital: number;
  closingRetainedEarnings: number;
  closingTotalEquity: number;
}

export interface FinancialRatioMetric {
  id: string;
  name: string;
  nameAm: string;
  formula: string;
  value: number | null;
  formattedValue: string;
  unit: "%" | "x";
  health: "Healthy" | "Watch" | "Critical" | "Insufficient Data";
  explanation: string;
  explanationAm: string;
}

export interface MonthlyProfitTrendRow {
  month: string;
  revenue: number;
  directCosts: number;
  operatingAndAdminExpenses: number;
  totalExpenses: number;
  grossProfit: number;
  netProfit: number;
}

export interface ReceivableStatementRow {
  id: string;
  invoiceNumber: string;
  client: string;
  project: string;
  category: string;
  date: string;
  dueDate: string;
  totalAmount: number;
  collectedAmount: number;
  outstandingAmount: number;
  agingCategory: string;
  status: string;
}

export interface PayableStatementRow {
  id: string;
  billNumber: string;
  supplier: string;
  project: string;
  category: string;
  date: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  agingCategory: string;
  status: string;
}

export interface Part7FinancialStatementsState {
  permissions: UserFinancePermissions;
  canApproveJournalsAndClosePeriods: boolean;
  canPrepareJournals: boolean;
  currency: string;
  companyName: string;
  referenceToday: string;
  resolvedRange: ResolvedDateRange;
  chartOfAccounts: ChartAccountRecord[];
  allPostedEntries: JournalEntryRecord[];
  manualJournalEntries: JournalEntryRecord[];
  financialPeriods: FinancialPeriodCloseRecord[];
  activePeriodRecord: FinancialPeriodCloseRecord | null;
  isCurrentPeriodClosed: boolean;
  filterOptions: {
    projects: string[];
    departments: string[];
    financialYears: string[];
    accounts: ChartAccountRecord[];
    sourceModules: string[];
  };
  incomeStatement: IncomeStatementData;
  balanceSheet: BalanceSheetData;
  cashFlowStatement: CashFlowStatementData;
  changesInEquity: StatementOfChangesInEquityData;
  trialBalance: {
    rows: TrialBalanceRow[];
    totalOpeningDebit: number;
    totalOpeningCredit: number;
    totalPeriodDebit: number;
    totalPeriodCredit: number;
    totalEndingDebit: number;
    totalEndingCredit: number;
    difference: number;
    isBalanced: boolean;
  };
  generalLedger: GeneralLedgerRow[];
  arReport: {
    rows: ReceivableStatementRow[];
    totalBilled: number;
    totalCollected: number;
    totalOutstanding: number;
    totalOverdue: number;
  };
  apReport: {
    rows: PayableStatementRow[];
    totalBilled: number;
    totalPaid: number;
    totalOutstanding: number;
    totalOverdue: number;
  };
  ratios: FinancialRatioMetric[];
  monthlyTrends: MonthlyProfitTrendRow[];
  dashboardKpis: {
    totalRevenue: number;
    totalExpenses: number;
    grossProfit: number;
    netProfit: number;
    totalAssets: number;
    totalLiabilities: number;
    totalEquity: number;
    cashPosition: number;
  };
  auditWarnings: string[];
}

// ============================================================================
// INTERNAL MATH & HELPER FUNCTIONS
// ============================================================================

function round2(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function normalizeText(v?: string): string {
  return safeString(v).trim().toLowerCase();
}

function getSignedAccountBalance(acc: ChartAccountRecord, debit: number, credit: number): number {
  if (acc.normalBalance === "Debit") {
    return round2(debit - credit);
  }
  return round2(credit - debit);
}

function diffDays(aIso: string, bIso: string): number {
  const a = new Date(`${aIso.slice(0, 10)}T00:00:00Z`).getTime();
  const b = new Date(`${bIso.slice(0, 10)}T00:00:00Z`).getTime();
  if (isNaN(a) || isNaN(b)) return 0;
  return Math.round((a - b) / (1000 * 60 * 60 * 24));
}

function normalizeInvoice(
  inv: FinancialInvoiceRecord,
  referenceToday: string,
  graceDays = 0
): NormalizedInvoice {
  const amount = parseMoney(inv.amount) ?? 0;
  const statusRaw = safeString(inv.status, "Pending");
  const isCancelledOrRejected = statusRaw === "Cancelled" || statusRaw === "Rejected";
  const explicitPaid = parseMoney(inv.paidAmount) ?? 0;
  const legacyPaidFallback = statusRaw === "Paid" && explicitPaid === 0 ? amount : 0;
  const rawCollected = Math.max(explicitPaid, legacyPaidFallback);
  const collectedAmount = inv.authorizedAdjustmentAmount ? rawCollected : Math.min(amount, rawCollected);
  const outstandingAmount = isCancelledOrRejected ? 0 : Math.max(0, amount - collectedAmount);
  const dueDate = safeString(inv.dueDate, inv.date || referenceToday).slice(0, 10);
  const rawDaysPastDue = dueDate ? diffDays(referenceToday, dueDate) - graceDays : 0;
  const daysOverdue = outstandingAmount > 0 ? Math.max(0, rawDaysPastDue) : 0;
  const isOverdue = outstandingAmount > 0 && daysOverdue > 0;
  const isDisputed = Boolean(inv.isDisputed) || statusRaw.toLowerCase() === "disputed";
  const normalizedStatus = isCancelledOrRejected
    ? statusRaw
    : isDisputed
    ? "Disputed"
    : outstandingAmount === 0 && amount > 0
    ? "Paid"
    : isOverdue
    ? "Overdue"
    : collectedAmount > 0
    ? "Partially Paid"
    : statusRaw;

  return {
    ...inv,
    receivableId: inv.receivableId || inv.id,
    amount,
    date: safeString(inv.date, referenceToday).slice(0, 10),
    dueDate,
    project: safeString(inv.project, "Unassigned Project"),
    client: safeString(inv.client || inv.clientName, "Client"),
    normalizedClient: safeString(inv.client || inv.clientName, "Client"),
    normalizedDepartment: safeString(inv.department, "Contracting & Billing"),
    normalizedCategory: safeString(inv.receivableCategory || inv.category, "Client Contract Receivables"),
    normalizedReceivableCategory: safeString(inv.receivableCategory || inv.category, "Client Contract Receivables"),
    status: normalizedStatus,
    paidAmount: collectedAmount,
    collectedAmount,
    outstandingAmount,
    arLifecycleStatus: isDisputed
      ? "Disputed"
      : outstandingAmount === 0 && amount > 0
      ? "Fully Collected"
      : isOverdue
      ? "Overdue"
      : collectedAmount > 0
      ? "Partially Collected"
      : dueDate === referenceToday
      ? "Due Today"
      : "Not Yet Due",
    agingCategory: classifyAgingCategory(daysOverdue),
    effectiveWorkflowStage:
      outstandingAmount === 0 && amount > 0
        ? "Completed"
        : inv.workflowStage || (statusRaw === "Approved" || statusRaw === "Paid" || statusRaw === "Partially Paid" ? "Verified" : "Registered"),
    isOverdue,
    daysOverdue,
    isCancelledOrRejected,
  };
}

function normalizeExpense(
  exp: Expense,
  referenceToday: string,
  graceDays = 0
): NormalizedExpense {
  const amount = parseMoney(exp.amount) ?? 0;
  const statusRaw = safeString(exp.status, "Approved");
  const isCancelledOrRejected = statusRaw === "Cancelled" || statusRaw === "Rejected";
  const explicitPaid = parseMoney(exp.paidAmount) ?? 0;
  const paidCashAmount = exp.authorizedAdjustmentAmount ? explicitPaid : Math.min(amount, explicitPaid);
  const outstandingAmount = isCancelledOrRejected ? 0 : Math.max(0, amount - paidCashAmount);
  const dueDate = safeString(exp.dueDate || exp.date, referenceToday).slice(0, 10);
  const rawDaysPastDue = dueDate ? diffDays(referenceToday, dueDate) - graceDays : 0;
  const daysOverdue = outstandingAmount > 0 ? Math.max(0, rawDaysPastDue) : 0;
  const isOverdue = outstandingAmount > 0 && daysOverdue > 0;
  const isDisputed = Boolean(exp.isDisputed) || statusRaw.toLowerCase() === "disputed";
  const normalizedStatus = isCancelledOrRejected
    ? statusRaw
    : isDisputed
    ? "Disputed"
    : paidCashAmount >= amount && amount > 0
    ? "Paid"
    : isOverdue
    ? "Overdue"
    : paidCashAmount > 0
    ? "Partially Paid"
    : statusRaw;

  return {
    ...exp,
    payableId: exp.payableId || exp.id,
    amount,
    date: safeString(exp.date, referenceToday).slice(0, 10),
    dueDate,
    project: safeString(exp.project, "Unassigned Project"),
    vendor: safeString(exp.vendor || exp.supplier, "Supplier"),
    normalizedSupplier: safeString(exp.vendor || exp.supplier, "Supplier"),
    normalizedDepartment: safeString(exp.department || exp.costCenter, "Operations"),
    normalizedCategory: safeString(exp.payableCategory || exp.category, "Material Supplier Payables"),
    normalizedPayableCategory: safeString(exp.payableCategory || exp.category, "Material Supplier Payables"),
    normalizedStatus,
    status: normalizedStatus,
    apLifecycleStatus: isDisputed
      ? "Disputed"
      : outstandingAmount === 0 && amount > 0
      ? "Fully Paid"
      : isOverdue
      ? "Overdue"
      : paidCashAmount > 0
      ? "Partially Paid"
      : dueDate === referenceToday
      ? "Due Today"
      : "Not Yet Due",
    agingCategory: classifyAgingCategory(daysOverdue),
    effectiveWorkflowStage:
      outstandingAmount === 0 && amount > 0
        ? "Paid"
        : exp.workflowStage || (statusRaw === "Approved" || statusRaw === "Paid" || statusRaw === "Partially Paid" ? "Approved" : "Registered"),
    paidAmount: paidCashAmount,
    paidCashAmount,
    outstandingAmount,
    isOverdue,
    daysOverdue,
    isCancelledOrRejected,
  };
}

function isUnverifiedDocStatus(status?: string): boolean {
  const s = normalizeText(status);
  return (
    s === "draft" ||
    s === "pending" ||
    s === "pending verification" ||
    s === "pending approval" ||
    s === "submitted" ||
    s === "under review" ||
    s === "rejected" ||
    s === "cancelled" ||
    s === "reversed"
  );
}

function mapExpenseCategoryToCoa(category?: string): string {
  const c = normalizeText(category);
  if (c.includes("tax") || c.includes("duty") || c.includes("vat") || c.includes("withholding")) {
    return "2030";
  }
  if (c.includes("bank") || c.includes("charge") || c.includes("fee") || c.includes("interest")) {
    return "6210";
  }
  if (c.includes("depreciation") || c.includes("amortization")) {
    return "6310";
  }
  if (c.includes("admin") || c.includes("office") || c.includes("rent") || c.includes("legal")) {
    return "6110";
  }
  if (c.includes("subcontract") || c.includes("consult")) {
    return "5030";
  }
  if (
    c.includes("labor") ||
    c.includes("labour") ||
    c.includes("payroll") ||
    c.includes("salary") ||
    c.includes("wage") ||
    c.includes("employee")
  ) {
    return "5020";
  }
  if (
    c.includes("equip") ||
    c.includes("machin") ||
    c.includes("fuel") ||
    c.includes("vehicle") ||
    c.includes("rental") ||
    c.includes("formwork")
  ) {
    return "5040";
  }
  if (c.includes("material") || c.includes("procure") || c.includes("cement") || c.includes("steel") || c.includes("inventory")) {
    return "5010";
  }
  return "6010";
}

function mapExpenseCategoryToPayableCoa(category?: string): string {
  const c = normalizeText(category);
  if (c.includes("tax") || c.includes("duty")) return "2030";
  if (c.includes("employee") || c.includes("payroll") || c.includes("salary")) return "2020";
  return "2010";
}

function resolvePart7DateRange(
  filterState: Part7StatementsFilterState,
  referenceToday: string
): ResolvedDateRange {
  const fy = filterState.financialYear && filterState.financialYear !== "ALL"
    ? filterState.financialYear
    : "";

  if (filterState.reportingFrequency === "Custom" || (filterState.startDate && filterState.endDate)) {
    return resolveDateRange("custom", filterState.startDate, filterState.endDate, referenceToday);
  }

  if (fy && /^\d{4}$/.test(fy)) {
    if (filterState.reportingFrequency === "Annual") {
      return resolveDateRange("custom", `${fy}-01-01`, `${fy}-12-31`, `${fy}-12-31`);
    }
    const baseMonth = referenceToday.slice(5, 7);
    const baseDay = referenceToday.slice(8, 10);
    const anchoredRef = `${fy}-${baseMonth}-${baseDay}`;
    const presetMap: Record<Part7ReportingFrequency, "daily" | "monthly" | "quarterly" | "annual" | "custom"> = {
      Daily: "daily",
      Monthly: "monthly",
      Quarterly: "quarterly",
      Annual: "annual",
      Custom: "custom",
    };
    return resolveDateRange(presetMap[filterState.reportingFrequency], undefined, undefined, anchoredRef);
  }

  const presetMap: Record<Part7ReportingFrequency, "daily" | "monthly" | "quarterly" | "annual" | "custom"> = {
    Daily: "daily",
    Monthly: "monthly",
    Quarterly: "quarterly",
    Annual: "annual",
    Custom: "custom",
  };
  return resolveDateRange(presetMap[filterState.reportingFrequency], filterState.startDate, filterState.endDate, referenceToday);
}

// ============================================================================
// VALIDATION & PERIOD CONTROLS
// ============================================================================

export function validateJournalEntryLines(lines: JournalEntryLine[]): {
  isValid: boolean;
  totalDebit: number;
  totalCredit: number;
  difference: number;
  error?: string;
} {
  if (!lines || lines.length < 2) {
    return {
      isValid: false,
      totalDebit: 0,
      totalCredit: 0,
      difference: 0,
      error: "A double-entry journal voucher requires at least 2 lines (one Debit and one Credit).",
    };
  }

  let totalDebit = 0;
  let totalCredit = 0;

  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    const dr = Number(ln.debit || 0);
    const cr = Number(ln.credit || 0);
    if (!ln.accountCode || !ln.accountName) {
      return {
        isValid: false,
        totalDebit: 0,
        totalCredit: 0,
        difference: 0,
        error: `Line ${i + 1} is missing a valid Chart of Accounts code.`,
      };
    }
    if (dr < 0 || cr < 0 || isNaN(dr) || isNaN(cr)) {
      return {
        isValid: false,
        totalDebit: 0,
        totalCredit: 0,
        difference: 0,
        error: `Line ${i + 1} contains negative or invalid debit/credit amounts.`,
      };
    }
    if (dr > 0 && cr > 0) {
      return {
        isValid: false,
        totalDebit: 0,
        totalCredit: 0,
        difference: 0,
        error: `Line ${i + 1} (${ln.accountCode}) cannot have both Debit and Credit greater than zero.`,
      };
    }
    if (dr === 0 && cr === 0) {
      return {
        isValid: false,
        totalDebit: 0,
        totalCredit: 0,
        difference: 0,
        error: `Line ${i + 1} (${ln.accountCode}) must specify a positive Debit or Credit amount.`,
      };
    }
    totalDebit += dr;
    totalCredit += cr;
  }

  totalDebit = round2(totalDebit);
  totalCredit = round2(totalCredit);
  const difference = round2(totalDebit - totalCredit);

  if (totalDebit <= 0) {
    return {
      isValid: false,
      totalDebit,
      totalCredit,
      difference,
      error: "Journal entry total amount must be greater than zero.",
    };
  }

  if (Math.abs(difference) > 0.01) {
    return {
      isValid: false,
      totalDebit,
      totalCredit,
      difference,
      error: `Unbalanced entry: Total Debit (${totalDebit.toLocaleString()}) must equal Total Credit (${totalCredit.toLocaleString()}). Difference: ${difference.toLocaleString()}.`,
    };
  }

  return {
    isValid: true,
    totalDebit,
    totalCredit,
    difference: 0,
  };
}

export function isDateInClosedPeriod(
  entryDate: string,
  periods: FinancialPeriodCloseRecord[]
): FinancialPeriodCloseRecord | null {
  const clean = safeString(entryDate).slice(0, 10);
  if (!clean) return null;
  return (
    periods.find(
      (p) =>
        p.status === "Closed" &&
        clean >= safeString(p.startDate).slice(0, 10) &&
        clean <= safeString(p.endDate).slice(0, 10)
    ) || null
  );
}

// ============================================================================
// DOUBLE-ENTRY CORE ENGINE (COMPUTES ALL 8 STATEMENTS & 7 RATIOS)
// ============================================================================

export function computePart7FinancialStatementsState(
  input: ComputePart7Input
): Part7FinancialStatementsState {
  const settings = input.settings || DEFAULT_FINANCIAL_SETTINGS;
  const currency = settings.defaultCurrency || "ETB";
  const permissions = resolveUserFinancePermissions(input.userRole);
  const referenceToday = input.referenceToday || new Date().toISOString().slice(0, 10);
  const resolvedRange = resolvePart7DateRange(input.filterState, referenceToday);
  const companyName = safeString(input.filterState.companyName, PART7_REPORTING_COMPANY_DEFAULT);

  const canApproveJournalsAndClosePeriods =
    permissions.isDirector || permissions.isFinanceManager;
  const canPrepareJournals =
    permissions.isDirector || permissions.isFinanceManager || permissions.isAccountant;

  // Assigned project scope for Project Manager
  const assignedProjects: string[] = Array.isArray(input.userProfile?.assignedProjects)
    ? input.userProfile.assignedProjects
    : input.userProfile?.assignedSite
    ? [String(input.userProfile.assignedSite)]
    : [];

  // Merge System Chart of Accounts + Custom Firestore Accounts
  const coaMap = new Map<string, ChartAccountRecord>();
  SYSTEM_CHART_OF_ACCOUNTS.forEach((a) => coaMap.set(a.accountCode, { ...a }));
  (input.chartOfAccounts || []).forEach((customAcc) => {
    if (customAcc.accountCode) {
      coaMap.set(customAcc.accountCode, { ...customAcc });
    }
  });
  const chartOfAccounts = Array.from(coaMap.values()).sort((a, b) =>
    a.accountCode.localeCompare(b.accountCode)
  );

  const getAcc = (code: string): ChartAccountRecord => {
    return (
      coaMap.get(code) || {
        id: `COA-${code}`,
        accountCode: code,
        accountName: `Account ${code}`,
        accountType: "Operating Expense",
        subType: "Operating Expense",
        normalBalance: "Debit",
        cashFlowSection: "Operating",
        isSystemAccount: false,
        isActive: true,
        openingBalance: 0,
        currency,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      }
    );
  };

  // Helper to check project / department scope filters
  const matchesDimFilter = (proj?: string, dept?: string): boolean => {
    const p = safeString(proj, "General");
    const d = safeString(dept, "General");
    if (permissions.isProjectScopedOnly && assignedProjects.length > 0) {
      const allowed = assignedProjects.some(
        (ap) =>
          p.toLowerCase() === ap.toLowerCase() ||
          p.toLowerCase().includes(ap.toLowerCase())
      );
      if (!allowed) return false;
    }
    if (input.filterState.project && input.filterState.project !== "ALL") {
      if (p.toLowerCase() !== input.filterState.project.toLowerCase()) return false;
    }
    if (input.filterState.department && input.filterState.department !== "ALL") {
      if (d.toLowerCase() !== input.filterState.department.toLowerCase()) return false;
    }
    return true;
  };

  // Track projects/departments/years catalog
  const projectSet = new Set<string>();
  const deptSet = new Set<string>(["Operations", "Finance", "Engineering", "Procurement", "HR"]);
  const yearSet = new Set<string>([referenceToday.slice(0, 4)]);

  (input.projects || []).forEach((pr: any) => {
    const name = safeString(pr?.name || pr?.id);
    if (name) projectSet.add(name);
  });

  const auditWarnings: string[] = [];
  const synthesizedEntries: JournalEntryRecord[] = [];
  const accountById = new Map<string, FinancialAccount>();
  (input.financialAccounts || []).forEach((a) => accountById.set(a.id, a));

  // ------------------------------------------------------------------
  // 1. SYNTHESIZE ACCOUNT OPENING BALANCES (DR 1010/1020, CR 3010)
  // ------------------------------------------------------------------
  (input.financialAccounts || []).forEach((acc) => {
    if (acc.status === "Closed") return;
    const proj = safeString(acc.project, "Corporate Treasury");
    const dept = safeString(acc.department, "Finance");
    projectSet.add(proj);
    deptSet.add(dept);
    if (!matchesDimFilter(proj, dept)) return;
    const openBal = round2(parseMoney(acc.openingBalance) ?? 0);
    if (openBal <= 0) return;

    const cashCode = acc.accountType === "Cash" ? "1010" : "1020";
    const cashAcc = getAcc(cashCode);
    const capAcc = getAcc("3010");

    synthesizedEntries.push({
      id: `SYS-OPEN-${acc.id}`,
      journalNo: `OB-${acc.accountCode || acc.id}`,
      entryDate: "1900-01-01",
      fiscalYear: referenceToday.slice(0, 4),
      periodMonth: "1900-01",
      project: proj,
      department: dept,
      referenceNo: acc.accountCode || acc.id,
      description: `Opening treasury balance: ${acc.accountName}`,
      entryType: "Opening Balance",
      sourceModule: acc.accountType === "Cash" ? "Cash Management" : "Bank Management",
      sourceRecordId: acc.id,
      sourceKey: `OPEN:${acc.id}`,
      lines: [
        {
          lineNo: 1,
          accountCode: cashAcc.accountCode,
          accountName: cashAcc.accountName,
          accountType: cashAcc.accountType,
          subType: cashAcc.subType,
          debit: openBal,
          credit: 0,
          memo: `${acc.accountName} opening balance`,
          project: proj,
          department: dept,
        },
        {
          lineNo: 2,
          accountCode: capAcc.accountCode,
          accountName: capAcc.accountName,
          accountType: capAcc.accountType,
          subType: capAcc.subType,
          debit: 0,
          credit: openBal,
          memo: `Opening capital backing ${acc.accountName}`,
          project: proj,
          department: dept,
        },
      ],
      totalDebit: openBal,
      totalCredit: openBal,
      isBalanced: true,
      status: "Posted",
      preparedBy: "Treasury Opening Ledger",
      preparedById: "SYSTEM",
      createdAt: acc.createdAt || "2026-01-01T00:00:00.000Z",
      updatedAt: acc.updatedAt || "2026-01-01T00:00:00.000Z",
    });
  });

  // ------------------------------------------------------------------
  // 2. PREPARE CONFIRMED CASH & APPROVED BANK LEDGERS (DEDUPED)
  // ------------------------------------------------------------------
  const confirmedCashTxs = (input.cashTransactions || []).filter(
    (tx) => isConfirmedCashStatus(tx.status) && !isReversedOrRejectedStatus(tx.status)
  );
  const confirmedCashIds = new Set(confirmedCashTxs.map((t) => t.id));
  const confirmedCashRefs = new Set(
    confirmedCashTxs.map((t) => normalizeText(t.referenceNo)).filter(Boolean)
  );

  // Deduplicate bankTransactions against cashTransactions (using linkedCashTxId or referenceNo)
  const approvedBankTxs = (input.bankTransactions || []).filter((bt) => {
    if (bt.approvalStatus !== "Approved") return false;
    if (bt.linkedCashTxId && confirmedCashIds.has(bt.linkedCashTxId)) return false;
    if (bt.linkedCashTxId && bt.sourceChannel === "Cash Module") return false;
    const normRef = normalizeText(bt.referenceNo);
    if (normRef && confirmedCashRefs.has(normRef) && bt.sourceChannel === "Cash Module") {
      return false;
    }
    return true;
  });

  // Track settled amounts per invoice / expense from explicit cash/bank/payment records
  const settledByInvoiceKey = new Map<string, number>();
  const settledByExpenseKey = new Map<string, number>();
  const settledPayrollKeys = new Set<string>();

  const registerInvoiceSettlement = (invId?: string, invNum?: string, amt = 0) => {
    if (invId) settledByInvoiceKey.set(`id:${invId}`, (settledByInvoiceKey.get(`id:${invId}`) || 0) + amt);
    if (invNum) settledByInvoiceKey.set(`num:${normalizeText(invNum)}`, (settledByInvoiceKey.get(`num:${normalizeText(invNum)}`) || 0) + amt);
  };
  const registerExpenseSettlement = (expId?: string, expNum?: string, amt = 0) => {
    if (expId) settledByExpenseKey.set(`id:${expId}`, (settledByExpenseKey.get(`id:${expId}`) || 0) + amt);
    if (expNum) settledByExpenseKey.set(`num:${normalizeText(expNum)}`, (settledByExpenseKey.get(`num:${normalizeText(expNum)}`) || 0) + amt);
  };

  // Index paymentRecords not duplicated by cash/bank txs
  const seenCashLinks = new Set<string>();
  confirmedCashTxs.forEach((tx) => {
    if (tx.linkedDocumentId) seenCashLinks.add(tx.linkedDocumentId);
    if (tx.invoiceNumber) seenCashLinks.add(normalizeText(tx.invoiceNumber));
  });
  approvedBankTxs.forEach((bt) => {
    if (bt.linkedDocumentId) seenCashLinks.add(bt.linkedDocumentId);
    if (bt.linkedReferenceNo) seenCashLinks.add(normalizeText(bt.linkedReferenceNo));
  });

  const legacyPaymentRecords = (input.paymentRecords || []).filter((pr) => {
    if (isReversedOrRejectedStatus(pr.status)) return false;
    const ref = normalizeText(pr.referenceNo || pr.reference || pr.id);
    if (ref && confirmedCashRefs.has(ref)) return false;
    if (pr.invoiceId && seenCashLinks.has(pr.invoiceId)) return false;
    if (pr.expenseId && seenCashLinks.has(pr.expenseId)) return false;
    return true;
  });

  // ------------------------------------------------------------------
  // 3. VERIFIED ACCOUNTS RECEIVABLE / REVENUE RECOGNITION (INVOICES)
  // ------------------------------------------------------------------
  const seenInvoiceIds = new Set<string>();
  const seenInvoiceNumbers = new Set<string>();
  const normalizedInvoices = [];
  const invoiceMap = new Map<string, ReturnType<typeof normalizeInvoice>>();

  for (const rawInv of input.invoices || []) {
    if (seenInvoiceIds.has(rawInv.id)) {
      auditWarnings.push(`Duplicate invoice ID skipped: ${rawInv.id}`);
      continue;
    }
    const invNumKey = normalizeText(rawInv.invoiceNumber);
    if (invNumKey && seenInvoiceNumbers.has(invNumKey)) {
      auditWarnings.push(`Duplicate invoice number skipped: ${rawInv.invoiceNumber}`);
      continue;
    }
    const normInv = normalizeInvoice(rawInv, referenceToday, settings.overdueAlertGraceDays);
    if (normInv.isCancelledOrRejected || isUnverifiedDocStatus(rawInv.status)) {
      continue;
    }
    seenInvoiceIds.add(rawInv.id);
    if (invNumKey) seenInvoiceNumbers.add(invNumKey);
    normalizedInvoices.push(normInv);
    invoiceMap.set(rawInv.id, normInv);
    if (invNumKey) invoiceMap.set(invNumKey, normInv);
  }

  normalizedInvoices.forEach((inv) => {
    const dt = safeString(inv.date, referenceToday).slice(0, 10);
    yearSet.add(dt.slice(0, 4));
    projectSet.add(inv.project);
    deptSet.add(inv.normalizedDepartment);
    if (!matchesDimFilter(inv.project, inv.normalizedDepartment)) return;

    const totalAmt = round2(inv.amount);
    if (totalAmt <= 0) return;

    const taxAmt =
      inv.taxAmount && inv.taxAmount > 0 && inv.subtotalAmount && inv.subtotalAmount > 0 && Math.abs(inv.subtotalAmount + inv.taxAmount - totalAmt) < 1
        ? round2(inv.taxAmount)
        : 0;
    const revAmt = round2(totalAmt - taxAmt);

    const arCode =
      inv.normalizedReceivableCategory === "Retention Money Receivables" ? "1120" : "1110";
    const arAcc = getAcc(arCode);
    const revAcc = getAcc("4010");
    const taxAcc = getAcc("2030");

    const lines: JournalEntryLine[] = [
      {
        lineNo: 1,
        accountCode: arAcc.accountCode,
        accountName: arAcc.accountName,
        accountType: arAcc.accountType,
        subType: arAcc.subType,
        debit: totalAmt,
        credit: 0,
        memo: `${inv.invoiceNumber || inv.id} — ${inv.normalizedClient}`,
        project: inv.project,
        department: inv.normalizedDepartment,
      },
      {
        lineNo: 2,
        accountCode: revAcc.accountCode,
        accountName: revAcc.accountName,
        accountType: revAcc.accountType,
        subType: revAcc.subType,
        debit: 0,
        credit: revAmt,
        memo: `Certified project revenue (${inv.project})`,
        project: inv.project,
        department: inv.normalizedDepartment,
      },
    ];

    if (taxAmt > 0) {
      lines.push({
        lineNo: 3,
        accountCode: taxAcc.accountCode,
        accountName: taxAcc.accountName,
        accountType: taxAcc.accountType,
        subType: taxAcc.subType,
        debit: 0,
        credit: taxAmt,
        memo: `Output VAT/Tax on ${inv.invoiceNumber || inv.id}`,
        project: inv.project,
        department: inv.normalizedDepartment,
      });
    }

    synthesizedEntries.push({
      id: `SYS-AR-${inv.id}`,
      journalNo: `AR-${inv.invoiceNumber || inv.id}`,
      entryDate: dt,
      fiscalYear: dt.slice(0, 4),
      periodMonth: dt.slice(0, 7),
      project: inv.project,
      department: inv.normalizedDepartment,
      referenceNo: inv.invoiceNumber || inv.id,
      description: `Client billing recognized: ${inv.normalizedClient} (${inv.invoiceNumber || inv.id})`,
      entryType: "Auto-Sync",
      sourceModule: "Accounts Receivable",
      sourceRecordId: inv.id,
      sourceKey: `INV:${inv.id}`,
      lines,
      totalDebit: totalAmt,
      totalCredit: totalAmt,
      isBalanced: true,
      status: "Posted",
      preparedBy: safeString(inv.responsibleOfficer, "AR Engine"),
      preparedById: safeString(inv.createdById, "SYSTEM"),
      approvedBy: safeString(inv.verifiedBy || inv.reviewedBy, "Finance Controller"),
      createdAt: inv.createdAt || dt,
      updatedAt: inv.updatedAt || dt,
    });
  });

  // ------------------------------------------------------------------
  // 4. VERIFIED ACCOUNTS PAYABLE / EXPENSE RECOGNITION (EXPENSES)
  // ------------------------------------------------------------------
  const seenExpenseIds = new Set<string>();
  const seenExpenseBills = new Set<string>();
  const normalizedExpenses = [];
  const expenseMap = new Map<string, ReturnType<typeof normalizeExpense>>();

  for (const rawExp of input.expenses || []) {
    if (seenExpenseIds.has(rawExp.id)) {
      auditWarnings.push(`Duplicate expense ID skipped: ${rawExp.id}`);
      continue;
    }
    const billKey = normalizeText(rawExp.billNumber || rawExp.payableId);
    if (billKey && seenExpenseBills.has(billKey)) {
      auditWarnings.push(`Duplicate expense bill number skipped: ${rawExp.billNumber || rawExp.payableId}`);
      continue;
    }
    const normExp = normalizeExpense(rawExp, referenceToday, settings.overdueAlertGraceDays);
    if (normExp.isCancelledOrRejected || isUnverifiedDocStatus(rawExp.status)) {
      continue;
    }
    seenExpenseIds.add(rawExp.id);
    if (billKey) seenExpenseBills.add(billKey);
    normalizedExpenses.push(normExp);
    expenseMap.set(rawExp.id, normExp);
    if (billKey) expenseMap.set(billKey, normExp);
    if (rawExp.purchaseOrderNumber) {
      seenExpenseBills.add(normalizeText(rawExp.purchaseOrderNumber));
    }
  }

  normalizedExpenses.forEach((exp) => {
    const dt = safeString(exp.date, referenceToday).slice(0, 10);
    yearSet.add(dt.slice(0, 4));
    projectSet.add(exp.project);
    deptSet.add(exp.normalizedDepartment);
    if (!matchesDimFilter(exp.project, exp.normalizedDepartment)) return;

    const totalAmt = round2(exp.amount);
    if (totalAmt <= 0) return;

    const expCode = mapExpenseCategoryToCoa(exp.payableCategory || exp.category);
    const apCode = mapExpenseCategoryToPayableCoa(exp.payableCategory || exp.category);
    const expAcc = getAcc(expCode);
    const apAcc = getAcc(apCode);

    synthesizedEntries.push({
      id: `SYS-AP-${exp.id}`,
      journalNo: `AP-${exp.billNumber || exp.payableId || exp.id}`,
      entryDate: dt,
      fiscalYear: dt.slice(0, 4),
      periodMonth: dt.slice(0, 7),
      project: exp.project,
      department: exp.normalizedDepartment,
      referenceNo: exp.billNumber || exp.payableId || exp.id,
      description: `${expAcc.accountName}: ${exp.normalizedSupplier} — ${safeString(exp.description, exp.category)}`,
      entryType: "Auto-Sync",
      sourceModule: "Accounts Payable",
      sourceRecordId: exp.id,
      sourceKey: `EXP:${exp.id}`,
      lines: [
        {
          lineNo: 1,
          accountCode: expAcc.accountCode,
          accountName: expAcc.accountName,
          accountType: expAcc.accountType,
          subType: expAcc.subType,
          debit: totalAmt,
          credit: 0,
          memo: `${exp.normalizedSupplier} — ${exp.category}`,
          project: exp.project,
          department: exp.normalizedDepartment,
        },
        {
          lineNo: 2,
          accountCode: apAcc.accountCode,
          accountName: apAcc.accountName,
          accountType: apAcc.accountType,
          subType: apAcc.subType,
          debit: 0,
          credit: totalAmt,
          memo: `Payable to ${exp.normalizedSupplier}`,
          project: exp.project,
          department: exp.normalizedDepartment,
        },
      ],
      totalDebit: totalAmt,
      totalCredit: totalAmt,
      isBalanced: true,
      status: "Posted",
      preparedBy: safeString(exp.responsibleOfficer, "AP Engine"),
      preparedById: "SYSTEM",
      approvedBy: safeString(exp.approvedBy, "Finance Manager"),
      createdAt: dt,
      updatedAt: dt,
    });
  });

  // ------------------------------------------------------------------
  // 5. VERIFIED PAYROLL OBLIGATIONS (payrollRecords)
  // ------------------------------------------------------------------
  const seenPayrollIds = new Set<string>();
  (input.payrollRecords || []).forEach((pr) => {
    if (pr.status !== "Approved" && pr.status !== "Paid") return;
    if (seenPayrollIds.has(pr.id)) return;
    if (seenExpenseIds.has(pr.id) || seenExpenseBills.has(normalizeText(pr.id))) return;
    seenPayrollIds.add(pr.id);

    const dt = pr.period && /^\d{4}-\d{2}$/.test(pr.period)
      ? `${pr.period}-28`
      : safeString(pr.updatedAt || pr.createdAt, referenceToday).slice(0, 10);
    yearSet.add(dt.slice(0, 4));
    const proj = safeString(pr.project, "General Operations");
    const dept = safeString(pr.department, "Operations");
    projectSet.add(proj);
    deptSet.add(dept);
    if (!matchesDimFilter(proj, dept)) return;

    const netAmt = round2(parseMoney(pr.netSalary) ?? 0);
    if (netAmt <= 0) return;

    const laborAcc = getAcc("5020");
    const payrollPayableAcc = getAcc("2020");

    synthesizedEntries.push({
      id: `SYS-PAY-${pr.id}`,
      journalNo: `PAY-${pr.id}`,
      entryDate: dt,
      fiscalYear: dt.slice(0, 4),
      periodMonth: dt.slice(0, 7),
      project: proj,
      department: dept,
      referenceNo: pr.id,
      description: `Approved Payroll: ${pr.workerName} (${pr.position})`,
      entryType: "Auto-Sync",
      sourceModule: "Payroll",
      sourceRecordId: pr.id,
      sourceKey: `PAYROLL:${pr.id}`,
      lines: [
        {
          lineNo: 1,
          accountCode: laborAcc.accountCode,
          accountName: laborAcc.accountName,
          accountType: laborAcc.accountType,
          subType: laborAcc.subType,
          debit: netAmt,
          credit: 0,
          memo: `Labor cost: ${pr.workerName}`,
          project: proj,
          department: dept,
        },
        {
          lineNo: 2,
          accountCode: payrollPayableAcc.accountCode,
          accountName: payrollPayableAcc.accountName,
          accountType: payrollPayableAcc.accountType,
          subType: payrollPayableAcc.subType,
          debit: 0,
          credit: netAmt,
          memo: `Accrued payroll payable to ${pr.workerName}`,
          project: proj,
          department: dept,
        },
      ],
      totalDebit: netAmt,
      totalCredit: netAmt,
      isBalanced: true,
      status: "Posted",
      preparedBy: "HR & Payroll Engine",
      preparedById: "SYSTEM",
      approvedBy: "Finance & HR",
      createdAt: dt,
      updatedAt: dt,
    });
  });

  // ------------------------------------------------------------------
  // 6. VALIDATED PROJECT ACTUAL COST ENTRIES (NO DUPLICATES)
  // ------------------------------------------------------------------
  const seenCostIds = new Set<string>();
  (input.actualCostEntries || []).forEach((ce) => {
    if (ce.verificationStatus !== "Validated") return;
    if (seenCostIds.has(ce.id)) return;
    seenCostIds.add(ce.id);

    // Prevent double recognition against AP Expenses / Payroll
    if (ce.sourceRecordId && (seenExpenseIds.has(ce.sourceRecordId) || seenPayrollIds.has(ce.sourceRecordId))) {
      return;
    }
    if (ce.invoiceNumber && seenExpenseBills.has(normalizeText(ce.invoiceNumber))) {
      return;
    }

    const dt = safeString(ce.transactionDate, referenceToday).slice(0, 10);
    yearSet.add(dt.slice(0, 4));
    const proj = safeString(ce.projectName, "General");
    const dept = "Engineering";
    projectSet.add(proj);
    if (!matchesDimFilter(proj, dept)) return;

    const amt = round2(ce.totalCost);
    if (amt <= 0) return;

    const costCode = mapExpenseCategoryToCoa(ce.budgetCategory);
    const creditCode = ce.sourceModule === "Petty Cash" ? "1010" : "2010";
    const costAcc = getAcc(costCode);
    const crAcc = getAcc(creditCode);

    synthesizedEntries.push({
      id: `SYS-COST-${ce.id}`,
      journalNo: `CST-${ce.costTransactionId || ce.id}`,
      entryDate: dt,
      fiscalYear: dt.slice(0, 4),
      periodMonth: dt.slice(0, 7),
      project: proj,
      department: dept,
      referenceNo: ce.costTransactionId || ce.invoiceNumber || ce.id,
      description: `Verified Project Cost (${ce.sourceModule}): ${ce.costDescription}`,
      entryType: "Auto-Sync",
      sourceModule: "Project Cost Control",
      sourceRecordId: ce.id,
      sourceKey: `COST:${ce.id}`,
      lines: [
        {
          lineNo: 1,
          accountCode: costAcc.accountCode,
          accountName: costAcc.accountName,
          accountType: costAcc.accountType,
          subType: costAcc.subType,
          debit: amt,
          credit: 0,
          memo: ce.costDescription,
          project: proj,
          department: dept,
        },
        {
          lineNo: 2,
          accountCode: crAcc.accountCode,
          accountName: crAcc.accountName,
          accountType: crAcc.accountType,
          subType: crAcc.subType,
          debit: 0,
          credit: amt,
          memo: `${ce.supplierOrPayee} (${ce.sourceModule})`,
          project: proj,
          department: dept,
        },
      ],
      totalDebit: amt,
      totalCredit: amt,
      isBalanced: true,
      status: "Posted",
      preparedBy: ce.recordedBy,
      preparedById: "SYSTEM",
      approvedBy: ce.validatedBy || ce.verifiedBy,
      createdAt: dt,
      updatedAt: dt,
    });
  });

  // ------------------------------------------------------------------
  // 7. VERIFIED PROCUREMENT ORDERS NOT ALREADY IN AP EXPENSES
  // ------------------------------------------------------------------
  (input.procurements || []).forEach((po) => {
    const s = normalizeText(po.status);
    const isVerifiedPo =
      s === "approved" ||
      s === "delivered" ||
      s === "received" ||
      s === "completed" ||
      s === "paid" ||
      s === "cleared";
    if (!isVerifiedPo) return;
    const poKey = normalizeText(po.poNumber || po.id);
    if (seenExpenseIds.has(po.id) || (poKey && seenExpenseBills.has(poKey))) return;

    const dt = safeString(po.date, referenceToday).slice(0, 10);
    yearSet.add(dt.slice(0, 4));
    const proj = safeString(po.project, "General Procurement");
    const dept = "Procurement";
    projectSet.add(proj);
    if (!matchesDimFilter(proj, dept)) return;

    const totalPo = round2(
      (parseMoney(po.poAmount) ?? 0) +
      (parseMoney(po.customsTax) ?? 0) +
      (parseMoney(po.deliveryCost) ?? 0)
    );
    if (totalPo <= 0) return;

    const matAcc = getAcc("5010");
    const apAcc = getAcc("2010");
    synthesizedEntries.push({
      id: `SYS-PROC-${po.id}`,
      journalNo: `PO-${po.poNumber || po.id}`,
      entryDate: dt,
      fiscalYear: dt.slice(0, 4),
      periodMonth: dt.slice(0, 7),
      project: proj,
      department: dept,
      referenceNo: po.poNumber || po.id,
      description: `Procurement Order: ${po.materialItem || "Materials"} — ${po.supplier || "Vendor"}`,
      entryType: "Auto-Sync",
      sourceModule: "Procurement",
      sourceRecordId: po.id,
      sourceKey: `PROC:${po.id}`,
      lines: [
        {
          lineNo: 1,
          accountCode: matAcc.accountCode,
          accountName: matAcc.accountName,
          accountType: matAcc.accountType,
          subType: matAcc.subType,
          debit: totalPo,
          credit: 0,
          memo: `${po.materialItem || "Material"} (${po.supplier || "Supplier"})`,
          project: proj,
          department: dept,
        },
        {
          lineNo: 2,
          accountCode: apAcc.accountCode,
          accountName: apAcc.accountName,
          accountType: apAcc.accountType,
          subType: apAcc.subType,
          debit: 0,
          credit: totalPo,
          memo: `Payable to ${po.supplier || "Supplier"}`,
          project: proj,
          department: dept,
        },
      ],
      totalDebit: totalPo,
      totalCredit: totalPo,
      isBalanced: true,
      status: "Posted",
      preparedBy: "Procurement Sync",
      preparedById: "SYSTEM",
      createdAt: dt,
      updatedAt: dt,
    });
  });

  // ------------------------------------------------------------------
  // 8. CONFIRMED CASH COLLECTIONS, PAYMENTS & TRANSFERS (cashTransactions)
  // ------------------------------------------------------------------
  confirmedCashTxs.forEach((tx) => {
    const dt = safeString(tx.date, referenceToday).slice(0, 10);
    yearSet.add(dt.slice(0, 4));
    const proj = safeString(tx.project, "General");
    const dept = safeString(tx.department, "Finance");
    projectSet.add(proj);
    deptSet.add(dept);
    if (!matchesDimFilter(proj, dept)) return;

    const amt = round2(tx.amount);
    if (amt <= 0) return;

    const srcAccount = accountById.get(tx.accountId);
    const srcCashCode = srcAccount?.accountType === "Bank" ? "1020" : "1010";
    const srcCashAcc = getAcc(srcCashCode);

    if (tx.type === "Collection") {
      // Linked to AR Invoice -> DR Cash/Bank, CR AR (never double-count revenue!)
      const matchedInv =
        (tx.linkedDocumentId && invoiceMap.get(tx.linkedDocumentId)) ||
        (tx.invoiceNumber && invoiceMap.get(normalizeText(tx.invoiceNumber)));
      const creditCode = matchedInv
        ? matchedInv.normalizedReceivableCategory === "Retention Money Receivables"
          ? "1120"
          : "1110"
        : tx.linkedDocumentType === "Invoice"
        ? "1110"
        : "4110";
      if (matchedInv) {
        registerInvoiceSettlement(matchedInv.id, matchedInv.invoiceNumber, amt);
      }
      const crAcc = getAcc(creditCode);

      synthesizedEntries.push({
        id: `SYS-CASH-${tx.id}`,
        journalNo: `CRV-${tx.referenceNo || tx.id}`,
        entryDate: dt,
        fiscalYear: dt.slice(0, 4),
        periodMonth: dt.slice(0, 7),
        project: proj,
        department: dept,
        referenceNo: tx.receiptNumber || tx.referenceNo || tx.id,
        description: `Cash Collection: ${tx.counterparty} (${tx.referenceNo})`,
        entryType: "Auto-Sync",
        sourceModule: "Cash Management",
        sourceRecordId: tx.id,
        sourceKey: `CASH:${tx.id}`,
        lines: [
          {
            lineNo: 1,
            accountCode: srcCashAcc.accountCode,
            accountName: srcCashAcc.accountName,
            accountType: srcCashAcc.accountType,
            subType: srcCashAcc.subType,
            debit: amt,
            credit: 0,
            memo: `Received in ${tx.accountName}`,
            project: proj,
            department: dept,
          },
          {
            lineNo: 2,
            accountCode: crAcc.accountCode,
            accountName: crAcc.accountName,
            accountType: crAcc.accountType,
            subType: crAcc.subType,
            debit: 0,
            credit: amt,
            memo: matchedInv ? `Settled AR ${matchedInv.invoiceNumber}` : `Other income receipt`,
            project: proj,
            department: dept,
          },
        ],
        totalDebit: amt,
        totalCredit: amt,
        isBalanced: true,
        status: "Posted",
        preparedBy: safeString(tx.recordedBy || tx.createdBy, "Cashier"),
        preparedById: tx.createdById || "SYSTEM",
        approvedBy: tx.approvedBy || tx.verifiedBy,
        createdAt: tx.createdAt || dt,
        updatedAt: tx.updatedAt || dt,
      });
    } else if (tx.type === "Payment") {
      const matchedExp =
        (tx.linkedDocumentId && expenseMap.get(tx.linkedDocumentId)) ||
        (tx.linkedReferenceNo && expenseMap.get(normalizeText(tx.linkedReferenceNo)));
      let debitCode = "6010";
      if (tx.linkedDocumentType === "Payroll" || normalizeText(tx.category).includes("salary") || normalizeText(tx.category).includes("payroll")) {
        debitCode = "2020";
        if (tx.linkedDocumentId) settledPayrollKeys.add(tx.linkedDocumentId);
      } else if (matchedExp || tx.linkedDocumentType === "Expense") {
        debitCode = matchedExp ? mapExpenseCategoryToPayableCoa(matchedExp.payableCategory || matchedExp.category) : "2010";
        if (matchedExp) registerExpenseSettlement(matchedExp.id, matchedExp.billNumber, amt);
      } else {
        debitCode = mapExpenseCategoryToCoa(tx.category);
      }

      const drAcc = getAcc(debitCode);
      synthesizedEntries.push({
        id: `SYS-CASH-${tx.id}`,
        journalNo: `CPV-${tx.referenceNo || tx.id}`,
        entryDate: dt,
        fiscalYear: dt.slice(0, 4),
        periodMonth: dt.slice(0, 7),
        project: proj,
        department: dept,
        referenceNo: tx.paymentVoucherNumber || tx.referenceNo || tx.id,
        description: `Cash Payment: ${tx.counterparty} (${tx.category})`,
        entryType: "Auto-Sync",
        sourceModule: "Cash Management",
        sourceRecordId: tx.id,
        sourceKey: `CASH:${tx.id}`,
        lines: [
          {
            lineNo: 1,
            accountCode: drAcc.accountCode,
            accountName: drAcc.accountName,
            accountType: drAcc.accountType,
            subType: drAcc.subType,
            debit: amt,
            credit: 0,
            memo: matchedExp ? `Settled AP ${matchedExp.billNumber || matchedExp.id}` : tx.description || tx.category,
            project: proj,
            department: dept,
          },
          {
            lineNo: 2,
            accountCode: srcCashAcc.accountCode,
            accountName: srcCashAcc.accountName,
            accountType: srcCashAcc.accountType,
            subType: srcCashAcc.subType,
            debit: 0,
            credit: amt,
            memo: `Disbursed from ${tx.accountName}`,
            project: proj,
            department: dept,
          },
        ],
        totalDebit: amt,
        totalCredit: amt,
        isBalanced: true,
        status: "Posted",
        preparedBy: safeString(tx.recordedBy || tx.createdBy, "Cashier"),
        preparedById: tx.createdById || "SYSTEM",
        approvedBy: tx.approvedBy || tx.verifiedBy,
        createdAt: tx.createdAt || dt,
        updatedAt: tx.updatedAt || dt,
      });
    } else if (tx.type === "Transfer" && tx.toAccountId) {
      const dstAccount = accountById.get(tx.toAccountId);
      const dstCode = dstAccount?.accountType === "Bank" ? "1020" : "1010";
      const dstAcc = getAcc(dstCode);
      synthesizedEntries.push({
        id: `SYS-CASH-TR-${tx.id}`,
        journalNo: `TRF-${tx.referenceNo || tx.id}`,
        entryDate: dt,
        fiscalYear: dt.slice(0, 4),
        periodMonth: dt.slice(0, 7),
        project: proj,
        department: dept,
        referenceNo: tx.referenceNo || tx.id,
        description: `Treasury Transfer: ${tx.accountName} → ${tx.toAccountName || "Destination"}`,
        entryType: "Auto-Sync",
        sourceModule: "Cash Management",
        sourceRecordId: tx.id,
        sourceKey: `CASH:${tx.id}`,
        lines: [
          {
            lineNo: 1,
            accountCode: dstAcc.accountCode,
            accountName: dstAcc.accountName,
            accountType: dstAcc.accountType,
            subType: dstAcc.subType,
            debit: amt,
            credit: 0,
            memo: `Transfer in to ${tx.toAccountName || dstAcc.accountName}`,
            project: proj,
            department: dept,
          },
          {
            lineNo: 2,
            accountCode: srcCashAcc.accountCode,
            accountName: srcCashAcc.accountName,
            accountType: srcCashAcc.accountType,
            subType: srcCashAcc.subType,
            debit: 0,
            credit: amt,
            memo: `Transfer out from ${tx.accountName}`,
            project: proj,
            department: dept,
          },
        ],
        totalDebit: amt,
        totalCredit: amt,
        isBalanced: true,
        status: "Posted",
        preparedBy: safeString(tx.recordedBy || tx.createdBy, "Treasury"),
        preparedById: tx.createdById || "SYSTEM",
        approvedBy: tx.approvedBy,
        createdAt: tx.createdAt || dt,
        updatedAt: tx.updatedAt || dt,
      });
    }
  });

  // ------------------------------------------------------------------
  // 9. APPROVED BANK TRANSACTIONS (NON-CASH-DUPLICATE)
  // ------------------------------------------------------------------
  approvedBankTxs.forEach((bt) => {
    const dt = safeString(bt.transactionDate, referenceToday).slice(0, 10);
    yearSet.add(dt.slice(0, 4));
    const proj = safeString(bt.project, "General");
    const dept = safeString(bt.department, "Finance");
    projectSet.add(proj);
    deptSet.add(dept);
    if (!matchesDimFilter(proj, dept)) return;

    const amt = round2(bt.amount);
    if (amt <= 0) return;

    const bankAcc = getAcc("1020");

    if (bt.transactionType === "Bank Transfers" && bt.toAccountId) {
      const dstAccount = accountById.get(bt.toAccountId);
      const dstCode = dstAccount?.accountType === "Cash" ? "1010" : "1020";
      const dstAcc = getAcc(dstCode);
      synthesizedEntries.push({
        id: `SYS-BNK-TR-${bt.id}`,
        journalNo: `BTR-${bt.transactionNo || bt.id}`,
        entryDate: dt,
        fiscalYear: dt.slice(0, 4),
        periodMonth: dt.slice(0, 7),
        project: proj,
        department: dept,
        referenceNo: bt.referenceNo || bt.transactionNo,
        description: `Bank Transfer: ${bt.accountName} → ${bt.toAccountName || "Destination"}`,
        entryType: "Auto-Sync",
        sourceModule: "Bank Management",
        sourceRecordId: bt.id,
        sourceKey: `BANK:${bt.id}`,
        lines: [
          {
            lineNo: 1,
            accountCode: dstAcc.accountCode,
            accountName: dstAcc.accountName,
            accountType: dstAcc.accountType,
            subType: dstAcc.subType,
            debit: amt,
            credit: 0,
            memo: `Transfer in to ${bt.toAccountName || dstAcc.accountName}`,
            project: proj,
            department: dept,
          },
          {
            lineNo: 2,
            accountCode: bankAcc.accountCode,
            accountName: bankAcc.accountName,
            accountType: bankAcc.accountType,
            subType: bankAcc.subType,
            debit: 0,
            credit: amt,
            memo: `Transfer out from ${bt.accountName}`,
            project: proj,
            department: dept,
          },
        ],
        totalDebit: amt,
        totalCredit: amt,
        isBalanced: true,
        status: "Posted",
        preparedBy: bt.recordedBy,
        preparedById: bt.createdById || "SYSTEM",
        approvedBy: bt.approvedBy,
        createdAt: bt.createdAt,
        updatedAt: bt.updatedAt,
      });
      return;
    }

    if (bt.direction === "Credit") {
      // Inflow
      const matchedInv =
        (bt.linkedDocumentId && invoiceMap.get(bt.linkedDocumentId)) ||
        (bt.linkedReferenceNo && invoiceMap.get(normalizeText(bt.linkedReferenceNo)));
      let crCode = "4110";
      if (bt.transactionType === "Interest Income") {
        crCode = "4110";
      } else if (matchedInv || bt.linkedDocumentType === "Invoice" || bt.transactionType === "Client Payments") {
        if (matchedInv) {
          crCode =
            matchedInv.normalizedReceivableCategory === "Retention Money Receivables"
              ? "1120"
              : "1110";
          registerInvoiceSettlement(matchedInv.id, matchedInv.invoiceNumber, amt);
        } else {
          // If client payment has no linked AR invoice record, recognize AR clearance if linked or Revenue 4010
          crCode = bt.linkedDocumentType === "Invoice" ? "1110" : "4110";
        }
      }
      const crAcc = getAcc(crCode);

      synthesizedEntries.push({
        id: `SYS-BNK-${bt.id}`,
        journalNo: `BNK-${bt.transactionNo || bt.id}`,
        entryDate: dt,
        fiscalYear: dt.slice(0, 4),
        periodMonth: dt.slice(0, 7),
        project: proj,
        department: dept,
        referenceNo: bt.referenceNo || bt.transactionNo,
        description: `${bt.transactionType}: ${bt.counterparty} — ${bt.description}`,
        entryType: "Auto-Sync",
        sourceModule: "Bank Management",
        sourceRecordId: bt.id,
        sourceKey: `BANK:${bt.id}`,
        lines: [
          {
            lineNo: 1,
            accountCode: bankAcc.accountCode,
            accountName: bankAcc.accountName,
            accountType: bankAcc.accountType,
            subType: bankAcc.subType,
            debit: amt,
            credit: 0,
            memo: `Bank credit in ${bt.accountName}`,
            project: proj,
            department: dept,
          },
          {
            lineNo: 2,
            accountCode: crAcc.accountCode,
            accountName: crAcc.accountName,
            accountType: crAcc.accountType,
            subType: crAcc.subType,
            debit: 0,
            credit: amt,
            memo: matchedInv ? `Settled AR ${matchedInv.invoiceNumber}` : bt.transactionType,
            project: proj,
            department: dept,
          },
        ],
        totalDebit: amt,
        totalCredit: amt,
        isBalanced: true,
        status: "Posted",
        preparedBy: bt.recordedBy,
        preparedById: bt.createdById || "SYSTEM",
        approvedBy: bt.approvedBy,
        createdAt: bt.createdAt,
        updatedAt: bt.updatedAt,
      });
    } else {
      // Outflow
      const matchedExp =
        (bt.linkedDocumentId && expenseMap.get(bt.linkedDocumentId)) ||
        (bt.linkedReferenceNo && expenseMap.get(normalizeText(bt.linkedReferenceNo)));
      let drCode = "6010";
      if (bt.transactionType === "Bank Charges") {
        drCode = "6210";
      } else if (bt.transactionType === "Salary Payments" || bt.linkedDocumentType === "Payroll") {
        drCode = "2020";
        if (bt.linkedDocumentId) settledPayrollKeys.add(bt.linkedDocumentId);
      } else if (matchedExp || bt.linkedDocumentType === "Expense" || bt.transactionType === "Supplier Payments") {
        if (matchedExp) {
          drCode = mapExpenseCategoryToPayableCoa(matchedExp.payableCategory || matchedExp.category);
          registerExpenseSettlement(matchedExp.id, matchedExp.billNumber, amt);
        } else {
          drCode = bt.linkedDocumentType === "Expense" ? "2010" : "6010";
        }
      }
      const drAcc = getAcc(drCode);

      synthesizedEntries.push({
        id: `SYS-BNK-${bt.id}`,
        journalNo: `BNK-${bt.transactionNo || bt.id}`,
        entryDate: dt,
        fiscalYear: dt.slice(0, 4),
        periodMonth: dt.slice(0, 7),
        project: proj,
        department: dept,
        referenceNo: bt.referenceNo || bt.transactionNo,
        description: `${bt.transactionType}: ${bt.counterparty} — ${bt.description}`,
        entryType: "Auto-Sync",
        sourceModule: "Bank Management",
        sourceRecordId: bt.id,
        sourceKey: `BANK:${bt.id}`,
        lines: [
          {
            lineNo: 1,
            accountCode: drAcc.accountCode,
            accountName: drAcc.accountName,
            accountType: drAcc.accountType,
            subType: drAcc.subType,
            debit: amt,
            credit: 0,
            memo: matchedExp ? `Settled AP ${matchedExp.billNumber || matchedExp.id}` : bt.description,
            project: proj,
            department: dept,
          },
          {
            lineNo: 2,
            accountCode: bankAcc.accountCode,
            accountName: bankAcc.accountName,
            accountType: bankAcc.accountType,
            subType: bankAcc.subType,
            debit: 0,
            credit: amt,
            memo: `Bank debit from ${bt.accountName}`,
            project: proj,
            department: dept,
          },
        ],
        totalDebit: amt,
        totalCredit: amt,
        isBalanced: true,
        status: "Posted",
        preparedBy: bt.recordedBy,
        preparedById: bt.createdById || "SYSTEM",
        approvedBy: bt.approvedBy,
        createdAt: bt.createdAt,
        updatedAt: bt.updatedAt,
      });
    }
  });

  // ------------------------------------------------------------------
  // 10. LEGACY PAYMENT RECORDS (NOT COVERED BY CASH OR BANK LEDGERS)
  // ------------------------------------------------------------------
  legacyPaymentRecords.forEach((pr) => {
    const dt = safeString(pr.date, referenceToday).slice(0, 10);
    yearSet.add(dt.slice(0, 4));
    const proj = safeString(pr.project, "General");
    const dept = safeString(pr.department, "Finance");
    projectSet.add(proj);
    deptSet.add(dept);
    if (!matchesDimFilter(proj, dept)) return;
    const amt = round2(pr.amount);
    if (amt <= 0) return;

    const bankAcc = getAcc("1020");
    if (pr.type === "Collection" || pr.invoiceId) {
      const matchedInv = pr.invoiceId ? invoiceMap.get(pr.invoiceId) : undefined;
      if (matchedInv) registerInvoiceSettlement(matchedInv.id, matchedInv.invoiceNumber, amt);
      const arAcc = getAcc(
        matchedInv?.normalizedReceivableCategory === "Retention Money Receivables" ? "1120" : "1110"
      );
      synthesizedEntries.push({
        id: `SYS-PMT-${pr.id}`,
        journalNo: `PMT-${pr.referenceNo || pr.id}`,
        entryDate: dt,
        fiscalYear: dt.slice(0, 4),
        periodMonth: dt.slice(0, 7),
        project: proj,
        department: dept,
        referenceNo: pr.referenceNo || pr.id,
        description: `Payment record receipt: ${pr.counterparty || pr.invoiceNumber || pr.id}`,
        entryType: "Auto-Sync",
        sourceModule: "Accounts Receivable",
        sourceRecordId: pr.id,
        sourceKey: `PMT:${pr.id}`,
        lines: [
          { lineNo: 1, accountCode: bankAcc.accountCode, accountName: bankAcc.accountName, accountType: bankAcc.accountType, subType: bankAcc.subType, debit: amt, credit: 0, project: proj, department: dept },
          { lineNo: 2, accountCode: arAcc.accountCode, accountName: arAcc.accountName, accountType: arAcc.accountType, subType: arAcc.subType, debit: 0, credit: amt, project: proj, department: dept },
        ],
        totalDebit: amt,
        totalCredit: amt,
        isBalanced: true,
        status: "Posted",
        preparedBy: safeString(pr.createdBy, "Finance"),
        preparedById: "SYSTEM",
        createdAt: dt,
        updatedAt: dt,
      });
    } else if (pr.expenseId) {
      const matchedExp = expenseMap.get(pr.expenseId);
      if (matchedExp) registerExpenseSettlement(matchedExp.id, matchedExp.billNumber, amt);
      const apAcc = getAcc("2010");
      synthesizedEntries.push({
        id: `SYS-PMT-${pr.id}`,
        journalNo: `PMT-${pr.referenceNo || pr.id}`,
        entryDate: dt,
        fiscalYear: dt.slice(0, 4),
        periodMonth: dt.slice(0, 7),
        project: proj,
        department: dept,
        referenceNo: pr.referenceNo || pr.id,
        description: `Payment record disbursement: ${pr.counterparty || pr.id}`,
        entryType: "Auto-Sync",
        sourceModule: "Accounts Payable",
        sourceRecordId: pr.id,
        sourceKey: `PMT:${pr.id}`,
        lines: [
          { lineNo: 1, accountCode: apAcc.accountCode, accountName: apAcc.accountName, accountType: apAcc.accountType, subType: apAcc.subType, debit: amt, credit: 0, project: proj, department: dept },
          { lineNo: 2, accountCode: bankAcc.accountCode, accountName: bankAcc.accountName, accountType: bankAcc.accountType, subType: bankAcc.subType, debit: 0, credit: amt, project: proj, department: dept },
        ],
        totalDebit: amt,
        totalCredit: amt,
        isBalanced: true,
        status: "Posted",
        preparedBy: safeString(pr.createdBy, "Finance"),
        preparedById: "SYSTEM",
        createdAt: dt,
        updatedAt: dt,
      });
    }
  });

  // ------------------------------------------------------------------
  // 11. PERSISTED BALANCED MANUAL / ADJUSTING / CLOSING JOURNALS
  // ------------------------------------------------------------------
  const manualJournalEntries = [...(input.journalEntries || [])].sort((a, b) =>
    b.entryDate.localeCompare(a.entryDate)
  );
  const postedManualEntries: JournalEntryRecord[] = [];
  const seenSourceKeys = new Set(synthesizedEntries.map((e) => e.sourceKey).filter(Boolean));

  manualJournalEntries.forEach((je) => {
    yearSet.add(je.entryDate.slice(0, 4));
    if (je.project) projectSet.add(je.project);
    if (je.department) deptSet.add(je.department);

    if (je.status !== "Posted") return;
    if (!je.isBalanced || Math.abs(je.totalDebit - je.totalCredit) > 0.01) {
      auditWarnings.push(`Excluded unbalanced journal entry ${je.journalNo}`);
      return;
    }
    if (je.sourceKey && seenSourceKeys.has(je.sourceKey)) return;
    if (!matchesDimFilter(je.project, je.department)) return;
    postedManualEntries.push(je);
  });

  const allPostedEntries = [...synthesizedEntries, ...postedManualEntries].sort((a, b) =>
    a.entryDate.localeCompare(b.entryDate)
  );

  // ------------------------------------------------------------------
  // 12. COMPUTE TRIAL BALANCE & GENERAL LEDGER
  // ------------------------------------------------------------------
  const periodStart = resolvedRange.startDate;
  const periodEnd = resolvedRange.endDate;

  const accountAgg = new Map<
    string,
    { openDr: number; openCr: number; perDr: number; perCr: number }
  >();
  chartOfAccounts.forEach((acc) => {
    accountAgg.set(acc.accountCode, { openDr: 0, openCr: 0, perDr: 0, perCr: 0 });
  });

  // For nominal accounts inside Income Statement, exclude "Closing" entries so historical P&L stays intact
  const periodIncomeStmtDebits = new Map<string, number>();
  const periodIncomeStmtCredits = new Map<string, number>();
  const cumulativePrePeriodIncomeDebits = new Map<string, number>();
  const cumulativePrePeriodIncomeCredits = new Map<string, number>();
  const monthlyTrendMap = new Map<
    string,
    { revenue: number; directCosts: number; opAdmin: number }
  >();

  // General ledger rows within selected period
  const generalLedgerRaw: Array<{
    id: string;
    journalId: string;
    journalNo: string;
    entryDate: string;
    accountCode: string;
    accountName: string;
    accountType: ChartAccountType;
    subType: ChartAccountSubType;
    project: string;
    department: string;
    sourceModule: string;
    referenceNo: string;
    description: string;
    entryType: string;
    debit: number;
    credit: number;
  }> = [];

  // Cash Flow tracking structures (direct cash/bank ledger movements in [periodStart, periodEnd])
  let openingCashBalance = 0;
  let internalTransfersTotal = 0;
  const cfOperatingMap = new Map<string, CashFlowStatementLine>();
  const cfInvestingMap = new Map<string, CashFlowStatementLine>();
  const cfFinancingMap = new Map<string, CashFlowStatementLine>();

  const upsertCfLine = (
    map: Map<string, CashFlowStatementLine>,
    key: string,
    label: string,
    labelAm: string,
    inflowDelta: number,
    outflowDelta: number
  ) => {
    const prev = map.get(key) || { label, labelAm, inflow: 0, outflow: 0, net: 0 };
    const inflow = round2(prev.inflow + inflowDelta);
    const outflow = round2(prev.outflow + outflowDelta);
    map.set(key, {
      label,
      labelAm,
      inflow,
      outflow,
      net: round2(inflow - outflow),
    });
  };

  allPostedEntries.forEach((je) => {
    const dt = je.entryDate.slice(0, 10);
    const isBeforeStart = dt < periodStart;
    const isInPeriod = dt >= periodStart && dt <= periodEnd;
    const isUpToEnd = dt <= periodEnd;

    // 1) Aggregate Trial Balance (All entries <= periodEnd)
    if (isUpToEnd) {
      je.lines.forEach((ln) => {
        if (!accountAgg.has(ln.accountCode)) {
          accountAgg.set(ln.accountCode, { openDr: 0, openCr: 0, perDr: 0, perCr: 0 });
        }
        const agg = accountAgg.get(ln.accountCode)!;
        if (isBeforeStart) {
          agg.openDr += Number(ln.debit || 0);
          agg.openCr += Number(ln.credit || 0);
        } else if (isInPeriod) {
          agg.perDr += Number(ln.debit || 0);
          agg.perCr += Number(ln.credit || 0);
        }
      });
    }

    // 2) Non-Closing Nominal Activity for Income Statement, Retained Earnings Continuity & Trends
    if (je.entryType !== "Closing" && isUpToEnd) {
      const mKey = dt.slice(0, 7);
      if (isInPeriod && !monthlyTrendMap.has(mKey)) {
        monthlyTrendMap.set(mKey, { revenue: 0, directCosts: 0, opAdmin: 0 });
      }
      je.lines.forEach((ln) => {
        const dr = Number(ln.debit || 0);
        const cr = Number(ln.credit || 0);
        const acc = getAcc(ln.accountCode);
        if (isBeforeStart) {
          cumulativePrePeriodIncomeDebits.set(ln.accountCode, (cumulativePrePeriodIncomeDebits.get(ln.accountCode) || 0) + dr);
          cumulativePrePeriodIncomeCredits.set(ln.accountCode, (cumulativePrePeriodIncomeCredits.get(ln.accountCode) || 0) + cr);
        } else if (isInPeriod) {
          periodIncomeStmtDebits.set(ln.accountCode, (periodIncomeStmtDebits.get(ln.accountCode) || 0) + dr);
          periodIncomeStmtCredits.set(ln.accountCode, (periodIncomeStmtCredits.get(ln.accountCode) || 0) + cr);

          if (mKey >= "1990-01") {
            const mt = monthlyTrendMap.get(mKey)!;
            if (acc.accountType === "Revenue") {
              mt.revenue += cr - dr;
            } else if (acc.accountType === "Cost of Construction") {
              mt.directCosts += dr - cr;
            } else if (acc.accountType === "Operating Expense" || acc.accountType === "Administrative Expense") {
              mt.opAdmin += dr - cr;
            }
          }
        }
      });
    }

    // 3) General Ledger Rows in [periodStart, periodEnd]
    if (isInPeriod) {
      je.lines.forEach((ln) => {
        const acc = getAcc(ln.accountCode);
        generalLedgerRaw.push({
          id: `${je.id}-L${ln.lineNo}`,
          journalId: je.id,
          journalNo: je.journalNo,
          entryDate: dt,
          accountCode: ln.accountCode,
          accountName: ln.accountName || acc.accountName,
          accountType: ln.accountType || acc.accountType,
          subType: ln.subType || acc.subType,
          project: ln.project || je.project,
          department: ln.department || je.department,
          sourceModule: je.sourceModule,
          referenceNo: je.referenceNo,
          description: ln.memo ? `${je.description} (${ln.memo})` : je.description,
          entryType: je.entryType,
          debit: round2(ln.debit),
          credit: round2(ln.credit),
        });
      });
    }

    // 4) Cash Flow Direct Method from Cash, Petty Cash & Bank Accounts (1010, 1015, 1020)
    const cashLines = je.lines.filter(
      (ln) => ln.accountCode === "1010" || ln.accountCode === "1015" || ln.accountCode === "1020"
    );
    if (cashLines.length > 0 && isUpToEnd) {
      const netCashDelta = cashLines.reduce(
        (s, ln) => s + Number(ln.debit || 0) - Number(ln.credit || 0),
        0
      );

      if (je.entryType === "Opening Balance" || isBeforeStart) {
        openingCashBalance += netCashDelta;
      } else if (isInPeriod) {
        const nonCashLines = je.lines.filter(
          (ln) => ln.accountCode !== "1010" && ln.accountCode !== "1015" && ln.accountCode !== "1020"
        );
        if (nonCashLines.length === 0) {
          // Pure internal transfer between cash, petty cash & bank accounts (net cash impact = 0)
          const transferAmt = cashLines.reduce((s, ln) => s + Number(ln.debit || 0), 0);
          internalTransfersTotal += transferAmt;
        } else if (Math.abs(netCashDelta) > 0.001) {
          const isInflow = netCashDelta > 0;
          const absCash = round2(Math.abs(netCashDelta));
          // Classify using primary offsetting account(s)
          const primaryOffset = nonCashLines[0];
          const offsetAcc = getAcc(primaryOffset.accountCode);

          if (
            offsetAcc.cashFlowSection === "Investing" ||
            offsetAcc.subType === "Non-Current Asset"
          ) {
            const key = offsetAcc.accountCode;
            upsertCfLine(
              cfInvestingMap,
              key,
              isInflow
                ? `Proceeds from ${offsetAcc.accountName}`
                : `Acquisition of ${offsetAcc.accountName}`,
              isInflow ? `ከ ${offsetAcc.accountNameAm || offsetAcc.accountName} ሽያጭ ገቢ` : `ለ ${offsetAcc.accountNameAm || offsetAcc.accountName} ግዢ`,
              isInflow ? absCash : 0,
              isInflow ? 0 : absCash
            );
          } else if (
            offsetAcc.cashFlowSection === "Financing" ||
            offsetAcc.subType === "Non-Current Liability" ||
            offsetAcc.accountType === "Equity"
          ) {
            const key = `${offsetAcc.accountCode}-${isInflow ? "IN" : "OUT"}`;
            const label =
              offsetAcc.accountCode === "3010"
                ? isInflow
                  ? "Owner Capital Contributions"
                  : "Capital Withdrawals"
                : offsetAcc.accountCode === "3210"
                ? "Owner Drawings / Dividends Paid"
                : offsetAcc.accountCode === "2510" || offsetAcc.accountCode === "2110"
                ? isInflow
                  ? `Proceeds from ${offsetAcc.accountName}`
                  : `Principal Repayment (${offsetAcc.accountName})`
                : isInflow
                ? `Financing Inflow (${offsetAcc.accountName})`
                : `Financing Outflow (${offsetAcc.accountName})`;
            upsertCfLine(
              cfFinancingMap,
              key,
              label,
              label,
              isInflow ? absCash : 0,
              isInflow ? 0 : absCash
            );
          } else {
            // Operating Activity
            const key = `${offsetAcc.accountCode}-${isInflow ? "IN" : "OUT"}`;
            const labelMap: Record<string, { in: string; out: string; inAm: string; outAm: string }> = {
              "1110": {
                in: "Cash Received from Customers (AR Collections)",
                out: "Customer Refunds",
                inAm: "ከደንበኞች የተሰበሰበ ጥሬ ገንዘብ",
                outAm: "ለደንበኞች ተመላሽ",
              },
              "1120": {
                in: "Retention Money Collected",
                out: "Retention Adjustment",
                inAm: "የዋስትና ተቀናሽ ክፍያ የተሰበሰበ",
                outAm: "የዋስትና ማስተካከያ",
              },
              "4010": {
                in: "Direct Contract Cash Receipts",
                out: "Revenue Reversal",
                inAm: "ቀጥተኛ የፕሮጀክት ገቢ",
                outAm: "የገቢ ማስተካከያ",
              },
              "4110": {
                in: "Interest & Other Operating Income Received",
                out: "Other Income Reversal",
                inAm: "የወለድ እና ሌላ ገቢ",
                outAm: "ማስተካከያ",
              },
              "2010": {
                in: "Supplier Refunds Received",
                out: "Cash Paid to Suppliers & Subcontractors (AP)",
                inAm: "ከአቅራቢዎች ተመላሽ",
                outAm: "ለአቅራቢዎች እና ንዑስ ተቋራጮች የተከፈለ",
              },
              "2020": {
                in: "Payroll Adjustment Refund",
                out: "Cash Paid for Salaries & Site Wages",
                inAm: "የደሞዝ ተመላሽ",
                outAm: "ለሰራተኞች ደሞዝ የተከፈለ",
              },
              "2030": {
                in: "Tax Refund Received",
                out: "Taxes & Statutory Duties Paid",
                inAm: "የግብር ተመላሽ",
                outAm: "የተከፈለ ግብር እና ቀረጥ",
              },
              "6210": {
                in: "Bank Charge Reversal",
                out: "Bank Charges & Finance Fees Paid",
                inAm: "የባንክ ክፍያ ተመላሽ",
                outAm: "የባንክ አገልግሎት ክፍያዎች",
              },
            };
            const mapped = labelMap[offsetAcc.accountCode];
            const label = mapped
              ? isInflow
                ? mapped.in
                : mapped.out
              : isInflow
              ? `Operating Cash Receipts (${offsetAcc.accountName})`
              : `Operating Cash Payments (${offsetAcc.accountName})`;
            const labelAm = mapped
              ? isInflow
                ? mapped.inAm
                : mapped.outAm
              : label;

            upsertCfLine(
              cfOperatingMap,
              key,
              label,
              labelAm,
              isInflow ? absCash : 0,
              isInflow ? 0 : absCash
            );
          }
        }
      }
    }
  });

  // Build Trial Balance Rows & Check Debit === Credit
  const trialBalanceRows: TrialBalanceRow[] = [];
  let totalOpeningDebit = 0;
  let totalOpeningCredit = 0;
  let totalPeriodDebit = 0;
  let totalPeriodCredit = 0;
  let totalEndingDebit = 0;
  let totalEndingCredit = 0;

  chartOfAccounts.forEach((acc) => {
    const agg = accountAgg.get(acc.accountCode) || { openDr: 0, openCr: 0, perDr: 0, perCr: 0 };
    const totalDr = agg.openDr + agg.perDr;
    const totalCr = agg.openCr + agg.perCr;
    if (totalDr === 0 && totalCr === 0 && !acc.isSystemAccount) return;

    const openNet = round2(agg.openDr - agg.openCr);
    const openingDebit = openNet > 0 ? openNet : 0;
    const openingCredit = openNet < 0 ? Math.abs(openNet) : 0;
    const periodDebit = round2(agg.perDr);
    const periodCredit = round2(agg.perCr);
    const endNet = round2(totalDr - totalCr);
    const endingDebit = endNet > 0 ? endNet : 0;
    const endingCredit = endNet < 0 ? Math.abs(endNet) : 0;

    totalOpeningDebit += openingDebit;
    totalOpeningCredit += openingCredit;
    totalPeriodDebit += periodDebit;
    totalPeriodCredit += periodCredit;
    totalEndingDebit += endingDebit;
    totalEndingCredit += endingCredit;

    trialBalanceRows.push({
      accountCode: acc.accountCode,
      accountName: acc.accountName,
      accountNameAm: acc.accountNameAm || acc.accountName,
      accountType: acc.accountType,
      subType: acc.subType,
      normalBalance: acc.normalBalance,
      openingDebit,
      openingCredit,
      periodDebit,
      periodCredit,
      endingDebit,
      endingCredit,
      netBalance: getSignedAccountBalance(acc, totalDr, totalCr),
    });
  });

  totalOpeningDebit = round2(totalOpeningDebit);
  totalOpeningCredit = round2(totalOpeningCredit);
  totalPeriodDebit = round2(totalPeriodDebit);
  totalPeriodCredit = round2(totalPeriodCredit);
  totalEndingDebit = round2(totalEndingDebit);
  totalEndingCredit = round2(totalEndingCredit);
  const tbDifference = round2(totalEndingDebit - totalEndingCredit);

  // Build General Ledger Running Balances per Entry chronologically
  const glRunningByAccount = new Map<string, number>();
  const generalLedger: GeneralLedgerRow[] = generalLedgerRaw
    .sort((a, b) => a.entryDate.localeCompare(b.entryDate) || a.journalNo.localeCompare(b.journalNo))
    .map((row) => {
      const acc = getAcc(row.accountCode);
      const prev = glRunningByAccount.get(row.accountCode) ?? 0;
      const delta = acc.normalBalance === "Debit" ? row.debit - row.credit : row.credit - row.debit;
      const next = round2(prev + delta);
      glRunningByAccount.set(row.accountCode, next);
      return { ...row, runningBalance: next };
    });

  // ------------------------------------------------------------------
  // 13. INCOME STATEMENT (PROFIT & LOSS FOR PERIOD)
  // ------------------------------------------------------------------
  const getPeriodAccountAmount = (acc: ChartAccountRecord): number => {
    const dr = periodIncomeStmtDebits.get(acc.accountCode) || 0;
    const cr = periodIncomeStmtCredits.get(acc.accountCode) || 0;
    return getSignedAccountBalance(acc, dr, cr);
  };

  let projectRevenue = 0;
  let otherIncome = 0;
  const revenueBreakdown: StatementLineAmount[] = [];
  let directMaterialsCost = 0;
  let directLaborCost = 0;
  let directSubcontractorCost = 0;
  let directEquipmentCost = 0;
  const directCostBreakdown: StatementLineAmount[] = [];
  let operatingExpenses = 0;
  let administrativeExpenses = 0;
  const operatingExpenseBreakdown: StatementLineAmount[] = [];
  const adminExpenseBreakdown: StatementLineAmount[] = [];

  chartOfAccounts.forEach((acc) => {
    const amt = getPeriodAccountAmount(acc);
    if (acc.accountType === "Revenue") {
      if (acc.subType === "Other Income" || acc.accountCode === "4110" || acc.accountCode === "4120") {
        otherIncome += amt;
      } else {
        projectRevenue += amt;
      }
      if (Math.abs(amt) > 0) {
        revenueBreakdown.push({ code: acc.accountCode, label: acc.accountName, labelAm: acc.accountNameAm || acc.accountName, amount: round2(amt) });
      }
    } else if (acc.accountType === "Cost of Construction") {
      if (acc.accountCode === "5010") directMaterialsCost += amt;
      else if (acc.accountCode === "5020") directLaborCost += amt;
      else if (acc.accountCode === "5030") directSubcontractorCost += amt;
      else if (acc.accountCode === "5040") directEquipmentCost += amt;
      else directMaterialsCost += amt;
      if (Math.abs(amt) > 0) {
        directCostBreakdown.push({ code: acc.accountCode, label: acc.accountName, labelAm: acc.accountNameAm || acc.accountName, amount: round2(amt) });
      }
    } else if (acc.accountType === "Operating Expense") {
      operatingExpenses += amt;
      if (Math.abs(amt) > 0) {
        operatingExpenseBreakdown.push({ code: acc.accountCode, label: acc.accountName, labelAm: acc.accountNameAm || acc.accountName, amount: round2(amt) });
      }
    } else if (acc.accountType === "Administrative Expense") {
      administrativeExpenses += amt;
      if (Math.abs(amt) > 0) {
        adminExpenseBreakdown.push({ code: acc.accountCode, label: acc.accountName, labelAm: acc.accountNameAm || acc.accountName, amount: round2(amt) });
      }
    }
  });

  projectRevenue = round2(projectRevenue);
  otherIncome = round2(otherIncome);
  const totalRevenue = round2(projectRevenue + otherIncome);
  const directConstructionCosts = round2(
    directMaterialsCost + directLaborCost + directSubcontractorCost + directEquipmentCost
  );
  const grossProfit = round2(projectRevenue - directConstructionCosts);
  operatingExpenses = round2(operatingExpenses);
  administrativeExpenses = round2(administrativeExpenses);
  const totalExpenses = round2(
    directConstructionCosts + operatingExpenses + administrativeExpenses
  );
  const operatingProfit = round2(
    grossProfit - operatingExpenses - administrativeExpenses
  );
  const netProfitLoss = round2(operatingProfit + otherIncome);

  const incomeStatement: IncomeStatementData = {
    periodStart,
    periodEnd,
    projectRevenue,
    otherIncome,
    totalRevenue,
    revenueBreakdown,
    directMaterialsCost: round2(directMaterialsCost),
    directLaborCost: round2(directLaborCost),
    directSubcontractorCost: round2(directSubcontractorCost),
    directEquipmentCost: round2(directEquipmentCost),
    directConstructionCosts,
    directCostBreakdown,
    grossProfit,
    operatingExpenses,
    administrativeExpenses,
    operatingExpenseBreakdown,
    adminExpenseBreakdown,
    totalExpenses,
    operatingProfit,
    netProfitLoss,
  };

  // ------------------------------------------------------------------
  // 14. BALANCE SHEET (CUMULATIVE AS OF periodEnd) & EQUITY CONTINUITY
  // ------------------------------------------------------------------
  const currentAssets: StatementLineAmount[] = [];
  const nonCurrentAssets: StatementLineAmount[] = [];
  const currentLiabilities: StatementLineAmount[] = [];
  const nonCurrentLiabilities: StatementLineAmount[] = [];
  let totalCurrentAssets = 0;
  let totalNonCurrentAssets = 0;
  let totalCurrentLiabilities = 0;
  let totalNonCurrentLiabilities = 0;

  let ownersEquity = 0;
  let openingOwnerCapital = 0;
  let recordedRetainedEarnings = 0;
  let drawings = 0;
  let priorDrawings = 0;
  let periodOtherEquityAdjustments = 0;
  let cumNominalNetProfitIncludingClosing = 0;
  let prePeriodNetProfitNonClosing = 0;

  trialBalanceRows.forEach((row) => {
    const acc = getAcc(row.accountCode);
    const netDrMinusCr = round2(row.endingDebit - row.endingCredit);

    if (acc.accountType === "Asset") {
      // Asset value = Debit - Credit (handles contra-assets like 1590 seamlessly as negative)
      const val = netDrMinusCr;
      if (acc.subType === "Non-Current Asset") {
        totalNonCurrentAssets += val;
        if (Math.abs(val) > 0 || acc.accountCode === "1510") {
          nonCurrentAssets.push({ code: acc.accountCode, label: acc.accountName, labelAm: acc.accountNameAm || acc.accountName, amount: val });
        }
      } else {
        totalCurrentAssets += val;
        if (Math.abs(val) > 0 || ["1010", "1020", "1110", "1210"].includes(acc.accountCode)) {
          currentAssets.push({ code: acc.accountCode, label: acc.accountName, labelAm: acc.accountNameAm || acc.accountName, amount: val });
        }
      }
    } else if (acc.accountType === "Liability") {
      const val = round2(-netDrMinusCr); // Credit - Debit
      if (acc.subType === "Non-Current Liability") {
        totalNonCurrentLiabilities += val;
        if (Math.abs(val) > 0 || acc.accountCode === "2510") {
          nonCurrentLiabilities.push({ code: acc.accountCode, label: acc.accountName, labelAm: acc.accountNameAm || acc.accountName, amount: val });
        }
      } else {
        totalCurrentLiabilities += val;
        if (Math.abs(val) > 0 || ["2010", "2020", "2030"].includes(acc.accountCode)) {
          currentLiabilities.push({ code: acc.accountCode, label: acc.accountName, labelAm: acc.accountNameAm || acc.accountName, amount: val });
        }
      }
    } else if (acc.accountType === "Equity") {
      const crMinusDr = round2(-netDrMinusCr);
      const openCrMinusDr = round2(row.openingCredit - row.openingDebit);
      if (acc.subType === "Owner Capital" || acc.accountCode === "3010") {
        ownersEquity += crMinusDr;
        openingOwnerCapital += openCrMinusDr;
      } else if (acc.subType === "Dividends / Drawings" || acc.accountCode === "3210") {
        drawings += netDrMinusCr; // Debit balance reduces equity
        priorDrawings += round2(row.openingDebit - row.openingCredit);
      } else {
        // Retained Earnings 3110 or other equity
        recordedRetainedEarnings += crMinusDr;
        periodOtherEquityAdjustments += round2(row.periodCredit - row.periodDebit);
      }
    } else {
      // Unclosed Nominal Revenue/Expense balances in Trial Balance contribute to Retained Earnings
      cumNominalNetProfitIncludingClosing += round2(-netDrMinusCr);
    }
  });

  // Pre-period cumulative net profit (non-closing) for Opening Retained Earnings on Changes in Equity
  chartOfAccounts.forEach((acc) => {
    const preDr = cumulativePrePeriodIncomeDebits.get(acc.accountCode) || 0;
    const preCr = cumulativePrePeriodIncomeCredits.get(acc.accountCode) || 0;
    if (acc.accountType === "Revenue" || acc.accountType === "Cost of Construction" || acc.accountType === "Operating Expense" || acc.accountType === "Administrative Expense") {
      prePeriodNetProfitNonClosing += round2(preCr - preDr);
    }
  });

  totalCurrentAssets = round2(totalCurrentAssets);
  totalNonCurrentAssets = round2(totalNonCurrentAssets);
  const totalAssets = round2(totalCurrentAssets + totalNonCurrentAssets);
  totalCurrentLiabilities = round2(totalCurrentLiabilities);
  totalNonCurrentLiabilities = round2(totalNonCurrentLiabilities);
  const totalLiabilities = round2(totalCurrentLiabilities + totalNonCurrentLiabilities);

  ownersEquity = round2(ownersEquity);
  openingOwnerCapital = round2(openingOwnerCapital);
  drawings = round2(drawings);
  priorDrawings = round2(priorDrawings);

  const retainedEarnings = round2(
    recordedRetainedEarnings + cumNominalNetProfitIncludingClosing - drawings
  );
  const totalEquity = round2(ownersEquity + retainedEarnings);
  const priorRetainedEarnings = round2(retainedEarnings - netProfitLoss);
  const totalLiabilitiesAndEquity = round2(totalLiabilities + totalEquity);
  const balanceDifference = round2(totalAssets - totalLiabilitiesAndEquity);

  const equityBreakdown: StatementLineAmount[] = [
    { code: "3010", label: "Owner's Paid-In Capital", labelAm: "የባለቤቶች ካፒታል", amount: ownersEquity },
    { code: "3110", label: "Retained Earnings (Prior Periods)", labelAm: "ያለፈው ጊዜ የተጠራቀመ ትርፍ", amount: priorRetainedEarnings },
    { code: "3900", label: "Current Period Net Profit / (Loss)", labelAm: "የወቅቱ የተጣራ ትርፍ / ኪሳራ", amount: netProfitLoss },
  ];
  if (Math.abs(drawings) > 0) {
    equityBreakdown.push({ code: "3210", label: "Less: Owner Drawings / Dividends", labelAm: "ተቀናሽ፡ የባለቤቶች ክፍፍል", amount: round2(-drawings) });
  }

  const balanceSheet: BalanceSheetData = {
    asOfDate: periodEnd,
    currentAssets,
    totalCurrentAssets,
    nonCurrentAssets,
    totalNonCurrentAssets,
    totalAssets,
    currentLiabilities,
    totalCurrentLiabilities,
    nonCurrentLiabilities,
    totalNonCurrentLiabilities,
    totalLiabilities,
    ownersEquity,
    priorRetainedEarnings,
    currentPeriodNetProfit: netProfitLoss,
    drawings,
    retainedEarnings,
    equityBreakdown,
    totalEquity,
    totalLiabilitiesAndEquity,
    balanceDifference,
    isBalanced: Math.abs(balanceDifference) <= 0.05,
  };

  // ------------------------------------------------------------------
  // 15. STATEMENT OF CHANGES IN EQUITY
  // ------------------------------------------------------------------
  const openingRetainedEarnings = round2(prePeriodNetProfitNonClosing - priorDrawings);
  const openingTotalEquity = round2(openingOwnerCapital + openingRetainedEarnings);
  const capitalContributions = round2(ownersEquity - openingOwnerCapital);
  const periodDrawings = round2(drawings - priorDrawings);
  // Exclude closing JE impact on 3110 from otherEquityAdjustments if already counted inside netProfitForPeriod
  const closingCreditsTo3110InPeriod = allPostedEntries
    .filter((je) => je.entryType === "Closing" && je.entryDate >= periodStart && je.entryDate <= periodEnd)
    .reduce((sum, je) => {
      return (
        sum +
        je.lines
          .filter((ln) => ln.accountCode === "3110")
          .reduce((s, ln) => s + (ln.credit - ln.debit), 0)
      );
    }, 0);
  const nonClosingOtherEquityAdj = round2(
    periodOtherEquityAdjustments - closingCreditsTo3110InPeriod
  );
  const closingRetainedEarnings = round2(
    openingRetainedEarnings + netProfitLoss - periodDrawings + nonClosingOtherEquityAdj
  );
  const closingTotalEquity = round2(
    openingTotalEquity + capitalContributions + netProfitLoss - periodDrawings + nonClosingOtherEquityAdj
  );

  const changesInEquity: StatementOfChangesInEquityData = {
    periodStart,
    periodEnd,
    openingOwnerCapital,
    openingRetainedEarnings,
    openingTotalEquity,
    capitalContributions,
    netProfitForPeriod: netProfitLoss,
    dividendsOrDrawings: periodDrawings,
    otherEquityAdjustments: nonClosingOtherEquityAdj,
    closingOwnerCapital: ownersEquity,
    closingRetainedEarnings,
    closingTotalEquity,
  };

  // ------------------------------------------------------------------
  // 16. CASH FLOW STATEMENT (OPERATING, INVESTING, FINANCING)
  // ------------------------------------------------------------------
  openingCashBalance = round2(openingCashBalance);
  const operatingLines = Array.from(cfOperatingMap.values());
  const investingLines = Array.from(cfInvestingMap.values());
  const financingLines = Array.from(cfFinancingMap.values());

  const netOperatingCashFlow = round2(operatingLines.reduce((s, l) => s + l.net, 0));
  const netInvestingCashFlow = round2(investingLines.reduce((s, l) => s + l.net, 0));
  const netFinancingCashFlow = round2(financingLines.reduce((s, l) => s + l.net, 0));

  const totalCashInflows = round2(
    operatingLines.reduce((s, l) => s + l.inflow, 0) +
    investingLines.reduce((s, l) => s + l.inflow, 0) +
    financingLines.reduce((s, l) => s + l.inflow, 0)
  );
  const totalCashOutflows = round2(
    operatingLines.reduce((s, l) => s + l.outflow, 0) +
    investingLines.reduce((s, l) => s + l.outflow, 0) +
    financingLines.reduce((s, l) => s + l.outflow, 0)
  );
  const netCashFlow = round2(totalCashInflows - totalCashOutflows);
  const closingCashBalance = round2(openingCashBalance + netCashFlow);

  const cashFlowStatement: CashFlowStatementData = {
    periodStart,
    periodEnd,
    openingCashBalance,
    operatingLines,
    netOperatingCashFlow,
    investingLines,
    netInvestingCashFlow,
    financingLines,
    netFinancingCashFlow,
    totalCashInflows,
    totalCashOutflows,
    netCashFlow,
    closingCashBalance,
    internalTransfersTotal: round2(internalTransfersTotal),
  };

  // ------------------------------------------------------------------
  // 17. AR & AP STATEMENT REPORTS
  // ------------------------------------------------------------------
  const arRows: ReceivableStatementRow[] = normalizedInvoices
    .filter(
      (inv) =>
        matchesDimFilter(inv.project, inv.normalizedDepartment) &&
        safeString(inv.date, referenceToday).slice(0, 10) <= periodEnd
    )
    .map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber || inv.receivableId || inv.id,
      client: inv.normalizedClient,
      project: inv.project,
      category: inv.normalizedReceivableCategory,
      date: inv.date,
      dueDate: inv.dueDate,
      totalAmount: inv.amount,
      collectedAmount: inv.collectedAmount,
      outstandingAmount: inv.outstandingAmount,
      agingCategory: inv.agingCategory,
      status: inv.arLifecycleStatus,
    }));

  const apRows: PayableStatementRow[] = normalizedExpenses
    .filter(
      (exp) =>
        matchesDimFilter(exp.project, exp.normalizedDepartment) &&
        safeString(exp.date, referenceToday).slice(0, 10) <= periodEnd
    )
    .map((exp) => ({
      id: exp.id,
      billNumber: exp.billNumber || exp.payableId || exp.id,
      supplier: exp.normalizedSupplier,
      project: exp.project,
      category: exp.normalizedPayableCategory,
      date: exp.date,
      dueDate: exp.dueDate || exp.date,
      totalAmount: exp.amount,
      paidAmount: exp.paidCashAmount,
      outstandingAmount: exp.outstandingAmount,
      agingCategory: exp.agingCategory,
      status: exp.apLifecycleStatus,
    }));

  const arReport = {
    rows: arRows,
    totalBilled: round2(arRows.reduce((s, r) => s + r.totalAmount, 0)),
    totalCollected: round2(arRows.reduce((s, r) => s + r.collectedAmount, 0)),
    totalOutstanding: round2(arRows.reduce((s, r) => s + r.outstandingAmount, 0)),
    totalOverdue: round2(
      arRows.filter((r) => r.status === "Overdue").reduce((s, r) => s + r.outstandingAmount, 0)
    ),
  };

  const apReport = {
    rows: apRows,
    totalBilled: round2(apRows.reduce((s, r) => s + r.totalAmount, 0)),
    totalPaid: round2(apRows.reduce((s, r) => s + r.paidAmount, 0)),
    totalOutstanding: round2(apRows.reduce((s, r) => s + r.outstandingAmount, 0)),
    totalOverdue: round2(
      apRows.filter((r) => r.status === "Overdue").reduce((s, r) => s + r.outstandingAmount, 0)
    ),
  };

  // ------------------------------------------------------------------
  // 18. FINANCIAL ANALYSIS RATIOS (7 RATIOS)
  // ------------------------------------------------------------------
  const cashPlusBank = round2(
    (trialBalanceRows.find((r) => r.accountCode === "1010")?.netBalance || 0) +
    (trialBalanceRows.find((r) => r.accountCode === "1015")?.netBalance || 0) +
    (trialBalanceRows.find((r) => r.accountCode === "1020")?.netBalance || 0)
  );
  const arTotalBal = round2(
    (trialBalanceRows.find((r) => r.accountCode === "1110")?.netBalance || 0) +
    (trialBalanceRows.find((r) => r.accountCode === "1120")?.netBalance || 0)
  );
  const quickAssets = round2(cashPlusBank + arTotalBal);

  const grossMarginVal =
    projectRevenue > 0 ? round2((grossProfit / projectRevenue) * 100) : null;
  const netMarginVal =
    totalRevenue > 0 ? round2((netProfitLoss / totalRevenue) * 100) : null;
  const currentRatioVal =
    totalCurrentLiabilities > 0
      ? round2(totalCurrentAssets / totalCurrentLiabilities)
      : null;
  const quickRatioVal =
    totalCurrentLiabilities > 0
      ? round2(quickAssets / totalCurrentLiabilities)
      : null;
  const debtToEquityVal =
    totalEquity > 0 ? round2(totalLiabilities / totalEquity) : null;
  const roaVal =
    totalAssets > 0 ? round2((netProfitLoss / totalAssets) * 100) : null;
  const roeVal =
    totalEquity > 0 ? round2((netProfitLoss / totalEquity) * 100) : null;

  const ratios: FinancialRatioMetric[] = [
    {
      id: "gross-profit-margin",
      name: "Gross Profit Margin",
      nameAm: "አጠቃላይ የትርፍ ህዳግ",
      formula: "(Gross Profit ÷ Project Revenue) × 100",
      value: grossMarginVal,
      formattedValue: grossMarginVal === null ? "N/A" : `${grossMarginVal.toFixed(1)}%`,
      unit: "%",
      health:
        grossMarginVal === null
          ? "Insufficient Data"
          : grossMarginVal >= 20
          ? "Healthy"
          : grossMarginVal >= 10
          ? "Watch"
          : "Critical",
      explanation:
        grossMarginVal === null
          ? "No verified project revenue recorded in the selected period."
          : `Retains ${grossMarginVal.toFixed(1)}% of contract revenue after direct construction materials, labor, subcontractors, and equipment costs.`,
      explanationAm:
        grossMarginVal === null
          ? "በተመረጠው ወቅት የተረጋገጠ የፕሮጀክት ገቢ የለም።"
          : `ቀጥተኛ የግንባታ ወጪዎች ከተቀነሱ በኋላ ${grossMarginVal.toFixed(1)}% ትርፍ ተገኝቷል።`,
    },
    {
      id: "net-profit-margin",
      name: "Net Profit Margin",
      nameAm: "የተጣራ የትርፍ ህዳግ",
      formula: "(Net Profit ÷ Total Revenue) × 100",
      value: netMarginVal,
      formattedValue: netMarginVal === null ? "N/A" : `${netMarginVal.toFixed(1)}%`,
      unit: "%",
      health:
        netMarginVal === null
          ? "Insufficient Data"
          : netMarginVal >= 12
          ? "Healthy"
          : netMarginVal >= 5
          ? "Watch"
          : "Critical",
      explanation:
        netMarginVal === null
          ? "Total revenue is zero in the selected period."
          : `Bottom-line earnings convert ${netMarginVal.toFixed(1)}% of total revenue into net profit after site overhead and administrative costs.`,
      explanationAm:
        netMarginVal === null
          ? "በተመረጠው ወቅት ጠቅላላ ገቢ ዜሮ ነው።"
          : `ሁሉም የስራ እና የአስተዳደር ወጪዎች ከተቀነሱ በኋላ ${netMarginVal.toFixed(1)}% የተጣራ ትርፍ።`,
    },
    {
      id: "current-ratio",
      name: "Current Ratio",
      nameAm: "የአሁን ፈሳሽነት ጥምርታ",
      formula: "Current Assets ÷ Current Liabilities",
      value: currentRatioVal,
      formattedValue: currentRatioVal === null ? "N/A" : `${currentRatioVal.toFixed(2)}x`,
      unit: "x",
      health:
        currentRatioVal === null
          ? totalCurrentAssets > 0
            ? "Healthy"
            : "Insufficient Data"
          : currentRatioVal >= 1.5
          ? "Healthy"
          : currentRatioVal >= 1.0
          ? "Watch"
          : "Critical",
      explanation:
        currentRatioVal === null
          ? totalCurrentAssets > 0
            ? "No current liabilities outstanding; short-term solvency is unencumbered."
            : "Insufficient asset/liability activity."
          : `Company holds ${currentRatioVal.toFixed(2)}x short-term assets per unit of current liabilities (construction benchmark >= 1.50x).`,
      explanationAm:
        currentRatioVal === null
          ? "ያልተከፈለ የአጭር ጊዜ እዳ የለም።"
          : `ለእያንዳንዱ የአጭር ጊዜ እዳ ${currentRatioVal.toFixed(2)}x እጥፍ ንብረት አለ።`,
    },
    {
      id: "quick-ratio",
      name: "Quick Ratio (Acid-Test)",
      nameAm: "ፈጣን ፈሳሽነት ጥምርታ",
      formula: "(Cash + Bank + Receivables) ÷ Current Liabilities",
      value: quickRatioVal,
      formattedValue: quickRatioVal === null ? "N/A" : `${quickRatioVal.toFixed(2)}x`,
      unit: "x",
      health:
        quickRatioVal === null
          ? quickAssets > 0
            ? "Healthy"
            : "Insufficient Data"
          : quickRatioVal >= 1.0
          ? "Healthy"
          : quickRatioVal >= 0.75
          ? "Watch"
          : "Critical",
      explanation:
        quickRatioVal === null
          ? quickAssets > 0
            ? "No current liabilities outstanding against liquid cash & receivables."
            : "Insufficient liquid asset/liability data."
          : `Measures immediate coverage (${quickRatioVal.toFixed(2)}x) using cash, bank balances, and receivables without relying on inventory liquidation.`,
      explanationAm:
        quickRatioVal === null
          ? "ያልተከፈለ የአጭር ጊዜ እዳ የለም።"
          : `ያለ ክምችት ሽያጭ የአጭር ጊዜ እዳዎችን የመሸፈን አቅም ${quickRatioVal.toFixed(2)}x ነው።`,
    },
    {
      id: "debt-to-equity",
      name: "Debt-to-Equity Ratio",
      nameAm: "የእዳ ከካፒታል ጥምርታ",
      formula: "Total Liabilities ÷ Total Equity",
      value: debtToEquityVal,
      formattedValue: debtToEquityVal === null ? "N/A" : `${debtToEquityVal.toFixed(2)}x`,
      unit: "x",
      health:
        debtToEquityVal === null
          ? "Insufficient Data"
          : debtToEquityVal <= 1.2
          ? "Healthy"
          : debtToEquityVal <= 2.0
          ? "Watch"
          : "Critical",
      explanation:
        debtToEquityVal === null
          ? "Total equity is zero or negative; leverage ratio is undefined."
          : `Financial leverage stands at ${debtToEquityVal.toFixed(2)}x debt per unit of shareholders' equity (conservative target <= 1.20x).`,
      explanationAm:
        debtToEquityVal === null
          ? "ካፒታል ዜሮ ወይም አሉታዊ በመሆኑ አይሰላም።"
          : `የድርጅቱ እዳ ከባለቤቶች ካፒታል አንፃር ${debtToEquityVal.toFixed(2)}x ነው።`,
    },
    {
      id: "roa",
      name: "Return on Assets (ROA)",
      nameAm: "የንብረት ትርፋማነት (ROA)",
      formula: "(Net Profit ÷ Total Assets) × 100",
      value: roaVal,
      formattedValue: roaVal === null ? "N/A" : `${roaVal.toFixed(1)}%`,
      unit: "%",
      health:
        roaVal === null
          ? "Insufficient Data"
          : roaVal >= 8
          ? "Healthy"
          : roaVal >= 2
          ? "Watch"
          : "Critical",
      explanation:
        roaVal === null
          ? "Total assets equal zero."
          : `Generates ${roaVal.toFixed(1)}% net return on total deployed assets (${currency} ${totalAssets.toLocaleString()}).`,
      explanationAm:
        roaVal === null
          ? "ጠቅላላ ንብረት ዜሮ ነው።"
          : `ከጠቅላላ ንብረት ላይ ${roaVal.toFixed(1)}% የተጣራ ትርፍ ተመዝግቧል።`,
    },
    {
      id: "roe",
      name: "Return on Equity (ROE)",
      nameAm: "የካፒታል ትርፋማነት (ROE)",
      formula: "(Net Profit ÷ Total Equity) × 100",
      value: roeVal,
      formattedValue: roeVal === null ? "N/A" : `${roeVal.toFixed(1)}%`,
      unit: "%",
      health:
        roeVal === null
          ? "Insufficient Data"
          : roeVal >= 15
          ? "Healthy"
          : roeVal >= 5
          ? "Watch"
          : "Critical",
      explanation:
        roeVal === null
          ? "Total equity is zero or negative."
          : `Delivers ${roeVal.toFixed(1)}% return on owners' equity (${currency} ${totalEquity.toLocaleString()}).`,
      explanationAm:
        roeVal === null
          ? "ካፒታል ዜሮ ወይም አሉታዊ ነው።"
          : `በባለቤቶች ካፒታል ላይ ${roeVal.toFixed(1)}% ትርፍ ተገኝቷል።`,
    },
  ];

  // ------------------------------------------------------------------
  // 19. MONTHLY PROFIT / LOSS TRENDS & ACTIVE PERIOD CLOSE CHECK
  // ------------------------------------------------------------------
  const monthlyTrends: MonthlyProfitTrendRow[] = Array.from(monthlyTrendMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => {
      const rev = round2(v.revenue);
      const dir = round2(v.directCosts);
      const opAdmin = round2(v.opAdmin);
      return {
        month,
        revenue: rev,
        directCosts: dir,
        operatingAndAdminExpenses: opAdmin,
        totalExpenses: round2(dir + opAdmin),
        grossProfit: round2(rev - dir),
        netProfit: round2(rev - dir - opAdmin),
      };
    });

  const financialPeriods = [...(input.financialPeriods || [])].sort((a, b) =>
    b.endDate.localeCompare(a.endDate)
  );
  const activePeriodRecord =
    financialPeriods.find(
      (p) => p.startDate === periodStart && p.endDate === periodEnd
    ) ||
    financialPeriods.find(
      (p) => periodEnd >= p.startDate && periodEnd <= p.endDate
    ) ||
    null;

  return {
    permissions,
    canApproveJournalsAndClosePeriods,
    canPrepareJournals,
    currency,
    companyName,
    referenceToday,
    resolvedRange,
    chartOfAccounts,
    allPostedEntries,
    manualJournalEntries,
    financialPeriods,
    activePeriodRecord,
    isCurrentPeriodClosed: activePeriodRecord?.status === "Closed",
    filterOptions: {
      projects: Array.from(projectSet).sort(),
      departments: Array.from(deptSet).sort(),
      financialYears: Array.from(yearSet).sort().reverse(),
      accounts: chartOfAccounts,
      sourceModules: Array.from(new Set(allPostedEntries.map((e) => e.sourceModule))).sort(),
    },
    incomeStatement,
    balanceSheet,
    cashFlowStatement,
    changesInEquity,
    trialBalance: {
      rows: trialBalanceRows,
      totalOpeningDebit,
      totalOpeningCredit,
      totalPeriodDebit,
      totalPeriodCredit,
      totalEndingDebit,
      totalEndingCredit,
      difference: tbDifference,
      isBalanced: Math.abs(tbDifference) <= 0.05,
    },
    generalLedger,
    arReport,
    apReport,
    ratios,
    monthlyTrends,
    dashboardKpis: {
      totalRevenue,
      totalExpenses,
      grossProfit,
      netProfit: netProfitLoss,
      totalAssets,
      totalLiabilities,
      totalEquity,
      cashPosition: closingCashBalance,
    },
    auditWarnings,
  };
}

// ============================================================================
// DOUBLE-ENTRY JOURNAL VOUCHERS, COA & PERIOD CLOSING MUTATIONS
// ============================================================================

export async function saveChartAccountMutation(params: {
  accountCode: string;
  accountName: string;
  accountNameAm?: string;
  accountType: ChartAccountType;
  subType: ChartAccountSubType;
  normalBalance: "Debit" | "Credit";
  cashFlowSection: "Operating" | "Investing" | "Financing" | "Non-Cash";
  openingBalance?: number;
  currency: string;
  description?: string;
  actorName: string;
  actorRole: string;
  actorUid: string;
}): Promise<ChartAccountRecord> {
  const perms = resolveUserFinancePermissions(params.actorRole);
  if (!perms.canManageTransactions && !perms.canApproveTransactions) {
    throw new Error("Insufficient permissions to manage Chart of Accounts.");
  }
  const code = params.accountCode.trim();
  if (!/^\d{4}$/.test(code)) {
    throw new Error("Account Code must be a 4-digit code (e.g., 1030, 5050).");
  }
  if (!params.accountName.trim()) {
    throw new Error("Account Name is required.");
  }

  const nowIso = new Date().toISOString();
  const record: ChartAccountRecord = {
    id: `COA-${code}`,
    accountCode: code,
    accountName: params.accountName.trim(),
    accountNameAm: params.accountNameAm?.trim() || params.accountName.trim(),
    accountType: params.accountType,
    subType: params.subType,
    normalBalance: params.normalBalance,
    cashFlowSection: params.cashFlowSection,
    isSystemAccount: SYSTEM_CHART_OF_ACCOUNTS.some((a) => a.accountCode === code),
    isActive: true,
    openingBalance: round2(params.openingBalance || 0),
    currency: params.currency,
    description: params.description?.trim() || "",
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  await DbService.saveChartAccount(record);
  await DbService.addAuditLog({
    id: `AUD-${Date.now()}`,
    timestamp: nowIso,
    userId: params.actorUid,
    userName: params.actorName,
    role: params.actorRole,
    action: "Save Chart of Account",
    category: "Finance",
    severity: "INFO",
    details: `Saved GL Account ${record.accountCode} - ${record.accountName} (${record.accountType})`,
  });
  return record;
}

export async function createDoubleEntryJournalVoucher(params: {
  entryDate: string;
  project: string;
  department: string;
  referenceNo: string;
  description: string;
  entryType: "Standard" | "Opening Balance" | "Adjusting";
  lines: JournalEntryLine[];
  existingPeriods: FinancialPeriodCloseRecord[];
  submitImmediately?: boolean;
  postImmediatelyIfAuthorized?: boolean;
  actorName: string;
  actorRole: string;
  actorUid: string;
}): Promise<JournalEntryRecord> {
  const perms = resolveUserFinancePermissions(params.actorRole);
  if (!perms.canManageTransactions && !perms.canApproveTransactions) {
    throw new Error("Unauthorized: Only Finance staff can create accounting journal vouchers.");
  }
  if (!params.entryDate || !params.description.trim()) {
    throw new Error("Entry Date and Description are required.");
  }

  const closedMatch = isDateInClosedPeriod(params.entryDate, params.existingPeriods);
  if (closedMatch) {
    throw new Error(
      `Period Locked: Entry date ${params.entryDate} falls within closed financial period ${closedMatch.periodLabel} (${closedMatch.startDate} → ${closedMatch.endDate}). Reopen the period first.`
    );
  }

  const validation = validateJournalEntryLines(params.lines);
  if (!validation.isValid) {
    throw new Error(validation.error || "Debit and Credit validation failed.");
  }

  const nowIso = new Date().toISOString();
  const canPost = perms.isDirector || perms.isFinanceManager;
  const status =
    params.postImmediatelyIfAuthorized && canPost
      ? "Posted"
      : params.submitImmediately
      ? "Submitted"
      : "Draft";

  const id = `JE-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const journalNo = `JE-${params.entryDate.replace(/-/g, "")}-${String(Math.floor(1000 + Math.random() * 9000))}`;

  const entry: JournalEntryRecord = {
    id,
    journalNo,
    entryDate: params.entryDate.slice(0, 10),
    fiscalYear: params.entryDate.slice(0, 4),
    periodMonth: params.entryDate.slice(0, 7),
    project: safeString(params.project, "Corporate Treasury"),
    department: safeString(params.department, "Finance"),
    referenceNo: safeString(params.referenceNo, journalNo),
    description: params.description.trim(),
    entryType: params.entryType,
    sourceModule: "Manual Journal",
    lines: params.lines.map((l, idx) => ({
      ...l,
      lineNo: idx + 1,
      debit: round2(l.debit),
      credit: round2(l.credit),
    })),
    totalDebit: validation.totalDebit,
    totalCredit: validation.totalCredit,
    isBalanced: true,
    status,
    preparedBy: params.actorName,
    preparedById: params.actorUid,
    approvedBy: status === "Posted" ? params.actorName : undefined,
    approvedAt: status === "Posted" ? nowIso : undefined,
    auditHistory: [
      {
        timestamp: nowIso,
        action: status === "Posted" ? "Created & Posted" : `Created (${status})`,
        actorName: params.actorName,
        actorRole: params.actorRole,
        notes: `${params.description.trim()} | Dr/Cr ${validation.totalDebit.toLocaleString()}`,
      },
    ],
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  await DbService.saveJournalEntry(entry);
  await DbService.addAuditLog({
    id: `AUD-${Date.now()}`,
    timestamp: nowIso,
    userId: params.actorUid,
    userName: params.actorName,
    role: params.actorRole,
    action: "Create Double-Entry Journal Voucher",
    category: "Finance",
    severity: status === "Posted" ? "INFO" : "INFO",
    details: `${journalNo} (${status}) Dr/Cr ${validation.totalDebit.toLocaleString()} — ${entry.description}`,
  });

  return entry;
}

export async function approveAndPostJournalEntry(params: {
  entry: JournalEntryRecord;
  existingPeriods: FinancialPeriodCloseRecord[];
  actorName: string;
  actorRole: string;
  actorUid: string;
}): Promise<JournalEntryRecord> {
  const perms = resolveUserFinancePermissions(params.actorRole);
  if (!perms.isDirector && !perms.isFinanceManager) {
    throw new Error("RBAC Denied: Only Finance Manager, Super Admin, or Head Office can approve and post journal vouchers.");
  }

  const closedMatch = isDateInClosedPeriod(params.entry.entryDate, params.existingPeriods);
  if (closedMatch) {
    throw new Error(`Period Locked: Cannot post into closed period ${closedMatch.periodLabel}.`);
  }

  const validation = validateJournalEntryLines(params.entry.lines);
  if (!validation.isValid) {
    throw new Error(validation.error || "Cannot post unbalanced journal entry.");
  }

  const nowIso = new Date().toISOString();
  const updated: JournalEntryRecord = {
    ...params.entry,
    status: "Posted",
    approvedBy: params.actorName,
    approvedAt: nowIso,
    updatedAt: nowIso,
    auditHistory: [
      ...(params.entry.auditHistory || []),
      {
        timestamp: nowIso,
        action: "Approved & Posted",
        actorName: params.actorName,
        actorRole: params.actorRole,
      },
    ],
  };

  await DbService.saveJournalEntry(updated);
  await DbService.addAuditLog({
    id: `AUD-${Date.now()}`,
    timestamp: nowIso,
    userId: params.actorUid,
    userName: params.actorName,
    role: params.actorRole,
    action: "Post Journal Entry",
    category: "Finance",
    severity: "INFO",
    details: `Posted double-entry voucher ${updated.journalNo} (${updated.totalDebit.toLocaleString()})`,
  });

  return updated;
}

export async function rejectJournalEntry(params: {
  entry: JournalEntryRecord;
  reason: string;
  actorName: string;
  actorRole: string;
  actorUid: string;
}): Promise<JournalEntryRecord> {
  const perms = resolveUserFinancePermissions(params.actorRole);
  if (!perms.isDirector && !perms.isFinanceManager) {
    throw new Error("Only Finance Manager or Director can reject submitted journal vouchers.");
  }
  const nowIso = new Date().toISOString();
  const updated: JournalEntryRecord = {
    ...params.entry,
    status: "Rejected",
    rejectedReason: params.reason.trim() || "Returned for correction",
    updatedAt: nowIso,
    auditHistory: [
      ...(params.entry.auditHistory || []),
      {
        timestamp: nowIso,
        action: "Rejected",
        actorName: params.actorName,
        actorRole: params.actorRole,
        notes: params.reason,
      },
    ],
  };
  await DbService.saveJournalEntry(updated);
  return updated;
}

export async function prepareAndCloseFinancialPeriod(params: {
  state: Part7FinancialStatementsState;
  periodType: "Daily" | "Monthly" | "Quarterly" | "Annual";
  action: "SubmitForReview" | "CloseAndLock";
  notes?: string;
  actorName: string;
  actorRole: string;
  actorUid: string;
}): Promise<{ period: FinancialPeriodCloseRecord; closingEntry?: JournalEntryRecord }> {
  const { state, periodType, action, actorName, actorRole, actorUid } = params;
  const perms = resolveUserFinancePermissions(actorRole);

  if (action === "CloseAndLock" && !perms.isDirector && !perms.isFinanceManager) {
    throw new Error("RBAC Denied: Only Finance Manager, Super Admin, or Head Office can approve and close a financial period.");
  }
  if (!perms.canManageTransactions && !perms.isDirector && !perms.isFinanceManager) {
    throw new Error("Insufficient permissions for period closing operations.");
  }

  if (!state.trialBalance.isBalanced) {
    throw new Error(`Cannot close period: Trial Balance is out of balance by ${state.trialBalance.difference}.`);
  }
  if (!state.balanceSheet.isBalanced) {
    throw new Error(`Cannot close period: Balance Sheet Assets != Liabilities + Equity (Diff: ${state.balanceSheet.balanceDifference}).`);
  }

  const nowIso = new Date().toISOString();
  const periodKey = `${state.resolvedRange.startDate}_to_${state.resolvedRange.endDate}`;
  const existing = state.financialPeriods.find(
    (p) => p.startDate === state.resolvedRange.startDate && p.endDate === state.resolvedRange.endDate
  );

  if (existing?.status === "Closed") {
    throw new Error(`Financial period ${existing.periodLabel} is already closed.`);
  }

  let closingEntry: JournalEntryRecord | undefined;

  if (action === "CloseAndLock") {
    // Build balanced Closing Journal Entry moving non-closed nominal accounts to 3110 Retained Earnings
    const closingLines: JournalEntryLine[] = [];
    let lineNo = 1;
    let netTransferToRetained = 0;

    state.chartOfAccounts.forEach((acc) => {
      if (
        acc.accountType !== "Revenue" &&
        acc.accountType !== "Cost of Construction" &&
        acc.accountType !== "Operating Expense" &&
        acc.accountType !== "Administrative Expense"
      ) {
        return;
      }
      // Compute net balance across non-closed entries up to periodEnd for this account
      const tbRow = state.trialBalance.rows.find((r) => r.accountCode === acc.accountCode);
      if (!tbRow) return;
      const drMinusCr = round2(tbRow.endingDebit - tbRow.endingCredit);
      if (Math.abs(drMinusCr) < 0.01) return;

      if (drMinusCr < 0) {
        // Account has net Credit balance (Revenue) -> Debit to close it out
        const amt = round2(Math.abs(drMinusCr));
        closingLines.push({
          lineNo: lineNo++,
          accountCode: acc.accountCode,
          accountName: acc.accountName,
          accountType: acc.accountType,
          subType: acc.subType,
          debit: amt,
          credit: 0,
          memo: `Close ${acc.accountName}`,
          project: "Corporate Consolidation",
          department: "Finance",
        });
        netTransferToRetained += amt;
      } else {
        // Account has net Debit balance (Expense) -> Credit to close it out
        const amt = round2(drMinusCr);
        closingLines.push({
          lineNo: lineNo++,
          accountCode: acc.accountCode,
          accountName: acc.accountName,
          accountType: acc.accountType,
          subType: acc.subType,
          debit: 0,
          credit: amt,
          memo: `Close ${acc.accountName}`,
          project: "Corporate Consolidation",
          department: "Finance",
        });
        netTransferToRetained -= amt;
      }
    });

    netTransferToRetained = round2(netTransferToRetained);
    if (closingLines.length > 0 && Math.abs(netTransferToRetained) > 0.01) {
      const retainedAcc = state.chartOfAccounts.find((a) => a.accountCode === "3110") || SYSTEM_CHART_OF_ACCOUNTS.find((a) => a.accountCode === "3110")!;
      closingLines.push({
        lineNo: lineNo++,
        accountCode: retainedAcc.accountCode,
        accountName: retainedAcc.accountName,
        accountType: retainedAcc.accountType,
        subType: retainedAcc.subType,
        debit: netTransferToRetained < 0 ? round2(Math.abs(netTransferToRetained)) : 0,
        credit: netTransferToRetained > 0 ? netTransferToRetained : 0,
        memo: `Transfer net income to Retained Earnings (${state.resolvedRange.startDate} → ${state.resolvedRange.endDate})`,
        project: "Corporate Consolidation",
        department: "Finance",
      });

      const totDr = round2(closingLines.reduce((s, l) => s + l.debit, 0));
      const totCr = round2(closingLines.reduce((s, l) => s + l.credit, 0));

      closingEntry = {
        id: `JE-CLOSE-${periodKey}-${Date.now()}`,
        journalNo: `CLS-${state.resolvedRange.endDate.replace(/-/g, "")}`,
        entryDate: state.resolvedRange.endDate,
        fiscalYear: state.resolvedRange.endDate.slice(0, 4),
        periodMonth: state.resolvedRange.endDate.slice(0, 7),
        project: "Corporate Consolidation",
        department: "Finance",
        referenceNo: `CLOSE-${state.resolvedRange.endDate}`,
        description: `Official Period Closing Entry (${state.resolvedRange.startDate} to ${state.resolvedRange.endDate})`,
        entryType: "Closing",
        sourceModule: "Period Closing",
        lines: closingLines,
        totalDebit: totDr,
        totalCredit: totCr,
        isBalanced: Math.abs(totDr - totCr) <= 0.01,
        status: "Posted",
        preparedBy: existing?.preparedBy || actorName,
        preparedById: actorUid,
        reviewedBy: existing?.reviewedBy || actorName,
        approvedBy: actorName,
        approvedAt: nowIso,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
    }
  }

  const periodRecord: FinancialPeriodCloseRecord = {
    id: existing?.id || `FP-${periodKey}`,
    periodKey,
    periodLabel: `${periodType} (${state.resolvedRange.startDate} → ${state.resolvedRange.endDate})`,
    periodType,
    financialYear: state.resolvedRange.endDate.slice(0, 4),
    startDate: state.resolvedRange.startDate,
    endDate: state.resolvedRange.endDate,
    status: action === "CloseAndLock" ? "Closed" : "Under Review",
    totalRevenueSnapshot: state.incomeStatement.totalRevenue,
    totalExpensesSnapshot: state.incomeStatement.totalExpenses,
    netProfitSnapshot: state.incomeStatement.netProfitLoss,
    totalAssetsSnapshot: state.balanceSheet.totalAssets,
    totalLiabilitiesSnapshot: state.balanceSheet.totalLiabilities,
    totalEquitySnapshot: state.balanceSheet.totalEquity,
    isTrialBalanceBalanced: state.trialBalance.isBalanced,
    isBalanceSheetBalanced: state.balanceSheet.isBalanced,
    closingJournalEntryId: closingEntry?.id || existing?.closingJournalEntryId,
    preparedBy: existing?.preparedBy || actorName,
    preparedAt: existing?.preparedAt || nowIso,
    reviewedBy: action === "CloseAndLock" ? existing?.reviewedBy || actorName : actorName,
    reviewedAt: nowIso,
    approvedBy: action === "CloseAndLock" ? actorName : undefined,
    approvedAt: action === "CloseAndLock" ? nowIso : undefined,
    notes: params.notes?.trim() || existing?.notes,
    auditHistory: [
      ...(existing?.auditHistory || []),
      {
        timestamp: nowIso,
        action: action === "CloseAndLock" ? "Period Closed & Locked" : "Submitted for Period Review",
        actorName,
        actorRole,
        notes: params.notes,
      },
    ],
    createdAt: existing?.createdAt || nowIso,
    updatedAt: nowIso,
  };

  await DbService.closeFinancialPeriodAtomic({
    period: periodRecord,
    closingEntry,
  });

  await DbService.addAuditLog({
    id: `AUD-${Date.now()}`,
    timestamp: nowIso,
    userId: actorUid,
    userName: actorName,
    role: actorRole,
    action: action === "CloseAndLock" ? "Close Financial Period" : "Submit Financial Period for Review",
    category: "Finance",
    severity: action === "CloseAndLock" ? "WARNING" : "INFO",
    details: `${periodRecord.periodLabel} -> ${periodRecord.status} (Net Profit ${state.currency} ${state.incomeStatement.netProfitLoss.toLocaleString()})`,
  });

  return { period: periodRecord, closingEntry };
}

export async function reopenClosedFinancialPeriod(params: {
  period: FinancialPeriodCloseRecord;
  closingEntry?: JournalEntryRecord;
  reason: string;
  actorName: string;
  actorRole: string;
  actorUid: string;
}): Promise<FinancialPeriodCloseRecord> {
  const perms = resolveUserFinancePermissions(params.actorRole);
  if (!perms.isDirector && !perms.isFinanceManager) {
    throw new Error("RBAC Denied: Only Super Admin, Head Office, or Finance Manager can reopen a closed period.");
  }
  if (!params.reason.trim()) {
    throw new Error("A mandatory reason is required to reopen a closed financial period.");
  }
  const nowIso = new Date().toISOString();
  const updatedPeriod: FinancialPeriodCloseRecord = {
    ...params.period,
    status: "Reopened",
    reopenedBy: params.actorName,
    reopenedAt: nowIso,
    reopenedReason: params.reason.trim(),
    updatedAt: nowIso,
    auditHistory: [
      ...(params.period.auditHistory || []),
      {
        timestamp: nowIso,
        action: "Period Reopened",
        actorName: params.actorName,
        actorRole: params.actorRole,
        notes: params.reason.trim(),
      },
    ],
  };

  await DbService.saveFinancialPeriod(updatedPeriod);
  if (params.closingEntry) {
    await DbService.saveJournalEntry({
      ...params.closingEntry,
      status: "Reversed",
      updatedAt: nowIso,
      auditHistory: [
        ...(params.closingEntry.auditHistory || []),
        {
          timestamp: nowIso,
          action: "Reversed on Period Reopen",
          actorName: params.actorName,
          actorRole: params.actorRole,
          notes: params.reason.trim(),
        },
      ],
    });
  }

  await DbService.addAuditLog({
    id: `AUD-${Date.now()}`,
    timestamp: nowIso,
    userId: params.actorUid,
    userName: params.actorName,
    role: params.actorRole,
    action: "Reopen Closed Financial Period",
    category: "Finance",
    severity: "WARNING",
    details: `Reopened ${params.period.periodLabel}. Reason: ${params.reason.trim()}`,
  });

  return updatedPeriod;
}

// ============================================================================
// REPORT DATASET & MULTI-SHEET EXCEL (.xlsx) / CSV EXPORT
// ============================================================================

export interface Part7ExportDataset {
  id: Part7StatementTypeId;
  title: string;
  sheetName: string;
  rows: Record<string, any>[];
}

export function buildPart7StatementRows(
  statementId: Part7StatementTypeId,
  state: Part7FinancialStatementsState
): Part7ExportDataset {
  const { incomeStatement: is, balanceSheet: bs, cashFlowStatement: cf, changesInEquity: eq, trialBalance: tb, generalLedger, arReport, apReport, currency } = state;

  switch (statementId) {
    case "income-statement": {
      const rows: Record<string, any>[] = [
        { Section: "REVENUE", AccountCode: "4010", LineItem: "Total Project Revenue", Currency: currency, Amount: is.projectRevenue },
        { Section: "REVENUE", AccountCode: "4110", LineItem: "Other Income", Currency: currency, Amount: is.otherIncome },
        { Section: "REVENUE TOTAL", AccountCode: "", LineItem: "Total Revenue", Currency: currency, Amount: is.totalRevenue },
        { Section: "DIRECT COSTS", AccountCode: "5010", LineItem: "Direct Materials & Procurement Cost", Currency: currency, Amount: is.directMaterialsCost },
        { Section: "DIRECT COSTS", AccountCode: "5020", LineItem: "Direct Site Labor & Payroll Cost", Currency: currency, Amount: is.directLaborCost },
        { Section: "DIRECT COSTS", AccountCode: "5030", LineItem: "Direct Subcontractor & Consultant Cost", Currency: currency, Amount: is.directSubcontractorCost },
        { Section: "DIRECT COSTS", AccountCode: "5040", LineItem: "Direct Equipment, Formwork & Fuel Cost", Currency: currency, Amount: is.directEquipmentCost },
        { Section: "DIRECT COSTS TOTAL", AccountCode: "", LineItem: "Total Direct Construction Costs", Currency: currency, Amount: is.directConstructionCosts },
        { Section: "PROFITABILITY", AccountCode: "", LineItem: "Gross Profit", Currency: currency, Amount: is.grossProfit },
        { Section: "OPERATING EXPENSES", AccountCode: "6010/6210/6310", LineItem: "Operating Expenses", Currency: currency, Amount: is.operatingExpenses },
        { Section: "ADMINISTRATIVE EXPENSES", AccountCode: "6110", LineItem: "Administrative Expenses", Currency: currency, Amount: is.administrativeExpenses },
        { Section: "PROFITABILITY", AccountCode: "", LineItem: "Operating Profit", Currency: currency, Amount: is.operatingProfit },
        { Section: "NET PROFIT", AccountCode: "", LineItem: "Net Profit / (Loss)", Currency: currency, Amount: is.netProfitLoss },
      ];
      return { id: statementId, title: "Income Statement (Profit & Loss)", sheetName: "Income Statement", rows };
    }

    case "balance-sheet": {
      const rows: Record<string, any>[] = [
        ...bs.currentAssets.map((a) => ({ Classification: "Current Assets", AccountCode: a.code, LineItem: a.label, Currency: currency, Amount: a.amount })),
        { Classification: "SUBTOTAL", AccountCode: "", LineItem: "Total Current Assets", Currency: currency, Amount: bs.totalCurrentAssets },
        ...bs.nonCurrentAssets.map((a) => ({ Classification: "Non-Current Assets", AccountCode: a.code, LineItem: a.label, Currency: currency, Amount: a.amount })),
        { Classification: "SUBTOTAL", AccountCode: "", LineItem: "Total Non-Current Assets", Currency: currency, Amount: bs.totalNonCurrentAssets },
        { Classification: "TOTAL ASSETS", AccountCode: "", LineItem: "Total Assets", Currency: currency, Amount: bs.totalAssets },
        ...bs.currentLiabilities.map((l) => ({ Classification: "Current Liabilities", AccountCode: l.code, LineItem: l.label, Currency: currency, Amount: l.amount })),
        { Classification: "SUBTOTAL", AccountCode: "", LineItem: "Total Current Liabilities", Currency: currency, Amount: bs.totalCurrentLiabilities },
        ...bs.nonCurrentLiabilities.map((l) => ({ Classification: "Non-Current Liabilities", AccountCode: l.code, LineItem: l.label, Currency: currency, Amount: l.amount })),
        { Classification: "SUBTOTAL", AccountCode: "", LineItem: "Total Non-Current Liabilities", Currency: currency, Amount: bs.totalNonCurrentLiabilities },
        { Classification: "TOTAL LIABILITIES", AccountCode: "", LineItem: "Total Liabilities", Currency: currency, Amount: bs.totalLiabilities },
        { Classification: "EQUITY", AccountCode: "3010", LineItem: "Owner's Equity", Currency: currency, Amount: bs.ownersEquity },
        { Classification: "EQUITY", AccountCode: "3110", LineItem: "Retained Earnings", Currency: currency, Amount: bs.retainedEarnings },
        { Classification: "TOTAL EQUITY", AccountCode: "", LineItem: "Total Equity", Currency: currency, Amount: bs.totalEquity },
        { Classification: "VERIFICATION", AccountCode: "", LineItem: "Total Liabilities + Total Equity", Currency: currency, Amount: bs.totalLiabilitiesAndEquity },
      ];
      return { id: statementId, title: "Balance Sheet (Statement of Financial Position)", sheetName: "Balance Sheet", rows };
    }

    case "cash-flow-statement": {
      const rows: Record<string, any>[] = [
        { Activity: "OPENING BALANCE", LineItem: "Opening Cash & Bank Balance", Inflow: 0, Outflow: 0, NetCashFlow: cf.openingCashBalance },
        ...cf.operatingLines.map((l) => ({ Activity: "Operating Activities", LineItem: l.label, Inflow: l.inflow, Outflow: l.outflow, NetCashFlow: l.net })),
        { Activity: "SUBTOTAL", LineItem: "Net Cash Flow from Operating Activities", Inflow: "", Outflow: "", NetCashFlow: cf.netOperatingCashFlow },
        ...cf.investingLines.map((l) => ({ Activity: "Investing Activities", LineItem: l.label, Inflow: l.inflow, Outflow: l.outflow, NetCashFlow: l.net })),
        { Activity: "SUBTOTAL", LineItem: "Net Cash Flow from Investing Activities", Inflow: "", Outflow: "", NetCashFlow: cf.netInvestingCashFlow },
        ...cf.financingLines.map((l) => ({ Activity: "Financing Activities", LineItem: l.label, Inflow: l.inflow, Outflow: l.outflow, NetCashFlow: l.net })),
        { Activity: "SUBTOTAL", LineItem: "Net Cash Flow from Financing Activities", Inflow: "", Outflow: "", NetCashFlow: cf.netFinancingCashFlow },
        { Activity: "SUMMARY", LineItem: "Total Cash Inflows & Outflows", Inflow: cf.totalCashInflows, Outflow: cf.totalCashOutflows, NetCashFlow: cf.netCashFlow },
        { Activity: "CLOSING BALANCE", LineItem: "Closing Cash & Bank Balance", Inflow: "", Outflow: "", NetCashFlow: cf.closingCashBalance },
      ];
      return { id: statementId, title: "Cash Flow Statement", sheetName: "Cash Flow", rows };
    }

    case "changes-in-equity": {
      const rows: Record<string, any>[] = [
        { Component: "Opening Balance (As of Period Start)", OwnerCapital: eq.openingOwnerCapital, RetainedEarnings: eq.openingRetainedEarnings, TotalEquity: eq.openingTotalEquity },
        { Component: "Owner Capital Contributions", OwnerCapital: eq.capitalContributions, RetainedEarnings: 0, TotalEquity: eq.capitalContributions },
        { Component: "Net Profit / (Loss) for the Period", OwnerCapital: 0, RetainedEarnings: eq.netProfitForPeriod, TotalEquity: eq.netProfitForPeriod },
        { Component: "Less: Owner Drawings / Dividends", OwnerCapital: 0, RetainedEarnings: -eq.dividendsOrDrawings, TotalEquity: -eq.dividendsOrDrawings },
        { Component: "Other Equity Adjustments", OwnerCapital: 0, RetainedEarnings: eq.otherEquityAdjustments, TotalEquity: eq.otherEquityAdjustments },
        { Component: "Closing Balance (As of Period End)", OwnerCapital: eq.closingOwnerCapital, RetainedEarnings: eq.closingRetainedEarnings, TotalEquity: eq.closingTotalEquity },
      ];
      return { id: statementId, title: "Statement of Changes in Equity", sheetName: "Changes in Equity", rows };
    }

    case "trial-balance": {
      const rows: Record<string, any>[] = tb.rows.map((r) => ({
        AccountCode: r.accountCode,
        AccountName: r.accountName,
        AccountType: r.accountType,
        OpeningDebit: r.openingDebit,
        OpeningCredit: r.openingCredit,
        PeriodDebit: r.periodDebit,
        PeriodCredit: r.periodCredit,
        EndingDebit: r.endingDebit,
        EndingCredit: r.endingCredit,
      }));
      rows.push({
        AccountCode: "TOTAL",
        AccountName: tb.isBalanced ? "BALANCED (Debit == Credit)" : "OUT OF BALANCE",
        AccountType: "",
        OpeningDebit: tb.totalOpeningDebit,
        OpeningCredit: tb.totalOpeningCredit,
        PeriodDebit: tb.totalPeriodDebit,
        PeriodCredit: tb.totalPeriodCredit,
        EndingDebit: tb.totalEndingDebit,
        EndingCredit: tb.totalEndingCredit,
      });
      return { id: statementId, title: "Trial Balance", sheetName: "Trial Balance", rows };
    }

    case "general-ledger": {
      return {
        id: statementId,
        title: "General Ledger",
        sheetName: "General Ledger",
        rows: generalLedger.map((g) => ({
          Date: g.entryDate,
          JournalNo: g.journalNo,
          AccountCode: g.accountCode,
          AccountName: g.accountName,
          Project: g.project,
          SourceModule: g.sourceModule,
          ReferenceNo: g.referenceNo,
          Description: g.description,
          Debit: g.debit,
          Credit: g.credit,
          RunningBalance: g.runningBalance,
        })),
      };
    }

    case "accounts-receivable-report": {
      return {
        id: statementId,
        title: "Accounts Receivable Report",
        sheetName: "AR Report",
        rows: arReport.rows.map((r) => ({
          InvoiceNo: r.invoiceNumber,
          Client: r.client,
          Project: r.project,
          Category: r.category,
          InvoiceDate: r.date,
          DueDate: r.dueDate,
          TotalBilled: r.totalAmount,
          Collected: r.collectedAmount,
          OutstandingBalance: r.outstandingAmount,
          Aging: r.agingCategory,
          Status: r.status,
        })),
      };
    }

    case "accounts-payable-report": {
      return {
        id: statementId,
        title: "Accounts Payable Report",
        sheetName: "AP Report",
        rows: apReport.rows.map((r) => ({
          BillNo: r.billNumber,
          Supplier: r.supplier,
          Project: r.project,
          Category: r.category,
          BillDate: r.date,
          DueDate: r.dueDate,
          TotalAmount: r.totalAmount,
          Paid: r.paidAmount,
          OutstandingBalance: r.outstandingAmount,
          Aging: r.agingCategory,
          Status: r.status,
        })),
      };
    }
  }
}

export function buildPart7ExcelWorkbook(params: {
  state: Part7FinancialStatementsState;
  statementId?: Part7StatementTypeId; // If omitted, exports complete 8-statement + Ratios package
  preparedBy: string;
  reviewedBy?: string;
  approvedBy?: string;
}): XLSX.WorkBook {
  const { state, statementId, preparedBy, reviewedBy, approvedBy } = params;
  const wb = XLSX.utils.book_new();
  const prepDate = state.referenceToday;
  const periodStr = `${state.resolvedRange.startDate} to ${state.resolvedRange.endDate} (${state.resolvedRange.label})`;

  const appendStatementSheet = (dataset: Part7ExportDataset) => {
    const headerBanner: any[][] = [
      [state.companyName],
      [`OFFICIAL FINANCIAL STATEMENT: ${dataset.title.toUpperCase()}`],
      [`Reporting Period: ${periodStr}`, `Currency: ${state.currency}`, `Preparation Date: ${prepDate}`],
      [
        `Prepared By: ${preparedBy}`,
        `Reviewed By: ${reviewedBy || state.activePeriodRecord?.reviewedBy || "Pending Review"}`,
        `Approved By: ${approvedBy || state.activePeriodRecord?.approvedBy || "Pending Approval"}`,
      ],
      [],
    ];

    const dataRows = dataset.rows;
    const keys = dataRows.length > 0 ? Object.keys(dataRows[0]) : ["Message"];
    const tableAoA: any[][] =
      dataRows.length > 0
        ? [keys, ...dataRows.map((r) => keys.map((k) => r[k]))]
        : [["Message"], ["No verified accounting records in selected scope."]];

    const footerSignatures: any[][] = [
      [],
      ["APPROVAL SIGNATURES & VERIFICATION"],
      [`Prepared By: ${preparedBy}`, "Signature: _____________________", `Date: ${prepDate}`],
      [
        `Reviewed By: ${reviewedBy || state.activePeriodRecord?.reviewedBy || "Finance Manager"}`,
        "Signature: _____________________",
        `Date: ${state.activePeriodRecord?.reviewedAt?.slice(0, 10) || "____________"}`,
      ],
      [
        `Approved By: ${approvedBy || state.activePeriodRecord?.approvedBy || "Director / Head Office"}`,
        "Signature: _____________________",
        `Date: ${state.activePeriodRecord?.approvedAt?.slice(0, 10) || "____________"}`,
      ],
    ];

    const ws = XLSX.utils.aoa_to_sheet([...headerBanner, ...tableAoA, ...footerSignatures]);
    XLSX.utils.book_append_sheet(wb, ws, dataset.sheetName.slice(0, 31));
  };

  if (statementId) {
    appendStatementSheet(buildPart7StatementRows(statementId, state));
  } else {
    const allIds: Part7StatementTypeId[] = [
      "income-statement",
      "balance-sheet",
      "cash-flow-statement",
      "changes-in-equity",
      "trial-balance",
      "general-ledger",
      "accounts-receivable-report",
      "accounts-payable-report",
    ];
    allIds.forEach((id) => appendStatementSheet(buildPart7StatementRows(id, state)));

    // Also include Financial Ratios sheet in full workbook package
    const ratiosAoA = [
      [state.companyName],
      ["FINANCIAL ANALYSIS & PERFORMANCE RATIOS"],
      [`Reporting Period: ${periodStr}`, `Preparation Date: ${prepDate}`],
      [],
      ["Ratio Name", "Formula", "Value", "Health Status", "Interpretation"],
      ...state.ratios.map((r) => [r.name, r.formula, r.formattedValue, r.health, r.explanation]),
    ];
    const ratioWs = XLSX.utils.aoa_to_sheet(ratiosAoA);
    XLSX.utils.book_append_sheet(wb, ratioWs, "Financial Ratios");
  }

  return wb;
}

export function exportPart7StatementToExcel(params: {
  state: Part7FinancialStatementsState;
  statementId?: Part7StatementTypeId;
  preparedBy: string;
  reviewedBy?: string;
  approvedBy?: string;
}): void {
  const wb = buildPart7ExcelWorkbook(params);
  const tag = params.statementId || "complete_financial_statements_package";
  XLSX.writeFile(wb, `${tag}_${params.state.resolvedRange.endDate}.xlsx`);
}

export function exportPart7StatementToCsv(
  statementId: Part7StatementTypeId,
  state: Part7FinancialStatementsState
): void {
  const ds = buildPart7StatementRows(statementId, state);
  exportRowsToCsv(`${ds.id}_${state.resolvedRange.endDate}`, ds.rows);
}
