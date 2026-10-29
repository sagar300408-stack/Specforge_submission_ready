import fs from "fs";
import path from "path";
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
  blueprintText?: string | null
): ParsedCourseData {
  // 1. Course Title
  const titleMatch = specText.match(/Course Title\s*[:\s]?\s*([^\n\r\t]+)/i);
  const title = titleMatch ? titleMatch[1].trim() : "Course Specifications";

  // 2. Course Code
  const codeMatch = specText.match(/Course Code\s*[:\s]?\s*([A-Za-z0-9]+)/i);
  const code = codeMatch ? codeMatch[1].trim() : "CSD101";

  // 3. Course Type
  const typeMatch = specText.match(/Course Type\s*[:\s]?\s*([^\n\r\t]+)/i);
  const course_type = typeMatch ? typeMatch[1].trim() : "Core Theory";

  // 4. Department & Faculty
  const deptMatch = specText.match(/Department\s*[:\s]?\s*([^\n\r\t]+)/i);
  const department = deptMatch ? deptMatch[1].trim() : "Engineering";

  const facMatch = specText.match(/Faculty\s*[:\s]?\s*([^\n\r\t]+)/i);
  const faculty = facMatch ? facMatch[1].trim() : "Engineering and Technology";

  // 5. Credits LTP & Total Credits
  const ltpMatch = specText.match(/Credit Structure[^\d]*(\d+\s*:\s*\d+\s*:\s*\d+)/i) || specText.match(/(\d:\d:\d)/);
  const credits_ltp = ltpMatch ? ltpMatch[1].replace(/\s+/g, "") : "3:0:0";

  const totalCreditsMatch = specText.match(/Number of Credits\s*[:\s]?(\d+)/i);
  const total_credits = totalCreditsMatch ? parseInt(totalCreditsMatch[1], 10) : 4;

  const totalHoursMatch = specText.match(/Total Hours[^:]*[:\s]*(\d+)/i);
  const total_hours = totalHoursMatch ? parseInt(totalHoursMatch[1], 10) : 75;

  // 6. Course Summary
  const sumIdx = specText.indexOf("Course Summary");
  let summary = "";
  if (sumIdx !== -1) {
    const afterSum = specText.slice(sumIdx + "Course Summary".length).trim();
    const endSum = afterSum.search(/Course Size|Number of Credits|Credit Structure/i);
    summary = endSum !== -1 ? afterSum.slice(0, endSum).trim() : afterSum.slice(0, 400).trim();
  }
  if (!summary) {
    summary = "This course provides comprehensive foundations and practical methodologies for engineering students.";
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
  const assessment: Assessment = {
    components: p > 0
      ? [
          { name: "Continuous Evaluation (CE)", weight_percent: 60, marks: 100 },
          { name: "Semester End Examination (SEE)", weight_percent: 25, marks: 50 },
          { name: "Lab Semester End Examination (LSEE)", weight_percent: 15, marks: 30 },
        ]
      : [
          { name: "Continuous Evaluation (CE)", weight_percent: 60, marks: 100 },
          { name: "Semester End Examination (SEE)", weight_percent: 40, marks: 100 },
        ],
    co_coverage: {
      "CO-1": ["Tests", "Written exam"],
      "CO-2": ["Tests", "Written exam", "Lab CE"],
      "CO-3": ["Tests", "Written exam", "Lab CE"],
      "CO-4": ["Assignments", "Written exam", "Lab CE"],
      "CO-5": ["Assignments", "Lab CE", "LSEE"],
    },
  };

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
    course_outcomes,
    units,
    teaching_hours,
    assessment,
    raw_text: specText,
    blueprint_used,
  };
}
