import type { TrainingRecord } from "@/types/report";

export type StatusKey = "completed" | "inProgress" | "notCompleted";

export const STATUS_ORDER: StatusKey[] = ["completed", "inProgress", "notCompleted"];

export const STATUS_LABELS: Record<StatusKey, string> = {
  completed: "Completed",
  inProgress: "In progress",
  notCompleted: "Not completed",
};

export interface CourseStat {
  course: string;
  count: number;
  pct: number;
  participants: number;
  avgScore: number | null;
  completed: number;
  inProgress: number;
  notCompleted: number;
  completionRate: number;
}

export interface Bucket {
  label: string;
  count: number;
  pct: number;
}

export interface StatusBucket extends Bucket {
  key: StatusKey;
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
  inProgress: number;
  notCompleted: number;
  avgScore: number | null;
  bestScore: number | null;
  lowestScore: number | null;
  passed: number;
  courses: string[];
}

export interface StatusCourse {
  course: string;
  score: number | null;
}

/** One person inside a status group. Each person appears once per group. */
export interface StatusUser {
  participant: string;
  department: string;
  courses: StatusCourse[];
}

export interface StatusGroup {
  key: StatusKey;
  label: string;
  /** Course assignments in this status. */
  assignments: number;
  pct: number;
  users: StatusUser[];
}

export interface StatusBlock {
  group: StatusGroup;
  rows: StatusUser[];
  start: number;
  continued: boolean;
}

export interface StatusPage {
  blocks: StatusBlock[];
  index: number;
  total: number;
}

