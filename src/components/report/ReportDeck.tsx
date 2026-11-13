import { Check, Clock, Hand, TrendingUp } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import {
  DistributionChart,
  ScoreBarChart,
  ShareChart,
  TrendChart,
} from "@/components/report/ReportCharts";
import {
  coursePages,
  coursesText,
  formatScore,
  participantPages,
  scoresText,
  statusPages,
  type CourseStat,
  type ParticipantStat,
  type StatusKey,
  type StatusPage,
} from "@/calculations/metrics";
import { hex, seriesColor } from "@/reports/theme";
import type { ReportModel } from "@/reports/model";
import type { SectionKey } from "@/types/report";
import { cn } from "@/lib/utils";

const colors = (model: ReportModel) => model.palette.colors;
const sc = (model: ReportModel, i: number) => seriesColor(i, model.palette.series);

function Logo({ model, size = "sm" }: { model: ReportModel; size?: "sm" | "lg" }) {
  if (!model.company?.logo) return null;
  return (
    <img
      src={model.company.logo}
      alt={`${model.company.name} logo`}
      className={cn("object-contain", size === "sm" ? "max-h-[6cqw]" : "max-h-[10cqw]")}
      style={{ maxWidth: size === "sm" ? "22%" : "34%" }}
    />
  );
}

function SlideFrame({
  children,
  className,
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={cn(
        "report-slide relative aspect-[16/9] w-full overflow-hidden",
        padded && "px-[5cqw] py-[4cqw]",
        className,
      )}
    >
      {children}
    </div>
  );
}

function SlideHeader({
  title,
  subtitle,
  model,
}: {
  title: string;
  subtitle?: string;
  model: ReportModel;
}) {
  return (
    <header className="flex items-start justify-between gap-[3cqw]">
      <div className="min-w-0">
        <h2 className="slide-title">{title}</h2>
        {subtitle ? <p className="slide-sub mt-[0.6cqw]">{subtitle}</p> : null}
      </div>
      <Logo model={model} />
    </header>
  );
}

function CoverSlide({ model }: { model: ReportModel }) {
  const { config, company, period } = model;
  return (
    <SlideFrame className="flex flex-col justify-between">
      <div className="flex items-start justify-between">
        <span className="slide-body font-semibold tracking-[0.25em] uppercase">
          {company?.name ?? ""}
        </span>
        <Logo model={model} size="lg" />
      </div>
      <div>
        <div
          className="mb-[2cqw] h-[0.5cqw] w-[12cqw] rounded-full"
          style={{ backgroundColor: hex(colors(model).accent) }}
        />
        <h1 className="slide-title" style={{ fontSize: "6cqw" }}>
          {config.title}
        </h1>
        <p className="slide-sub mt-[1cqw]" style={{ fontSize: "2.4cqw" }}>
          {config.subtitle}
          {period ? ` — ${period}` : ""}
        </p>
      </div>
      <div className="slide-body flex flex-wrap gap-x-[4cqw] gap-y-[0.5cqw]">
        {config.presenter ? <span>Presented by {config.presenter}</span> : null}
        {config.preparedFor ? <span>Prepared for {config.preparedFor}</span> : null}
      </div>
    </SlideFrame>
  );
}

const statusHex = (model: ReportModel, key: StatusKey) => hex(model.palette.status[key]);
const statusSoftHex = (model: ReportModel, key: StatusKey) =>
  hex(model.palette.status[`${key}Soft`]);
const pageSuffix = (index: number, total: number) =>
  total > 1 ? ` · page ${index + 1} of ${total}` : "";

