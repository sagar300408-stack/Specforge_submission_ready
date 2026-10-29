export interface CourseOutcome {
  id: string;
  statement: string;
  bloom_level: number;
  verb?: string;
}

export interface Unit {
  number: number;
  title: string;
  content?: string;
  hours?: number;
  lab?: string | null;
}

export interface AssessmentComponent {
  name: string;
  weight_percent: number;
  marks?: number;
}

export interface Assessment {
  components: AssessmentComponent[];
  co_coverage: Record<string, string[]>;
}

export interface CoPoPsoCell {
  level: 1 | 2 | 3;
  justification: string;
}

export interface Defect {
  code: string;
  location: {
    source: "spec" | "blueprint" | "template";
    section?: number | null;
    refs?: string[];
  };
  description: string;
  fix: string;
  severity?: "High" | "Medium" | "Low";
}

export interface ParsedCourseData {
  title: string;
  code: string;
  department: string;
  faculty: string;
  credits_ltp: string;
  total_credits: number;
  total_hours: number;
  course_type: string;
  summary: string;
  course_outcomes: CourseOutcome[];
  units: Unit[];
  teaching_hours: Record<string, number>;
  assessment: Assessment;
  raw_text?: string;
  blueprint_used?: boolean;
}

export interface SpecForgeOutput {
  schema_version: "1.0";
  input_id: string;
  template: "integrated" | "non_lab";
  course: {
    title: string;
    code: string;
    department: string;
    credits_ltp: string;
    course_type: string;
    summary: string;
  };
  course_outcomes: Array<{
    id: string;
    statement: string;
    bloom_level: number;
  }>;
  units: Array<{
    number: number;
    title: string;
    lab?: string | null;
  }>;
  co_po_pso_map: Record<string, Record<string, CoPoPsoCell | null>>;
  teaching_hours: Record<string, number>;
  assessment: Assessment;
  defects: Defect[];
}

export type WorkflowRole = "Author" | "Reviewer" | "HOD";
export type WorkflowState = "Draft" | "Submitted" | "Under Review" | "Pending HOD" | "Approved" | "Returned";

export interface WorkflowLogEntry {
  id: string;
  timestamp: string;
  user: string;
  role: WorkflowRole;
  action: string;
  fromState: WorkflowState;
  toState: WorkflowState;
  comment: string;
}

export interface SectionComment {
  id: string;
  section: string;
  user: string;
  role: WorkflowRole;
  text: string;
  timestamp: string;
}

export interface ValidationRuleResult {
  id: string;
  rule: string;
  status: "PASS" | "FAIL" | "WARN";
  details: string;
}
