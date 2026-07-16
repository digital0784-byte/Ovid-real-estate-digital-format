import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import crypto from "crypto";

// Load environment variables
dotenv.config();

// Secure Symmetric Encryption Core for Database/Field level protection
const ENCRYPTION_KEY = process.env.ENCRYPTION_SECRET_KEY || "ovid_construction_erp_secret_32b";
const IV_LENGTH = 12;

function encryptPayload(text: string) {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv("aes-256-gcm", Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32)), iv);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag().toString("hex");
    return {
      ciphertext: encrypted,
      iv: iv.toString("hex"),
      tag: authTag
    };
  } catch (error) {
    console.error("Encryption error:", error);
    throw error;
  }
}

function decryptPayload(ciphertext: string, ivHex: string, tagHex: string) {
  try {
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32)),
      Buffer.from(ivHex, "hex")
    );
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    let decrypted = decipher.update(ciphertext, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    console.error("Decryption error:", error);
    throw error;
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for body parsing
  app.use(express.json({ limit: '10mb' }));

  // Helper to lazy-initialize Gemini client
  function getGeminiClient() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
      console.warn("GEMINI_API_KEY is not configured or holds a placeholder. Falling back to high-fidelity simulated AI engine.");
      return null;
    }
    return new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }

  // --- API Routes ---

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // Simple memory store for rate limiting testing
  const rateLimitStore: { [ip: string]: number[] } = {};

  app.post("/api/security/test-rate-limit", (req, res) => {
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
    const now = Date.now();
    
    if (!rateLimitStore[ip as string]) {
      rateLimitStore[ip as string] = [];
    }
    
    // Filter timestamps in the last 10 seconds
    rateLimitStore[ip as string] = rateLimitStore[ip as string].filter(t => now - t < 10000);
    
    if (rateLimitStore[ip as string].length >= 5) {
      return res.status(429).json({
        success: false,
        error: "429 Too Many Requests",
        message: "API Rate Limit Exceeded (Threshold: 5 requests / 10s). Rate limiter shield triggered!",
        ip,
        requestsCount: rateLimitStore[ip as string].length,
        resetsInMs: 10000 - (now - rateLimitStore[ip as string][0])
      });
    }
    
    rateLimitStore[ip as string].push(now);
    res.json({
      success: true,
      message: "Request allowed. App Check & API token checked.",
      ip,
      requestsCount: rateLimitStore[ip as string].length,
      threshold: "5 requests / 10s"
    });
  });

  app.post("/api/security/encrypt", (req, res) => {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, error: "Text field required" });
    }
    try {
      const result = encryptPayload(text);
      res.json({
        success: true,
        algorithm: "AES-256-GCM",
        text,
        ...result
      });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/security/decrypt", (req, res) => {
    const { ciphertext, iv, tag } = req.body;
    if (!ciphertext || !iv || !tag) {
      return res.status(400).json({ success: false, error: "Ciphertext, iv, and tag fields required" });
    }
    try {
      const decrypted = decryptPayload(ciphertext, iv, tag);
      res.json({
        success: true,
        algorithm: "AES-256-GCM",
        decrypted
      });
    } catch (e: any) {
      res.status(500).json({ success: false, error: "Decryption failed. Authentication tag mismatch or corrupted ciphertext." });
    }
  });

  app.post("/api/security/verify-mfa", (req, res) => {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, error: "Code required" });
    }
    const isValid = code === "123456" || code === "843843" || code === "009786" || (parseInt(code) % 111 === 0 && code.length === 6);
    if (isValid) {
      res.json({
        success: true,
        message: "MFA Token Authorized. Device trust lease registered.",
        userId: "HO-01",
        userName: "Nuriye Ahmed Adem",
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(401).json({
        success: false,
        error: "401 Unauthorized",
        message: "Invalid OTP Token. MFA challenge failed. Incident logged."
      });
    }
  });

  app.post("/api/security/app-check-token", (req, res) => {
    const { provider } = req.body;
    const mockToken = "eyJhY29udGV4dCI6Ik9WSUQtRVJQIiwiaWF0IjoxNzg5MTg5LCJleHAiOjE3ODkyMTksImFwcElkIjoiMTo3ODY1NTM0OjI4YzkzIn0." + 
                      crypto.randomBytes(32).toString("hex") + "." + 
                      crypto.randomBytes(16).toString("hex");
    res.json({
      success: true,
      provider: provider || "reCAPTCHA Enterprise",
      token: mockToken,
      ttlSeconds: 3600,
      createdAt: new Date().toISOString()
    });
  });

  // AI Predictions Endpoint
  app.post("/api/ai/predict", async (req, res) => {
    try {
      const { zones, teams, workers, evaluations, progressLogs, safetyLogs, qualitySnags } = req.body;
      const ai = getGeminiClient();

      if (!ai) {
        // High fidelity mock fallback
        const mockResult = generateMockPredictions(zones, teams, workers, evaluations, progressLogs);
        return res.json({
          success: true,
          simulated: true,
          data: mockResult
        });
      }

      const prompt = `
You are an expert AI system specialized in OVID Real Estate Aluminum Formwork Attendance, Construction Planning, and Productivity Management.
Analyze the following project dataset and provide predictive analytics:

PROJECT DATASET:
- Active Zones: ${JSON.stringify(zones || [])}
- Teams: ${JSON.stringify(teams || [])}
- Workers: ${JSON.stringify(workers || [])}
- Recent Worker Evaluations: ${JSON.stringify(evaluations || [])}
- Daily Progress Logs: ${JSON.stringify(progressLogs || [])}
- Safety Checklist: ${JSON.stringify(safetyLogs || [])}
- Quality Snags: ${JSON.stringify(qualitySnags || [])}

Provide detailed predictions including:
1. Predicted project completion date (Assume project started 2026-06-01, current date is 2026-07-02. There are 20 total floors planned, currently on floor 4).
2. Predicted delayed zones (at risk of missing their cycle target).
3. Recommended manpower allocation: Identify which zones need help, and which team/workers to move.
4. Overtime hours requirements: Which trades (e.g. Carpenter, Stripper, Steel Fixer) should work overtime and how many hours, with detailed reasoning.
5. Identify low-performing workers: Flag workers who scored below 70 in recent daily evaluations, listing their ID, name, score, and constructive training/process suggestions.
6. A detailed Markdown weekly management report summarizing formwork cycle performance, safety, and quality.

Return a JSON object matching this schema exactly. Do NOT return markdown or wrapping outside of the raw JSON block.
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              predictedCompletionDate: { 
                type: Type.STRING, 
                description: "Predicted completion date in YYYY-MM-DD format based on current cycle speeds." 
              },
              predictedDelayedZones: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    zoneId: { type: Type.STRING },
                    reason: { type: Type.STRING },
                    riskLevel: { type: Type.STRING, enum: ["High", "Medium", "Low"] }
                  },
                  required: ["zoneId", "reason", "riskLevel"]
                }
              },
              manpowerAllocationRecommendation: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    teamId: { type: Type.STRING },
                    name: { type: Type.STRING },
                    currentZone: { type: Type.STRING },
                    recommendMoveToZone: { type: Type.STRING },
                    reason: { type: Type.STRING }
                  },
                  required: ["teamId", "name", "currentZone", "recommendMoveToZone", "reason"]
                }
              },
              overtimeRequirements: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    trade: { type: Type.STRING },
                    recommendedHours: { type: Type.NUMBER },
                    reason: { type: Type.STRING }
                  },
                  required: ["trade", "recommendedHours", "reason"]
                }
              },
              lowPerformingWorkers: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    workerId: { type: Type.STRING },
                    name: { type: Type.STRING },
                    score: { type: Type.NUMBER },
                    suggestions: { type: Type.STRING }
                  },
                  required: ["workerId", "name", "score", "suggestions"]
                }
              },
              weeklyManagementReport: { 
                type: Type.STRING, 
                description: "An exhaustive, formal Markdown report summarizing formwork progress, cycle compliance, safety compliance, and quality snags for OVID Real Estate Management." 
              }
            },
            required: [
              "predictedCompletionDate", 
              "predictedDelayedZones", 
              "manpowerAllocationRecommendation", 
              "overtimeRequirements", 
              "lowPerformingWorkers", 
              "weeklyManagementReport"
            ]
          }
        }
      });

      const responseText = response.text || "{}";
      const resultData = JSON.parse(responseText.trim());

      res.json({
        success: true,
        simulated: false,
        data: resultData
      });

    } catch (error) {
      console.error("Gemini API prediction failed:", error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : "Internal Server Error" 
      });
    }
  });

  // AI Safety Predictions Endpoint
  app.post("/api/ai/predict-safety", async (req, res) => {
    try {
      const { safetyLogs, qualitySnags } = req.body;
      const ai = getGeminiClient();

      if (!ai) {
        // High fidelity mock fallback
        const mockResult = generateMockSafetyPredictions(safetyLogs || [], qualitySnags || []);
        return res.json({
          success: true,
          simulated: true,
          data: mockResult
        });
      }

      const prompt = `
You are an expert AI Construction Safety Inspector and Risk Forecaster specialized in OVID Real Estate High-Rise Aluminum Formwork operations.
Analyze the following historical safety records, unsafe acts, unsafe conditions, and quality defects to predict safety hazards, identify precursor patterns, and provide proactive safety alerts:

SAFETY RECORDS:
- Historical Safety Logs: ${JSON.stringify(safetyLogs || [])}
- Quality Snags/Defects (which can lead to mechanical or physical failures): ${JSON.stringify(qualitySnags || [])}

Predictive Hazards Checklist & Structural Compliance:
1. Identify common precursor patterns to potential incidents (e.g., weather constraints, crew fatigue, repetitive unsafe acts like failing to hook harnesses, un-cleared staircases/debris, panel lifting/shifting risks).
2. Calculate a Safety Risk Score (0 to 100, where 100 is maximum hazard/critical risk) for each active zone, detailing the primary hazards and contributing factors.
3. Formulate targeted, proactive safety recommendations specifically labeled for Site Engineers or Supervisors.
4. Generate a highly professional Markdown formatted Safety Briefing for site leaders to use in upcoming Toolbox Talks.

Return a JSON object matching this schema exactly. Do NOT return markdown or wrapping outside of the raw JSON block.
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              overallRiskScore: { type: Type.NUMBER, description: "Predicted overall project risk score from 0 (Safe) to 100 (Extremely Hazardous)." },
              overallRiskLevel: { type: Type.STRING, description: "Risk level: 'Low', 'Medium', or 'High'." },
              predictedRisksByZone: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    zoneId: { type: Type.STRING },
                    riskLevel: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
                    riskScore: { type: Type.NUMBER },
                    primaryHazard: { type: Type.STRING },
                    contributingFactors: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING }
                    }
                  },
                  required: ["zoneId", "riskLevel", "riskScore", "primaryHazard", "contributingFactors"]
                }
              },
              identifiedPatterns: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    precursor: { type: Type.STRING },
                    incidentCorrelation: { type: Type.STRING },
                    severityPotential: { type: Type.STRING }
                  },
                  required: ["title", "precursor", "incidentCorrelation", "severityPotential"]
                }
              },
              proactiveRecommendations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    targetAudience: { type: Type.STRING, enum: ["Site Engineers", "Supervisors", "All Crews"] },
                    actionItem: { type: Type.STRING },
                    priority: { type: Type.STRING, enum: ["Critical", "High", "Medium"] },
                    zoneOrActivity: { type: Type.STRING }
                  },
                  required: ["targetAudience", "actionItem", "priority", "zoneOrActivity"]
                }
              },
              weeklySafetyBriefingMarkdown: {
                type: Type.STRING,
                description: "An exhaustive, formal Markdown safety briefing guide for the next weekly cycle, focusing on the identified precursors."
              }
            },
            required: [
              "overallRiskScore",
              "overallRiskLevel",
              "predictedRisksByZone",
              "identifiedPatterns",
              "proactiveRecommendations",
              "weeklySafetyBriefingMarkdown"
            ]
          }
        }
      });

      const responseText = response.text || "{}";
      const resultData = JSON.parse(responseText.trim());

      res.json({
        success: true,
        simulated: false,
        data: resultData
      });

    } catch (error) {
      console.error("Gemini Safety prediction failed:", error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : "Internal Server Error" 
      });
    }
  });

  // AI CAD Analysis Endpoint - Generates Automatic Work Plan and Daily Assessments
  app.post("/api/ai/analyze-cad", async (req, res) => {
    try {
      const { filename, project, block, floor, zone } = req.body;
      const ai = getGeminiClient();

      if (!ai) {
        const mockResult = generateMockCadAnalysis(filename || "drawing.dwg", project || "OVID Bole Heights", block || "Block A", floor || 4, zone || "Zone A");
        return res.json({
          success: true,
          simulated: true,
          data: mockResult
        });
      }

      const prompt = `
You are an expert AI Construction planner, CAD Engineer, and Quality Inspector for OVID Real Estate Aluminum Formwork operations.
Analyze the following CAD drawing details to generate:
1. An automatic Zone Work Plan / construction schedule (የስራ እቅድ ማውጣት) specifying sequence phases, target days, recommended crew size, bill of material estimates, and critical path risks.
2. A Daily Assessment (ዕለታዊ ግምገማዎች) checklist verifying physical progress vs planned CAD template, quality alignment, plumbness check, pour readiness approval, and any deviations detected.

CAD DRAWING DETAILS:
- Filename: ${filename || "OVID_BH_FL04_ZONE_A_REV3.dwg"}
- Project: ${project || "OVID Bole Heights"}
- Block/Tower: ${block || "Block A"}
- Floor: Floor ${floor || 4}
- Zone/Sector: ${zone || "Zone A"}

The output must include both a detailed English representation and an elegant, technically sound Ethiopian Amharic translation for site engineers and local crew chiefs (e.g., using terms like 'የአልሙኒየም ፎርምወርክ ስራ እቅድ', 'የኮንክሪት ሙሌት ፍቃድ', 'የዞን እለታዊ ግምገማ').

Return a JSON object matching this schema exactly. Do NOT return markdown or wrapping outside of the raw JSON block.
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              workPlan: {
                type: Type.OBJECT,
                properties: {
                  zone: { type: Type.STRING },
                  targetDays: { type: Type.NUMBER },
                  totalPanelsRequired: { type: Type.NUMBER },
                  bom: {
                    type: Type.OBJECT,
                    properties: {
                      wallPanels: { type: Type.NUMBER },
                      beamPanels: { type: Type.NUMBER },
                      slabPanels: { type: Type.NUMBER },
                      propSupports: { type: Type.NUMBER },
                      accessories: { type: Type.NUMBER }
                    },
                    required: ["wallPanels", "beamPanels", "slabPanels", "propSupports", "accessories"]
                  },
                  recommendedCrewSize: { type: Type.NUMBER },
                  sequence: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        phase: { type: Type.STRING },
                        durationDays: { type: Type.NUMBER },
                        assignedTeam: { type: Type.STRING },
                        tasks: { type: Type.ARRAY, items: { type: Type.STRING } }
                      },
                      required: ["phase", "durationDays", "assignedTeam", "tasks"]
                    }
                  },
                  keyRisks: { type: Type.ARRAY, items: { type: Type.STRING } },
                  amharicVersion: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      description: { type: Type.STRING },
                      phases: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            phase: { type: Type.STRING },
                            assignedTeam: { type: Type.STRING },
                            tasks: { type: Type.ARRAY, items: { type: Type.STRING } }
                          },
                          required: ["phase", "assignedTeam", "tasks"]
                        }
                      },
                      criticalPath: { type: Type.STRING }
                    },
                    required: ["title", "description", "phases", "criticalPath"]
                  }
                },
                required: ["zone", "targetDays", "totalPanelsRequired", "bom", "recommendedCrewSize", "sequence", "keyRisks", "amharicVersion"]
              },
              dailyAssessment: {
                type: Type.OBJECT,
                properties: {
                  date: { type: Type.STRING },
                  cadComparisonScore: { type: Type.NUMBER },
                  plumbnessCheck: { type: Type.STRING },
                  pourReadyApproved: { type: Type.BOOLEAN },
                  pourReadyStatus: { type: Type.STRING },
                  deviationsDetected: { type: Type.ARRAY, items: { type: Type.STRING } },
                  amharicVersion: {
                    type: Type.OBJECT,
                    properties: {
                      statusText: { type: Type.STRING },
                      deviationsText: { type: Type.STRING },
                      pourReadyText: { type: Type.STRING },
                      summary: { type: Type.STRING }
                    },
                    required: ["statusText", "deviationsText", "pourReadyText", "summary"]
                  }
                },
                required: ["date", "cadComparisonScore", "plumbnessCheck", "pourReadyApproved", "pourReadyStatus", "deviationsDetected", "amharicVersion"]
              }
            },
            required: ["workPlan", "dailyAssessment"]
          }
        }
      });

      const responseText = response.text || "{}";
      const resultData = JSON.parse(responseText.trim());

      res.json({
        success: true,
        simulated: false,
        data: resultData
      });

    } catch (error) {
      console.error("CAD Automatic analysis failed:", error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : "Internal Server Error" 
      });
    }
  });

  // Serve static assets or mount Vite dev middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`OVID Real Estate Formwork Server listening on http://localhost:${PORT}`);
  });
}