function SummarySlide({ model }: { model: ReportModel }) {
  const m = model.metrics;
  const c = colors(model);
  return (
    <SlideFrame className="flex flex-col">
      <SlideHeader title="Executive Summary" subtitle={model.config.summaryStrap} model={model} />
      <div className="mt-[2.4cqw] grid grid-cols-4 gap-[2cqw]">
        {model.kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-[1cqw] px-[2cqw] py-[2cqw]"
            style={{
              backgroundColor:
                kpi.tone === "neutral" ? hex(c.card) : statusSoftHex(model, kpi.tone),
            }}
          >
            <span
              className="mb-[1.2cqw] block h-[0.6cqw] w-[5cqw]"
              style={{
                backgroundColor: kpi.tone === "neutral" ? hex(c.ink) : statusHex(model, kpi.tone),
              }}
            />
            <p className="slide-kpi tabular-nums" style={{ fontSize: "4.7cqw" }}>
              {kpi.value}
            </p>
            <p
              className="mt-[1.2cqw] font-semibold"
              style={{ fontSize: "1.5cqw", color: hex(c.ink) }}
            >
              {kpi.label}
            </p>
            <p className="slide-body" style={{ fontSize: "1.3cqw" }}>
              {kpi.caption}
            </p>
          </div>
        ))}
      </div>
      <p
        className="mt-[2.6cqw] font-display font-bold"
        style={{ fontSize: "1.9cqw", color: hex(c.ink) }}
      >
        Overall assignment status
      </p>
      <div
        className="mt-[1cqw] flex h-[4cqw] w-full overflow-hidden"
        style={{ backgroundColor: hex(c.card) }}
      >
        {m.completionSplit
          .filter((part) => part.count > 0)
          .map((part) => (
            <div
              key={part.key}
              className="flex items-center justify-center font-bold"
              style={{
                width: `${(part.count / Math.max(m.totalEnrolments, 1)) * 100}%`,
                backgroundColor: statusHex(model, part.key),
                color: hex(c.white),
                fontSize: "1.4cqw",
              }}
            >
              {part.count / Math.max(m.totalEnrolments, 1) >= 0.066 ? `${part.pct}%` : ""}
            </div>
          ))}
      </div>
      <div className="mt-[1.6cqw] grid grid-cols-3">
        {m.completionSplit.map((part) => (
          <div key={part.key} className="flex items-center gap-[0.8cqw]">
            <span
              className="h-[1.6cqw] w-[1.6cqw] shrink-0"
              style={{ backgroundColor: statusHex(model, part.key) }}
            />
            <span className="slide-body">
              <b style={{ color: hex(c.ink) }}>{part.count}</b> {part.label} ({part.pct}%)
            </span>
          </div>
        ))}
      </div>
    </SlideFrame>
  );
}

function EnrolmentSlide({ model }: { model: ReportModel }) {
  const data = model.metrics.courses.map((c) => ({
    label: c.course,
    count: c.count,
    pct: c.pct,
  }));
  return (
    <SlideFrame className="flex flex-col">
      <SlideHeader
        title={
          model.period
            ? `${model.period} — ${model.config.enrolmentTitle}`
            : model.config.enrolmentTitle
        }
        subtitle={`Distribution of ${model.metrics.totalEnrolments} enrolments across ${model.metrics.courseCount} ${
          model.metrics.courseCount === 1 ? "course" : "courses"
        }`}
        model={model}
      />
      <div className="mt-[2cqw] grid flex-1 grid-cols-[1fr_1.1fr] items-center gap-[3cqw]">
        <div className="h-full max-h-[38cqw] min-h-0">
          <ShareChart data={data} variant={model.config.enrolmentChart} palette={model.palette} />
        </div>
        <div className="flex flex-col gap-[0.9cqw]">
          {data.slice(0, 7).map((d, i) => (
            <div key={d.label} className="flex items-center gap-[1cqw]">
              <span
                className="h-[1.4cqw] w-[1.4cqw] shrink-0 rounded-[0.3cqw]"
                style={{ backgroundColor: hex(sc(model, i)) }}
              />
              <span className="slide-body flex-1 truncate">{d.label}</span>
              <span className="slide-body tabular-nums">{d.count}</span>
              <span
                className="slide-body w-[6cqw] text-right font-semibold tabular-nums"
                style={{ color: hex(colors(model).ink) }}
              >
                {d.pct}%
              </span>
            </div>
          ))}
          <p className="slide-body mt-[1.2cqw] italic">{model.narrative}</p>
        </div>
      </div>
    </SlideFrame>
  );
}

