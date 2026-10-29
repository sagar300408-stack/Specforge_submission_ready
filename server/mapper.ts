import fs from "fs";
import path from "path";
import { z } from "zod";
import { generateJson, type LlmConfig } from "./llm.js";
import type { CourseOutcome, CoPoPsoCell, Unit } from "./types.js";

// Load reference POs and PSOs
let poPsoConfig: {
  pos: Array<{ id: string; title: string; statement: string }>;
  psos: Array<{ id: string; statement: string }>;
} = { pos: [], psos: [] };

try {
  const p = path.resolve(process.cwd(), "config/po_pso.json");
  if (fs.existsSync(p)) {
    poPsoConfig = JSON.parse(fs.readFileSync(p, "utf8"));
  }
} catch {
  // fallback
}

const aiMatrixSchema = z.record(
  z.string(),
  z.record(
    z.string(),
    z.object({
      level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
      justification: z.string(),
    }).nullable()
  )
);

export async function generateCoPoPsoMap(
  cos: CourseOutcome[],
  units: Unit[],
  llmConfig?: LlmConfig
): Promise<Record<string, Record<string, CoPoPsoCell | null>>> {
  if (llmConfig) {
    try {
      const prompt = `You are an academic curriculum mapping expert.
Given the following Course Outcomes (COs) and syllabus units, generate a CO-PO-PSO articulation matrix mapping each CO (CO-1 to CO-n) to Programme Outcomes (PO-1 through PO-11) and Programme Specific Outcomes (PSO-1, PSO-2).
Scale: 3 (Very Strong), 2 (Strong), 1 (Moderate), or null (No relation).
Every mapped cell must include a concise, evidence-based one-line justification referencing the CO statement and PO/PSO definition.

Configured POs and PSOs:
${JSON.stringify(poPsoConfig, null, 2)}

Course Outcomes:
${JSON.stringify(cos, null, 2)}

Syllabus Units:
${JSON.stringify(units, null, 2)}

Return strictly valid JSON matching this schema:
Record<string, Record<string, { level: 1|2|3, justification: string } | null>>.`;

      const aiResult = await generateJson(prompt, aiMatrixSchema, llmConfig);
      if (aiResult && typeof aiResult === "object") {
        return aiResult as Record<string, Record<string, CoPoPsoCell | null>>;
      }
    } catch (e) {
      console.log("AI mapping using deterministic fallback rules.");
    }
  }

  // Deterministic fallback
  const matrix: Record<string, Record<string, CoPoPsoCell | null>> = {};
  const poList = poPsoConfig.pos || [];
  const psoList = poPsoConfig.psos || [];

  for (const co of cos) {
    matrix[co.id] = {};
    const bloom = co.bloom_level || 2;
    const stmtLower = co.statement.toLowerCase();

    for (let i = 1; i <= 11; i++) {
      const poId = `PO-${i}`;
      const poDef = poList.find((p) => p.id === poId);
      let level: 1 | 2 | 3 | null = null;
      let justification = "";

      // PO-1 (Engineering Knowledge): Applying mathematics, natural science, computing, or engineering fundamentals
      if (poId === "PO-1" && (stmtLower.includes("fundamental") || stmtLower.includes("principle") || stmtLower.includes("mathematics") || stmtLower.includes("science") || stmtLower.includes("concept") || stmtLower.includes("theory"))) {
        level = Math.min(bloom, 3) as 1 | 2 | 3;
        justification = `Demonstrates ${poDef?.title || "Engineering Knowledge"} by applying foundational principles to: "${co.statement.slice(0, 85)}".`;
      }
      // PO-2 (Problem Analysis): Formulating, analyzing complex engineering problems, reaching substantiated conclusions
      else if (poId === "PO-2" && (stmtLower.includes("analy") || stmtLower.includes("formulat") || stmtLower.includes("differenti") || stmtLower.includes("diagnos") || stmtLower.includes("evaluat"))) {
        level = Math.min(bloom >= 4 ? 3 : 2, bloom) as 1 | 2 | 3;
        justification = `Demonstrates ${poDef?.title || "Problem Analysis"} through structured analysis of complex engineering problems in: "${co.statement.slice(0, 85)}".`;
      }
      // PO-3 (Design/Development of Solutions): Designing creative solutions, developing systems, components, or processes
      else if (poId === "PO-3" && (stmtLower.includes("design") || stmtLower.includes("develop") || stmtLower.includes("construct") || stmtLower.includes("synthes") || stmtLower.includes("architect"))) {
        level = (bloom >= 5 ? 3 : 2) as 1 | 2 | 3;
        justification = `Demonstrates ${poDef?.title || "Design / Development"} by creating solutions and components to meet defined technical requirements in: "${co.statement.slice(0, 85)}".`;
      }
      // PO-4 (Conduct Investigations): Research-based knowledge, design of experiments, analysis/interpretation of data
      else if (poId === "PO-4" && (stmtLower.includes("investigat") || stmtLower.includes("experiment") || stmtLower.includes("measur") || stmtLower.includes("benchmark") || stmtLower.includes("testing"))) {
        level = (bloom >= 4 ? 2 : 1) as 1 | 2 | 3;
        justification = `Demonstrates ${poDef?.title || "Investigations"} through experimental inquiry, modeling, or data analysis in: "${co.statement.slice(0, 85)}".`;
      }
      // PO-5 (Engineering Tool Usage): Creating, selecting, and applying modern engineering and IT tools
      else if (poId === "PO-5" && (stmtLower.includes("tool") || stmtLower.includes("software") || stmtLower.includes("apparatus") || stmtLower.includes("instrument") || stmtLower.includes("simulat") || stmtLower.includes("ide"))) {
        level = (bloom >= 3 ? 2 : 1) as 1 | 2 | 3;
        justification = `Demonstrates ${poDef?.title || "Tool Usage"} by applying appropriate engineering tools, environments, and resources in: "${co.statement.slice(0, 85)}".`;
      }
      // PO-11 (Life-Long Learning): Independent and life-long learning, critical thinking in broad technological change
      else if (poId === "PO-11" && (stmtLower.includes("independent") || stmtLower.includes("self-directed") || stmtLower.includes("emerging") || stmtLower.includes("lifelong") || stmtLower.includes("literature"))) {
        level = 1;
        justification = `Demonstrates ${poDef?.title || "Life-Long Learning"} by fostering self-directed inquiry and continuous adaptability in: "${co.statement.slice(0, 85)}".`;
      }

      matrix[co.id][poId] = level ? { level, justification } : null;
    }

    for (let j = 1; j <= 2; j++) {
      const psoId = `PSO-${j}`;
      const psoDef = psoList.find((p) => p.id === psoId);
      let level: 1 | 2 | 3 | null = null;
      let justification = "";

      // PSO-1: Computing fundamentals, algorithms, data structures (config/po_pso.json)
      if (psoId === "PSO-1" && (stmtLower.includes("algorithm") || stmtLower.includes("data structure") || stmtLower.includes("computational") || stmtLower.includes("program"))) {
        level = Math.min(bloom, 3) as 1 | 2 | 3;
        justification = `Directly evidences PSO-1 (${psoDef?.statement.slice(0, 60)}...) through algorithmic and computational problem solving.`;
      }
      // PSO-2: Design and develop software solutions (config/po_pso.json)
      else if (psoId === "PSO-2" && (stmtLower.includes("software") || stmtLower.includes("programmatic") || stmtLower.includes("platform") || stmtLower.includes("code"))) {
        level = (bloom >= 4 ? 3 : 2) as 1 | 2 | 3;
        justification = `Directly evidences PSO-2 (${psoDef?.statement.slice(0, 60)}...) through software solution design and implementation.`;
      }

      matrix[co.id][psoId] = level ? { level, justification } : null;
    }
  }

  return matrix;
}

export async function generateComprehensiveSummary(
  title: string,
  units: Unit[],
  courseType: string,
  llmConfig?: LlmConfig
): Promise<string> {
  if (llmConfig) {
    try {
      const prompt = `Write a comprehensive academic course summary for the course "${title}" (Type: ${courseType}) based on the following syllabus units:
${JSON.stringify(units, null, 2)}
The summary must be professional, descriptive, grounded in the syllabus topics, and free of fabricated external facts. Return JSON: { "summary": "..." }`;
      const aiRes = await generateJson(prompt, z.object({ summary: z.string() }), llmConfig);
      if (aiRes?.summary) return aiRes.summary;
    } catch (e) {
      console.log("AI summary using deterministic fallback.");
    }
  }

  const unitList = units.map((u) => `Unit ${u.number}: ${u.title}`).filter(Boolean).join("; ");
  let summary = `This course covers ${title}. The curriculum comprises: ${unitList}.`;
  const hasLab = units.some((u) => typeof u.lab === "string" && u.lab.trim().length > 0);
  if (hasLab) {
    summary += ` The syllabus includes laboratory and practical exercises.`;
  }
  return summary;
}
