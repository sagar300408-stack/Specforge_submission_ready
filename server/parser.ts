import fs from "fs";
import path from "path";
import * as cheerio from "cheerio";
import type { CourseOutcome, ParsedCourseData, Unit, Assessment } from "./types.js";

// Load reference Bloom's taxonomy dynamically from config/po_pso.json
let bloomsConfig: Array<{ level: string; name: string; verbs: string }> = [];
try {
  const p = path.resolve(process.cwd(), "config/po_pso.json");
  if (fs.existsSync(p)) {
    const raw = JSON.parse(fs.readFileSync(p, "utf8"));
    bloomsConfig = raw.blooms || [];
  }
} catch {
  // fallback
}

export function detectBloomLevel(statement: string): { level: number; verb: string } {
  const words = statement.trim().split(/\s+/);
  const firstWord = words[0]?.replace(/[^a-zA-Z]/g, "").toLowerCase() || "";

  // Check against reference verbs in bloomsConfig
  for (const b of bloomsConfig) {
    const levelNum = parseInt(b.level.replace(/\D/g, ""), 10);
    const verbList = b.verbs.toLowerCase().split(/,\s*/);
    if (verbList.some((v) => v.trim() === firstWord || firstWord.startsWith(v.trim()))) {
      return { level: levelNum, verb: firstWord };
    }
  }

  // Fallback defaults
  if (["explain", "describe", "summarise", "summarize", "discuss"].includes(firstWord)) return { level: 2, verb: firstWord };
  if (["apply", "solve", "use", "implement", "compute", "demonstrate"].includes(firstWord)) return { level: 3, verb: firstWord };
  if (["analyse", "analyze", "compare", "differentiate", "examine"].includes(firstWord)) return { level: 4, verb: firstWord };
  if (["evaluate", "assess", "justify", "judge"].includes(firstWord)) return { level: 5, verb: firstWord };
  if (["design", "develop", "build", "construct", "formulate"].includes(firstWord)) return { level: 6, verb: firstWord };

  return { level: 2, verb: firstWord };
}