function TrendsSlide({ model }: { model: ReportModel }) {
  const m = model.metrics;
  const peak = [...m.byMonth].sort((a, b) => b.count - a.count)[0];
  return (
    <SlideFrame className="flex flex-col">
      <SlideHeader
        title="Enrolment Trends & Departments"
        subtitle={
          peak
            ? `Peak activity in ${peak.label} with ${peak.count} enrolments`
            : "Activity across the reporting period"
        }
        model={model}
      />
      <div className="mt-[2cqw] grid flex-1 grid-cols-2 gap-[2.5cqw]">
        <div className="flex min-h-0 flex-col">
          <p className="slide-body font-semibold">Enrolments over time</p>
          <div className="min-h-0 flex-1">
            <TrendChart data={m.byMonth} palette={model.palette} />
          </div>
        </div>
        <div className="flex min-h-0 flex-col">
          <p className="slide-body font-semibold">Enrolments by department</p>
          <div className="min-h-0 flex-1">
            <ShareChart data={m.byDepartment.slice(0, 6)} variant="bar" palette={model.palette} />
          </div>
        </div>
      </div>
      <p className="slide-body mt-[1cqw] italic">
        {m.byDepartment.length} {m.byDepartment.length === 1 ? "group" : "groups"} represented ·{" "}
        {m.completionRate}% of enrolments completed · average score{" "}
        {m.average == null ? "—" : `${m.average}%`}.
      </p>
    </SlideFrame>
  );
}

function InsightsSlide({ model }: { model: ReportModel }) {
  return (
    <SlideFrame className="flex flex-col">
      <SlideHeader
        title="What the Numbers Tell Us"
        subtitle="Derived directly from the imported records"
        model={model}
      />
      <div className="mt-[3cqw] grid flex-1 grid-cols-3 gap-[2cqw]">
        {model.insights.map((block, i) => (
          <div
            key={block.title}
            className="rounded-[1.4cqw] p-[2cqw]"
            style={{ backgroundColor: hex(colors(model).card) }}
          >
            <span
              className="mb-[1.2cqw] block h-[2.6cqw] w-[2.6cqw] rounded-full"
              style={{ backgroundColor: hex(sc(model, i)) }}
            />
            <h3
              className="font-display font-bold"
              style={{ fontSize: "2.1cqw", color: hex(colors(model).ink) }}
            >
              {block.title}
            </h3>
            <p className="slide-kpi my-[1cqw]" style={{ fontSize: "4cqw" }}>
              {block.value}
            </p>
            <p className="slide-body">{block.body}</p>
          </div>
        ))}
      </div>
    </SlideFrame>
  );
}

function Stat({ value, label, model }: { value: string; label: string; model: ReportModel }) {
  return (
    <div
      className="rounded-[1.2cqw] px-[1.4cqw] py-[1.4cqw] text-center"
      style={{ backgroundColor: hex(colors(model).card) }}
    >
      <p className="slide-kpi" style={{ fontSize: "3.4cqw" }}>
        {value}
      </p>
      <p className="slide-body mt-[0.4cqw]">{label}</p>
    </div>
  );
}

function AssessmentSlide({ model }: { model: ReportModel }) {
  const m = model.metrics;
  const data = m.distribution.map((d) => ({ label: d.label, count: d.count, pct: d.pct }));
  const fmt = formatScore;
  return (
    <SlideFrame className="flex flex-col">
      <SlideHeader
        title={
          model.period
            ? `${model.period} — ${model.config.assessmentTitle}`
            : model.config.assessmentTitle
        }
        subtitle={`${m.assessed} assessed · ${m.passed} passed · ${m.failed} below the ${m.passMark}% threshold`}
        model={model}
      />
      <div className="mt-[2cqw] grid flex-1 grid-cols-[1fr_1fr] gap-[2.5cqw]">
        <div className="grid grid-cols-2 content-start gap-[1.2cqw]">
          <Stat model={model} value={fmt(m.highest)} label="Highest score" />
          <Stat model={model} value={fmt(m.lowest)} label="Lowest score" />
          <Stat model={model} value={fmt(m.average)} label="Average score" />
          <Stat model={model} value={`${m.passRate}%`} label="Pass rate" />
          <Stat model={model} value={String(m.assessed)} label="Assessed" />
          <Stat
            model={model}
            value={`${m.passed} / ${m.failed}`}
            label="Passed / below threshold"
          />
        </div>
        <div className="flex min-h-0 flex-col">
          <p className="slide-body font-semibold">Score distribution</p>
          <div className="min-h-0 flex-1">
            <DistributionChart
              data={data}
              variant={model.config.distributionChart}
              palette={model.palette}
            />
          </div>
          {m.lowPerformers.length > 0 && m.lowPerformers[0] ? (
            <p className="slide-body mt-[0.8cqw] italic">
              Note: lowest result is {m.lowPerformers[0].participant} at{" "}
              {formatScore(m.lowPerformers[0].score)}
              in {m.lowPerformers[0].course} — flagged for a short refresher.
            </p>
          ) : null}
        </div>
      </div>
    </SlideFrame>
  );
}