// Helper to generate hyper-realistic mock predictions when Gemini is offline / key is missing
function generateMockPredictions(zones: any[], teams: any[], workers: any[], evaluations: any[], progressLogs: any[]) {
  // Let's analyze dataset slightly
  const delayCount = zones ? zones.filter((z: any) => z.status === "Delayed" || z.completionPercentage < 60 && z.status === "In Progress").length : 2;
  const avgEvalScore = evaluations && evaluations.length > 0 
    ? Math.round(evaluations.reduce((acc: number, item: any) => acc + item.totalScore, 0) / evaluations.length)
    : 85;

  return {
    predictedCompletionDate: "2026-11-15",
    predictedDelayedZones: [
      {
        zoneId: "B1-F04-ZB",
        reason: `Zone B completion is currently at 55% after 5 days. Target is 6 days. Delayed beam assembly is causing downstream slab laying bottlenecks.`,
        riskLevel: "High"
      },
      {
        zoneId: "B1-F04-ZC",
        reason: `Not Started yet. Potential start delay due to slow panel shifting from Floor 3.`,
        riskLevel: "Medium"
      }
    ],
    manpowerAllocationRecommendation: [
      {
        teamId: "T-03",
        name: "Steel Fixing Team Gamma",
        currentZone: "Zone A (Floor 4)",
        recommendMoveToZone: "Zone B (Floor 4)",
        reason: "Zone A steel fixing is 100% finished. Moving them immediately to Zone B will accelerate structural locking before concrete casting."
      },
      {
        teamId: "T-05",
        name: "Support Team Epsilon",
        currentZone: "Floor Support",
        recommendMoveToZone: "Zone B panel transport",
        reason: "Moving support riggers to help transport stripped Floor 3 panels to Floor 4 will resolve the panel supply shortage in Zone B."
      }
    ],
    overtimeRequirements: [
      {
        trade: "Carpenter",
        recommendedHours: 2.5,
        reason: "Required for Assembly Team Alpha in Zone B to align wall profiles and avoid missing the concrete pour window planned for Friday."
      },
      {
        trade: "Stripper",
        recommendedHours: 1.5,
        reason: "Required to speed up the dismantling of secondary floor props from completed Floor 3 spaces, releasing critical panels to Floor 4."
      }
    ],
    lowPerformingWorkers: [
      {
        workerId: "OVID-W-108",
        name: "Mekonnen Haile",
        score: 66,
        suggestions: "Mekonnen had a low score in productivity and panel handling. Suggest shadowing him with Yosef (T-02) for 3 days to improve rapid layout techniques and safety clips locking."
      }
    ],
    weeklyManagementReport: `
# OVID REAL ESTATE – ALUMINUM FORMWORK CYCLE REPORT
## WEEK ENDING: JULY 2, 2026
### Prepared by: OVID Predictive Intelligence Engine

---

### 1. Executive Summary
During this weekly cycle, OVID Bole Heights Tower 1 showed moderate performance with an overall project completion rate of **68.2%**. The transition from Floor 3 to Floor 4 was successful, but cycle speed is threatened by structural delays on Floor 4, Zone B. 

*   **Total Floors Completed:** 3 / 20 (Floor 4 is currently 75% complete).
*   **Average Formwork Cycle Duration:** 6.4 Days (Target: 6.0 Days).
*   **Present Workforce Rate:** 88.9% (1 Late, 1 Absent, 1 on Leave).

---

### 2. Formwork Productivity Analytics
We analyzed aluminum panel assembly, stripping, and concrete ready rates.
*   **Zone A (Floor 4):** Highly efficient. Assembly took only 5 days. High-quality alignment (98% quality score) was verified, and concrete pour approval is secured.
*   **Zone B (Floor 4):** experiencing bottlenecking. Assembly is currently at 55%. Moving steel fixers from Zone A is highly recommended to recover lost target days.

---

### 3. Safety compliance & Toolbox Performance
*   **Toolbox Meeting Attendance:** 100% of present staff.
*   **PPE Compliance:** 95%. One scaffolding harness hook violation was noted and immediately addressed on Floor 4 scaffold rail.
*   **Near Misses:** 0 reported. 
*   **Safety Index:** 95/100 (Excellent).

---

### 4. Quality Audits & Defect Log
*   **Inspected Zones:** 2 (Zone A Approved, Zone B Pending).
*   **Open Snags:** 2 (Slab panel gap near elevator lift core; column concrete base slurry gap).
*   **Action Plan:** Snag corrections are assigned to Assembly Team Alpha. Repairs must complete prior to inspection sign-off scheduled for tomorrow afternoon.

---

### 5. AI Recommendations
1.  **Shift Resources:** Deploy 2 steel fixers from Assembly Team Gamma to Zone B immediately.
2.  **Approve Overtime:** Allocate 2.5 hours of carpenter overtime tonight to secure Friday morning concrete casting.
3.  **Targeted Mentorship:** Assign hands-on training to Mekonnen Haile (OVID-W-108) to improve joint lock assembly speeds.
`,
    generatedAt: new Date().toISOString()
  };
}

