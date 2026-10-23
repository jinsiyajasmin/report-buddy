import { Check, Clock, Hand, TrendingUp } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import {
  DistributionChart,
  ScoreBarChart,
  ShareChart,
  TrendChart,
} from "@/components/report/ReportCharts";
import { completionPages, type CompletionPage, type CompletionUser } from "@/calculations/metrics";
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

function SummarySlide({ model }: { model: ReportModel }) {
  return (
    <SlideFrame className="flex flex-col">
      <SlideHeader title="Executive Summary" subtitle={model.config.summaryStrap} model={model} />
      <div className="mt-[3cqw] grid flex-1 grid-cols-4 gap-[1.8cqw]">
        {model.kpis.map((kpi, i) => (
          <div
            key={`${kpi.value}-${i}`}
            className="flex flex-col items-center justify-center rounded-[1.6cqw] px-[1.4cqw] py-[2.2cqw] text-center"
            style={{ backgroundColor: hex(colors(model).card) }}
          >
            <span
              className="mb-[1.4cqw] block h-[3.4cqw] w-[3.4cqw] rounded-full"
              style={{
                backgroundColor: hex(
                  kpi.tone === "accent" ? colors(model).accent : colors(model).ink,
                ),
              }}
            />
            <p className="slide-kpi">{kpi.value}</p>
            <p className="slide-body mt-[1cqw]">{kpi.caption}</p>
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
            <ShareChart
              data={m.byDepartment.slice(0, 6)}
              variant="bar"
              palette={model.palette}
            />
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
  const fmt = (n: number | null) => (n == null ? "—" : `${n}%`);
  return (
    <SlideFrame className="flex flex-col">
      <SlideHeader
        title={model.period ? `${model.period} — ${model.config.assessmentTitle}` : model.config.assessmentTitle}
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
          <Stat model={model} value={`${m.passed} / ${m.failed}`} label="Passed / below threshold" />
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
              Note: lowest result is {m.lowPerformers[0].participant} at {m.lowPerformers[0].score}%
              in {m.lowPerformers[0].course} — flagged for a short refresher.
            </p>
          ) : null}
        </div>
      </div>
    </SlideFrame>
  );
}

function UserTable({
  title,
  total,
  rows,
  start,
  model,
  wide,
}: {
  title: string;
  total: number;
  rows: CompletionUser[];
  start: number;
  model: ReportModel;
  wide: boolean;
}) {
  const c = colors(model);
  const columns = wide
    ? "grid-cols-[0.45fr_1.7fr_1.6fr_1.3fr]"
    : "grid-cols-[0.4fr_1.35fr_1.25fr]";
  return (
    <div className="min-h-0">
      <div className="mb-[0.7cqw] flex items-baseline gap-[0.8cqw]">
        <p className="font-display font-bold" style={{ fontSize: "1.85cqw", color: hex(c.ink) }}>
          {title}
        </p>
        <p className="slide-body font-semibold tabular-nums" style={{ color: hex(c.ink) }}>
          {total}
        </p>
      </div>
      <div
        className={cn(
          "slide-body grid gap-[0.6cqw] pb-[0.4cqw] font-semibold",
          columns,
        )}
        style={{ color: hex(c.ink), borderBottom: `1px solid ${hex(c.card)}` }}
      >
        <span>#</span>
        <span>Participant</span>
        <span>Course</span>
        {wide ? <span>Department</span> : null}
      </div>
      {rows.length === 0 && total === 0 ? (
        <div
          className={cn("slide-body grid items-center gap-[0.6cqw] rounded-[0.45cqw] px-[0.35cqw] py-[0.45cqw]", columns)}
          style={{ backgroundColor: hex(c.card) }}
        >
          <span />
          <span className="tabular-nums" style={{ color: hex(c.ink) }}>
            0
          </span>
          <span />
          {wide ? <span /> : null}
        </div>
      ) : (
        rows.map((user, i) => (
          <div
            key={`${user.participant}-${user.course}-${user.status}-${start + i}`}
            className={cn(
              "slide-body grid items-center gap-[0.6cqw] rounded-[0.45cqw] px-[0.35cqw] py-[0.34cqw]",
              columns,
            )}
            style={{ backgroundColor: i % 2 === 0 ? hex(c.card) : "transparent" }}
          >
            <span className="tabular-nums">{start + i + 1}</span>
            <span className="truncate font-medium" style={{ color: hex(c.ink) }}>
              {user.participant}
            </span>
            <span className="truncate">{user.course}</span>
            {wide ? <span className="truncate">{user.department}</span> : null}
          </div>
        ))
      )}
    </div>
  );
}

function CompletionSlide({ model, page }: { model: ReportModel; page: CompletionPage }) {
  const m = model.metrics;
  const c = colors(model);
  const continued = page.total > 1 ? ` · page ${page.index + 1} of ${page.total}` : "";
  const chartSlices = m.completionSplit
    .map((item, i) => ({ ...item, color: hex(sc(model, i)) }))
    .filter((item) => item.count > 0);
  const tables = [
    page.completed.length > 0 || (m.completed === 0 && page.showChart)
      ? {
          key: "completed",
          title: "Completed users",
          total: m.completed,
          rows: page.completed,
          start: page.completedStart,
        }
      : null,
    page.notCompleted.length > 0 || (m.notCompleted === 0 && page.showChart && m.completed === 0)
      ? {
          key: "not-completed",
          title: "Not completed users",
          total: m.notCompleted,
          rows: page.notCompleted,
          start: page.notCompletedStart,
        }
      : null,
  ].filter((table) => table != null);
  const wide = tables.length < 2;

  return (
    <SlideFrame className="flex flex-col">
      <SlideHeader
        title="Completed and not completed"
        subtitle={`${m.completed} completed · ${m.notCompleted} not completed${continued}`}
        model={model}
      />
      {page.showChart ? (
        <div className="mt-[1.5cqw] grid h-[18cqw] grid-cols-[0.9fr_1.15fr] items-center gap-[2.4cqw]">
          <div className="h-full min-h-0">
            {chartSlices.length > 0 ? (
              <ShareChart
                data={chartSlices}
                colors={chartSlices.map((slice) => slice.color)}
                variant="donut"
                palette={model.palette}
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="slide-kpi" style={{ fontSize: "4cqw" }}>
                  0
                </p>
              </div>
            )}
          </div>
          <div className="flex flex-col justify-center gap-[1cqw]">
            {m.completionSplit.map((item, i) => (
              <div
                key={item.label}
                className="flex items-center gap-[1cqw] rounded-[1cqw] px-[1.3cqw] py-[1cqw]"
                style={{ backgroundColor: hex(c.card) }}
              >
                <span
                  className="h-[1.5cqw] w-[1.5cqw] shrink-0 rounded-[0.3cqw]"
                  style={{ backgroundColor: hex(sc(model, i)) }}
                />
                <span className="slide-body min-w-0 flex-1 truncate" style={{ color: hex(c.ink) }}>
                  {item.label}
                </span>
                <span className="slide-kpi tabular-nums" style={{ fontSize: "2.8cqw" }}>
                  {item.count}
                </span>
                <span
                  className="slide-body w-[6.5cqw] text-right font-semibold tabular-nums"
                  style={{ color: hex(c.ink) }}
                >
                  {item.pct}%
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      <div className={cn("mt-[1.4cqw] grid flex-1 gap-[2.2cqw]", tables.length > 1 && "grid-cols-2")}>
        {tables.map((table) => (
          <UserTable
            key={table.key}
            title={table.title}
            total={table.total}
            rows={table.rows}
            start={table.start}
            model={model}
            wide={wide}
          />
        ))}
      </div>
    </SlideFrame>
  );
}

function ParticipantsSlide({ model }: { model: ReportModel }) {
  const m = model.metrics;
  const rows = m.participants.slice(0, 12);
  const chartData = m.participants
    .filter((p) => p.avgScore != null)
    .slice(0, 8)
    .map((p) => ({ label: p.participant, count: p.avgScore ?? 0, pct: p.avgScore ?? 0 }));
  const c = colors(model);
  return (
    <SlideFrame className="flex flex-col">
      <SlideHeader
        title="Participant Results"
        subtitle={`${m.uniqueParticipants} people · every name, course load and score from the imported data`}
        model={model}
      />
      <div className="mt-[1.6cqw] grid flex-1 grid-cols-[1.35fr_1fr] gap-[2.2cqw]">
        <div className="min-h-0">
          <div
            className="slide-body grid grid-cols-[1.5fr_0.6fr_0.7fr_0.7fr_0.8fr] gap-[0.6cqw] pb-[0.5cqw] font-semibold"
            style={{ color: hex(c.ink) }}
          >
            <span>Participant</span>
            <span className="text-right">Courses</span>
            <span className="text-right">Avg</span>
            <span className="text-right">Best</span>
            <span className="text-right">Passed</span>
          </div>
          <div className="flex flex-col">
            {rows.map((p, i) => (
              <div
                key={p.participant}
                className="slide-body grid grid-cols-[1.5fr_0.6fr_0.7fr_0.7fr_0.8fr] items-center gap-[0.6cqw] rounded-[0.5cqw] px-[0.4cqw] py-[0.32cqw]"
                style={{ backgroundColor: i % 2 === 0 ? hex(c.card) : "transparent" }}
              >
                <span className="truncate">{p.participant}</span>
                <span className="text-right tabular-nums">{p.enrolments}</span>
                <span
                  className="text-right font-semibold tabular-nums"
                  style={{ color: hex(c.ink) }}
                >
                  {p.avgScore == null ? "—" : `${p.avgScore}%`}
                </span>
                <span className="text-right tabular-nums">
                  {p.bestScore == null ? "—" : `${p.bestScore}%`}
                </span>
                <span className="text-right tabular-nums">
                  {p.passed}/{p.enrolments}
                </span>
              </div>
            ))}
          </div>
          {m.participants.length > rows.length ? (
            <p className="slide-body mt-[0.6cqw] italic">
              + {m.participants.length - rows.length} more participants in the source data
            </p>
          ) : null}
        </div>
        <div className="flex min-h-0 flex-col">
          <p className="slide-body font-semibold">Average score by participant</p>
          <div className="min-h-0 flex-1">
            <ScoreBarChart data={chartData} palette={model.palette} />
          </div>
        </div>
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

const RENDERERS: Record<Exclude<SectionKey, "completion">, (p: { model: ReportModel }) => ReactNode> = {
  cover: CoverSlide,
  summary: SummarySlide,
  enrolment: EnrolmentSlide,
  trends: TrendsSlide,
  insights: InsightsSlide,
  assessment: AssessmentSlide,
  participants: ParticipantsSlide,
  recommendations: RecommendationsSlide,
  closing: ClosingSlide,
};

export function ReportDeck({ model, printable = false }: { model: ReportModel; printable?: boolean }) {
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
        if (key === "completion") {
          return completionPages(model.metrics).map((page) => (
            <div key={`completion-${page.index}`} className={frame}>
              <CompletionSlide model={model} page={page} />
            </div>
          ));
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