const cellText = { fontSize: "1.25cqw", lineHeight: 1.3 } as const;

function HeadRow({
  model,
  columns,
  labels,
}: {
  model: ReportModel;
  columns: string;
  labels: string[];
}) {
  const c = colors(model);
  return (
    <div
      className={cn("grid items-center font-bold", columns)}
      style={{ ...cellText, backgroundColor: hex(c.ink), color: hex(c.white), minHeight: "2.6cqw" }}
    >
      {labels.map((label, i) => (
        <span
          key={label}
          className={cn(
            "px-[0.8cqw]",
            i > 0 && label !== "Employee" && !label.startsWith("Course(s)") && "text-center",
          )}
        >
          {label}
        </span>
      ))}
    </div>
  );
}

function Count({ value, tone, model }: { value: number; tone?: StatusKey; model: ReportModel }) {
  const active = tone != null && value > 0;
  return (
    <span
      className={cn("px-[0.8cqw] text-center tabular-nums", active && "font-bold")}
      style={active ? { color: statusHex(model, tone) } : undefined}
    >
      {value}
    </span>
  );
}

function CoursesSlide({
  model,
  rows,
  index,
  total,
}: {
  model: ReportModel;
  rows: CourseStat[];
  index: number;
  total: number;
}) {
  const m = model.metrics;
  const c = colors(model);
  const columns = "grid-cols-[2.7fr_0.9fr_1fr_1fr_1.15fr_1.2fr_1.05fr]";
  const max = Math.max(...rows.map((r) => r.count), 1);
  const keys: StatusKey[] = ["completed", "inProgress", "notCompleted"];
  return (
    <SlideFrame className="flex flex-col">
      <SlideHeader
        title="Course Breakdown"
        subtitle={`Status of ${m.totalEnrolments} course assignments across ${m.courseCount} ${
          m.courseCount === 1 ? "course" : "courses"
        }${pageSuffix(index, total)}`}
        model={model}
      />
      <div className="mt-[1.6cqw]" style={{ border: `1px solid ${hex(c.card)}` }}>
        <HeadRow
          model={model}
          columns={columns}
          labels={[
            "Course",
            "Assigned",
            "Completed",
            "In progress",
            "Not completed",
            "Completion rate",
            "Avg score",
          ]}
        />
        {rows.map((r, i) => (
          <div
            key={r.course}
            className={cn("slide-body grid items-center", columns)}
            style={{
              ...cellText,
              minHeight: "2.6cqw",
              backgroundColor: i % 2 ? hex(c.card) : undefined,
            }}
          >
            <span className="truncate px-[0.8cqw] font-bold" style={{ color: hex(c.ink) }}>
              {r.course}
            </span>
            <Count value={r.count} model={model} />
            <Count value={r.completed} tone="completed" model={model} />
            <Count value={r.inProgress} tone="inProgress" model={model} />
            <Count value={r.notCompleted} tone="notCompleted" model={model} />
            <span className="text-center font-bold tabular-nums" style={{ color: hex(c.ink) }}>
              {r.completionRate}%
            </span>
            <span className="text-center tabular-nums">{formatScore(r.avgScore)}</span>
          </div>
        ))}
        {index === total - 1 && m.courses.length > 0 ? (
          <div
            className={cn("grid items-center font-bold", columns)}
            style={{
              ...cellText,
              minHeight: "2.6cqw",
              backgroundColor: hex(c.card),
              color: hex(c.ink),
            }}
          >
            <span className="px-[0.8cqw]">Total</span>
            <span className="text-center tabular-nums">{m.totalEnrolments}</span>
            <span className="text-center tabular-nums">{m.completed}</span>
            <span className="text-center tabular-nums">{m.inProgress}</span>
            <span className="text-center tabular-nums">{m.notCompleted}</span>
            <span className="text-center tabular-nums">{m.completionRate}%</span>
            <span className="text-center tabular-nums">{formatScore(m.average)}</span>
          </div>
        ) : null}
      </div>
      <div className="mt-[1.6cqw] flex min-h-0 flex-1 flex-col justify-center gap-[0.7cqw]">
        {rows.map((r) => (
          <div key={r.course} className="grid grid-cols-[2.2fr_6.8fr] items-center gap-[1cqw]">
            <span className="slide-body truncate text-right" style={cellText}>
              {r.course}
            </span>
            <div className="flex h-[1.9cqw]" style={{ width: `${(r.count / max) * 100}%` }}>
              {keys
                .filter((key) => r[key] > 0)
                .map((key) => (
                  <div
                    key={key}
                    className="flex items-center justify-center font-bold"
                    style={{
                      width: `${(r[key] / r.count) * 100}%`,
                      backgroundColor: statusHex(model, key),
                      color: hex(c.white),
                      fontSize: "1.2cqw",
                    }}
                  >
                    {r[key]}
                  </div>
                ))}
            </div>
          </div>
        ))}
        <div className="mt-[0.4cqw] flex justify-center gap-[2.4cqw]">
          {m.completionSplit.map((part) => (
            <span
              key={part.key}
              className="slide-body flex items-center gap-[0.6cqw]"
              style={cellText}
            >
              <span
                className="h-[1.1cqw] w-[1.1cqw]"
                style={{ backgroundColor: statusHex(model, part.key) }}
              />
              {part.label}
            </span>
          ))}
        </div>
      </div>
    </SlideFrame>
  );
}

