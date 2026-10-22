import type { TrainingRecord } from "@/types/report";

export interface CourseStat {
  course: string;
  count: number;
  pct: number;
  participants: number;
  avgScore: number | null;
}

export interface Bucket {
  label: string;
  count: number;
  pct: number;
}

export interface PerformerStat {
  participant: string;
  course: string;
  score: number;
}

export interface ParticipantStat {
  participant: string;
  department: string;
  enrolments: number;
  completed: number;
  avgScore: number | null;
  bestScore: number | null;
  lowestScore: number | null;
  passed: number;
  courses: string[];
}

export interface Metrics {
  totalEnrolments: number;
  uniqueParticipants: number;
  courseCount: number;
  courses: CourseStat[];
  statuses: Bucket[];
  completed: number;
  completionRate: number;
  assessed: number;
  passed: number;
  failed: number;
  passRate: number;
  highest: number | null;
  lowest: number | null;
  average: number | null;
  median: number | null;
  perfectScores: number;
  perfectPct: number;
  distribution: Bucket[];
  byMonth: Bucket[];
  byDepartment: Bucket[];
  byParticipant: Bucket[];
  participants: ParticipantStat[];
  topPerformers: PerformerStat[];
  lowPerformers: PerformerStat[];
  periodLabel: string;
  periodStart: string | null;
  periodEnd: string | null;
  passMark: number;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function round(n: number, dp = 0): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

export function pctOf(part: number, total: number): number {
  if (total <= 0) return 0;
  return round((part / total) * 100);
}

function tally(values: string[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const v of values) {
    map.set(v, (map.get(v) ?? 0) + 1);
  }
  return map;
}

function toBuckets(map: Map<string, number>, total: number): Bucket[] {
  return [...map.entries()]
    .map(([label, count]) => ({ label, count, pct: pctOf(count, total) }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-");
  const idx = Number(m) - 1;
  return `${MONTH_NAMES[idx] ?? m} ${y}`;
}

export function isPass(score: number | null, passMark: number): boolean {
  return score != null && score >= passMark;
}

export function computeMetrics(records: TrainingRecord[], passMark = 80): Metrics {
  const valid = records.filter((r) => r.course.trim() !== "" || r.participant.trim() !== "");
  const total = valid.length;

  const courseMap = new Map<string, TrainingRecord[]>();
  for (const r of valid) {
    const key = r.course.trim() || "Unspecified course";
    const list = courseMap.get(key);
    if (list) list.push(r);
    else courseMap.set(key, [r]);
  }

  const courses: CourseStat[] = [...courseMap.entries()]
    .map(([course, rows]) => {
      const scored = rows.map((r) => r.score).filter((s): s is number => s != null);
      return {
        course,
        count: rows.length,
        pct: pctOf(rows.length, total),
        participants: new Set(rows.map((r) => r.participant.trim().toLowerCase())).size,
        avgScore: scored.length
          ? round(scored.reduce((a, b) => a + b, 0) / scored.length, 1)
          : null,
      };
    })
    .sort((a, b) => b.count - a.count || a.course.localeCompare(b.course));

  const statuses = toBuckets(
    tally(valid.map((r) => (r.status.trim() ? r.status.trim() : "Not recorded"))),
    total,
  );
  const completed = valid.filter((r) => r.status.toLowerCase().includes("complet")).length;

  const scoredRows = valid.filter((r) => r.score != null && r.score >= 0 && r.score <= 100);
  const scores = scoredRows.map((r) => r.score as number);
  const assessed = scores.length;
  const passed = scores.filter((s) => s >= passMark).length;
  const failed = assessed - passed;
  const sorted = [...scores].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length
    ? sorted.length % 2 === 0
      ? round(((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2, 2)
      : round(sorted[mid] ?? 0, 2)
    : null;

  const perfectScores = scores.filter((s) => s >= 100).length;

  const bucketDefs: { label: string; test: (s: number) => boolean }[] = [
    { label: "100%", test: (s) => s >= 100 },
    { label: "97–99%", test: (s) => s >= 97 && s < 100 },
    { label: "90–96%", test: (s) => s >= 90 && s < 97 },
    { label: "Below 90%", test: (s) => s < 90 },
  ];
  const distribution: Bucket[] = bucketDefs.map((d) => {
    const count = scores.filter(d.test).length;
    return { label: d.label, count, pct: pctOf(count, assessed) };
  });

  const dated = valid
    .map((r) => r.dateEnrolled ?? r.dateCompleted)
    .filter((d): d is string => !!d)
    .sort();
  const periodStart = dated.length ? (dated[0] ?? null) : null;
  const periodEnd = dated.length ? (dated[dated.length - 1] ?? null) : null;

  const byMonth = [...tally(dated.map(monthKey)).entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, count]) => ({
      label: monthLabel(key),
      count,
      pct: pctOf(count, dated.length),
    }));

  const byDepartment = toBuckets(
    tally(valid.map((r) => r.department.trim() || "Unassigned")),
    total,
  );
  const byParticipant = toBuckets(
    tally(valid.map((r) => r.participant.trim() || "Unnamed")),
    total,
  );

  const participantMap = new Map<string, TrainingRecord[]>();
  for (const r of valid) {
    const key = r.participant.trim() || "Unnamed";
    const list = participantMap.get(key);
    if (list) list.push(r);
    else participantMap.set(key, [r]);
  }
  const participants: ParticipantStat[] = [...participantMap.entries()]
    .map(([participant, rows]) => {
      const scored = rows.map((r) => r.score).filter((s): s is number => s != null);
      return {
        participant,
        department: rows.find((r) => r.department.trim())?.department.trim() ?? "",
        enrolments: rows.length,
        completed: rows.filter((r) => r.status.toLowerCase().includes("complet")).length,
        avgScore: scored.length
          ? round(scored.reduce((a, b) => a + b, 0) / scored.length, 1)
          : null,
        bestScore: scored.length ? round(Math.max(...scored), 2) : null,
        lowestScore: scored.length ? round(Math.min(...scored), 2) : null,
        passed: scored.filter((s) => s >= passMark).length,
        courses: [...new Set(rows.map((r) => r.course.trim() || "Unspecified course"))],
      };
    })
    .sort(
      (a, b) =>
        (b.avgScore ?? -1) - (a.avgScore ?? -1) || a.participant.localeCompare(b.participant),
    );

  const performers: PerformerStat[] = scoredRows.map((r) => ({
    participant: r.participant.trim() || "Unnamed",
    course: r.course.trim() || "Unspecified course",
    score: r.score as number,
  }));

  const topPerformers = [...performers].sort((a, b) => b.score - a.score).slice(0, 5);
  const lowPerformers = [...performers]
    .filter((p) => p.score < 90)
    .sort((a, b) => a.score - b.score)
    .slice(0, 5);

  return {
    totalEnrolments: total,
    uniqueParticipants: new Set(
      valid.map((r) => r.participant.trim().toLowerCase()).filter(Boolean),
    ).size,
    courseCount: courses.length,
    courses,
    statuses,
    completed,
    completionRate: pctOf(completed, total),
    assessed,
    passed,
    failed,
    passRate: pctOf(passed, assessed),
    highest: assessed ? round(Math.max(...scores), 2) : null,
    lowest: assessed ? round(Math.min(...scores), 2) : null,
    average: assessed ? round(scores.reduce((a, b) => a + b, 0) / assessed, 1) : null,
    median,
    perfectScores,
    perfectPct: pctOf(perfectScores, assessed),
    distribution,
    byMonth,
    byDepartment,
    byParticipant,
    participants,
    topPerformers,
    lowPerformers,
    periodLabel: formatPeriod(periodStart, periodEnd),
    periodStart,
    periodEnd,
    passMark,
  };
}

export function formatPeriod(start: string | null, end: string | null): string {
  if (!start || !end) return "";
  const [sy, sm] = start.split("-");
  const [ey, em] = end.split("-");
  const sLabel = MONTH_NAMES[Number(sm) - 1] ?? "";
  const eLabel = MONTH_NAMES[Number(em) - 1] ?? "";
  if (sy === ey && sm === em) return `${sLabel} ${sy}`;
  if (sy === ey) return `${sLabel}–${eLabel} ${sy}`;
  return `${sLabel} ${sy} – ${eLabel} ${ey}`;
}
