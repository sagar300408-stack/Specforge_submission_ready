import fs from "fs";
import path from "path";
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

export function generateCoPoPsoMap(
  cos: CourseOutcome[],
  units: Unit[]
): Record<string, Record<string, CoPoPsoCell | null>> {
  const matrix: Record<string, Record<string, CoPoPsoCell | null>> = {};

  // For each CO, generate a sound academic mapping with Bloom ceiling enforcement
  for (const co of cos) {
    matrix[co.id] = {};
    const bloom = co.bloom_level || 2;
    const stmtLower = co.statement.toLowerCase();

    // Map through PO-1 to PO-11
    for (let i = 1; i <= 11; i++) {
      const poId = `PO-${i}`;
      let level: 1 | 2 | 3 | null = null;
      let justification = "";

      if (poId === "PO-1") {
        // Engineering knowledge applies to almost all computing fundamentals
        level = (Math.min(bloom, 3) as 1 | 2 | 3);
        justification = `Applies fundamental principles of engineering and computing to ${co.verb || 'address'} computational concepts.`;
      } else if (poId === "PO-2" && (bloom >= 3 || stmtLower.includes("problem") || stmtLower.includes("computational"))) {
        // Problem analysis
        level = (Math.min(bloom >= 4 ? 3 : 2, bloom) as 1 | 2 | 3);
        justification = `Formulates and analyzes structured computational problems using systematic analytical techniques.`;
      } else if (poId === "PO-3" && (bloom >= 3 || stmtLower.includes("solve") || stmtLower.includes("develop") || stmtLower.includes("program"))) {
        // Design/Development of solutions
        level = (bloom >= 5 ? 3 : bloom >= 3 ? 2 : 1) as 1 | 2 | 3;
        justification = `Designs algorithmic solutions, software components, and modular structures meeting technical requirements.`;
      } else if (poId === "PO-4" && (bloom >= 4 || stmtLower.includes("analyze") || stmtLower.includes("evaluate"))) {
        // Investigations
        level = (bloom >= 5 ? 2 : 1) as 1 | 2 | 3;
        justification = `Conducts empirical investigation and performance benchmarking of algorithmic choices.`;
      } else if (poId === "PO-5" && (stmtLower.includes("programming") || stmtLower.includes("data structure") || stmtLower.includes("ide") || stmtLower.includes("python") || stmtLower.includes("construct"))) {
        // Modern tool usage
        level = (bloom >= 3 ? 2 : 1) as 1 | 2 | 3;
        justification = `Employs modern programming language environments, compiler tooling, and debugging IDEs.`;
      } else if (poId === "PO-11" && (bloom >= 2)) {
        // Lifelong learning
        level = 1;
        justification = `Develops foundational aptitude for self-directed learning and adapting to evolving programming frameworks.`;
      }

      matrix[co.id][poId] = level ? { level, justification } : null;
    }

    // Map through PSOs: PSO-1 and PSO-2 only (never PSO-3!)
    for (let j = 1; j <= 2; j++) {
      const psoId = `PSO-${j}`;
      let level: 1 | 2 | 3 | null = null;
      let justification = "";

      if (psoId === "PSO-1") {
        level = (Math.min(bloom, 3) as 1 | 2 | 3);
        justification = `Applies core computer science algorithms, memory models, and data representation techniques.`;
      } else if (psoId === "PSO-2") {
        level = (bloom >= 4 ? 3 : bloom >= 2 ? 2 : 1) as 1 | 2 | 3;
        justification = `Constructs and validates robust software solutions using programming idioms and standard data structures.`;
      }

      matrix[co.id][psoId] = level ? { level, justification } : null;
    }
  }

  return matrix;
}

export function generateComprehensiveSummary(
  title: string,
  units: Unit[],
  courseType: string
): string {
  const unitTopics = units
    .map((u) => u.title)
    .filter(Boolean)
    .join(", ");

  return `This course provides a rigorous, foundational introduction to ${title}. Designed for engineering disciplines, the syllabus systematically covers ${unitTopics}. Students develop competence in algorithmic reasoning, problem formulation, structural programming idioms, control flow, functions, testing, sorting and searching algorithms, as well as foundational linear data structures (arrays, stacks, queues). Theoretical principles are closely paired with practical programming lab experiences to prepare students for multi-domain engineering computation.`;
}