function StatusOverviewSlide({ model }: { model: ReportModel }) {
  const m = model.metrics;
  const c = colors(model);
  const slices = m.completionSplit.filter((item) => item.count > 0);
  return (
    <SlideFrame className="flex flex-col">
      <SlideHeader
        title="Training Status Overview"
        subtitle={`${m.completed} completed · ${m.inProgress} in progress · ${m.notCompleted} not completed`}
        model={model}
      />
      <div className="mt-[1.5cqw] grid min-h-0 flex-1 grid-cols-[0.9fr_1fr] items-center gap-[3cqw]">
        <div className="h-full max-h-[36cqw] min-h-0">
          {slices.length > 0 ? (
            <ShareChart
              data={slices}
              colors={slices.map((slice) => statusHex(model, slice.key))}
              variant="donut"
              palette={model.palette}
            />
          ) : (
            <div className="slide-body flex h-full items-center justify-center">No assignments</div>
          )}
        </div>
        <div className="flex flex-col gap-[1.6cqw]">
          {m.statusGroups.map((group) => (
            <div
              key={group.key}
              className="flex items-center gap-[1.6cqw] px-[1.8cqw] py-[1.5cqw]"
              style={{
                backgroundColor: statusSoftHex(model, group.key),
                borderLeft: `0.7cqw solid ${statusHex(model, group.key)}`,
                borderRadius: "0.8cqw",
              }}
            >
              <div className="min-w-0 flex-1">
                <p
                  className="font-display font-bold"
                  style={{ fontSize: "2.2cqw", color: hex(c.ink) }}
                >
                  {group.label}
                </p>
                <p className="slide-body" style={{ fontSize: "1.3cqw" }}>
                  {group.users.length} {group.users.length === 1 ? "employee" : "employees"} ·{" "}
                  {group.pct}% of assignments
                </p>
              </div>
              <p
                className="slide-kpi tabular-nums"
                style={{ fontSize: "4.4cqw", color: statusHex(model, group.key) }}
              >
                {group.assignments}
              </p>
            </div>
          ))}
        </div>
      </div>
    </SlideFrame>
  );
}

