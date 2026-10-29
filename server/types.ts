import { z } from "zod";

export const CourseOutcomeSchema = z.object({
  id: z.string().regex(/^CO-\d+$/),
  statement: z.string(),
  bloom_level: z.number().int().min(1).max(6),
  verb: z.string().optional(),
});
export type CourseOutcome = z.infer<typeof CourseOutcomeSchema>;

export const UnitSchema = z.object({
  number: z.number().int(),
  title: z.string(),
  content: z.string().optional(),
  hours: z.number().optional(),
  lab: z.string().nullable().optional(),
});
export type Unit = z.infer<typeof UnitSchema>;

export const AssessmentComponentSchema = z.object({
  name: z.string(),
  weight_percent: z.number(),
  marks: z.number().optional(),
});

export const AssessmentSchema = z.object({
  components: z.array(AssessmentComponentSchema),
  co_coverage: z.record(z.string(), z.array(z.string())),
});
export type Assessment = z.infer<typeof AssessmentSchema>;

export const CoPoPsoCellSchema = z.object({
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  justification: z.string(),
});
export type CoPoPsoCell = z.infer<typeof CoPoPsoCellSchema>;

export const DefectSchema = z.object({
  code: z.enum([
    "CO_MISSING_IN_TABLE",
    "CO_EXTRA_IN_TABLE",
    "CO_ASSESSMENT_MISMATCH",
    "PSO_COLUMN_MISMATCH",
    "MAPPING_BLOOM_MISMATCH",
    "MAPPING_UNSUPPORTED",
    "WRONG_TEMPLATE",
    "PLACEHOLDER_TEXT",
    "SUMMARY_SYLLABUS_MISMATCH",
    "LABEL_OR_TITLE_MISMATCH",
    "HOURS_INCONSISTENT",
    "WEIGHTAGE_INCONSISTENT",
    "TYPO_OR_FORMAT",
    "SECTION_NOT_IN_TEMPLATE",
    "MARKS_INCONSISTENT",
    "OTHER",
  ]),
  location: z.object({
    source: z.enum(["spec", "blueprint", "template"]),
    section: z.number().nullable().optional(),
    refs: z.array(z.string()).optional(),
  }),
  description: z.string(),
  fix: z.string(),
  severity: z.enum(["High", "Medium", "Low"]).optional(),
});
export type Defect = z.infer<typeof DefectSchema>;

export const SpecForgeOutputSchema = z.object({
  schema_version: z.literal("1.0"),
  input_id: z.string(),
  template: z.enum(["integrated", "non_lab"]),
  course: z.object({
    title: z.string(),
    code: z.string(),
    department: z.string(),
    credits_ltp: z.string().regex(/^\d+:\d+:\d+$/),
    course_type: z.string(),
    summary: z.string(),
  }),
  course_outcomes: z.array(CourseOutcomeSchema).min(1),
  units: z.array(z.object({
    number: z.number().int(),
    title: z.string(),
    lab: z.string().nullable().optional(),
  })),
  co_po_pso_map: z.record(z.string(), z.record(z.string(), CoPoPsoCellSchema.nullable())),
  teaching_hours: z.record(z.string(), z.number()),
  assessment: AssessmentSchema,
  defects: z.array(DefectSchema),
});
export type SpecForgeOutput = z.infer<typeof SpecForgeOutputSchema>;

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
  hasExplicitCredits?: boolean;
  course_outcomes: CourseOutcome[];
  units: Unit[];
  teaching_hours: Record<string, number>;
  assessment: Assessment;
  raw_text?: string;
  blueprint_used?: boolean;
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
