import { computeMetrics, type Metrics } from "@/calculations/metrics";
import {
  buildInsights,
  buildKpis,
  buildNarrative,
  buildRecommendations,
  type InsightBlock,
  type KpiCard,
  type Recommendation,
} from "@/calculations/insights";
import { paletteFor, type Palette } from "@/reports/theme";
import type { Company, ReportConfig, SectionKey, TrainingRecord } from "@/types/report";

export interface ReportModel {
  company: Company | null;
  config: ReportConfig;
  metrics: Metrics;
  period: string;
  kpis: KpiCard[];
  narrative: string;
  insights: InsightBlock[];
  recommendations: Recommendation[];
  visibleSections: SectionKey[];
  palette: Palette;
}

const ORDER: SectionKey[] = [
  "cover",
  "summary",
  "enrolment",
  "trends",
  "insights",
  "assessment",
  "participants",
  "recommendations",
  "closing",
];

/**
 * The single source of truth. Preview, PPTX export and PDF export all render
 * from this object — never from their own calculations.
 */
export function buildReportModel(
  records: TrainingRecord[],
  config: ReportConfig,
  company: Company | null,
): ReportModel {
  const metrics = computeMetrics(records, config.passMark);
  const generated = buildRecommendations(metrics);
  const overrides = config.recommendationsOverride;

  const recommendations: Recommendation[] =
    overrides && overrides.length
      ? generated.map((rec, i) => ({ ...rec, body: overrides[i] ?? rec.body }))
      : generated;

  return {
    company,
    config,
    metrics,
    period: config.periodOverride.trim() || metrics.periodLabel,
    kpis: buildKpis(metrics),
    narrative: config.narrativeOverride?.trim() || buildNarrative(metrics),
    insights: buildInsights(metrics),
    recommendations,
    visibleSections: ORDER.filter((s) => config.sections[s] !== false),
    palette: paletteFor(config.theme),
  };
}