function StatusDetailSlide({ model, page }: { model: ReportModel; page: StatusPage }) {
  const c = colors(model);
  return (
    <SlideFrame className="flex flex-col">
      <SlideHeader
        title="Training Status Details"
        subtitle={`Each employee is listed once per status, with their courses grouped on one row${pageSuffix(page.index, page.total)}`}
        model={model}
      />
      <div className="mt-[1.4cqw] flex flex-col gap-[1.4cqw]">
        {page.blocks.map((block) => {
          const { group } = block;
          const withScore = group.key === "completed";
          const columns = withScore
            ? "grid-cols-[0.45fr_2.3fr_4.85fr_1.4fr]"
            : "grid-cols-[0.45fr_2.3fr_6.25fr]";
          return (
            <div key={`${group.key}-${block.start}`}>
              <div className="mb-[0.6cqw] flex items-center gap-[1.5cqw]">
                <span
                  className="w-[24cqw] px-[1cqw] py-[0.4cqw] font-bold"
                  style={{
                    fontSize: "1.6cqw",
                    color: hex(c.ink),
                    backgroundColor: statusSoftHex(model, group.key),
                    borderLeft: `0.6cqw solid ${statusHex(model, group.key)}`,
                  }}
                >
                  {group.label}
                  {block.continued ? " (continued)" : ""}
                </span>
                <span className="slide-body" style={{ fontSize: "1.3cqw" }}>
                  {group.assignments} course{" "}
                  {group.assignments === 1 ? "assignment" : "assignments"} | {group.users.length}{" "}
                  {group.users.length === 1 ? "employee" : "employees"}
                </span>
              </div>
              <div style={{ border: `1px solid ${hex(c.card)}` }}>
                <HeadRow
                  model={model}
                  columns={columns}
                  labels={[
                    "#",
                    "Employee",
                    withScore ? "Course(s) completed" : "Course(s) in this status",
                    ...(withScore ? ["Score"] : []),
                  ]}
                />
                {block.rows.length === 0 ? (
                  <div className="slide-body px-[4cqw] py-[0.5cqw] italic" style={cellText}>
                    No course assignments in this status
                  </div>
                ) : (
                  block.rows.map((user, i) => (
                    <div
                      key={`${user.participant}-${block.start + i}`}
                      className={cn("slide-body grid items-center", columns)}
                      style={{
                        ...cellText,
                        minHeight: "2.5cqw",
                        backgroundColor: i % 2 ? hex(c.card) : undefined,
                      }}
                    >
                      <span className="text-center tabular-nums">{block.start + i + 1}</span>
                      <span
                        className="truncate px-[0.8cqw] font-bold"
                        style={{ color: hex(c.ink) }}
                      >
                        {user.participant}
                      </span>
                      <span className="px-[0.8cqw]">{coursesText(user)}</span>
                      {withScore ? (
                        <span
                          className="text-center font-bold tabular-nums"
                          style={{ color: statusHex(model, "completed") }}
                        >
                          {scoresText(user)}
                        </span>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </SlideFrame>
  );
}

function ParticipantsSlide({
  model,
  rows,
  start,
  index,
  total,
}: {
  model: ReportModel;
  rows: ParticipantStat[];
  start: number;
  index: number;
  total: number;
}) {
  const m = model.metrics;
  const c = colors(model);
  const columns = "grid-cols-[0.45fr_2.75fr_0.95fr_1.05fr_1.05fr_1.2fr_0.8fr_0.75fr]";
  return (
    <SlideFrame className="flex flex-col">
      <SlideHeader
        title="Employee Training Overview"
        subtitle={`${m.uniqueParticipants} ${m.uniqueParticipants === 1 ? "employee" : "employees"}, each shown once with all assigned courses${pageSuffix(index, total)}`}
        model={model}
      />
      <div className="mt-[1.6cqw]" style={{ border: `1px solid ${hex(c.card)}` }}>
        <HeadRow
          model={model}
          columns={columns}
          labels={[
            "#",
            "Employee",
            "Assigned",
            "Completed",
            "In progress",
            "Not completed",
            "Completion",
            "Avg score",
          ]}
        />
        {rows.map((p, i) => (
          <div
            key={`${p.participant}-${start + i}`}
            className={cn("slide-body grid items-center", columns)}
            style={{
              ...cellText,
              minHeight: "2.7cqw",
              backgroundColor: i % 2 ? hex(c.card) : undefined,
            }}
          >
            <span className="text-center tabular-nums">{start + i + 1}</span>
            <span className="truncate px-[0.8cqw] font-bold" style={{ color: hex(c.ink) }}>
              {p.participant}
            </span>
            <Count value={p.enrolments} model={model} />
            <Count value={p.completed} tone="completed" model={model} />
            <Count value={p.inProgress} tone="inProgress" model={model} />
            <Count value={p.notCompleted} tone="notCompleted" model={model} />
            <span className="text-center tabular-nums">
              {Math.round((p.completed / Math.max(p.enrolments, 1)) * 100)}%
            </span>
            <span className="text-center font-bold tabular-nums" style={{ color: hex(c.ink) }}>
              {formatScore(p.avgScore)}
            </span>
          </div>
        ))}
      </div>
    </SlideFrame>
  );
}

const ICONS = { check: Check, up: TrendingUp, point: Hand, clock: Clock };

function RecommendationsSlide({ model }: { model: ReportModel }) {
  return (
    <SlideFrame className="flex flex-col">
      <SlideHeader
        title="Key Takeaways & Recommendations"
        subtitle="Each point is traceable to a calculated metric"
        model={model}
      />
      <div className="mt-[2.5cqw] grid flex-1 grid-cols-2 gap-[1.8cqw]">
        {model.recommendations.map((rec, i) => {
          const Icon = ICONS[rec.icon];
          return (
            <div key={rec.title} className="flex gap-[1.4cqw]">
              <span
                className="flex h-[3cqw] w-[3cqw] shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: hex(sc(model, i)) }}
              >
                <Icon
                  className="h-[1.6cqw] w-[1.6cqw]"
                  strokeWidth={2.5}
                  style={{ color: hex(colors(model).white) }}
                />
              </span>
              <div className="min-w-0">
                <h3
                  className="font-display font-bold"
                  style={{ fontSize: "2cqw", color: hex(colors(model).ink) }}
                >
                  {rec.title}
                </h3>
                <p className="slide-body mt-[0.5cqw]">{rec.body}</p>
              </div>
            </div>
          );
        })}
      </div>
    </SlideFrame>
  );
}

function ClosingSlide({ model }: { model: ReportModel }) {
  return (
    <SlideFrame className="flex flex-col items-center justify-center text-center">
      <Logo model={model} size="lg" />
      <h2 className="slide-title mt-[3cqw]" style={{ fontSize: "6cqw" }}>
        {model.config.closingTitle}
      </h2>
      <p className="slide-sub mt-[1cqw]">{model.config.closingSubtitle}</p>
    </SlideFrame>
  );
}

const RENDERERS: Record<
  Exclude<SectionKey, "completion" | "courses" | "participants">,
  (p: { model: ReportModel }) => ReactNode
> = {
  cover: CoverSlide,
  summary: SummarySlide,
  enrolment: EnrolmentSlide,
  trends: TrendsSlide,
  insights: InsightsSlide,
  assessment: AssessmentSlide,
  recommendations: RecommendationsSlide,
  closing: ClosingSlide,
};

export function ReportDeck({
  model,
  printable = false,
}: {
  model: ReportModel;
  printable?: boolean;
}) {
  const c = model.palette.colors;
  const themeVars = {
    "--color-report-bg": hex(c.bg),
    "--color-report-card": hex(c.card),
    "--color-report-ink": hex(c.ink),
    "--color-report-muted": hex(c.muted),
    "--color-report-accent": hex(c.accent),
  } as CSSProperties;

  return (
    <div
      className={cn("flex flex-col gap-6", printable && "gap-0")}
      id={printable ? "print-root" : undefined}
      style={themeVars}
    >
      {model.visibleSections.flatMap((key) => {
        const frame = cn(
          "overflow-hidden rounded-xl border border-border shadow-sm",
          printable && "print-page rounded-none border-0 shadow-none",
        );
        const wrap = (id: string, node: ReactNode) => (
          <div key={id} className={frame}>
            {node}
          </div>
        );
        if (key === "completion") {
          return [
            wrap("status-overview", <StatusOverviewSlide model={model} />),
            ...statusPages(model.metrics).map((page) =>
              wrap(`status-${page.index}`, <StatusDetailSlide model={model} page={page} />),
            ),
          ];
        }
        if (key === "courses") {
          const pages = coursePages(model.metrics);
          const list = pages.length > 0 ? pages : [[]];
          return list.map((rows, i) =>
            wrap(
              `courses-${i}`,
              <CoursesSlide model={model} rows={rows} index={i} total={list.length} />,
            ),
          );
        }
        if (key === "participants") {
          const pages = participantPages(model.metrics);
          const list = pages.length > 0 ? pages : [[]];
          let start = 0;
          return list.map((rows, i) => {
            const node = wrap(
              `participants-${i}`,
              <ParticipantsSlide
                model={model}
                rows={rows}
                start={start}
                index={i}
                total={list.length}
              />,
            );
            start += rows.length;
            return node;
          });
        }
        const Slide = RENDERERS[key];
        return [
          <div key={key} className={frame}>
            <Slide model={model} />
          </div>,
        ];
      })}
    </div>
  );
}