export function parseCourseDocuments(
  specText: string,
  blueprintText?: string | null,
  specHtml?: string | null
): ParsedCourseData {
  let title = "UNKNOWN_TITLE";
  let code = "UNKNOWN_CODE";
  let course_type = "Core Course";
  let department = "UNKNOWN_DEPARTMENT";
  let faculty = "UNKNOWN_FACULTY";

  if (specHtml) {
    const $ = cheerio.load(specHtml);
    $("tr").each((_, tr) => {
      const tds = $(tr).find("td, th").toArray();
      for (let i = 0; i < tds.length; i++) {
        const cellText = $(tds[i]).text().trim().toLowerCase();
        if (cellText.includes("course title") && tds[i + 1]) {
          const val = $(tds[i + 1]).text().trim();
          if (val) title = val;
        } else if (cellText.includes("course code") && tds[i + 1]) {
          const val = $(tds[i + 1]).text().trim();
          if (val) code = val;
        } else if (cellText.includes("course type") && tds[i + 1]) {
          const val = $(tds[i + 1]).text().trim();
          if (val) course_type = val;
        } else if (cellText.includes("department") && tds[i + 1]) {
          const val = $(tds[i + 1]).text().trim();
          if (val) department = val;
        } else if (cellText.includes("faculty") && tds[i + 1]) {
          const val = $(tds[i + 1]).text().trim();
          if (val) faculty = val;
        }
      }
    });
  }

  // Fallbacks if not found via HTML tables
  if (title === "UNKNOWN_TITLE") {
    const titleMatch = specText.match(/Course Title\s*[:\n\r]+\s*([^\n\r\t]+)/i);
    if (titleMatch) title = titleMatch[1].trim();
  }
  if (code === "UNKNOWN_CODE") {
    const codeMatch = specText.match(/Course Code\s*[:\n\r]+\s*([A-Za-z0-9_-]+)/i) || specText.match(/\b([A-Z]{2,4}\d{3,4}[A-Z]?)\b/);
    if (codeMatch) code = codeMatch[1].trim();
  }
  if (course_type === "Core Course") {
    const typeMatch = specText.match(/Course Type\s*[:\n\r]+\s*([^\n\r\t]+)/i);
    if (typeMatch) course_type = typeMatch[1].trim();
  }
  if (department === "UNKNOWN_DEPARTMENT") {
    const deptMatch = specText.match(/Department\s*[:\n\r]+\s*([^\n\r\t]+)/i);
    if (deptMatch) department = deptMatch[1].trim();
  }
  if (faculty === "UNKNOWN_FACULTY") {
    const facMatch = specText.match(/Faculty\s*[:\n\r]+\s*([^\n\r\t]+)/i);
    if (facMatch) faculty = facMatch[1].trim();
  }

  // 5. Credits LTP & Total Credits
  const ltpMatch = specText.match(/Credit Structure[^\d]*(\d+\s*:\s*\d+\s*:\s*\d+)/i) || specText.match(/\b(\d+:\d+:\d+)\b/);
  const hasExplicitCredits = Boolean(ltpMatch);
  const credits_ltp = ltpMatch ? ltpMatch[1].replace(/\s+/g, "") : "0:0:0";

  const totalCreditsMatch = specText.match(/Number of Credits\s*[:\s]?(\d+)/i);
  const total_credits = totalCreditsMatch ? parseInt(totalCreditsMatch[1], 10) : 0;

  const totalHoursMatch = specText.match(/Total Hours[^:]*[:\s]*(\d+)/i);
  const total_hours = totalHoursMatch ? parseInt(totalHoursMatch[1], 10) : 0;

  // 6. Course Summary
  const sumIdx = specText.indexOf("Course Summary");
  let summary = "";
  if (sumIdx !== -1) {
    const afterSum = specText.slice(sumIdx + "Course Summary".length).trim();
    const endSum = afterSum.search(/Course Size|Number of Credits|Credit Structure/i);
    summary = endSum !== -1 ? afterSum.slice(0, endSum).trim() : afterSum.slice(0, 400).trim();
  }

  // 7. Course Outcomes (COs)
  const coRegex = /CO-?(\d+)[\.:\s]+([^\n\r]+)/gi;
  let m: RegExpExecArray | null;
  const course_outcomes: CourseOutcome[] = [];
  const coMap = new Map<string, string>();

  // If blueprint has COs, check blueprint first as Source of Truth
  const targetText = blueprintText && blueprintText.includes("Course Outcome") ? blueprintText : specText;

  while ((m = coRegex.exec(targetText)) !== null) {
    const id = `CO-${m[1]}`;
    const stmt = m[2].trim();
    if (stmt.length > 8 && !coMap.has(id)) {
      coMap.set(id, stmt);
      const { level, verb } = detectBloomLevel(stmt);
      course_outcomes.push({
        id,
        statement: stmt,
        bloom_level: level,
        verb,
      });
    }
  }

  // Fallback to specText if blueprint didn't yield COs
  if (course_outcomes.length === 0 && targetText !== specText) {
    while ((m = coRegex.exec(specText)) !== null) {
      const id = `CO-${m[1]}`;
      const stmt = m[2].trim();
      if (stmt.length > 8 && !coMap.has(id)) {
        coMap.set(id, stmt);
        const { level, verb } = detectBloomLevel(stmt);
        course_outcomes.push({
          id,
          statement: stmt,
          bloom_level: level,
          verb,
        });
      }
    }
  }

  // 8. Units (Unit-wise syllabus)
  const units: Unit[] = [];
  let blueprint_used = false;

  if (blueprintText && blueprintText.includes("Unit-wise distribution")) {
    blueprint_used = true;
    const unitRegex = /(\d)\t([^\t]+)\t\s*(\d+)/g;
    let um: RegExpExecArray | null;
    while ((um = unitRegex.exec(blueprintText)) !== null) {
      const num = parseInt(um[1], 10);
      const fullText = um[2].trim();
      const hrs = parseInt(um[3], 10);
      if (num >= 1 && num <= 10 && !fullText.toLowerCase().includes("total marks")) {
        const colonIdx = fullText.indexOf(":");
        const shortTitle = colonIdx > 0 ? fullText.slice(0, colonIdx).trim() : fullText;
        const content = colonIdx > 0 ? fullText.slice(colonIdx + 1).trim() : fullText;
        units.push({
          number: num,
          title: shortTitle,
          content,
          hours: hrs,
          lab: null,
        });
      }
    }
  }

  // If no blueprint or no units from blueprint, parse from specText
  if (units.length === 0) {
    const specUnitRegex = /Unit\s*(\d+)[\s:\(]+([^:\)\n\r]+)[:\)]?\s*([^\n\r]+)/gi;
    let sum: RegExpExecArray | null;
    while ((sum = specUnitRegex.exec(specText)) !== null) {
      const num = parseInt(sum[1], 10);
      if (!units.find((u) => u.number === num)) {
        units.push({
          number: num,
          title: sum[2].trim(),
          content: sum[3].trim(),
          hours: 8,
          lab: null,
        });
      }
    }
  }

  // Parse Lab Exercises from specText for each unit
  if (specText.includes("Lab Exercises")) {
    const labSegments = specText.split(/Unit\s*\d+/i);
    units.forEach((u, i) => {
      const seg = labSegments[i + 1] || "";
      const labMatch = seg.match(/Lab Exercises\s*[:\s]?\s*([^\n\r]+)/i);
      if (labMatch) {
        u.lab = labMatch[1].trim();
      }
    });
  }

  // 9. Teaching Hours Breakdown
  const parts = credits_ltp.split(":").map((p) => parseInt(p, 10) || 0);
  const l = parts[0] || 3;
  const p = parts[2] || 0;
  const lectureHours = l * 15; // 15 weeks
  const labHours = p > 0 ? p * 2 * 15 : 0; // Practical is typically 2 hrs/week * 15 weeks = 30 hrs
  const teaching_hours: Record<string, number> = {
    lectures: lectureHours,
    lab: labHours,
    tests_exams: 0,
    total: lectureHours + labHours,
  };

  // 10. Assessment Structure
  const components: Array<{ name: string; weight_percent: number }> = [];
  const co_coverage: Record<string, string[]> = {};
  course_outcomes.forEach((co) => {
    co_coverage[co.id] = [];
  });

  // Table-preserving extraction via Mammoth HTML representation
  let tableParsed = false;
  if (specHtml) {
    const $ = cheerio.load(specHtml);
    const assessTbl = $("table:has(th:contains('Focus of COs'), td:contains('Focus of COs'))").first();
    if (assessTbl.length > 0) {
      const rows: string[][] = [];
      assessTbl.find("tr").each((_, tr) => {
        const cells = $(tr).find("th, td").map((_, el) => $(el).text().trim()).get();
        if (cells.length > 0) rows.push(cells);
      });

      // Row 1 contains component names & weightages (e.g. CE (Weightage: 60 %), SEE (Weightage: 25 %), Lab (Weightage: 15 %))
      const weightRow = rows.find((r) => r.some((c) => /Weightage\s*:\s*\d+\s*%/i.test(c)));
      if (weightRow) {
        weightRow.forEach((cellText) => {
          const m = cellText.match(/([A-Za-z\s]+)\s*\([^\)]*Weightage\s*:\s*(\d+)\s*%\s*\)/i);
          if (m) {
            const label = m[1].trim();
            const weight = parseInt(m[2], 10);
            const standardName = label.includes("CE")
              ? "Continuous Evaluation (CE)"
              : label.includes("Lab")
              ? "Lab Semester End Examination (LSEE)"
              : "Semester End Examination (SEE)";
            components.push({ name: standardName, weight_percent: weight });
          }
        });
      }

      // Row 2 contains subcomponents (e.g. Tests, Assignments, Lab CE, Written exam, LSEE: SEE)
      const subcompRow = rows.find((r) => r.includes("Tests") || r.includes("Written exam"));
      const colToParentComp: Array<string | null> = [];
      if (subcompRow) {
        subcompRow.forEach((subName) => {
          const s = subName.toLowerCase();
          if (s.includes("test") || s.includes("assignment") || s.includes("lab ce")) {
            colToParentComp.push(components.find((c) => c.name.includes("Continuous"))?.name || "Continuous Evaluation (CE)");
          } else if (s.includes("written")) {
            colToParentComp.push(components.find((c) => c.name.includes("Semester End") && !c.name.includes("Lab"))?.name || "Semester End Examination (SEE)");
          } else if (s.includes("lsee") || s.includes("lab exam")) {
            colToParentComp.push(components.find((c) => c.name.includes("Lab Semester"))?.name || "Lab Semester End Examination (LSEE)");
          } else {
            colToParentComp.push(null);
          }
        });
      }

      // Map each CO row cell-by-cell based on exact column boundaries
      rows.forEach((row) => {
        const firstCell = row[0]?.trim();
        if (/^CO-\d+$/i.test(firstCell)) {
          const coId = firstCell.toUpperCase();
          if (!co_coverage[coId]) co_coverage[coId] = [];
          for (let colIdx = 1; colIdx < row.length; colIdx++) {
            const cellVal = row[colIdx]?.trim().toUpperCase();
            const parentComp = colToParentComp[colIdx - 1];
            if (cellVal === "X" && parentComp) {
              if (!co_coverage[coId].includes(parentComp)) {
                co_coverage[coId].push(parentComp);
              }
            }
          }
        }
      });
      tableParsed = true;
    }
  }

  // Fallback for non-HTML/plain-text inputs: Quarantined Section 7 text search
  if (!tableParsed) {
    const assessStartIdx = specText.indexOf("Course Assessment and Reassessment");
    if (assessStartIdx !== -1) {
      const afterAssess = specText.slice(assessStartIdx);
      const endAssess = afterAssess.search(/Achieving Cos|The details of number of tests|8\.\s*Achieving/i);
      const assessSectionText = endAssess !== -1 ? afterAssess.slice(0, endAssess) : afterAssess.slice(0, 2500);

      const ceWeightMatch = assessSectionText.match(/CE\s*\([^\)]*Weightage\s*:\s*(\d+)\s*%\s*\)/i);
      const seeWeightMatch = assessSectionText.match(/SEE\s*\([^\)]*Weightage\s*:\s*(\d+)\s*%\s*\)/i);
      const labWeightMatch = assessSectionText.match(/Lab\s*\([^\)]*Weightage\s*:\s*(\d+)\s*%\s*\)/i);
      if (ceWeightMatch) components.push({ name: "Continuous Evaluation (CE)", weight_percent: parseInt(ceWeightMatch[1], 10) });
      if (seeWeightMatch) components.push({ name: "Semester End Examination (SEE)", weight_percent: parseInt(seeWeightMatch[1], 10) });
      if (labWeightMatch) components.push({ name: "Lab Semester End Examination (LSEE)", weight_percent: parseInt(labWeightMatch[1], 10) });
    }
  }

  const assessment: Assessment = { components, co_coverage };

  return {
    title,
    code,
    department,
    faculty,
    credits_ltp,
    total_credits,
    total_hours: teaching_hours.total || total_hours,
    course_type,
    summary,
    original_summary: summary,
    course_outcomes,
    units,
    teaching_hours,
    assessment,
    hasExplicitCredits,
    raw_text: specText,
    blueprint_used,
  };
}
