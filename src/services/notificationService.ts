import { EnterpriseNotification, NotificationCategory, NotificationPriority, NotificationStatus, UserRole } from "../types";

const STORAGE_KEY_NOTIFICATIONS = "buildsync_enterprise_notifications";
const STORAGE_KEY_SETTINGS = "buildsync_notification_settings";

// Realistic seed notifications across all 31 Categories
const SEED_NOTIFICATIONS: EnterpriseNotification[] = [
  // 1. Attendance
  {
    id: "NOTIF-ATT-01",
    title: "Biometric Attendance Anomaly Detected",
    titleAm: "የባዮሜትሪክ መገኘት ያልተለመደ ምልክት ታይቷል",
    description: "4 Workers in Gang Chief Tekle's crew logged in via GPS Geofence outside the designated Zone 1 boundary.",
    descriptionAm: "በቡድን መሪ ተክለ ሥር ያሉ 4 ሠራተኞች ከተመደበላቸው ዞን 1 ውጭ በጂፒኤስ ተመዝግበዋል።",
    category: "Attendance Notifications",
    priority: "High",
    status: "Unread",
    projectName: "Addis Ababa Tower Block A",
    siteName: "Bole Main Site",
    building: "Tower A",
    floor: "3rd Floor (+10.8m)",
    zone: "Zone 1 Core",
    sender: "AI Biometric Engine",
    senderRole: "System AI",
    receiver: "Time Keeper / Site Engineer",
    targetRoles: [UserRole.SUPER_ADMIN, UserRole.HEAD_OFFICE, UserRole.PROJECT_MANAGER, UserRole.TIME_KEEPER, UserRole.SUPERVISOR],
    date: "2026-07-23",
    time: "07:15 AM",
    timestamp: Date.now() - 3600000 * 2,
    isAiGenerated: true,
    aiConfidence: 0.94,
    deliveryChannels: { inApp: true, push: true, email: false, sms: true },
    actionTab: "attendance"
  },

  // 2. Warehouse
  {
    id: "NOTIF-WH-01",
    title: "Critical Low Warehouse Stock - Rebar 16mm",
    titleAm: "የዋና ዕቃ ግምጃ ቤት ዝቅተኛ ብረት ስቶክ ማስጠንቀቂያ",
    description: "Deformed Rebar Ø16mm inventory dropped below safety threshold (Current: 4.2 Tons, Min: 10.0 Tons).",
    descriptionAm: "የባለ 16 ሚሜ የብረት ዘንግ ክምችት ከዝቅተኛው ወሰን በታች ወርዷል (አሁን ያለው፡ 4.2 ቶን)።",
    category: "Warehouse Notifications",
    priority: "Critical",
    status: "Unread",
    projectName: "Addis Ababa Tower Block A",
    siteName: "Central Logistics Yard",
    building: "Warehouse B",
    sender: "Warehouse ERP System",
    senderRole: "Warehouse Manager",
    receiver: "Procurement & Store Managers",
    targetRoles: [UserRole.SUPER_ADMIN, UserRole.HEAD_OFFICE, UserRole.PROJECT_MANAGER, UserRole.WAREHOUSE_MANAGER, UserRole.PROCUREMENT_MANAGER, UserRole.STORE_OWNER],
    date: "2026-07-23",
    time: "06:45 AM",
    timestamp: Date.now() - 3600000 * 3,
    isAiGenerated: true,
    aiConfidence: 0.98,
    deliveryChannels: { inApp: true, push: true, email: true, sms: true },
    actionTab: "warehouseManagerApp"
  },

  // 3. Site Store
  {
    id: "NOTIF-STO-01",
    title: "Site Store Panel Issue Request Approved",
    titleAm: "የሳይት ስቶር የፎርምወርክ ፓነል ወጪ ጥያቄ ጸደቀ",
    description: "Store Owner approved material issue ticket #STORE-882 for 45 aluminum wall panels to Zone 2.",
    descriptionAm: "የሳይት ስቶር ሃላፊ ቁጥር #STORE-882 የ45 አሉሚኒየም ግድግዳ ፓነሎች ወጪ እንዲደረግ አጽድቀዋል።",
    category: "Site Store Notifications",
    priority: "Medium",
    status: "Read",
    projectName: "Addis Ababa Tower Block A",
    siteName: "Bole Main Site",
    building: "Tower A",
    floor: "2nd Floor (+7.2m)",
    zone: "Zone 2 North",
    sender: "Alemayehu T. (Store Owner)",
    senderRole: "Store Owner",
    receiver: "Site Engineers & Gang Chiefs",
    targetRoles: [UserRole.SUPER_ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_ENGINEER, UserRole.STORE_OWNER, UserRole.GANG_CHIEF],
    date: "2026-07-22",
    time: "04:30 PM",
    timestamp: Date.now() - 3600000 * 15,
    deliveryChannels: { inApp: true, push: true, email: false, sms: false },
    actionTab: "storeOwnerApp"
  },

  // 4. Material Request
  {
    id: "NOTIF-REQ-01",
    title: "Urgent Material Requisition #MR-2026-104",
    titleAm: "አስቸኳይ የቁሳቁስ መጠየቂያ #MR-2026-104",
    description: "Site Engineer submitted requisition for 200 bags of C42.5 PPC Cement for tomorrow morning's slab pour.",
    descriptionAm: "ሳይት ኢንጅነሩ ለነገ ጠዋት ስላብ ማፍሰስ 200 ቦርሳ ሲሚንቶ አጣዳፊ ጥያቄ አቅርበዋል።",
    category: "Material Request Notifications",
    priority: "High",
    status: "Unread",
    projectName: "Commercial Podium Plaza B",
    siteName: "Kazanchis Site",
    building: "Podium Plaza",
    floor: "Ground Floor",
    sender: "Ermias K. (Site Engineer)",
    senderRole: "Site Engineer",
    receiver: "Project Manager & Procurement",
    targetRoles: [UserRole.SUPER_ADMIN, UserRole.PROJECT_MANAGER, UserRole.PROCUREMENT_MANAGER, UserRole.WAREHOUSE_MANAGER],
    date: "2026-07-23",
    time: "08:10 AM",
    timestamp: Date.now() - 3600000 * 0.5,
    deliveryChannels: { inApp: true, push: true, email: true, sms: false },
    actionTab: "enterpriseErp"
  },

  // 5. Material Approval
  {
    id: "NOTIF-MAP-01",
    title: "Material Purchase Order #PO-902 Approved",
    titleAm: "የቁሳቁስ ግዢ ትዕዛዝ #PO-902 ጸድቋል",
    description: "Head Office Finance approved ETB 1,450,000 budget for pre-mix concrete dispatch.",
    descriptionAm: "የዋና መሥሪያ ቤት ፋይናንስ 1,450,000 ብር ለሬዲሚክስ ኮንክሪት ትዕዛዝ አጽድቋል።",
    category: "Material Approval Notifications",
    priority: "Medium",
    status: "Acknowledged",
    projectName: "Addis Ababa Tower Block A",
    siteName: "Bole Main Site",
    sender: "Head Office Finance Dept",
    senderRole: "Finance Manager",
    receiver: "Procurement Manager & Project Manager",
    targetRoles: [UserRole.SUPER_ADMIN, UserRole.HEAD_OFFICE, UserRole.FINANCE_MANAGER, UserRole.PROJECT_MANAGER, UserRole.PROCUREMENT_MANAGER],
    date: "2026-07-22",
    time: "11:20 AM",
    timestamp: Date.now() - 3600000 * 20,
    deliveryChannels: { inApp: true, push: false, email: true, sms: false },
    actionTab: "financeErp"
  },

  // 6. Material Transfer
  {
    id: "NOTIF-TRF-01",
    title: "Inter-Site Material Transfer Dispatched",
    titleAm: "በሳይቶች መካከል የሚደረግ የቁሳቁስ ዝውውር ተላከ",
    description: "Truck #ET-3-8812 loaded with 120 Pin & Wedge boxes en route from Bole Site to Kazanchis Site.",
    descriptionAm: "ተሽከርካሪ ቁጥር #ET-3-8812 የፒንና ዌጅ ሳጥኖችን ጭኖ ከቦሌ ወደ ካዛንቺስ ሳይት በመጓዝ ላይ ነው።",
    category: "Material Transfer Notifications",
    priority: "Low",
    status: "Read",
    projectName: "Commercial Podium Plaza B",
    siteName: "Kazanchis Site",
    sender: "Logistics Dispatch Center",
    senderRole: "Warehouse Manager",
    receiver: "Store Owner & Driver",
    targetRoles: [UserRole.SUPER_ADMIN, UserRole.WAREHOUSE_MANAGER, UserRole.STORE_OWNER, UserRole.DRIVER],
    date: "2026-07-22",
    time: "02:15 PM",
    timestamp: Date.now() - 3600000 * 18,
    deliveryChannels: { inApp: true, push: true, email: false, sms: false },
    actionTab: "warehouseManagerApp"
  },

  // 7. Material Return
  {
    id: "NOTIF-RET-01",
    title: "Damaged Formwork Panel Return Logged",
    titleAm: "የተበላሹ ፎርምወርክ ፓነሎች መመለሻ ተመዝግቧል",
    description: "8 Bent Aluminum Wall Panels returned to Store from 1st Floor pour site for maintenance refurbishment.",
    descriptionAm: "8 የታጠፉ የአሉሚኒየም ግድግዳ ፓነሎች ከፎቅ 1 ወደ ስቶር ለጥገና ተመልሰዋል።",
    category: "Material Return Notifications",
    priority: "Medium",
    status: "Unread",
    projectName: "Addis Ababa Tower Block A",
    siteName: "Bole Main Site",
    building: "Tower A",
    floor: "1st Floor (+3.6m)",
    sender: "QA/QC Site Inspection",
    senderRole: "QAQC Engineer",
    receiver: "Store Owner & Formwork Team",
    targetRoles: [UserRole.SUPER_ADMIN, UserRole.PROJECT_MANAGER, UserRole.STORE_OWNER, UserRole.QAQC_ENGINEER, UserRole.ASSEMBLER],
    date: "2026-07-23",
    time: "07:50 AM",
    timestamp: Date.now() - 3600000 * 1,
    deliveryChannels: { inApp: true, push: false, email: false, sms: false },
    actionTab: "formworkManagement"
  },

  // 8. Aluminum Formwork Panel Tracking
  {
    id: "NOTIF-ALU-01",
    title: "AI Missing Panel Alert - 12 Panels Unaccounted",
    titleAm: "የአርቴፊሻል ኢንቴሊጀንስ የጠፉ ፓነሎች ማስጠንቀቂያ - 12 ፓነሎች አልተገኙም",
    description: "AI QR Scanner flagged 12 aluminum deck panels missing during striking cycle on Floor 2, Zone 1.",
    descriptionAm: "ኤአይ ስካነር በፎቅ 2 ዞን 1 ፎርምወርክ ሲነሳ 12 የደብረ ፓነሎች መጎደላቸውን አሳይቷል።",
    category: "Aluminum Formwork Panel Tracking Notifications",
    priority: "Critical",
    status: "Unread",
    projectName: "Addis Ababa Tower Block A",
    siteName: "Bole Main Site",
    building: "Tower A",
    floor: "2nd Floor (+7.2m)",
    zone: "Zone 1 Lift Shaft",
    sender: "BuildSync AI Panel Vision",
    senderRole: "System AI",
    receiver: "Site Engineer & Formwork Assemblers",
    targetRoles: [UserRole.SUPER_ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_ENGINEER, UserRole.STORE_OWNER, UserRole.ASSEMBLER, UserRole.TEAM_LEADER],
    date: "2026-07-23",
    time: "08:00 AM",
    timestamp: Date.now() - 3600000 * 0.8,
    isAiGenerated: true,
    aiConfidence: 0.96,
    deliveryChannels: { inApp: true, push: true, email: true, sms: true },
    actionTab: "formworkManagement"
  },

  // 9. Procurement
  {
    id: "NOTIF-PRO-01",
    title: "Vendor Quotations Ready for Review - Formwork Accessories",
    titleAm: "የአቅራቢዎች ዋጋ ዝርዝር ለግምገማ ዝግጁ ነው",
    description: "Received 3 competitive bids for high-tensile wall tie rods from Lianxin & Local Suppliers.",
    descriptionAm: "ለዋል ታይሮዶች ከ3 አቅራቢዎች የቀረቡ የዋጋ ሰነዶች ለግምገማ ደርሰዋል።",
    category: "Procurement Notifications",
    priority: "Medium",
    status: "Read",
    projectName: "Addis Ababa Tower Block A",
    sender: "Procurement Portal",
    senderRole: "Procurement Manager",
    receiver: "Procurement & Head Office",
    targetRoles: [UserRole.SUPER_ADMIN, UserRole.HEAD_OFFICE, UserRole.PROCUREMENT_MANAGER, UserRole.FINANCE_MANAGER],
    date: "2026-07-21",
    time: "03:40 PM",
    timestamp: Date.now() - 3600000 * 40,
    deliveryChannels: { inApp: true, push: false, email: true, sms: false },
    actionTab: "enterpriseErp"
  },

  // 10. Purchase Order
  {
    id: "NOTIF-PO-01",
    title: "PO #PO-2026-880 Dispatched to Supplier",
    titleAm: "የግዢ ትዕዛዝ #PO-2026-880 ለአቅራቢው ተላከ",
    description: "Purchase Order for 50 Tons PPC Cement dispatched to Mugher Cement Factory with delivery SLA Friday.",
    descriptionAm: "የ50 ቶን ሲሚንቶ ግዢ ትዕዛዝ ለሙገር ሲሚንቶ ፋብሪካ በይፋ ተላከ።",
    category: "Purchase Order Notifications",
    priority: "Low",
    status: "Acknowledged",
    projectName: "Commercial Podium Plaza B",
    sender: "Procurement Dept",
    senderRole: "Procurement Manager",
    receiver: "Warehouse & Store Owners",
    targetRoles: [UserRole.SUPER_ADMIN, UserRole.PROCUREMENT_MANAGER, UserRole.WAREHOUSE_MANAGER, UserRole.STORE_OWNER],
    date: "2026-07-22",
    time: "10:15 AM",
    timestamp: Date.now() - 3600000 * 22,
    deliveryChannels: { inApp: true, push: false, email: true, sms: false },
    actionTab: "enterpriseErp"
  },

  // 11. Delivery
  {
    id: "NOTIF-DEL-01",
    title: "AI Alert - Delivery Delayed: Pre-Mix Concrete Truck",
    titleAm: "የኤአይ ማስጠንቀቂያ - የሬዲሚክስ ኮንክሪት መኪና መዘግየት",
    description: "Transit GPS indicates Truck #ET-3-1029 delayed in traffic for 45 mins. Concrete slump degradation risk!",
    descriptionAm: "የተሽከርካሪ ጂፒኤስ የኮንክሪት መኪናው በትራፊክ ምክንያት በ45 ደቂቃ መዘግየቱን አሳይቷል። የኮንክሪት ጥራት ስጋት!",
    category: "Delivery Notifications",
    priority: "High",
    status: "Unread",
    projectName: "Addis Ababa Tower Block A",
    siteName: "Bole Main Site",
    sender: "BuildSync Logistics AI",
    senderRole: "System AI",
    receiver: "Site Engineer & QA/QC Inspector",
    targetRoles: [UserRole.SUPER_ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_ENGINEER, UserRole.QAQC_ENGINEER, UserRole.DRIVER],
    date: "2026-07-23",
    time: "08:12 AM",
    timestamp: Date.now() - 3600000 * 0.2,
    isAiGenerated: true,
    aiConfidence: 0.92,
    deliveryChannels: { inApp: true, push: true, email: false, sms: true },
    actionTab: "enterpriseErp"
  },

  // 12. Finance
  {
    id: "NOTIF-FIN-01",
    title: "Subcontractor IPC #4 Milestone Payment Due",
    titleAm: "የንዑስ ተራዳኢ ክፍያ ሰርተፊኬት #4 ጊዜ ደረሰ",
    description: "Tekle Structural Firm submitted Interim Payment Certificate for ETB 2,850,000 for slab completion.",
    descriptionAm: "ተክለ መዋቅር ድርጅት የ2,850,000 ብር የክፍያ ጥያቄ ሰነድ አቅርቧል።",
    category: "Finance Notifications",
    priority: "High",
    status: "Unread",
    projectName: "Addis Ababa Tower Block A",
    sender: "Subcontractor Management Portal",
    senderRole: "Finance Manager",
    receiver: "Finance Manager & Project Manager",
    targetRoles: [UserRole.SUPER_ADMIN, UserRole.HEAD_OFFICE, UserRole.FINANCE_MANAGER, UserRole.PROJECT_MANAGER, UserRole.AUDITOR],
    date: "2026-07-23",
    time: "07:00 AM",
    timestamp: Date.now() - 3600000 * 2.5,
    deliveryChannels: { inApp: true, push: true, email: true, sms: false },
    actionTab: "financeErp"
  },

  // 13. Payroll
  {
    id: "NOTIF-PAY-01",
    title: "Weekly Daily Labourer Payroll Disbursement Ready",
    titleAm: "የሳምንታዊ ዕለታዊ ሠራተኞች ደመወዝ ክፍያ ዝግጁ ነው",
    description: "Payroll breakdown generated for 142 site workers (Total: ETB 385,400) awaiting PM digital signature.",
    descriptionAm: "ለ142 የሳይት ሠራተኞች የ385,400 ብር የሳምንት ክፍያ ሰነድ የፕሮጀክት ማናጀሩን ፊርማ በመጠበቅ ላይ ነው።",
    category: "Payroll Notifications",
    priority: "High",
    status: "Unread",
    projectName: "Addis Ababa Tower Block A",
    sender: "Time Keeper & HR Dept",
    senderRole: "Time Keeper",
    receiver: "Project Manager & Finance",
    targetRoles: [UserRole.SUPER_ADMIN, UserRole.HEAD_OFFICE, UserRole.FINANCE_MANAGER, UserRole.PROJECT_MANAGER, UserRole.HR_MANAGER, UserRole.TIME_KEEPER],
    date: "2026-07-23",
    time: "06:30 AM",
    timestamp: Date.now() - 3600000 * 3.5,
    deliveryChannels: { inApp: true, push: true, email: true, sms: false },
    actionTab: "financeErp"
  },

  // 14. Budget
  {
    id: "NOTIF-BUD-01",
    title: "AI Budget Variance Alert - Structural Formwork Overrun",
    titleAm: "የኤአይ የበጀት ልዩነት ማስጠንቀቂያ - የፎርምወርክ ወጪ መጨመር",
    description: "Actual formwork labor and accessories spend exceeded EVM baseline by 8.4% for Month of July.",
    descriptionAm: "የፎርምወርክ ሥራዎች የወጣላቸው ወጪ ከታቀደው በጀት በ8.4% በልጧል።",
    category: "Budget Notifications",
    priority: "High",
    status: "Unread",
    projectName: "Addis Ababa Tower Block A",
    sender: "BuildSync Financial AI Engine",
    senderRole: "System AI",
    receiver: "Head Office & Finance Manager",
    targetRoles: [UserRole.SUPER_ADMIN, UserRole.HEAD_OFFICE, UserRole.FINANCE_MANAGER, UserRole.PROJECT_MANAGER, UserRole.AUDITOR],
    date: "2026-07-22",
    time: "09:00 PM",
    timestamp: Date.now() - 3600000 * 11,
    isAiGenerated: true,
    aiConfidence: 0.95,
    deliveryChannels: { inApp: true, push: true, email: true, sms: false },
    actionTab: "financeErp"
  },

  // 15. Project Progress
  {
    id: "NOTIF-PRG-01",
    title: "Milestone Achieved: 2nd Floor Slab Pour Complete",
    titleAm: "ታላቅ ስኬት፡ የ2ኛ ፎቅ ስላብ ማፍሰስ ተጠናቋል",
    description: "Concrete pour for 420m² slab achieved 100% completion in 7.5 hours with zero safety incidents.",
    descriptionAm: "420 ካሬ ሜትር ስላብ ማፍሰስ ያለ ምንም አደጋ በ7.5 ሰዓታት ውስጥ ሙሉ በሙሉ ተጠናቋል።",
    category: "Project Progress Notifications",
    priority: "Low",
    status: "Read",
    projectName: "Addis Ababa Tower Block A",
    siteName: "Bole Main Site",
    building: "Tower A",
    floor: "2nd Floor (+7.2m)",
    sender: "Mulugeta B. (Project Manager)",
    senderRole: "Project Manager",
    receiver: "All Project Stakeholders",
    targetRoles: [UserRole.SUPER_ADMIN, UserRole.HEAD_OFFICE, UserRole.PROJECT_MANAGER, UserRole.SITE_ENGINEER, UserRole.CLIENT_CONSULTANT],
    date: "2026-07-22",
    time: "06:00 PM",
    timestamp: Date.now() - 3600000 * 14,
    deliveryChannels: { inApp: true, push: true, email: true, sms: false },
    actionTab: "progress"
  },

  // 16. Daily Report
  {
    id: "NOTIF-REP-01",
    title: "Daily Site Log Submitted for Approval",
    titleAm: "የዕለቱ የሳይት ውሎ ሪፖርት ማረጋገጫ ተላከ",
    description: "Site Supervisor submitted Daily Activity Report #DAR-2026-0722 covering manpower and equipment hours.",
    descriptionAm: "የሳይት ሱፐርቫይዘሩ የዕለቱን የሥራና የሰው ኃይል ውሎ ሪፖርት አቅርበዋል።",
    category: "Daily Report Notifications",
    priority: "Medium",
    status: "Read",
    projectName: "Commercial Podium Plaza B",
    sender: "Tadesse W. (Supervisor)",
    senderRole: "Supervisor",
    receiver: "Project Manager & Section Head",
    targetRoles: [UserRole.SUPER_ADMIN, UserRole.PROJECT_MANAGER, UserRole.SECTION_HEAD, UserRole.SUPERVISOR, UserRole.SITE_ENGINEER],
    date: "2026-07-22",
    time: "05:30 PM",
    timestamp: Date.now() - 3600000 * 15,
    deliveryChannels: { inApp: true, push: false, email: false, sms: false },
    actionTab: "progress"
  },

  // 17. QA/QC
  {
    id: "NOTIF-QA-01",
    title: "Concrete Cube Compressive Test Result Passed (C30)",
    titleAm: "የኮንክሪት ኩብ የ28 ቀን ጥንካሬ ፍተሻ ውጤት አለፈ (C30)",
    description: "28-day crushing test achieved 34.2 MPa (Required: 30.0 MPa). Conforms to ES EN 206 standards.",
    descriptionAm: "የ28 ቀን የኮንክሪት ጥንካሬ ፍተሻ 34.2 ሜጋፓስካል በመስጠት መስፈርቱን አሟልቷል።",
    category: "QA/QC Notifications",
    priority: "Low",
    status: "Acknowledged",
    projectName: "Addis Ababa Tower Block A",
    sender: "Materials Testing Lab",
    senderRole: "QAQC Engineer",
    receiver: "QA/QC Engineers & Consultants",
    targetRoles: [UserRole.SUPER_ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_ENGINEER, UserRole.QAQC_ENGINEER, UserRole.CLIENT_CONSULTANT],
    date: "2026-07-21",
    time: "11:00 AM",
    timestamp: Date.now() - 3600000 * 45,
    deliveryChannels: { inApp: true, push: false, email: true, sms: false },
    actionTab: "safetyQuality"
  },

  // 18. NCR
  {
    id: "NOTIF-NCR-01",
    title: "Non-Conformance Report #NCR-2026-012 Issued",
    titleAm: "የጥራት ጉድለት ሪፖርት #NCR-2026-012 ተፃፈ",
    description: "Consultant issued NCR for honeycombing surface on Shear Wall SW-04 between Axis 3 and 4.",
    descriptionAm: "ኮንሰልታንቱ በግድግዳ SW-04 ላይ የታየውን የኮንክሪት ክፍተት ምክንያት የNCR ሪፖርት አውጥተዋል።",
    category: "NCR Notifications",
    priority: "High",
    status: "Unread",
    projectName: "Addis Ababa Tower Block A",
    building: "Tower A",
    floor: "1st Floor (+3.6m)",
    zone: "Zone 1 Core Wall",
    sender: "Client / Consultant QA Lead",
    senderRole: "Client / Consultant",
    receiver: "Project Manager & QA/QC Lead",
    targetRoles: [UserRole.SUPER_ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_ENGINEER, UserRole.QAQC_ENGINEER, UserRole.CLIENT_CONSULTANT],
    date: "2026-07-23",
    time: "07:30 AM",
    timestamp: Date.now() - 3600000 * 1.8,
    deliveryChannels: { inApp: true, push: true, email: true, sms: true },
    actionTab: "safetyQuality"
  },

  // 19. HSE
  {
    id: "NOTIF-HSE-01",
    title: "Site Safety Incident Rate Zero Milestone",
    titleAm: "የሳይት ደህንነት አደጋ አልባ የ100 ቀናት ስኬት",
    description: "Bole Site completed 100 consecutive days with zero lost-time injuries (LTI).",
    descriptionAm: "የቦሌ ሳይት ያለ ምንም ከባድ የሥራ አደጋ 100 ተከታታይ ቀናትን አጠናቋል።",
    category: "HSE Notifications",
    priority: "Low",
    status: "Read",
    projectName: "Addis Ababa Tower Block A",
    sender: "HSE Safety Department",
    senderRole: "HSE Officer",
    receiver: "All Site Staff",
    targetRoles: [UserRole.SUPER_ADMIN, UserRole.PROJECT_MANAGER, UserRole.HSE_OFFICER, UserRole.SUPERVISOR, UserRole.TEAM_LEADER],
    date: "2026-07-20",
    time: "09:00 AM",
    timestamp: Date.now() - 3600000 * 70,
    deliveryChannels: { inApp: true, push: false, email: false, sms: false },
    actionTab: "safetyQuality"
  },

  // 20. Toolbox Meeting
  {
    id: "NOTIF-TBX-01",
    title: "Mandatory Morning Safety Toolbox Talk Scheduled",
    titleAm: "የግዴታ የጠዋት ደህንነት ውይይት ማስታወቂያ",
    description: "Topic: Working at Heights & Full Body Harness Hooking Compliance at 07:30 AM in Zone 1 Assembly.",
    descriptionAm: "ርዕስ፡ በከፍታ ቦታዎች ላይ መሥራትና የደህንነት ገመድ አጠቃቀም። ከጠዋቱ 1:30 በዞን 1።",
    category: "Toolbox Meeting Notifications",
    priority: "Medium",
    status: "Acknowledged",
    projectName: "Addis Ababa Tower Block A",
    siteName: "Bole Main Site",
    sender: "HSE Officer Girma",
    senderRole: "HSE Officer",
    receiver: "Gang Chiefs & Subcontractor Crews",
    targetRoles: [UserRole.SUPER_ADMIN, UserRole.HSE_OFFICER, UserRole.SUPERVISOR, UserRole.TEAM_LEADER, UserRole.GANG_CHIEF],
    date: "2026-07-23",
    time: "06:00 AM",
    timestamp: Date.now() - 3600000 * 4,
    deliveryChannels: { inApp: true, push: true, email: false, sms: false },
    actionTab: "safetyQuality"
  },

  // 21. PPE Inspection
  {
    id: "NOTIF-PPE-01",
    title: "Weekly PPE Compliance Audit Completed",
    titleAm: "የሳምንታዊ ደህንነት አልባሳት ፍተሻ ተጠናቋል",
    description: "98.5% compliance observed across 180 workers. 3 missing chin-straps rectified immediately.",
    descriptionAm: "98.5% የደህንነት አልባሳት አጠቃቀም ተረጋግጧል። 3 የሚጎድሉ የቆብ ገመዶች ወዲያውኑ ተስተካክለዋል።",
    category: "PPE Inspection Notifications",
    priority: "Low",
    status: "Read",
    projectName: "Commercial Podium Plaza B",
    sender: "HSE Safety Audit Team",
    senderRole: "HSE Officer",
    receiver: "Site Supervisors & HR",
    targetRoles: [UserRole.SUPER_ADMIN, UserRole.HSE_OFFICER, UserRole.SUPERVISOR, UserRole.HR_MANAGER],
    date: "2026-07-21",
    time: "04:00 PM",
    timestamp: Date.now() - 3600000 * 38,
    deliveryChannels: { inApp: true, push: false, email: false, sms: false },
    actionTab: "safetyQuality"
  },

  // 22. Hazard
  {
    id: "NOTIF-HAZ-01",
    title: "CRITICAL HAZARD: Unprotected Slab Opening Floor 3",
    titleAm: "ከፍተኛ አደጋ፡ ያልተከለለ የፎቅ ክፍተት በፎቅ 3",
    description: "Open shaft floor penetration missing perimeter guardrail on Floor 3, Zone 2. Immediate barricade needed!",
    descriptionAm: "በፎቅ 3 ዞን 2 ላይ ያለ ያልተከለለ ክፍተት ለውድቀት አደጋ የተጋለጠ ነው። ወዲያውኑ አጥር ይሰራለት!",
    category: "Hazard Notifications",
    priority: "Critical",
    status: "Unread",
    projectName: "Addis Ababa Tower Block A",
    building: "Tower A",
    floor: "3rd Floor (+10.8m)",
    zone: "Zone 2 North",
    sender: "BuildSync AI Vision Safety Camera",
    senderRole: "System AI",
    receiver: "HSE Officer & Site Engineers",
    targetRoles: [UserRole.SUPER_ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_ENGINEER, UserRole.HSE_OFFICER, UserRole.SUPERVISOR],
    date: "2026-07-23",
    time: "08:15 AM",
    timestamp: Date.now() - 3600000 * 0.1,
    isAiGenerated: true,
    aiConfidence: 0.99,
    deliveryChannels: { inApp: true, push: true, email: true, sms: true },
    actionTab: "safetyQuality"
  },

  // 23. Near Miss
  {
    id: "NOTIF-MIS-01",
    title: "Near Miss Reported: Falling Formwork Wedge Pin",
    titleAm: "ለጥቂት የተረፈ አደጋ ሪፖርት፡ ከከፍታ የወደቀ የፎርምወርክ ፒን",
    description: "A wedge pin dropped from 2nd Floor formwork striking safety helmet below. Zero injuries sustained.",
    descriptionAm: "ከ2ኛ ፎቅ የወደቀ የፎርምወርክ ፒን የሠራተኛውን ደህንነት ቆብ መትቷል። ምንም ጉዳት አልደረሰም።",
    category: "Near Miss Notifications",
    priority: "High",
    status: "Unread",
    projectName: "Addis Ababa Tower Block A",
    building: "Tower A",
    floor: "2nd Floor (+7.2m)",
    sender: "Site Safety Patrol",
    senderRole: "HSE Officer",
    receiver: "HSE Manager & Project Manager",
    targetRoles: [UserRole.SUPER_ADMIN, UserRole.PROJECT_MANAGER, UserRole.HSE_OFFICER, UserRole.SUPERVISOR, UserRole.GANG_CHIEF],
    date: "2026-07-22",
    time: "03:10 PM",
    timestamp: Date.now() - 3600000 * 17,
    deliveryChannels: { inApp: true, push: true, email: false, sms: false },
    actionTab: "safetyQuality"
  },

  // 24. Equipment
  {
    id: "NOTIF-EQP-01",
    title: "Tower Crane #TC-01 Hydraulic Oil Pressure Drop",
    titleAm: "የታወር ክሬን #TC-01 የሃይድሮሊክ ዘይት ግፊት መቀነስ",
    description: "Telemetry sensor registered hydraulic pressure drop to 140 bar. Operational suspension advised.",
    descriptionAm: "የታወር ክሬኑ የሃይድሮሊክ ግፊት ወደ 140 ባር ዝቅ ማለቱን ሴንሰሩ አሳይቷል። የሥራ እገዳ ይመከራል።",
    category: "Equipment Notifications",
    priority: "Critical",
    status: "Unread",
    projectName: "Addis Ababa Tower Block A",
    siteName: "Bole Main Site",
    sender: "IoT Equipment Telemetry",
    senderRole: "System AI",
    receiver: "Equipment Manager & Crane Operator",
    targetRoles: [UserRole.SUPER_ADMIN, UserRole.PROJECT_MANAGER, UserRole.WAREHOUSE_MANAGER, UserRole.SITE_ENGINEER],
    date: "2026-07-23",
    time: "07:45 AM",
    timestamp: Date.now() - 3600000 * 1.5,
    isAiGenerated: true,
    aiConfidence: 0.97,
    deliveryChannels: { inApp: true, push: true, email: true, sms: true },
    actionTab: "enterpriseErp"
  },

  // 25. Vehicle
  {
    id: "NOTIF-VEH-01",
    title: "Dump Truck #ET-3-9901 Fuel Consumption Anomaly",
    titleAm: "የዳምፕ ትራክ #ET-3-9901 ያልተለመደ የነዳጅ ፍጆታ",
    description: "Fuel usage spiked 32% above baseline route standard between Quarry & Bole Site.",
    descriptionAm: "የመኪናው ነዳጅ ፍጆታ ከተለመደው መስፈርት በ32% ጨምሮ ተመዝግቧል።",
    category: "Vehicle Notifications",
    priority: "Medium",
    status: "Read",
    projectName: "Addis Ababa Tower Block A",
    sender: "Fleet Telemetry System",
    senderRole: "System AI",
    receiver: "Fleet Manager & Logistics",
    targetRoles: [UserRole.SUPER_ADMIN, UserRole.WAREHOUSE_MANAGER, UserRole.DRIVER],
    date: "2026-07-21",
    time: "05:00 PM",
    timestamp: Date.now() - 3600000 * 37,
    isAiGenerated: true,
    aiConfidence: 0.89,
    deliveryChannels: { inApp: true, push: false, email: false, sms: false },
    actionTab: "enterpriseErp"
  },

  // 26. Asset
  {
    id: "NOTIF-AST-01",
    title: "Annual High-Value Asset Depreciation Audit",
    titleAm: "የዓመታዊ ከፍተኛ ዋጋ ያላቸው ንብረቶች የዋጋ ቅናሽ ኦዲት",
    description: "Sany Concrete Pump trailer asset depreciation logged in accounting books for Q2.",
    descriptionAm: "የኮንክሪት ፓምፕ መኪናው የሁለተኛ ሩብ ዓመት የንብረት ዋጋ ቅናሽ በሂሳብ መዝገብ ተመዝግቧል።",
    category: "Asset Notifications",
    priority: "Low",
    status: "Acknowledged",
    projectName: "Addis Ababa Tower Block A",
    sender: "Fixed Asset ERP Engine",
    senderRole: "Finance Manager",
    receiver: "Finance Manager & Auditors",
    targetRoles: [UserRole.SUPER_ADMIN, UserRole.HEAD_OFFICE, UserRole.FINANCE_MANAGER, UserRole.AUDITOR],
    date: "2026-07-20",
    time: "02:00 PM",
    timestamp: Date.now() - 3600000 * 75,
    deliveryChannels: { inApp: true, push: false, email: true, sms: false },
    actionTab: "financeErp"
  },

  // 27. AI Alerts
  {
    id: "NOTIF-AI-01",
    title: "AI Predictive Schedule Risk: 3-Day Delay Predicted",
    titleAm: "የኤአይ ትንበያ፡ የ3 ቀን የሥራ መዘግየት ስጋት ተተንብዮአል",
    description: "Rainfall forecast + rebar curing rates project potential 3-day delay on Floor 4 pouring. Recommended mitigation: Early shift acceleration.",
    descriptionAm: "የዝናብ ትንበያና የብረት ሥራዎች ፍጥነት በፎቅ 4 ላይ የ3 ቀን መዘግየት ሊያመጡ እንደሚችሉ ኤአይ ገምቷል።",
    category: "AI Alerts",
    priority: "High",
    status: "Unread",
    projectName: "Addis Ababa Tower Block A",
    sender: "BuildSync Antigravity AI Engine",
    senderRole: "System AI",
    receiver: "Project Manager & Section Heads",
    targetRoles: [UserRole.SUPER_ADMIN, UserRole.HEAD_OFFICE, UserRole.PROJECT_MANAGER, UserRole.SECTION_HEAD, UserRole.SITE_ENGINEER],
    date: "2026-07-23",
    time: "08:18 AM",
    timestamp: Date.now() - 3600000 * 0.05,
    isAiGenerated: true,
    aiConfidence: 0.97,
    deliveryChannels: { inApp: true, push: true, email: true, sms: true },
    actionTab: "predictions"
  },

  // 28. Maintenance
  {
    id: "NOTIF-MNT-01",
    title: "Preventive Maintenance Due: Mobile Concrete Mixer #MX-02",
    titleAm: "የቀጠሮ መደበኛ ጥገና፡ የኮንክሪት ሚክሰር መኪና #MX-02",
    description: "Mixer reached 250 operating engine hours. Scheduled for oil filter & drum seal replacement tomorrow.",
    descriptionAm: "ሚክሰሩ 250 የሥራ ሰዓታት በመሙላቱ ነገ የዘይት ፊልተርና የድራም ማኅተም ይቀየራል።",
    category: "Maintenance Notifications",
    priority: "Medium",
    status: "Unread",
    projectName: "Commercial Podium Plaza B",
    sender: "Equipment Fleet Service Center",
    senderRole: "Warehouse Manager",
    receiver: "Equipment Technicians & Warehouse",
    targetRoles: [UserRole.SUPER_ADMIN, UserRole.WAREHOUSE_MANAGER, UserRole.STORE_OWNER, UserRole.DRIVER],
    date: "2026-07-22",
    time: "08:00 PM",
    timestamp: Date.now() - 3600000 * 12,
    deliveryChannels: { inApp: true, push: true, email: false, sms: false },
    actionTab: "warehouseManagerApp"
  },

  // 29. Document Approval
  {
    id: "NOTIF-DOC-01",
    title: "Structural CAD Drawing #DWG-STR-402 Pending Approval",
    titleAm: "የህንጻ መዋቅር ካድ ዲዛይን ሰነድ #DWG-STR-402 ማጽደቂያ ተላከ",
    description: "Revised beam reinforcement detail drawing submitted for Consultant & PM signature.",
    descriptionAm: "የተሻሻለው የቢም ብረት ዲዛይን ሰነድ የኮንሰልታንቱንና ፕሮጀክት ማናጀሩን ፊርማ በመጠበቅ ላይ ነው።",
    category: "Document Approval Notifications",
    priority: "Medium",
    status: "Read",
    projectName: "Addis Ababa Tower Block A",
    sender: "Consulting Structural Designer",
    senderRole: "Client / Consultant",
    receiver: "Project Manager & Site Engineers",
    targetRoles: [UserRole.SUPER_ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_ENGINEER, UserRole.CLIENT_CONSULTANT, UserRole.SURVEYOR],
    date: "2026-07-21",
    time: "02:30 PM",
    timestamp: Date.now() - 3600000 * 42,
    deliveryChannels: { inApp: true, push: false, email: true, sms: false },
    actionTab: "cadDrawing"
  },

  // 30. User Approval
  {
    id: "NOTIF-USR-01",
    title: "New Subcontractor Site Access Clearance Request",
    titleAm: "የአዲስ ንዑስ ተራዳኢ ሠራተኞች የሳይት መግቢያ ፈቃድ ጥያቄ",
    description: "12 new steel fixers from Tekle Firm submitted biometric identity verification documents.",
    descriptionAm: "12 አዲስ የብረት ሠራተኞች የባዮሜትሪክ መታወቂያ ሰነዶችን አቅርበዋል።",
    category: "User Approval Notifications",
    priority: "Medium",
    status: "Unread",
    projectName: "Addis Ababa Tower Block A",
    sender: "Security Gate Clearance Kiosk",
    senderRole: "Super Admin",
    receiver: "HR & Site Security Admin",
    targetRoles: [UserRole.SUPER_ADMIN, UserRole.HEAD_OFFICE, UserRole.HR_MANAGER, "Security Officer", UserRole.PROJECT_MANAGER],
    date: "2026-07-23",
    time: "06:10 AM",
    timestamp: Date.now() - 3600000 * 4,
    deliveryChannels: { inApp: true, push: true, email: false, sms: false },
    actionTab: "admin"
  },

  // 31. System Update
  {
    id: "NOTIF-SYS-01",
    title: "BuildSync ERP v4.8 Update Applied Successfully",
    titleAm: "የቢልድሲንክ ኢአርፒ v4.8 ሥርዓት ማሻሻያ በስኬት ተጠናቋል",
    description: "Includes AI Custom Input Auto-Learning, Real-time FCM Notifications, and Biometric Geo-fencing.",
    descriptionAm: "የኤአይ ብጁ መረጃዎች ትምህርት፣ የእውነተኛ ጊዜ ማስታወቂያዎችና የባዮሜትሪክ ጂኦ-ፌንሲንግ አዲስ ማሻሻያዎችን ያካተተ ነው።",
    category: "System Update Notifications",
    priority: "Low",
    status: "Read",
    projectName: "Global System",
    sender: "BuildSync DevOps Engineering",
    senderRole: "System Admin",
    receiver: "All ERP System Users",
    targetRoles: [
      UserRole.SUPER_ADMIN, UserRole.HEAD_OFFICE, UserRole.FINANCE_MANAGER, UserRole.WAREHOUSE_MANAGER,
      UserRole.STORE_OWNER, UserRole.PROCUREMENT_MANAGER, UserRole.PROJECT_MANAGER, UserRole.SECTION_HEAD,
      UserRole.SUPERVISOR, UserRole.SITE_ENGINEER, UserRole.SURVEYOR, UserRole.QAQC_ENGINEER,
      UserRole.HSE_OFFICER, UserRole.TEAM_LEADER, UserRole.GANG_CHIEF, UserRole.TIME_KEEPER,
      UserRole.ASSEMBLER, UserRole.DRIVER, UserRole.CLIENT_CONSULTANT, UserRole.AUDITOR, UserRole.VISITOR
    ],
    date: "2026-07-22",
    time: "01:00 AM",
    timestamp: Date.now() - 3600000 * 30,
    deliveryChannels: { inApp: true, push: false, email: false, sms: false },
    actionTab: "dashboard"
  }
];

