import type { Metrics, StatusKey } from "./metrics";

export interface KpiCard {
  value: string;
  label: string;
  caption: string;
  tone: "neutral" | StatusKey;
}

export interface InsightBlock {
  title: string;
  value: string;
  body: string;
}

export interface Recommendation {
  icon: "check" | "up" | "point" | "clock";
  title: string;
  body: string;
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/** Four headline KPIs: total assignments and the three status counts. */
export function buildKpis(m: Metrics): KpiCard[] {
  return [
    {
      value: String(m.totalEnrolments),
      label: "Total course assignments",
      caption: `${m.uniqueParticipants} ${m.uniqueParticipants === 1 ? "employee" : "employees"} · ${m.courseCount} ${m.courseCount === 1 ? "course" : "courses"}`,
      tone: "neutral",
    },
    ...m.completionSplit.map((s) => ({
      value: String(s.count),
      label: s.label,
      caption: `${fmt(s.pct)}% of assignments`,
      tone: s.key,
    })),
  ];
}

/** One-line narrative shown beneath the enrolment chart. */
export function buildNarrative(m: Metrics): string {
  const top = m.courses[0];
  if (!top) return "No enrolment data available for this period.";
  const second = m.courses[1];
  if (second) {
    return `${top.course} and ${second.course} account for ${fmt(top.pct + second.pct)}% of all enrolments, across ${m.totalEnrolments} enrolments and ${m.uniqueParticipants} employees.`;
  }
  return `All ${m.totalEnrolments} enrolments sit within ${top.course}, covering ${m.uniqueParticipants} employees.`;
}

/** Insight blocks for the "What the Numbers Tell Us" page. */
export function buildInsights(m: Metrics): InsightBlock[] {
  const blocks: InsightBlock[] = [];
  const [first, second, ...rest] = m.courses;

  if (first) {
    const leadShare = second ? first.pct + second.pct : first.pct;
    blocks.push({
      title: "Core training focus",
      value: `${fmt(leadShare)}%`,
      body: second
        ? `${first.course} (${fmt(first.pct)}%) and ${second.course} (${fmt(second.pct)}%) make up the largest share of enrolments, indicating where training effort is concentrated.`
        : `All enrolment activity sits within ${first.course}.`,
    });
  }

  if (rest.length > 0) {
    const tailShare = rest.reduce((sum, c) => sum + c.pct, 0);
    const names = rest
      .slice(0, 3)
      .map((c) => `${c.course} (${fmt(c.pct)}%)`)
      .join(", ");
    blocks.push({
      title: "Supporting programmes",
      value: `${fmt(tailShare)}%`,
      body: `The remaining ${rest.length} ${rest.length === 1 ? "course accounts" : "courses account"} for ${fmt(tailShare)}% of enrolments: ${names}${rest.length > 3 ? " and others" : ""}.`,
    });
  }

  if (m.assessed > 0) {
    blocks.push({
      title: "Assessment outcomes",
      value: `${fmt(m.average ?? 0)}%`,
      body: `Average score across ${m.assessed} assessed enrolments, ranging from ${fmt(m.lowest ?? 0)}% to ${fmt(m.highest ?? 0)}%, with a ${fmt(m.passRate)}% pass rate at the ${m.passMark}% threshold.`,
    });
  } else if (m.byMonth.length > 0) {
    const busiest = [...m.byMonth].sort((a, b) => b.count - a.count)[0];
    if (busiest) {
      blocks.push({
        title: "Peak activity",
        value: String(busiest.count),
        body: `${busiest.label} was the busiest period, representing ${fmt(busiest.pct)}% of all enrolments in this report.`,
      });
    }
  }

  return blocks.slice(0, 3);
}

/** Rule-based recommendations. Every statement maps to a calculated metric. */
export function buildRecommendations(m: Metrics): Recommendation[] {
  const out: Recommendation[] = [];
  const top = m.courses[0];
  const second = m.courses[1];

  if (top) {
    const share = second ? top.pct + second.pct : top.pct;
    if (share >= 50) {
      const names = second ? `${top.course} and ${second.course}` : top.course;
      out.push(
        m.completionRate >= 50
          ? {
              icon: "check",
              title: "Core training is well embedded",
              body: `${fmt(share)}% of assignments sit in ${names}, and ${fmt(m.completionRate)}% of all assignments are complete. Continue this sequencing so fundamentals are covered before specialist progression.`,
            }
          : {
              icon: "check",
              title: "Prioritise the core courses",
              body: `${fmt(share)}% of assignments sit in ${names}. Completing these first closes the largest share of outstanding training.`,
            },
      );
    } else {
      out.push({
        icon: "check",
        title: "Enrolments are broadly distributed",
        body: `No single course exceeds ${fmt(top.pct)}% of enrolments across ${m.courseCount} courses. Confirm this spread matches the current training plan.`,
      });
    }
  }

  if (m.assessed > 0) {
    if (m.passRate >= 95) {
      out.push({
        icon: "up",
        title: "Assessment outcomes are strong",
        body: `A ${fmt(m.passRate)}% pass rate and ${m.perfectScores} perfect ${m.perfectScores === 1 ? "score" : "scores"} out of ${m.assessed} assessments indicate content is well designed and clearly delivered${m.assessed < m.totalEnrolments ? `, though only ${m.assessed} of ${m.totalEnrolments} assignments have been assessed so far` : ""}.`,
      });
    } else if (m.passRate >= 75) {
      out.push({
        icon: "up",
        title: "Outcomes are solid with room to improve",
        body: `${m.passed} of ${m.assessed} assessments met the ${m.passMark}% threshold (${fmt(m.passRate)}%). Review the ${m.failed} shortfall ${m.failed === 1 ? "result" : "results"} to identify common topic gaps.`,
      });
    } else {
      out.push({
        icon: "up",
        title: "Pass rate requires attention",
        body: `Only ${fmt(m.passRate)}% of assessments met the ${m.passMark}% threshold (${m.failed} of ${m.assessed} below). Review course delivery and assessment difficulty before the next cohort.`,
      });
    }
  }

  if (m.lowPerformers.length > 0) {
    const names = m.lowPerformers
      .slice(0, 3)
      .map((p) => `${p.participant} (${fmt(p.score)}% — ${p.course})`)
      .join("; ");
    out.push({
      icon: "point",
      title: `Targeted refresher for ${m.lowPerformers.length} ${m.lowPerformers.length === 1 ? "participant" : "participants"}`,
      body: `Scores below 90% were recorded for ${names}. A short practical refresher would close residual knowledge gaps.`,
    });
  }

  const incomplete = m.totalEnrolments - m.completed;
  if (incomplete > 0) {
    out.push({
      icon: "clock",
      title: "Chase outstanding completions",
      body: `${incomplete} of ${m.totalEnrolments} assignments (${fmt(100 - m.completionRate)}%) are not yet complete: ${m.inProgress} in progress and ${m.notCompleted} not completed. Follow up with the relevant managers before the grace period closes.`,
    });
  } else if (m.totalEnrolments > 0) {
    out.push({
      icon: "clock",
      title: "Maintain the rolling training calendar",
      body: `All ${m.totalEnrolments} enrolments in this period are complete. Keep monitoring scheduled intakes against the training plan.`,
    });
  }

  return out.slice(0, 4);
}
