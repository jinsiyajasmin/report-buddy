import Papa from "papaparse";
import {
  CANONICAL_FIELDS,
  REQUIRED_FIELDS,
  type CanonicalField,
  type ColumnMapping,
  type RowIssue,
  type TrainingRecord,
} from "@/types/report";

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
  fileName: string;
}

const MONTHS = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];

/** Strips characters that spreadsheet software would treat as a formula. */
export function sanitiseCell(value: unknown): string {
  const raw = value == null ? "" : String(value);
  const trimmed = raw.trim();
  if (/^[=+\-@\t\r]/.test(trimmed) && !/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return `'${trimmed}`;
  }
  return trimmed;
}

export function parseCsvFile(file: File): Promise<ParsedCsv> {
  return new Promise((resolve, reject) => {
    if (file.size > 8 * 1024 * 1024) {
      reject(new Error("File is larger than 8 MB. Please upload a smaller CSV."));
      return;
    }
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      complete: (result) => {
        const headers = (result.meta.fields ?? []).filter((h) => h && h.trim() !== "");
        if (headers.length === 0) {
          reject(new Error("No columns found. Is this a valid CSV file?"));
          return;
        }
        const rows = result.data.filter((row) =>
          Object.values(row).some((v) => sanitiseCell(v) !== ""),
        );
        resolve({ headers, rows, fileName: file.name });
      },
      error: (err: Error) => reject(err),
    });
  });
}

const MATCHERS: Record<CanonicalField, RegExp[]> = {
  course: [/^course/i, /course\s*name/i, /training\s*(course|name|module)/i, /^module/i],
  participant: [
    /participant/i,
    /employee/i,
    /candidate/i,
    /learner/i,
    /^(full\s*)?name$/i,
    /user\s*name$/i,
  ],
  status: [/completion\s*status/i, /^status$/i, /^result$/i, /outcome/i],
  score: [/^score/i, /grade/i, /^mark/i, /percentage/i, /result.*%/i],
  dateEnrolled: [/date\s*enrol/i, /enrol.*date/i, /^enrolled/i, /date\s*started/i],
  dateCompleted: [/date\s*completed/i, /completion\s*date/i, /completed\s*(on|date)/i],
  department: [/department/i, /company/i, /organisation/i, /organization/i, /team/i, /group/i],
  email: [/e-?mail/i],
  mode: [/^mode$/i, /delivery/i],
};

export function autoDetectMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const used = new Set<string>();
  for (const field of CANONICAL_FIELDS) {
    for (const pattern of MATCHERS[field]) {
      const hit = headers.find((h) => !used.has(h) && pattern.test(h.trim()));
      if (hit) {
        mapping[field] = hit;
        used.add(hit);
        break;
      }
    }
    if (!mapping[field]) mapping[field] = null;
  }
  return mapping;
}

export function missingRequiredFields(mapping: ColumnMapping): CanonicalField[] {
  return REQUIRED_FIELDS.filter((f) => !mapping[f]);
}

/** Accepts "28 Jul 2026", "2026-07-28", "28/07/2026". Returns ISO yyyy-mm-dd or null. */
export function parseDate(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const textual = /^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})$/.exec(v);
  if (textual) {
    const [, day = "", monthName = "", year = ""] = textual;
    const m = MONTHS.indexOf(monthName.slice(0, 3).toLowerCase());
    if (m >= 0) {
      return `${year}-${String(m + 1).padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
  }
  const slash = /^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/.exec(v);
  if (slash) {
    const [, day = "", month = "", year = ""] = slash;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const fallback = new Date(v);
  if (!Number.isNaN(fallback.getTime())) {
    return fallback.toISOString().slice(0, 10);
  }
  return null;
}

export function parseScore(value: string): number | null {
  const cleaned = value.replace("%", "").trim();
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

let counter = 0;
export function newId(prefix = "r"): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter.toString(36)}`;
}

export function buildRecords(parsed: ParsedCsv, mapping: ColumnMapping): TrainingRecord[] {
  const get = (row: Record<string, string>, field: CanonicalField) => {
    const col = mapping[field];
    return col ? sanitiseCell(row[col]) : "";
  };
  return parsed.rows.map((row) => ({
    id: newId(),
    course: get(row, "course"),
    participant: get(row, "participant"),
    status: get(row, "status"),
    score: parseScore(get(row, "score")),
    dateEnrolled: parseDate(get(row, "dateEnrolled")),
    dateCompleted: parseDate(get(row, "dateCompleted")),
    department: get(row, "department"),
    email: get(row, "email"),
    mode: get(row, "mode"),
  }));
}

export function emptyRecord(): TrainingRecord {
  return {
    id: newId(),
    course: "",
    participant: "",
    status: "Completed",
    score: null,
    dateEnrolled: null,
    dateCompleted: null,
    department: "",
    email: "",
    mode: "",
  };
}

export function validateRecords(records: TrainingRecord[]): RowIssue[] {
  const issues: RowIssue[] = [];
  const seen = new Map<string, string>();
  for (const r of records) {
    if (!r.course) {
      issues.push({ rowId: r.id, field: "course", message: "Course is empty", severity: "error" });
    }
    if (!r.participant) {
      issues.push({
        rowId: r.id,
        field: "participant",
        message: "Participant is empty",
        severity: "error",
      });
    }
    if (r.score != null && (r.score < 0 || r.score > 100)) {
      issues.push({
        rowId: r.id,
        field: "score",
        message: `Score ${r.score} is outside 0–100`,
        severity: "error",
      });
    }
    if (r.score == null && r.status.toLowerCase().includes("complet")) {
      issues.push({
        rowId: r.id,
        field: "score",
        message: "Completed but no score recorded",
        severity: "warning",
      });
    }
    const key = `${r.course.toLowerCase()}|${r.participant.toLowerCase()}`;
    if (r.course && r.participant) {
      if (seen.has(key)) {
        issues.push({
          rowId: r.id,
          field: "participant",
          message: "Duplicate participant/course pair",
          severity: "warning",
        });
      } else {
        seen.set(key, r.id);
      }
    }
  }
  return issues;
}
