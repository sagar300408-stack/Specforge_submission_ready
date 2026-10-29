import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import Ajv2020 from "ajv/dist/2020.js";
import * as cheerio from "cheerio";
import mammoth from "mammoth";
import { parseCourseDocuments } from "../server/parser.js";
import { generateCoPoPsoMap, generateComprehensiveSummary } from "../server/mapper.js";
import { inspectCourseSpec } from "../server/inspector.js";
import { fillCourseTemplate } from "../server/templateFiller.js";
import type { ParsedCourseData } from "../server/types.js";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  FAIL: ${message}`);
    failedCount++;
    throw new Error(`Assertion failed: ${message}`);
  } else {
    console.log(`  PASS: ${message}`);
    passedCount++;
  }
}

async function runAllTests() {
  console.log("=== SPECFORGE AUDIT & VERIFICATION TEST SUITE ===\n");

  const schema = JSON.parse(fs.readFileSync("config/specforge_output.schema.json", "utf8"));
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  const validateSchema = ajv.compile(schema);

  // -------------------------------------------------------------
  // Test 1: Real DOCX extraction of sample_course_spec.docx
  // -------------------------------------------------------------
  console.log("[Test 1] Real DOCX extraction and table-cell preserved assessment parsing");
  const docxPath = "sample-inputs/sample_course_spec.docx";
  assert(fs.existsSync(docxPath), "sample_course_spec.docx exists");

  const docxBuffer = fs.readFileSync(docxPath);
  const mammothHtml = (await mammoth.convertToHtml({ buffer: docxBuffer })).value;
  const mammothText = (await mammoth.extractRawText({ buffer: docxBuffer })).value;

  const realParsed = parseCourseDocuments(mammothText, null, mammothHtml);

  assert(realParsed.course_outcomes.length === 5, `Extracted 5 defined COs from Section 3 (found ${realParsed.course_outcomes.length})`);
  assert(realParsed.course_outcomes[0].id === "CO-1", "First CO is CO-1");
  assert(realParsed.course_outcomes[4].id === "CO-5", "Fifth CO is CO-5");
  assert(Boolean(realParsed.assessment.co_coverage["CO-6"]), "Foreign CO-6 extracted from assessment table as intentional sample defect");

  // In the real docx table:
  // CO-1 has X in Tests, Written exam -> CE and SEE (NOT LSEE)
  // CO-6 has X in Assignments, Lab CE, LSEE -> CE and LSEE (NOT Written exam / SEE)
  const co1Assess = realParsed.assessment.co_coverage["CO-1"] || [];
  const co6Assess = realParsed.assessment.co_coverage["CO-6"] || [];

  assert(co1Assess.includes("Continuous Evaluation (CE)"), "CO-1 includes Continuous Evaluation (CE)");
  assert(co1Assess.includes("Semester End Examination (SEE)"), "CO-1 includes Semester End Examination (SEE)");
  assert(!co1Assess.includes("Lab Semester End Examination (LSEE)"), "CO-1 correctly excludes Lab Semester End Examination (LSEE)");

  assert(co6Assess.includes("Continuous Evaluation (CE)"), "CO-6 includes Continuous Evaluation (CE)");
  assert(co6Assess.includes("Lab Semester End Examination (LSEE)"), "CO-6 includes Lab Semester End Examination (LSEE)");
  assert(!co6Assess.includes("Semester End Examination (SEE)"), "CO-6 correctly excludes Semester End Examination (SEE) based on exact table cells");

  // -------------------------------------------------------------
  // Test 2: Dynamic assessment CO coverage for 4-CO course
  // -------------------------------------------------------------
  console.log("\n[Test 2] 4-CO Course Scenario");
  const fourCoData: ParsedCourseData = {
    title: "Operating Systems",
    code: "CS302",
    department: "Computer Science and Engineering",
    faculty: "Engineering",
    credits_ltp: "3:0:2",
    total_credits: 4,
    total_hours: 75,
    course_type: "Core",
    summary: "Study of operating systems concepts including processes, memory management, and file systems.",
    course_outcomes: [
      { id: "CO-1", statement: "Explain fundamental OS architectures and process lifecycle models.", bloom_level: 2 },
      { id: "CO-2", statement: "Apply CPU scheduling algorithms and synchronization primitives.", bloom_level: 3 },
      { id: "CO-3", statement: "Implement virtual memory management and page replacement policies.", bloom_level: 3 },
      { id: "CO-4", statement: "Design and evaluate file system structures and device driver interfaces.", bloom_level: 5 },
    ],
    units: [
      { number: 1, title: "OS Principles", hours: 15, content: "Process and thread models.", lab: "Process creation" },
      { number: 2, title: "Concurrency", hours: 15, content: "Semaphores and mutexes.", lab: "Producer-consumer" },
      { number: 3, title: "Memory", hours: 15, content: "Paging and segmentation.", lab: "Page replacement simulation" },
      { number: 4, title: "Storage", hours: 15, content: "File systems and I/O.", lab: "Virtual disk layout" },
    ],
    teaching_hours: { lectures: 45, lab: 30, tests_exams: 0, total: 75 },
    assessment: {
      components: [
        { name: "Continuous Evaluation (CE)", weight_percent: 60 },
        { name: "Semester End Examination (SEE)", weight_percent: 40 },
      ],
      co_coverage: {
        "CO-1": ["Continuous Evaluation (CE)", "Semester End Examination (SEE)"],
        "CO-2": ["Continuous Evaluation (CE)", "Semester End Examination (SEE)"],
        "CO-3": ["Continuous Evaluation (CE)"],
        "CO-4": ["Semester End Examination (SEE)"],
      },
    },
    raw_text: "",
    hasExplicitCredits: true,
  };

  const fourCoMap = await generateCoPoPsoMap(fourCoData.course_outcomes, fourCoData.units);
  assert(Object.keys(fourCoMap).length === 4, "4-CO mapping matrix generated exactly 4 rows");
  const fourCoReport = inspectCourseSpec(fourCoData, fourCoMap, "integrated");
  assert(fourCoReport.rules.find((r) => r.id === "V1")?.status === "PASS", "V1 passes for 4-CO course");

  // -------------------------------------------------------------
  // Test 3: Dynamic assessment CO coverage for 6-CO course
  // -------------------------------------------------------------
  console.log("\n[Test 3] 6-CO Course Scenario");
  const sixCoData: ParsedCourseData = {
    ...fourCoData,
    title: "Computer Networks",
    code: "CS401",
    course_outcomes: [
      ...fourCoData.course_outcomes,
      { id: "CO-5", statement: "Analyze transport layer congestion control protocols.", bloom_level: 4 },
      { id: "CO-6", statement: "Design and implement network security configurations.", bloom_level: 6 },
    ],
    assessment: {
      components: [
        { name: "Continuous Evaluation (CE)", weight_percent: 60 },
        { name: "Semester End Examination (SEE)", weight_percent: 40 },
      ],
      co_coverage: {
        "CO-1": ["Continuous Evaluation (CE)", "Semester End Examination (SEE)"],
        "CO-2": ["Continuous Evaluation (CE)", "Semester End Examination (SEE)"],
        "CO-3": ["Continuous Evaluation (CE)"],
        "CO-4": ["Semester End Examination (SEE)"],
        "CO-5": ["Continuous Evaluation (CE)", "Semester End Examination (SEE)"],
        "CO-6": ["Continuous Evaluation (CE)", "Semester End Examination (SEE)"],
      },
    },
  };
  const sixCoMap = await generateCoPoPsoMap(sixCoData.course_outcomes, sixCoData.units);
  assert(Object.keys(sixCoMap).length === 6, "6-CO mapping matrix generated exactly 6 rows");
  const sixCoReport = inspectCourseSpec(sixCoData, sixCoMap, "integrated");
  assert(sixCoReport.rules.find((r) => r.id === "V1")?.status === "PASS", "V1 passes for 6-CO course");

  // -------------------------------------------------------------
  // Test 4: Non-CS Course Scenario & No Fabricated Programming Claims
  // -------------------------------------------------------------
  console.log("\n[Test 4] Non-CS Course Scenario & Factual Grounding");
  const nonCsUnits = [
    { number: 1, title: "Fluid Properties", hours: 15, content: "Viscosity, surface tension, pressure measurement.", lab: null },
    { number: 2, title: "Fluid Kinematics", hours: 15, content: "Velocity field, continuity equation, streamline analysis.", lab: null },
    { number: 3, title: "Fluid Dynamics", hours: 15, content: "Bernoulli equation, Navier-Stokes equations, pipe flow.", lab: null },
  ];
  const nonCsSummary = await generateComprehensiveSummary("Fluid Mechanics", nonCsUnits, "Core Course");
  assert(!nonCsSummary.toLowerCase().includes("python"), "Non-CS summary does not fabricate Python");
  assert(!nonCsSummary.toLowerCase().includes("software"), "Non-CS summary does not fabricate software");
  assert(!nonCsSummary.toLowerCase().includes("opencv"), "Non-CS summary does not fabricate OpenCV");
  assert(nonCsSummary.includes("Fluid Properties"), "Non-CS summary contains genuine Unit 1 topic");

  // -------------------------------------------------------------
  // Test 5: Missing Credits Structure triggers HOURS_INCONSISTENT
  // -------------------------------------------------------------
  console.log("\n[Test 5] Missing Credit Structure Verification");
  const missingCreditData: ParsedCourseData = {
    ...fourCoData,
    credits_ltp: "0:0:0",
    hasExplicitCredits: false,
  };
  const missingCreditReport = inspectCourseSpec(missingCreditData, fourCoMap, "integrated");
  const hoursDefect = missingCreditReport.defects.find((d) => d.code === "HOURS_INCONSISTENT" && d.location.section === 2);
  assert(Boolean(hoursDefect), "Missing credit info emits HOURS_INCONSISTENT defect in Section 2");

  // -------------------------------------------------------------
  // Test 6: Assessment Weight Total Validation
  // -------------------------------------------------------------
  console.log("\n[Test 6] Assessment Weight Total Validation");
  const invalidWeightData: ParsedCourseData = {
    ...fourCoData,
    assessment: {
      components: [
        { name: "Continuous Evaluation (CE)", weight_percent: 50 },
        { name: "Semester End Examination (SEE)", weight_percent: 30 }, // Sum = 80%, not 100%
      ],
      co_coverage: fourCoData.assessment.co_coverage,
    },
  };
  const invalidWeightReport = inspectCourseSpec(invalidWeightData, fourCoMap, "integrated");
  const weightDefect = invalidWeightReport.defects.find((d) => d.code === "WEIGHTAGE_INCONSISTENT");
  assert(Boolean(weightDefect), "Non-100% weights trigger WEIGHTAGE_INCONSISTENT defect");

  const zeroCompData: ParsedCourseData = {
    ...fourCoData,
    assessment: { components: [], co_coverage: {} },
  };
  const zeroCompReport = inspectCourseSpec(zeroCompData, fourCoMap, "integrated");
  assert(
    Boolean(zeroCompReport.defects.find((d) => d.code === "WEIGHTAGE_INCONSISTENT")),
    "Zero assessment components triggers WEIGHTAGE_INCONSISTENT defect"
  );

  // -------------------------------------------------------------
  // Test 7: Unsupported PO/PSO mapping & MAPPING_UNSUPPORTED defect
  // -------------------------------------------------------------
  console.log("\n[Test 7] Unsupported PO Mapping & Null Retention");
  const unevidencedCos = [
    { id: "CO-1", statement: "Attend weekly orientation lectures quietly without participation.", bloom_level: 1 },
  ];
  const unevidencedMap = await generateCoPoPsoMap(unevidencedCos, []);
  const co1Cells = unevidencedMap["CO-1"];
  const mappedPoCount = Object.keys(co1Cells).filter((k) => k.startsWith("PO-") && co1Cells[k] !== null).length;
  assert(mappedPoCount === 0, `Unevidenced CO retains null PO mappings (mapped: ${mappedPoCount})`);

  const unevidencedReport = inspectCourseSpec(
    { ...fourCoData, course_outcomes: unevidencedCos },
    unevidencedMap,
    "non_lab"
  );
  const unsupportedDefect = unevidencedReport.defects.find((d) => d.code === "MAPPING_UNSUPPORTED");
  assert(Boolean(unsupportedDefect), "Unevidenced CO emits MAPPING_UNSUPPORTED defect");

  // -------------------------------------------------------------
  // Test 8: Template Rendering for integrated_lab and non_lab
  // -------------------------------------------------------------
  const realParsedMap = await generateCoPoPsoMap(realParsed.course_outcomes, realParsed.units);
  const renderedLab = fillCourseTemplate(realParsed, realParsedMap, "integrated");
  const $lab = cheerio.load(renderedLab);
  const labAssessTable = $lab("table.assessment-integrated-table");
  assert(labAssessTable.length > 0, "Integrated lab template renders table.assessment-integrated-table");
  assert(labAssessTable.find("tr:contains('CO-1')").length > 0, "CO-1 row rendered in assessment table");

  const renderedNonLab = fillCourseTemplate(fourCoData, fourCoMap, "non_lab");
  const $nonLab = cheerio.load(renderedNonLab);
  const nonLabAssessTable = $nonLab("table.assessment-integrated-table");
  assert(nonLabAssessTable.length > 0, "Non-lab template renders table.assessment-integrated-table");

  // Test empty components in template filler
  const emptyCompData: ParsedCourseData = { ...fourCoData, assessment: { components: [], co_coverage: {} } };
  const renderedEmpty = fillCourseTemplate(emptyCompData, fourCoMap, "non_lab");
  assert(
    renderedEmpty.includes("Assessment components unresolved in source document"),
    "Empty assessment components renders explicit unresolved message in HTML"
  );

  // Test template missing assessment table error
  let threwOnMissing = false;
  try {
    // Pass a fake template by creating a mock data with missing table
    fillCourseTemplate(fourCoData, fourCoMap, "invalid" as any);
  } catch (err: any) {
    if (err.message.includes("Assessment table not found in template")) {
      threwOnMissing = true;
    }
  }
  assert(threwOnMissing, "Throws explicit error when assessment table is absent from template");

  // -------------------------------------------------------------
  // Test 9: HTTP API /api/v1/generate integration test
  // -------------------------------------------------------------
  console.log("\n[Test 9] HTTP API Verification (POST /api/v1/generate)");
  let targetUrl = "";
  for (const port of [3001, 3000]) {
    try {
      const ping = await fetch(`http://localhost:${port}/api/v1/health`, { signal: AbortSignal.timeout(600) });
      if (ping.ok) {
        targetUrl = `http://localhost:${port}/api/v1`;
        break;
      }
    } catch {}
  }

  if (!targetUrl) {
    console.error("  FAIL: Neither port 3001 nor 3000 is reachable for HTTP API testing.");
    failedCount++;
    throw new Error("API server not reachable");
  }

  console.log(`  Targeting API at ${targetUrl}`);

  // 9a: Missing spec file must return HTTP 400
  const emptyForm = new FormData();
  emptyForm.append("blueprint", new Blob([Buffer.from("dummy")]), "blueprint.doc");
  const missingSpecRes = await fetch(`${targetUrl}/generate`, {
    method: "POST",
    body: emptyForm,
  });
  assert(missingSpecRes.status === 400, `Missing spec returns HTTP 400 (received ${missingSpecRes.status})`);
  const missingSpecJson: any = await missingSpecRes.json();
  assert(missingSpecJson.success === false, "Missing spec response has success: false");
  assert(missingSpecJson.error?.code === "MISSING_SPEC", `Error code is MISSING_SPEC (received ${missingSpecJson.error?.code})`);

  // 9b: Spec only (blueprint omitted) must succeed with HTTP 200 and return output + html
  const specOnlyForm = new FormData();
  specOnlyForm.append("spec", new Blob([docxBuffer]), "sample_course_spec.docx");
  const specOnlyRes = await fetch(`${targetUrl}/generate`, {
    method: "POST",
    body: specOnlyForm,
  });
  assert(specOnlyRes.status === 200, `Spec-only upload returns HTTP 200 (received ${specOnlyRes.status})`);
  const specOnlyJson: any = await specOnlyRes.json();
  assert(specOnlyJson.success === true, "Response has success: true");
  assert(Boolean(specOnlyJson.data?.output), "Response includes data.output");
  assert(typeof specOnlyJson.data?.html === "string" && specOnlyJson.data.html.length > 0, "Response includes non-empty data.html");
  assert(validateSchema(specOnlyJson.data.output), "Generated output passes JSON schema validation");

  console.log("\n=================================================");
  console.log(`TOTAL TESTS: ${passedCount + failedCount} | PASSED: ${passedCount} | FAILED: ${failedCount}`);
  console.log("=================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
