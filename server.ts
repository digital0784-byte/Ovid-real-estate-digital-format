import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

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

startServer();