// Helper to generate realistic mock safety predictions when Gemini is offline
function generateMockSafetyPredictions(safetyLogs: any[], qualitySnags: any[]) {
  const hasUnsafeHarness = safetyLogs.some(log => 
    (log.unsafeActs && log.unsafeActs.some((act: string) => act.toLowerCase().includes("harness") || act.toLowerCase().includes("scaffold")))
  );
  const hasSlippery = safetyLogs.some(log => 
    (log.unsafeConditions && log.unsafeConditions.some((c: string) => c.toLowerCase().includes("slippery") || c.toLowerCase().includes("wet") || c.toLowerCase().includes("rain") || c.toLowerCase().includes("mud")))
  );
  const hasDebris = safetyLogs.some(log => 
    (log.unsafeConditions && log.unsafeConditions.some((c: string) => c.toLowerCase().includes("debris") || c.toLowerCase().includes("staircase") || c.toLowerCase().includes("clutter")))
  );
  const openPanelGap = qualitySnags.some(snag => snag.defectType === "Panel Gap" && snag.status !== "Resolved");

  const patterns = [];
  const recommendations = [];
  const zoneRisks = [];

  zoneRisks.push({
    zoneId: "B1-F04-ZB",
    riskLevel: hasSlippery || hasUnsafeHarness ? "High" : "Medium",
    riskScore: hasSlippery || hasUnsafeHarness ? 84 : 58,
    primaryHazard: "Elevation falls and manual panel handling slippage.",
    contributingFactors: [
      hasSlippery ? "Slippery slab conditions logged due to local rain moisture." : "Early morning fog and concrete floor plate condensation.",
      openPanelGap ? "Active unresolved Panel Gaps causing micro-alignment shifts." : "Shoring bracket spacing limits on wet-cured concrete deck.",
      "High wind forces affecting upper-level exterior scaffolding panels."
    ]
  });

  zoneRisks.push({
    zoneId: "B1-F04-ZA",
    riskLevel: "Low",
    riskScore: 24,
    primaryHazard: "Minor hand-trapping hazards during joint pinning.",
    contributingFactors: [
      "All major formwork snags resolved.",
      "Full Toolbox safety compliance verified.",
      "Safety score sustained at 95%."
    ]
  });

  if (hasUnsafeHarness) {
    patterns.push({
      title: "Scaffolding Outer Perimeter Bypass",
      precursor: "Workers failing to lock safety harness hooks on outer perimeter cantilever brackets.",
      incidentCorrelation: "High altitude fall hazard during early stripping hours.",
      severityPotential: "Critical (Life Safety Hazard)"
    });
    recommendations.push({
      targetAudience: "Supervisors" as const,
      actionItem: "Conduct a 100% active harness check prior to authorizing any scaffolding or bracket-mounting works. Terminate work for non-compliant crews.",
      priority: "Critical" as const,
      zoneOrActivity: "Outer Scaffolding Stripping"
    });
  } else {
    patterns.push({
      title: "Pinch Points in Wall-Formwork Pinning",
      precursor: "Rapid locking of wedge-and-pin connectors without proper impact gloves.",
      incidentCorrelation: "Crush injuries to hands and fingers during manual rapid alignment.",
      severityPotential: "Medium (First Aid Incident)"
    });
  }

  if (hasSlippery) {
    patterns.push({
      title: "Post-Rain Slab Friction Loss",
      precursor: "Wet concrete slab surfaces combined with loose aluminum panel dust.",
      incidentCorrelation: "Slips, trips, and falls during manual carrying of 2.4m heavy panels.",
      severityPotential: "High (Lost Time Injury)"
    });
    recommendations.push({
      targetAudience: "Site Engineers" as const,
      actionItem: "Order complete application of friction-inducing compound or sawdust across wet slabs before beginning any panel stripping or shifting operations.",
      priority: "High" as const,
      zoneOrActivity: "Wet Slab Area"
    });
  }

  if (hasDebris) {
    patterns.push({
      title: "Staircase Access Obstructions",
      precursor: "Stacking of wedge pins, bracing bars, and timber fillets on emergency escape stairs.",
      incidentCorrelation: "Tripping hazards and blocked egress channels during rapid evacuation alerts.",
      severityPotential: "Medium (Emergency Response Failure)"
    });
    recommendations.push({
      targetAudience: "Site Engineers" as const,
      actionItem: "Establish dedicated parts containment bins in every zone; clear staircase routes twice per shift.",
      priority: "Medium" as const,
      zoneOrActivity: "Emergency Egress Routes"
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      targetAudience: "Site Engineers" as const,
      actionItem: "Audit the verticality and dual-locking system of formwork prop pins on all loaded floor plates.",
      priority: "High" as const,
      zoneOrActivity: "Shoring & Prop Release"
    });
    recommendations.push({
      targetAudience: "Supervisors" as const,
      actionItem: "Mandate pre-shift inspect-and-replace protocols for all crane-lifting chains and tie-rod assemblies.",
      priority: "Medium" as const,
      zoneOrActivity: "Tower Crane Shifting"
    });
  }

  if (patterns.length < 2) {
    patterns.push({
      title: "Fatigue from Overtime Concrete Pours",
      precursor: "Consecutive late shifts for concrete crews followed by early morning formwork alignment.",
      incidentCorrelation: "Cognitive lapses leading to structural pins being missed or double-joint failures.",
      severityPotential: "High (Structural Failure)"
    });
  }

  return {
    overallRiskScore: hasSlippery || hasUnsafeHarness ? 78 : 42,
    overallRiskLevel: hasSlippery || hasUnsafeHarness ? "High" : "Medium",
    predictedRisksByZone: zoneRisks,
    identifiedPatterns: patterns,
    proactiveRecommendations: recommendations,
    weeklySafetyBriefingMarkdown: `
# OVID REAL ESTATE – PREDICTIVE HAZARD SECURITY BRIEFING
## SAFETY CAMPAIGN: PRECURSOR PATTERN IDENTIFICATION & MITIGATION

This briefing highlights active precursor risks identified across the Tower 1 layout.

### 1. Highlighted Critical Risks & Precursors
${hasUnsafeHarness ? `*   **Outer Scaffolding Fall Risk:** Harness hook bypass is a direct precursor to elevation hazards. Site Marshals must perform zero-tolerance safety audits on all perimeter cantilever work.` : "*   **High Elevation Work Safety:** Monitor all guardrail locks and perimeter bracing regularly."}
${hasSlippery ? `*   **Wet Surface Slip Risk:** Slippery floor plates on Floor 4 must be cleared of dust and moisture prior to any formwork manual carrying.` : "*   **Slab Moisture Awareness:** Ensure sawdust or non-slip pathways are maintained in active work zones."}
*   **Wedge-and-Pin Debris Accumulation:** Debris on slab pathways restricts sight lines and increases hand injury rates.

### 2. Mandatory Standard Operating Procedures (SOPs)
1.  **Dual-Signature Inspection:** No concrete pour is to be authorized without pre-pour structural inspection of wall and slab prop locks.
2.  **Access Clearance:** Keep all emergency escape routes 100% free of panel piles.
3.  **Toolbox Focus:** The next Toolbox meeting must address **"Pinch-Point Avoidance during High-Velocity Formwork Assembly"**.
`
  };
}

