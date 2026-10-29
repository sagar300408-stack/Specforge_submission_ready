import fs from "fs";
import path from "path";
import { extractTextFromFile } from "./docReader.js";
import { parseCourseDocuments } from "./parser.js";
import { generateCoPoPsoMap, generateComprehensiveSummary } from "./mapper.js";
import { inspectCourseSpec } from "./inspector.js";
import { fillCourseTemplate } from "./templateFiller.js";
import { workflowStore } from "./workflowStore.js";
import type { SpecForgeOutput, ParsedCourseData } from "./types.js";

export interface PipelineResult {
  output: SpecForgeOutput;
  html: string;
  parsed: ParsedCourseData;
  templateChoice: "integrated" | "non_lab";
  signals: string[];
  reportHtml: string;
}

export async function runSpecForgePipeline(params: {
  specBuffer: Buffer;
  specFilename: string;
  blueprintBuffer?: Buffer | null;
  blueprintFilename?: string | null;
  templateOverride?: "integrated" | "non_lab" | null;
  overrideReason?: string;
  inputId?: string;
}): Promise<PipelineResult> {
  // 1. Extract raw texts
  const specDoc = await extractTextFromFile(params.specBuffer, params.specFilename);
  let blueprintDoc: { text: string } | null = null;
  if (params.blueprintBuffer && params.blueprintFilename) {
    blueprintDoc = await extractTextFromFile(params.blueprintBuffer, params.blueprintFilename);
  }

  // 2. Parse course data
  const parsed = parseCourseDocuments(specDoc.text, blueprintDoc?.text || null);

  // 3. Template Selection Logic:
  // Rule: A non-zero Practical value in the credit structure (e.g. 3:0:1) or a course type containing 'laboratory'
  // means the Integrated template; otherwise Non-Lab.
  const parts = parsed.credits_ltp.split(":").map((p) => parseInt(p, 10) || 0);
  const practicalCredits = parts[2] || 0;
  const isLabType = parsed.course_type.toLowerCase().includes("laboratory");

  const signals: string[] = [];
  if (practicalCredits > 0) {
    signals.push(`Practical credit component = ${practicalCredits} (> 0 in structure ${parsed.credits_ltp})`);
  }
  if (isLabType) {
    signals.push(`Course type '${parsed.course_type}' explicitly indicates laboratory work`);
  }
  if (signals.length === 0) {
    signals.push(`Practical credits = 0 and course type '${parsed.course_type}' has no lab component`);
  }

  const detectedTemplate: "integrated" | "non_lab" =
    practicalCredits > 0 || isLabType ? "integrated" : "non_lab";

  const templateChoice: "integrated" | "non_lab" =
    params.templateOverride || detectedTemplate;

  // 4. Generate comprehensive summary covering all syllabus units
  parsed.summary = generateComprehensiveSummary(parsed.title, parsed.units, parsed.course_type);

  // 5. Generate CO-PO-PSO Matrix
  const matrix = generateCoPoPsoMap(parsed.course_outcomes, parsed.units);

  // 6. Inspect & detect defects according to Rules V1 to V10
  const inspection = inspectCourseSpec(
    parsed,
    matrix,
    templateChoice,
    params.overrideReason
  );

  // 7. Fill official template HTML
  const currentWorkflowState = workflowStore.getState();
  const html = fillCourseTemplate(parsed, matrix, templateChoice, currentWorkflowState);

  // 8. Construct validated specforge_output conforming to schema
  const output: SpecForgeOutput = {
    schema_version: "1.0",
    input_id: params.inputId || "SAMPLE",
    template: templateChoice,
    course: {
      title: parsed.title,
      code: parsed.code,
      department: parsed.department,
      credits_ltp: parsed.credits_ltp,
      course_type: parsed.course_type,
      summary: parsed.summary,
    },
    course_outcomes: parsed.course_outcomes.map((co) => ({
      id: co.id,
      statement: co.statement,
      bloom_level: co.bloom_level,
    })),
    units: parsed.units.map((u) => ({
      number: u.number,
      title: u.title,
      lab: u.lab || null,
    })),
    co_po_pso_map: matrix,
    teaching_hours: parsed.teaching_hours,
    assessment: {
      components: parsed.assessment.components.map((c) => ({
        name: c.name,
        weight_percent: c.weight_percent,
      })),
      co_coverage: parsed.assessment.co_coverage,
    },
    defects: inspection.defects.map((d) => ({
      code: d.code,
      location: {
        source: d.location.source,
        section: d.location.section ?? null,
        refs: d.location.refs,
      },
      description: d.description,
      fix: d.fix,
    })),
  };

  return {
    output,
    html,
    parsed,
    templateChoice,
    signals,
    reportHtml: inspection.htmlReport,
  };
}
