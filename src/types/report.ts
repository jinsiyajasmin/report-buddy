export const CANONICAL_FIELDS = [
  "course",
  "participant",
  "status",
  "score",
  "dateEnrolled",
  "dateCompleted",
  "department",
  "email",
  "mode",
] as const;

export type CanonicalField = (typeof CANONICAL_FIELDS)[number];

export const FIELD_LABELS: Record<CanonicalField, string> = {
  course: "Course",
  participant: "Participant",
  status: "Completion status",
  score: "Score",
  dateEnrolled: "Date enrolled",
  dateCompleted: "Date completed",
  department: "Department / Group",
  email: "Email",
  mode: "Mode",
};

export const REQUIRED_FIELDS: CanonicalField[] = ["course", "participant"];

export type ColumnMapping = Partial<Record<CanonicalField, string | null>>;

export interface TrainingRecord {
  id: string;
  course: string;
  participant: string;
  status: string;
  score: number | null;
  dateEnrolled: string | null;
  dateCompleted: string | null;
  department: string;
  email: string;
  mode: string;
}

export interface RowIssue {
  rowId: string;
  field: CanonicalField;
  message: string;
  severity: "error" | "warning";
}

export interface Company {
  id: string;
  name: string;
  logo: string | null;
  address: string;
  contact: string;
  createdAt: string;
}

export type ReportTheme = "corporate" | "midnight" | "sandstone";

export type SectionKey =
  | "cover"
  | "summary"
  | "enrolment"
  | "trends"
  | "insights"
  | "assessment"
  | "participants"
  | "recommendations"
  | "closing";

export const SECTION_LABELS: Record<SectionKey, string> = {
  cover: "Cover",
  summary: "Executive Summary",
  enrolment: "Enrolment Overview",
  trends: "Enrolment Trends & Departments",
  insights: "What the Numbers Tell Us",
  assessment: "Assessment Results",
  participants: "Participant Results",
  recommendations: "Key Takeaways & Recommendations",
  closing: "Thank You",
};

export type EnrolmentChartType = "donut" | "pie" | "bar";
export type DistributionChartType = "bar" | "donut";

export interface ReportConfig {
  theme: ReportTheme;
  title: string;
  subtitle: string;
  preparedFor: string;
  presenter: string;
  periodOverride: string;
  passMark: number;
  summaryStrap: string;
  enrolmentTitle: string;
  assessmentTitle: string;
  closingTitle: string;
  closingSubtitle: string;
  enrolmentChart: EnrolmentChartType;
  distributionChart: DistributionChartType;
  sections: Record<SectionKey, boolean>;
  narrativeOverride: string | null;
  recommendationsOverride: string[] | null;
}

export interface SavedReport {
  id: string;
  companyId: string;
  name: string;
  sourceFileName: string;
  records: TrainingRecord[];
  mapping: ColumnMapping;
  config: ReportConfig;
  createdAt: string;
  updatedAt: string;
}

export function defaultConfig(): ReportConfig {
  return {
    theme: "corporate",
    title: "Training Performance Report",
    subtitle: "Candidate Enrolment & Assessment Insights",
    preparedFor: "Senior Leadership Team",
    presenter: "",
    periodOverride: "",
    passMark: 80,
    summaryStrap: "A snapshot of safety training activity and outcomes",
    enrolmentTitle: "Candidate Enrolment Overview",
    assessmentTitle: "Assessment Results",
    closingTitle: "Thank You",
    closingSubtitle: "Questions and discussion welcome",
    enrolmentChart: "donut",
    distributionChart: "bar",
    sections: {
      cover: true,
      summary: true,
      enrolment: true,
      trends: true,
      insights: true,
      assessment: true,
      participants: true,
      recommendations: true,
      closing: true,
    },
    narrativeOverride: null,
    recommendationsOverride: null,
  };
}