export interface Metrics {
  totalEnrolments: number;
  uniqueParticipants: number;
  courseCount: number;
  courses: CourseStat[];
  statuses: Bucket[];
  completed: number;
  inProgress: number;
  notCompleted: number;
  completionRate: number;
  completionSplit: StatusBucket[];
  statusGroups: StatusGroup[];
  duplicatesRemoved: number;
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

/** "100.0" → "100%", 86.666 → "86.7%", no score → "—". */
export function formatScore(score: number | null | undefined): string {
  if (score == null || !Number.isFinite(score)) return "—";
  return `${round(score, 1)}%`;
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

function normaliseStatus(status: string): string {
  return status.trim().toLowerCase().replace(/[_-]+/g, " ");
}

/** True only for a positive completion. "Not completed" and "Incomplete" stay incomplete. */
export function isCompletedStatus(status: string): boolean {
  const s = normaliseStatus(status);
  if (!s) return false;
  if (/\b(not|non|un)\b[\s-]*(complet|pass)/.test(s) || s.includes("incomplete")) return false;
  return /\bcomplet/.test(s) || /\bpass(ed)?\b/.test(s);
}

/** Sorts any status wording into completed / in progress / not completed. */
export function statusKey(status: string): StatusKey {
  if (isCompletedStatus(status)) return "completed";
  const s = normaliseStatus(status);
  if (!s) return "notCompleted";
  if (/\bnot\s+(yet\s+)?(started|begun|attempted)/.test(s) || /\bun(started|attempted)\b/.test(s)) {
    return "notCompleted";
  }
  if (/progress|ongoing|underway|started|incomplete|partial|attempt/.test(s)) return "inProgress";
  return "notCompleted";
}

/** "mathew  slater" → "Mathew Slater". Only the first letter of each word is touched. */
export function displayName(name: string): string {
  const clean = name.trim().replace(/\s+/g, " ");
  if (!clean) return "Unnamed";
  return clean
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** Identity of a person: name (case-insensitive) plus email when one is recorded. */
function personKey(record: TrainingRecord): string {
  const name = record.participant.trim().replace(/\s+/g, " ").toLowerCase();
  const email = record.email.trim().toLowerCase();
  return email ? `${name}|${email}` : name;
}

function courseName(record: TrainingRecord): string {
  return record.course.trim().replace(/\s+/g, " ") || "Unspecified course";
}

const STATUS_RANK: Record<StatusKey, number> = { completed: 2, inProgress: 1, notCompleted: 0 };

/**
 * Keeps one row per person per course. When the same pair is uploaded more than
 * once, the furthest-along row wins (completed > in progress > not completed),
 * then the higher score.
 */
export function dedupeRecords(records: TrainingRecord[]): TrainingRecord[] {
  const best = new Map<string, TrainingRecord>();
  for (const r of records) {
    const key = `${personKey(r)}||${courseName(r).toLowerCase()}`;
    const current = best.get(key);
    if (!current) {
      best.set(key, r);
      continue;
    }
    const rank = STATUS_RANK[statusKey(r.status)] - STATUS_RANK[statusKey(current.status)];
    if (rank > 0 || (rank === 0 && (r.score ?? -1) > (current.score ?? -1))) {
      best.set(key, r);
    }
  }
  return [...best.values()];
}

function byName(a: { participant: string }, b: { participant: string }): number {
  return a.participant.localeCompare(b.participant, undefined, { numeric: true });
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export function coursesText(user: StatusUser): string {
  return user.courses.map((c) => c.course).join(", ");
}

export function scoresText(user: StatusUser): string {
  return user.courses.map((c) => formatScore(c.score)).join(" · ");
}

const STATUS_PAGE_UNITS = 13.5;
const BLOCK_HEAD_UNITS = 2.3;
const BLOCK_GAP_UNITS = 0.6;
const CHARS_PER_LINE = 96;

/** Lines a person's row needs once their course list wraps. */
export function rowUnits(user: StatusUser): number {
  return Math.max(1, Math.ceil(coursesText(user).length / CHARS_PER_LINE));
}

/**
 * Flows the three status lists across slides. Every person is listed, an empty
 * group still gets its heading, and a long group continues on the next slide.
 */
export function statusPages(metrics: Pick<Metrics, "statusGroups">): StatusPage[] {
  const pages: StatusBlock[][] = [[]];
  let remaining = STATUS_PAGE_UNITS;
  const current = () => pages[pages.length - 1]!;
  const newPage = () => {
    pages.push([]);
    remaining = STATUS_PAGE_UNITS;
  };

  for (const group of metrics.statusGroups) {
    if (group.users.length === 0) {
      const need = BLOCK_HEAD_UNITS + 1;
      if (remaining < need) newPage();
      current().push({ group, rows: [], start: 0, continued: false });
      remaining -= need + BLOCK_GAP_UNITS;
      continue;
    }
    let offset = 0;
    while (offset < group.users.length) {
      const firstUnits = rowUnits(group.users[offset]!);
      const restUnits = group.users.slice(offset).reduce((sum, u) => sum + rowUnits(u), 0);
      const fitsHere = BLOCK_HEAD_UNITS + restUnits <= remaining;
      const fitsFresh = BLOCK_HEAD_UNITS + restUnits <= STATUS_PAGE_UNITS;
      const tooTight = remaining < BLOCK_HEAD_UNITS + Math.max(firstUnits, 4);
      // Keep a list together when a fresh slide can hold all of it.
      if (current().length > 0 && !fitsHere && (fitsFresh || tooTight)) newPage();
      let space = remaining - BLOCK_HEAD_UNITS;
      let take = 0;
      while (offset + take < group.users.length) {
        const units = rowUnits(group.users[offset + take]!);
        if (units > space && take > 0) break;
        space -= units;
        take += 1;
        if (space <= 0) break;
      }
      current().push({
        group,
        rows: group.users.slice(offset, offset + take),
        start: offset,
        continued: offset > 0,
      });
      offset += take;
      remaining = space - BLOCK_GAP_UNITS;
    }
  }

  const filled = pages.filter((blocks) => blocks.length > 0);
  return filled.map((blocks, index) => ({ blocks, index, total: filled.length }));
}

export const COURSES_PER_PAGE = 5;
export const PARTICIPANTS_PER_PAGE = 11;

export function coursePages(metrics: Pick<Metrics, "courses">): CourseStat[][] {
  return chunk(metrics.courses, COURSES_PER_PAGE);
}

export function participantPages(metrics: Pick<Metrics, "participants">): ParticipantStat[][] {
  return chunk(metrics.participants, PARTICIPANTS_PER_PAGE);
}

export function computeMetrics(records: TrainingRecord[], passMark = 80): Metrics {
  const usable = records.filter((r) => r.course.trim() !== "" || r.participant.trim() !== "");
  const valid = dedupeRecords(usable);
  const total = valid.length;
  const nameOf = (r: TrainingRecord) => displayName(r.participant);

  const courseMap = new Map<string, TrainingRecord[]>();
  for (const r of valid) {
    const key = courseName(r);
    const list = courseMap.get(key);
    if (list) list.push(r);
    else courseMap.set(key, [r]);
  }

  const countStatus = (rows: TrainingRecord[], key: StatusKey) =>
    rows.filter((r) => statusKey(r.status) === key).length;

  const courses: CourseStat[] = [...courseMap.entries()]
    .map(([course, rows]) => {
      const scored = rows.map((r) => r.score).filter((s): s is number => s != null);
      const done = countStatus(rows, "completed");
      return {
        course,
        count: rows.length,
        pct: pctOf(rows.length, total),
        participants: new Set(rows.map(personKey)).size,
        avgScore: scored.length
          ? round(scored.reduce((a, b) => a + b, 0) / scored.length, 1)
          : null,
        completed: done,
        inProgress: countStatus(rows, "inProgress"),
        notCompleted: countStatus(rows, "notCompleted"),
        completionRate: pctOf(done, rows.length),
      };
    })
    .sort((a, b) => b.count - a.count || a.course.localeCompare(b.course));

  const statuses = toBuckets(
    tally(valid.map((r) => (r.status.trim() ? r.status.trim() : "Not recorded"))),
    total,
  );

  const statusGroups: StatusGroup[] = STATUS_ORDER.map((key) => {
    const rows = valid.filter((r) => statusKey(r.status) === key);
    const people = new Map<string, StatusUser>();
    for (const r of rows) {
      const id = personKey(r);
      const user = people.get(id) ?? {
        participant: nameOf(r),
        department: r.department.trim(),
        courses: [],
      };
      user.courses.push({ course: courseName(r), score: r.score });
      people.set(id, user);
    }
    const users = [...people.values()]
      .map((u) => ({
        ...u,
        courses: [...u.courses].sort((a, b) => a.course.localeCompare(b.course)),
      }))
      .sort(byName);
    return {
      key,
      label: STATUS_LABELS[key],
      assignments: rows.length,
      pct: pctOf(rows.length, total),
      users,
    };
  });

  const groupCount = (key: StatusKey) => statusGroups.find((g) => g.key === key)?.assignments ?? 0;
  const completed = groupCount("completed");
  const inProgress = groupCount("inProgress");
  const notCompleted = groupCount("notCompleted");
  const completionSplit: StatusBucket[] = statusGroups.map((g) => ({
    key: g.key,
    label: g.label,
    count: g.assignments,
    pct: g.pct,
  }));

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
  const byParticipant = toBuckets(tally(valid.map(nameOf)), total);

  const participantMap = new Map<string, TrainingRecord[]>();
  for (const r of valid) {
    const key = personKey(r);
    const list = participantMap.get(key);
    if (list) list.push(r);
    else participantMap.set(key, [r]);
  }
  const participants: ParticipantStat[] = [...participantMap.values()]
    .map((rows) => {
      const scored = rows.map((r) => r.score).filter((s): s is number => s != null);
      return {
        participant: nameOf(rows[0]!),
        department: rows.find((r) => r.department.trim())?.department.trim() ?? "",
        enrolments: rows.length,
        completed: countStatus(rows, "completed"),
        inProgress: countStatus(rows, "inProgress"),
        notCompleted: countStatus(rows, "notCompleted"),
        avgScore: scored.length
          ? round(scored.reduce((a, b) => a + b, 0) / scored.length, 1)
          : null,
        bestScore: scored.length ? round(Math.max(...scored), 2) : null,
        lowestScore: scored.length ? round(Math.min(...scored), 2) : null,
        passed: scored.filter((s) => s >= passMark).length,
        courses: [...new Set(rows.map(courseName))],
      };
    })
    .sort(byName);

  const performers: PerformerStat[] = scoredRows.map((r) => ({
    participant: nameOf(r),
    course: courseName(r),
    score: r.score as number,
  }));

  const topPerformers = [...performers].sort((a, b) => b.score - a.score).slice(0, 5);
  const lowPerformers = [...performers]
    .filter((p) => p.score < 90)
    .sort((a, b) => a.score - b.score)
    .slice(0, 5);

  return {
    totalEnrolments: total,
    uniqueParticipants: participantMap.size,
    courseCount: courses.length,
    courses,
    statuses,
    completed,
    inProgress,
    notCompleted,
    completionRate: pctOf(completed, total),
    completionSplit,
    statusGroups,
    duplicatesRemoved: usable.length - valid.length,
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