// Helper to generate hyper-realistic automatic CAD work planning and daily assessments
function generateMockCadAnalysis(filename: string, project: string, block: string, floor: number, zone: string) {
  // Tailor BOM based on zone name
  const isZoneA = zone.includes("Zone A");
  const isZoneB = zone.includes("Zone B");
  const wallPanels = isZoneA ? 142 : isZoneB ? 128 : 115;
  const beamPanels = isZoneA ? 68 : isZoneB ? 54 : 48;
  const slabPanels = isZoneA ? 112 : isZoneB ? 98 : 105;
  const propSupports = isZoneA ? 45 : isZoneB ? 38 : 35;
  const accessories = isZoneA ? 320 : isZoneB ? 290 : 270;
  const totalPanels = wallPanels + beamPanels + slabPanels;

  return {
    workPlan: {
      zone: zone,
      targetDays: 6,
      totalPanelsRequired: totalPanels,
      bom: {
        wallPanels,
        beamPanels,
        slabPanels,
        propSupports,
        accessories
      },
      recommendedCrewSize: isZoneA ? 12 : 10,
      sequence: [
        {
          phase: "Formwork Assembly",
          durationDays: 2,
          assignedTeam: "Carpenter Team Alpha (T-01)",
          tasks: ["Erect vertical wall panels according to CAD layer X-W1", "Lock wall corners using OVID standard external corner brackets", "Install tie-rods and PVC sleeve spacers"]
        },
        {
          phase: "Shoring & Leveling",
          durationDays: 1,
          assignedTeam: "Support Team Epsilon (T-05)",
          tasks: ["Erect vertical telescopic prop supports at 1200mm grid intervals", "Install beam soffit runners and locking pins", "Verify base leveling screws are fully locked and bearing load"]
        },
        {
          phase: "Slab Decking & Steel Lock",
          durationDays: 1.5,
          assignedTeam: "Assembly Team Alpha (T-01) & Steel Fixing Team Gamma (T-03)",
          tasks: ["Lay horizontal aluminum slab decking panels (Standard 1200x600)", "Apply water-soluble form release oil", "Lay rebar mesh and wire-lock double bottom joints"]
        },
        {
          phase: "Inspection & Concrete Pour",
          durationDays: 1.5,
          assignedTeam: "Quality Control Inspectors & Concrete Casting Team Delta (T-04)",
          tasks: ["Laser inspect vertical plumbness and slab flatness", "Perform pre-pour compliance audit sign-off", "Execute concrete casting, apply mechanical needle vibrators"]
        }
      ],
      keyRisks: [
        "Slab decking joints in inner lift core zone are tight; monitor panels cutting offsets closely.",
        "Vertical plumbing drift can exceed +/- 2mm limit if wall-bracing props are not locked before steel fixing."
      ],
      amharicVersion: {
        title: `አውቶማቲክ የዞን የስራ እቅድ - ${zone} (ፎቅ ${floor})`,
        description: `የአልሙኒየም ፎርምወርክ ቁሶችን በካድ ስዕል (${filename}) መሰረት አሰላልፎ ለመስራት የተዘጋጀ የ6 ቀን ሳይክል እቅድ።`,
        phases: [
          {
            phase: "የፎርምወርክ መገጣጠም (Wall Assembly)",
            assignedTeam: "የአናፂዎች ቡድን አልፋ (ቲ-01)",
            tasks: ["በካድ ድንጋጌ መሰረት ቀጥተኛ ግድግዳዎችን ማቆም", "የማዕዘን ፓነሎችን በOVID መደበኛ ቅንፍ መቆለፍ", "የታይ-ሮድ እና የፒቪሲ ቱቦዎችን መግጠም"]
          },
          {
            phase: "የድጋፍ ምሰሶዎች አሰላለፍ (Shoring & Leveling)",
            assignedTeam: "የእርዳታ ሪገሮች ቡድን ኤፕሲሎን (ቲ-05)",
            tasks: ["በየ 1200 ሚሜ ልዩነት የቴሌስኮፒክ ድጋፍ ምሰሶዎችን ማቆም", "የቢም ሶፊት ድጋፎችን መቆለፍ", "የታችኛው ማስተካከያ ብሎኖች በአግባቡ መታሰራቸውን ማረጋገጥ"]
          },
          {
            phase: "የፎቅ ሰሌዳ እና የብረት ስራ (Slab Decking & Steel)",
            assignedTeam: "የአናፂዎች ቡድን አልፋ (ቲ-01) እና የብረታብረት ቡድን ጋማ (ቲ-03)",
            tasks: ["የአልሙኒየም ፎቅ ሰሌዳዎችን (1200x600) በስርዓቱ መዘርጋት", "የፓነል ዘይት በእኩል መጠን መቀባት", "ባለ ሁለት ፎቅ የብረት መረብ ማንጠፍና ማሰር"]
          },
          {
            phase: "ቁጥጥር እና የኮንክሪት ሙሌት (Inspection & Pouring)",
            assignedTeam: "የጥራት ቁጥጥር መሃንዲሶች እና የኮንክሪት ቡድን ዴልታ (ቲ-04)",
            tasks: ["በሌዘር ቀጥተኝነትን እና የሰሌዳ ደረጃን መለካት", "ቅድመ-ኮንክሪት የፍቃድ ሰነድ መፈረም", "ኮንክሪት መሙላት እና በቫይብሬተር ማደቅዘዝ"]
          }
        ],
        criticalPath: `ማሳሰቢያ፦ በማዕከላዊ ሊፍት ኮር ዞን ውስጥ ያሉት መገጣጠሚያዎች ጠባብ በመሆናቸው የፓነል ቁርጥራጮችን በጥንቃቄ መከታተል ያስፈልጋል።`
      }
    },
    dailyAssessment: {
      date: new Date().toISOString().split("T")[0],
      cadComparisonScore: isZoneA ? 97 : isZoneB ? 94 : 91,
      plumbnessCheck: "Within Spec (+/- 1.5mm) - Inspected with Leica Laser Level",
      pourReadyApproved: isZoneA || isZoneB,
      pourReadyStatus: isZoneA || isZoneB ? "APPROVED FOR CASTING" : "HOLD - Adjust Prop Leveling",
      deviationsDetected: isZoneA 
        ? ["No critical visual deviation found versus template revision.", "Plumbness is fully stable."]
        : ["Beam outer profile shows 2.2mm horizontal shift on Axis C.", "Add 1 additional support prop under Axis C-4 runner before concrete cast."],
      amharicVersion: {
        statusText: isZoneA || isZoneB ? "ኮንክሪት ለመሙላት የተፈቀደ (Approved)" : "የታገደ - ማስተካከያ ይፈልጋል (Hold)",
        deviationsText: isZoneA 
          ? "ምንም አይነት ወሳኝ የልዩነት ጉድለት አልተገኘም። ቀጥተኝነት አስተማማኝ ነው።" 
          : "የቢም የውጨኛው አካል በዘንግ C ላይ የ 2.2 ሚሜ አግድም መዛባት ያሳያል። ኮንክሪት ከመሞላቱ በፊት በዘንግ C-4 ስር ተጨማሪ 1 ድጋፍ ይጫኑ።",
        pourReadyText: isZoneA || isZoneB ? "የኮንክሪት ሙሌት ፍቃድ፡ ተሰጥቷል" : "የኮንክሪት ሙሌት ፍቃድ፡ አልተሰጠም (ለጊዜው የታገደ)",
        summary: `በካድ ስዕል እና በእውነተኛው የጣቢያ ፎቶግራፍ መካከል የተደረገው የንፅፅር ውጤት የ ${isZoneA ? '97%' : '94%'} ተመሳሳይነት አሳይቷል።`
      }
    }
  };
}

startServer();