type NotificationListener = (notifications: EnterpriseNotification[]) => void;

export class NotificationService {
  private static listeners: Set<NotificationListener> = new Set();

  public static getNotifications(): EnterpriseNotification[] {
    if (typeof window === "undefined") return SEED_NOTIFICATIONS;
    const stored = localStorage.getItem(STORAGE_KEY_NOTIFICATIONS);
    if (!stored) {
      localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(SEED_NOTIFICATIONS));
      return SEED_NOTIFICATIONS;
    }
    try {
      return JSON.parse(stored);
    } catch {
      return SEED_NOTIFICATIONS;
    }
  }

  private static saveNotifications(list: EnterpriseNotification[]): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(list));
    this.notifyListeners(list);
  }

  public static subscribe(listener: NotificationListener): () => void {
    this.listeners.add(listener);
    // initial trigger
    listener(this.getNotifications());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private static notifyListeners(list: EnterpriseNotification[]): void {
    this.listeners.forEach(fn => fn(list));
  }

  // Filter notifications according to RBAC role and assigned project
  public static getNotificationsForRoleAndProject(
    role: UserRole | string,
    projectName?: string
  ): EnterpriseNotification[] {
    const all = this.getNotifications();
    const roleStr = String(role);

    return all.filter(n => {
      // Role check: If super admin or head office or role in targetRoles
      const matchesRole = 
        roleStr === UserRole.SUPER_ADMIN || 
        roleStr === UserRole.HEAD_OFFICE || 
        n.targetRoles.some(r => String(r) === roleStr);

      // Project check: If global or matched or no project filter
      const matchesProject = !projectName || projectName === "ALL" || n.projectName === "Global System" || n.projectName === projectName;

      // Filter out snoozed if snoozedUntil is in future
      let isStillSnoozed = false;
      if (n.isSnoozed && n.snoozedUntil) {
        isStillSnoozed = new Date(n.snoozedUntil).getTime() > Date.now();
      }

      return matchesRole && matchesProject && !isStillSnoozed;
    });
  }

  // Unread count
  public static getUnreadCount(role: UserRole | string, projectName?: string): number {
    const filtered = this.getNotificationsForRoleAndProject(role, projectName);
    return filtered.filter(n => n.status === "Unread" && !n.isArchived).length;
  }

  // Update Notification Status
  public static markAsRead(id: string): void {
    const list = this.getNotifications();
    const item = list.find(n => n.id === id);
    if (item && item.status === "Unread") {
      item.status = "Read";
      this.saveNotifications(list);
    }
  }

  public static markAsUnread(id: string): void {
    const list = this.getNotifications();
    const item = list.find(n => n.id === id);
    if (item) {
      item.status = "Unread";
      this.saveNotifications(list);
    }
  }

  public static acknowledge(id: string): void {
    const list = this.getNotifications();
    const item = list.find(n => n.id === id);
    if (item) {
      item.status = "Acknowledged";
      this.saveNotifications(list);
    }
  }

  public static markAsCompleted(id: string): void {
    const list = this.getNotifications();
    const item = list.find(n => n.id === id);
    if (item) {
      item.status = "Completed";
      this.saveNotifications(list);
    }
  }

  public static snooze(id: string, hours: number = 4): void {
    const list = this.getNotifications();
    const item = list.find(n => n.id === id);
    if (item) {
      item.isSnoozed = true;
      item.snoozedUntil = new Date(Date.now() + hours * 3600000).toISOString();
      this.saveNotifications(list);
    }
  }

  public static archive(id: string): void {
    const list = this.getNotifications();
    const item = list.find(n => n.id === id);
    if (item) {
      item.isArchived = true;
      this.saveNotifications(list);
    }
  }

  public static deleteNotification(id: string): void {
    const list = this.getNotifications();
    const filtered = list.filter(n => n.id !== id);
    this.saveNotifications(filtered);
  }

  public static markAllAsRead(role: UserRole | string, projectName?: string): void {
    const list = this.getNotifications();
    const roleStr = String(role);

    list.forEach(n => {
      const matchesRole = roleStr === UserRole.SUPER_ADMIN || roleStr === UserRole.HEAD_OFFICE || n.targetRoles.some(r => String(r) === roleStr);
      const matchesProject = !projectName || projectName === "ALL" || n.projectName === "Global System" || n.projectName === projectName;
      if (matchesRole && matchesProject && n.status === "Unread") {
        n.status = "Read";
      }
    });

    this.saveNotifications(list);
  }

  // Create new notification manually or programmatically
  public static createNotification(params: Omit<EnterpriseNotification, "id" | "date" | "time" | "timestamp">): EnterpriseNotification {
    const list = this.getNotifications();
    const now = new Date();
    
    const newNotif: EnterpriseNotification = {
      ...params,
      id: `NOTIF-${Date.now()}`,
      date: now.toISOString().slice(0, 10),
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now()
    };

    list.unshift(newNotif);
    this.saveNotifications(list);
    return newNotif;
  }

  // AI Trigger Simulation Engine - generates dynamic AI alerts
  public static triggerAiAlertGenerator(alertType: 
    | "lowStock"
    | "missingPanels"
    | "delayedDelivery"
    | "budgetOverrun"
    | "attendanceAnomaly"
    | "safetyRisk"
    | "materialShortage"
    | "equipmentMaintenance"
    | "projectDelay"
    | "unusualActivity"
  ): EnterpriseNotification {

    const generators: Record<string, () => Omit<EnterpriseNotification, "id" | "date" | "time" | "timestamp">> = {
      lowStock: () => ({
        title: "AI Alert: Critical Fast-Depleting Stock - Waterproofing Chemical",
        titleAm: "የኤአይ ማስጠንቀቂያ፡ በፍጥነት የሚያልቅ ኬሚካል ስቶክ",
        description: "Predictive burn rate indicates Waterproof Membrane Chemical stock will run out in 18 hours at current application pace.",
        descriptionAm: "የኤአይ ትንበያ አሁን ባለው የሥራ ፍጥነት የውሃ መከላከያ ኬሚካል ክምችት በ18 ሰዓታት ውስጥ እንደሚበቃ አሳይቷል።",
        category: "Warehouse Notifications",
        priority: "Critical",
        status: "Unread",
        projectName: "Addis Ababa Tower Block A",
        siteName: "Central Logistics Yard",
        sender: "BuildSync AI Inventory Engine",
        senderRole: "System AI",
        receiver: "Warehouse Manager & Procurement",
        targetRoles: [UserRole.SUPER_ADMIN, UserRole.WAREHOUSE_MANAGER, UserRole.PROCUREMENT_MANAGER, UserRole.STORE_OWNER],
        isAiGenerated: true,
        aiConfidence: 0.98,
        deliveryChannels: { inApp: true, push: true, email: true, sms: true },
        actionTab: "warehouseManagerApp"
      }),

      missingPanels: () => ({
        title: "AI Panel Tracker: 18 Decking Panels Missing in Zone 3",
        titleAm: "የኤአይ ፓነል መከታተያ፡ 18 የደብረ ፓነሎች በዞን 3 አልተገኙም",
        description: "Computer vision scan identified mismatch between dismounted panels and store return logs.",
        descriptionAm: "የኮምፒውተር ቪዥን ስካነር ከተነሱት ፓነሎችና ወደ ስቶር ከተመለሱት መካከል የ18 ፓነሎች ልዩነት አግኝቷል።",
        category: "Aluminum Formwork Panel Tracking Notifications",
        priority: "High",
        status: "Unread",
        projectName: "Addis Ababa Tower Block A",
        siteName: "Bole Main Site",
        building: "Tower A",
        floor: "3rd Floor (+10.8m)",
        zone: "Zone 3 South",
        sender: "BuildSync Formwork AI Vision",
        senderRole: "System AI",
        receiver: "Site Engineer & Store Owner",
        targetRoles: [UserRole.SUPER_ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_ENGINEER, UserRole.STORE_OWNER, UserRole.ASSEMBLER],
        isAiGenerated: true,
        aiConfidence: 0.95,
        deliveryChannels: { inApp: true, push: true, email: false, sms: true },
        actionTab: "formworkManagement"
      }),

      delayedDelivery: () => ({
        title: "AI Logistics Alert: Rebar Truck #ET-3-7720 Delayed 2 Hours",
        titleAm: "የኤአይ ሎጅስቲክስ ማስጠንቀቂያ፡ የብረት መኪናው በ2 ሰዓት ዘግይቷል",
        description: "GPS Geofence breach detected on Mojo Dry Port route due to highway clearance check.",
        descriptionAm: "የጂፒኤስ መከታተያው መኪናው በመንገድ ፍተሻ ምክንያት በ2 ሰዓት መዘግየቱን አሳይቷል።",
        category: "Delivery Notifications",
        priority: "High",
        status: "Unread",
        projectName: "Commercial Podium Plaza B",
        sender: "BuildSync GPS Logistics AI",
        senderRole: "System AI",
        receiver: "Procurement & Site Logistics",
        targetRoles: [UserRole.SUPER_ADMIN, UserRole.PROCUREMENT_MANAGER, UserRole.WAREHOUSE_MANAGER, UserRole.DRIVER],
        isAiGenerated: true,
        aiConfidence: 0.91,
        deliveryChannels: { inApp: true, push: true, email: false, sms: true },
        actionTab: "enterpriseErp"
      }),

      budgetOverrun: () => ({
        title: "AI Finance Alert: Equipment Rental Cost Variance +12.5%",
        titleAm: "የኤአይ ፋይናንስ ማስጠንቀቂያ፡ የክሬንና ኤክስካቫተር ኪራይ በ12.5% ጨምሯል",
        description: "Overtime mobile crane operation hours exceeded monthly budget allowance by ETB 210,000.",
        descriptionAm: "የተደረገው የክሬን ትርፍ ሰዓት ሥራ ከወርሃዊው በጀት በላይ የ210,000 ብር ብልጫ አሳይቷል።",
        category: "Budget Notifications",
        priority: "High",
        status: "Unread",
        projectName: "Addis Ababa Tower Block A",
        sender: "BuildSync Cost AI Predictor",
        senderRole: "System AI",
        receiver: "Finance Manager & Project Manager",
        targetRoles: [UserRole.SUPER_ADMIN, UserRole.HEAD_OFFICE, UserRole.FINANCE_MANAGER, UserRole.PROJECT_MANAGER, UserRole.AUDITOR],
        isAiGenerated: true,
        aiConfidence: 0.96,
        deliveryChannels: { inApp: true, push: true, email: true, sms: false },
        actionTab: "financeErp"
      }),

      attendanceAnomaly: () => ({
        title: "AI Attendance Alert: Duplicate Face Recognition Scan Flagged",
        titleAm: "የኤአይ መገኘት ማስጠንቀቂያ፡ ተደራራቢ የፊት ቅኝት ተመዝግቧል",
        description: "Worker ID #W-204 scanned at Bole Gate and Kazanchis Gate within a 10-minute interval.",
        descriptionAm: "የሠራተኛ መታወቂያ #W-204 በ10 ደቂቃ ልዩነት ውስጥ በሁለት ልዩ ልዩ ሳይቶች ተመዝግቧል።",
        category: "Attendance Notifications",
        priority: "High",
        status: "Unread",
        projectName: "Global System",
        sender: "BuildSync Biometric Anti-Fraud AI",
        senderRole: "System AI",
        receiver: "Time Keeper & HR Admin",
        targetRoles: [UserRole.SUPER_ADMIN, UserRole.HR_MANAGER, UserRole.TIME_KEEPER, "Security Officer"],
        isAiGenerated: true,
        aiConfidence: 0.99,
        deliveryChannels: { inApp: true, push: true, email: true, sms: true },
        actionTab: "attendance"
      }),

      safetyRisk: () => ({
        title: "AI Safety Camera: Unsecured Perimeter Cable Detected",
        titleAm: "የኤአይ ደህንነት ካሜራ፡ ያልተጠበቀ የፎቅ ጠርዝ ገመድ ተገኝቷል",
        description: "Live camera stream in Zone 2 detected loose safety lifeline near edge pour area.",
        descriptionAm: "የቀጥታ ካሜራ ምስል በዞን 2 የፎቅ ጠርዝ ላይ የላላ የደህንነት ገመድ አሳይቷል።",
        category: "Hazard Notifications",
        priority: "Critical",
        status: "Unread",
        projectName: "Addis Ababa Tower Block A",
        siteName: "Bole Main Site",
        building: "Tower A",
        floor: "4th Floor (+14.4m)",
        zone: "Zone 2 North",
        sender: "BuildSync Safety AI Vision",
        senderRole: "System AI",
        receiver: "HSE Officer & Site Engineers",
        targetRoles: [UserRole.SUPER_ADMIN, UserRole.PROJECT_MANAGER, UserRole.HSE_OFFICER, UserRole.SITE_ENGINEER, UserRole.SUPERVISOR],
        isAiGenerated: true,
        aiConfidence: 0.97,
        deliveryChannels: { inApp: true, push: true, email: true, sms: true },
        actionTab: "safetyQuality"
      }),

      materialShortage: () => ({
        title: "AI Material Forecast: Tie Rod Shortage Forecasted in 48 Hours",
        titleAm: "የኤአይ ትንበያ፡ የፎርምወርክ ታይሮዶች እጥረት በ48 ሰዓታት ውስጥ ያጋጥማል",
        description: "Scheduled column formwork erection requires 400 tie rods; current approved store stock is 120.",
        descriptionAm: "የታቀደው የዓምዶች ሥራ 400 ታይሮዶችን የሚፈልግ ሲሆን በስቶር ያለው ግን 120 ብቻ ነው።",
        category: "Material Request Notifications",
        priority: "High",
        status: "Unread",
        projectName: "Addis Ababa Tower Block A",
        sender: "BuildSync MRP AI Engine",
        senderRole: "System AI",
        receiver: "Store Owner & Procurement",
        targetRoles: [UserRole.SUPER_ADMIN, UserRole.PROJECT_MANAGER, UserRole.STORE_OWNER, UserRole.PROCUREMENT_MANAGER],
        isAiGenerated: true,
        aiConfidence: 0.93,
        deliveryChannels: { inApp: true, push: true, email: false, sms: false },
        actionTab: "enterpriseErp"
      }),

      equipmentMaintenance: () => ({
        title: "AI Telemetry Alert: Tower Crane Cable Tension Warning",
        titleAm: "የኤአይ መከታተያ፡ የታወር ክሬን ገመድ ውጥረት ማስጠንቀቂያ",
        description: "Hoisting cable strain sensors detected 5.2% elongation. Immediate calibration required.",
        descriptionAm: "የክሬኑ ገመድ ውጥረት መለኪያ የ5.2% መወጠር አሳይቷል። ወዲያውኑ ፍተሻ ይደረግ።",
        category: "Equipment Notifications",
        priority: "Critical",
        status: "Unread",
        projectName: "Addis Ababa Tower Block A",
        siteName: "Bole Main Site",
        sender: "IoT Crane Strain Sensor AI",
        senderRole: "System AI",
        receiver: "Equipment Manager & Crane Operator",
        targetRoles: [UserRole.SUPER_ADMIN, UserRole.PROJECT_MANAGER, UserRole.WAREHOUSE_MANAGER, UserRole.SITE_ENGINEER],
        isAiGenerated: true,
        aiConfidence: 0.98,
        deliveryChannels: { inApp: true, push: true, email: true, sms: true },
        actionTab: "enterpriseErp"
      }),

      projectDelay: () => ({
        title: "AI Schedule Predictor: Concrete Curing SLA Delay +2 Days",
        titleAm: "የኤአይ የጊዜ ሰሌዳ ትንበያ፡ የኮንክሪት ማድረቂያ ጊዜ በ2 ቀን መዘግየት",
        description: "High humidity levels extended minimum stripping strength cure time by 36 hours.",
        descriptionAm: "ከፍተኛ እርጥበት ምክንያት የፎርምወርክ ማንሻ ጥንካሬ ለማግኘት ተጨማሪ 36 ሰዓታት ያስፈልጋሉ።",
        category: "Project Progress Notifications",
        priority: "High",
        status: "Unread",
        projectName: "Addis Ababa Tower Block A",
        building: "Tower A",
        floor: "3rd Floor (+10.8m)",
        sender: "BuildSync Antigravity Schedule AI",
        senderRole: "System AI",
        receiver: "Project Manager & Section Head",
        targetRoles: [UserRole.SUPER_ADMIN, UserRole.HEAD_OFFICE, UserRole.PROJECT_MANAGER, UserRole.SECTION_HEAD, UserRole.SITE_ENGINEER],
        isAiGenerated: true,
        aiConfidence: 0.94,
        deliveryChannels: { inApp: true, push: true, email: true, sms: false },
        actionTab: "progress"
      }),

      unusualActivity: () => ({
        title: "AI Security Alert: Late Night Inventory Movement at 02:14 AM",
        titleAm: "የኤአይ ደህንነት ማስጠንቀቂያ፡ ከእኩለ ሌሊት በኋላ የተደረገ የዕቃ ዝውውር",
        description: "Warehouse B Motion Sensors detected unauthorized pallet jack movement during closed hours.",
        descriptionAm: "የግምጃ ቤት ቢ የእንቅስቃሴ ሴንሰሮች ከተዘጋ በኋላ የዕቃ ዝውውር መኖሩን አሳይተዋል።",
        category: "System Update Notifications",
        priority: "Critical",
        status: "Unread",
        projectName: "Addis Ababa Tower Block A",
        siteName: "Central Logistics Yard",
        building: "Warehouse B",
        sender: "BuildSync Security AI Patrol",
        senderRole: "System AI",
        receiver: "Admin & Security Officers",
        targetRoles: [UserRole.SUPER_ADMIN, UserRole.HEAD_OFFICE, UserRole.WAREHOUSE_MANAGER, "Security Officer"],
        isAiGenerated: true,
        aiConfidence: 0.99,
        deliveryChannels: { inApp: true, push: true, email: true, sms: true },
        actionTab: "admin"
      })
    };

    const fn = generators[alertType] || generators.lowStock;
    return this.createNotification(fn());
  }
}
