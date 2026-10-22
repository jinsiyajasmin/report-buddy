import PptxGenJS from "pptxgenjs";
import type { ReportModel } from "@/reports/model";
import type { PaletteColors } from "@/reports/theme";

const W = 10;
const H = 5.625;

function logoImage(model: ReportModel) {
  const logo = model.company?.logo;
  if (!logo || !logo.startsWith("data:image/")) return null;
  if (logo.startsWith("data:image/svg")) return null; // not embeddable in pptx
  return logo;
}

function addLogo(slide: PptxGenJS.Slide, model: ReportModel, big = false) {
  const data = logoImage(model);
  if (!data) return;
  const w = big ? 2.2 : 1.4;
  slide.addImage({
    data,
    x: W - w - 0.5,
    y: 0.32,
    w,
    h: big ? 0.9 : 0.6,
    sizing: { type: "contain", w, h: big ? 0.9 : 0.6 },
  });
}

function heading(
  slide: PptxGenJS.Slide,
  C: PaletteColors,
  title: string,
  subtitle?: string,
) {
  slide.addText(title, {
    x: 0.5,
    y: 0.32,
    w: 7.4,
    h: 0.6,
    fontSize: 28,
    bold: true,
    color: C.ink,
    fontFace: "Georgia",
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.5,
      y: 0.95,
      w: 7.6,
      h: 0.4,
      fontSize: 12,
      color: C.muted,
    });
  }
}

export async function exportPptx(model: ReportModel, fileName: string): Promise<void> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9";
  pptx.author = model.company?.name ?? "Training Report Builder";
  pptx.title = model.config.title;

  const m = model.metrics;
  const C = model.palette.colors;
  const SERIES = model.palette.series;
  const seriesColor = (i: number) => SERIES[i % SERIES.length] ?? SERIES[0]!;
  const bg = { color: C.bg };
  const chartBase = {
    dataLabelColor: C.ink,
    dataLabelFontSize: 9,
    valGridLine: { style: "none" as const },
    catGridLine: { style: "none" as const },
    catAxisLineShow: false,
    valAxisLineShow: false,
    catAxisLabelColor: C.muted,
    catAxisLabelFontSize: 9,
  };

  for (const section of model.visibleSections) {
    const slide = pptx.addSlide();
    slide.background = bg;

    if (section === "cover") {
      slide.addText(model.company?.name?.toUpperCase() ?? "", {
        x: 0.6,
        y: 0.4,
        w: 5,
        h: 0.3,
        fontSize: 11,
        bold: true,
        charSpacing: 3,
        color: C.muted,
      });
      addLogo(slide, model, true);
      slide.addShape("rect", {
        x: 0.6,
        y: 2.2,
        w: 1.2,
        h: 0.08,
        fill: { color: C.accent },
      });
      slide.addText(model.config.title, {
        x: 0.6,
        y: 2.45,
        w: 8.4,
        h: 0.9,
        fontSize: 40,
        bold: true,
        color: C.ink,
        fontFace: "Georgia",
      });
      slide.addText(
        `${model.config.subtitle}${model.period ? ` — ${model.period}` : ""}`,
        { x: 0.6, y: 3.4, w: 8.4, h: 0.5, fontSize: 16, color: C.muted },
      );
      const footer = [
        model.config.presenter ? `Presented by ${model.config.presenter}` : "",
        model.config.preparedFor ? `Prepared for ${model.config.preparedFor}` : "",
      ]
        .filter(Boolean)
        .join("    ·    ");
      slide.addText(footer, {
        x: 0.6,
        y: 4.7,
        w: 8.4,
        h: 0.4,
        fontSize: 11,
        color: C.muted,
      });
    }

    if (section === "summary") {
      heading(slide, C, "Executive Summary", model.config.summaryStrap);
      addLogo(slide, model);
      const cardW = 2.1;
      const gap = 0.22;
      const startX = (W - (cardW * 4 + gap * 3)) / 2;
      model.kpis.forEach((kpi, i) => {
        const x = startX + i * (cardW + gap);
        slide.addShape("roundRect", {
          x,
          y: 1.7,
          w: cardW,
          h: 3.1,
          fill: { color: C.card },
          line: { color: C.card },
          rectRadius: 0.12,
        });
        slide.addShape("ellipse", {
          x: x + cardW / 2 - 0.28,
          y: 2.0,
          w: 0.56,
          h: 0.56,
          fill: { color: kpi.tone === "accent" ? C.accent : C.ink },
        });
        slide.addText(kpi.value, {
          x,
          y: 2.75,
          w: cardW,
          h: 0.6,
          fontSize: 28,
          bold: true,
          align: "center",
          color: C.ink,
          fontFace: "Georgia",
        });
        slide.addText(kpi.caption, {
          x: x + 0.15,
          y: 3.4,
          w: cardW - 0.3,
          h: 1.2,
          fontSize: 10,
          align: "center",
          valign: "top",
          color: C.muted,
        });
      });
    }

    if (section === "enrolment") {
      heading(
        slide,
        C,
        model.period
          ? `${model.period} — ${model.config.enrolmentTitle}`
          : model.config.enrolmentTitle,
        `Distribution of ${m.totalEnrolments} enrolments across ${m.courseCount} ${
          m.courseCount === 1 ? "course" : "courses"
        }`,
      );
      addLogo(slide, model);

      if (m.courses.length > 0) {
        const labels = m.courses.map((c) => c.course);
        const values = m.courses.map((c) => c.count);
        const chartType =
          model.config.enrolmentChart === "bar" ? pptx.ChartType.bar : pptx.ChartType.doughnut;
        slide.addChart(
          chartType,
          [{ name: "Enrolments", labels, values }],
          {
            ...chartBase,
            x: 0.5,
            y: 1.5,
            w: 4.4,
            h: 3.7,
            chartColors: SERIES.slice(0, Math.max(labels.length, 1)),
            showLegend: false,
            showValue: false,
            holeSize: 55,
            barDir: "bar",
            catAxisHidden: model.config.enrolmentChart !== "bar",
            valAxisHidden: true,
          } as PptxGenJS.IChartOpts,
        );

        const rows: PptxGenJS.TableRow[] = m.courses.slice(0, 7).map((c, i) => [
          { text: "■", options: { fontSize: 11, color: seriesColor(i) } },
          {
            text: c.course,
            options: { fontSize: 11, color: C.muted },
          },
          { text: String(c.count), options: { fontSize: 11, align: "right" as const, color: C.muted } },
          {
            text: `${c.pct}%`,
            options: {
              fontSize: 11,
              bold: true,
              align: "right" as const,
              color: C.ink,
            },
          },
        ]);
        slide.addTable(rows, {
          x: 5.2,
          y: 1.6,
          w: 4.3,
          colW: [0.25, 2.65, 0.6, 0.8],
          border: { type: "none" },
          rowH: 0.3,
        });
        slide.addText(model.narrative, {
          x: 5.2,
          y: 4.1,
          w: 4.3,
          h: 1,
          fontSize: 10,
          italic: true,
          color: C.muted,
        });
      }
    }

    if (section === "trends") {
      const peak = [...m.byMonth].sort((a, b) => b.count - a.count)[0];
      heading(
        slide,
        C,
        "Enrolment Trends & Departments",
        peak
          ? `Peak activity in ${peak.label} with ${peak.count} enrolments`
          : "Activity across the reporting period",
      );
      addLogo(slide, model);

      if (m.byMonth.length > 0) {
        slide.addText("Enrolments over time", {
          x: 0.5, y: 1.45, w: 4.3, h: 0.3, fontSize: 11, bold: true, color: C.ink,
        });
        slide.addChart(
          pptx.ChartType.line,
          [
            {
              name: "Enrolments",
              labels: m.byMonth.map((d) => d.label),
              values: m.byMonth.map((d) => d.count),
            },
          ],
          {
            ...chartBase,
            x: 0.4, y: 1.8, w: 4.5, h: 3.2,
            chartColors: [C.accent],
            showLegend: false,
            showValue: true,
            lineSmooth: true,
            lineDataSymbolSize: 8,
            valAxisHidden: true,
            catAxisLabelColor: C.muted,
          } as PptxGenJS.IChartOpts,
        );
      }

      if (m.byDepartment.length > 0) {
        slide.addText("Enrolments by department", {
          x: 5.2, y: 1.45, w: 4.3, h: 0.3, fontSize: 11, bold: true, color: C.ink,
        });
        const dept = m.byDepartment.slice(0, 6);
        slide.addChart(
          pptx.ChartType.bar,
          [
            {
              name: "Enrolments",
              labels: dept.map((d) => d.label),
              values: dept.map((d) => d.count),
            },
          ],
          {
            ...chartBase,
            x: 5.1, y: 1.8, w: 4.5, h: 3.2,
            chartColors: SERIES.slice(0, dept.length),
            barDir: "bar",
            showLegend: false,
            showValue: true,
            valAxisHidden: true,
            catAxisLabelColor: C.muted,
            varyColors: true,
          } as PptxGenJS.IChartOpts,
        );
      }
    }

    if (section === "insights") {
      heading(slide, C, "What the Numbers Tell Us", "Derived directly from the imported records");
      addLogo(slide, model);
      const cardW = 2.85;
      const gap = 0.3;
      const startX = (W - (cardW * model.insights.length + gap * (model.insights.length - 1))) / 2;
      model.insights.forEach((b, i) => {
        const x = startX + i * (cardW + gap);
        slide.addShape("roundRect", {
          x,
          y: 1.6,
          w: cardW,
          h: 3.3,
          fill: { color: C.card },
          line: { color: C.card },
          rectRadius: 0.1,
        });
        slide.addShape("ellipse", {
          x: x + 0.25,
          y: 1.85,
          w: 0.34,
          h: 0.34,
          fill: { color: seriesColor(i) },
        });
        slide.addText(b.title, {
          x: x + 0.25,
          y: 2.28,
          w: cardW - 0.5,
          h: 0.4,
          fontSize: 13,
          bold: true,
          color: C.ink,
          fontFace: "Georgia",
        });
        slide.addText(b.value, {
          x: x + 0.25,
          y: 2.7,
          w: cardW - 0.5,
          h: 0.6,
          fontSize: 26,
          bold: true,
          color: C.ink,
          fontFace: "Georgia",
        });
        slide.addText(b.body, {
          x: x + 0.25,
          y: 3.35,
          w: cardW - 0.5,
          h: 1.4,
          fontSize: 9.5,
          valign: "top",
          color: C.muted,
        });
      });
    }

    if (section === "assessment") {
      heading(
        slide,
        C,
        model.period
          ? `${model.period} — ${model.config.assessmentTitle}`
          : model.config.assessmentTitle,
        `${m.assessed} assessed · ${m.passed} passed · ${m.failed} below the ${m.passMark}% threshold`,
      );
      addLogo(slide, model);

      const stats: [string, string][] = [
        [m.highest == null ? "—" : `${m.highest}%`, "Highest score"],
        [m.lowest == null ? "—" : `${m.lowest}%`, "Lowest score"],
        [m.average == null ? "—" : `${m.average}%`, "Average score"],
        [`${m.passRate}%`, "Pass rate"],
        [String(m.assessed), "Assessed"],
        [`${m.passed} / ${m.failed}`, "Passed / below"],
      ];
      stats.forEach(([value, label], i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const x = 0.5 + col * 2.15;
        const y = 1.6 + row * 1.12;
        slide.addShape("roundRect", {
          x,
          y,
          w: 2,
          h: 0.98,
          fill: { color: C.card },
          line: { color: C.card },
          rectRadius: 0.08,
        });
        slide.addText(value, {
          x,
          y: y + 0.1,
          w: 2,
          h: 0.45,
          fontSize: 20,
          bold: true,
          align: "center",
          color: C.ink,
          fontFace: "Georgia",
        });
        slide.addText(label, {
          x,
          y: y + 0.55,
          w: 2,
          h: 0.3,
          fontSize: 9,
          align: "center",
          color: C.muted,
        });
      });

      if (m.assessed > 0) {
        slide.addChart(
          model.config.distributionChart === "donut" ? pptx.ChartType.doughnut : pptx.ChartType.bar,
          [
            {
              name: "Assessments",
              labels: m.distribution.map((d) => d.label),
              values: m.distribution.map((d) => d.count),
            },
          ],
          {
            ...chartBase,
            x: 5.1,
            y: 1.5,
            w: 4.4,
            h: 3,
            chartColors: SERIES.slice(0, 4),
            showLegend: false,
            showValue: true,
            holeSize: 55,
            valAxisHidden: true,
          } as PptxGenJS.IChartOpts,
        );
      }
      const low = m.lowPerformers[0];
      if (low) {
        slide.addText(
          `Note: lowest result is ${low.participant} at ${low.score}% in ${low.course} — flagged for a short refresher.`,
          { x: 5.1, y: 4.6, w: 4.4, h: 0.6, fontSize: 9.5, italic: true, color: C.muted },
        );
      }
    }

    if (section === "participants") {
      heading(
        slide,
        C,
        "Participant Results",
        `${m.uniqueParticipants} people · every name, course load and score from the imported data`,
      );
      addLogo(slide, model);

      const head: PptxGenJS.TableRow = [
        "Participant",
        "Courses",
        "Avg",
        "Best",
        "Passed",
      ].map((t, i) => ({
        text: t,
        options: {
          fontSize: 9,
          bold: true,
          color: C.ink,
          align: (i === 0 ? "left" : "right") as "left" | "right",
        },
      }));
      const body: PptxGenJS.TableRow[] = m.participants.slice(0, 12).map((p) => [
        { text: p.participant, options: { fontSize: 10, color: C.muted } },
        { text: String(p.enrolments), options: { fontSize: 10, align: "right" as const, color: C.muted } },
        {
          text: p.avgScore == null ? "—" : `${p.avgScore}%`,
          options: { fontSize: 10, bold: true, align: "right" as const, color: C.ink },
        },
        {
          text: p.bestScore == null ? "—" : `${p.bestScore}%`,
          options: { fontSize: 10, align: "right" as const, color: C.muted },
        },
        {
          text: `${p.passed}/${p.enrolments}`,
          options: { fontSize: 10, align: "right" as const, color: C.muted },
        },
      ]);
      slide.addTable([head, ...body], {
        x: 0.5,
        y: 1.55,
        w: 5.3,
        colW: [2.2, 0.85, 0.75, 0.75, 0.75],
        border: { type: "solid", pt: 1, color: C.card },
        rowH: 0.26,
      });

      const scored = m.participants.filter((p) => p.avgScore != null).slice(0, 8);
      if (scored.length > 0) {
        slide.addText("Average score by participant", {
          x: 6.0, y: 1.5, w: 3.5, h: 0.3, fontSize: 11, bold: true, color: C.ink,
        });
        slide.addChart(
          pptx.ChartType.bar,
          [
            {
              name: "Average score",
              labels: scored.map((p) => p.participant),
              values: scored.map((p) => p.avgScore ?? 0),
            },
          ],
          {
            ...chartBase,
            x: 5.9, y: 1.85, w: 3.7, h: 3.2,
            valAxisMaxVal: 115,
            chartColors: SERIES.slice(0, scored.length),
            barDir: "bar",
            showLegend: false,
            showValue: true,
            valAxisHidden: true,
            catAxisLabelColor: C.muted,
            varyColors: true,
          } as PptxGenJS.IChartOpts,
        );
      }
      if (m.participants.length > 12) {
        slide.addText(`+ ${m.participants.length - 12} more participants in the source data`, {
          x: 0.5, y: 4.9, w: 5.3, h: 0.3, fontSize: 9, italic: true, color: C.muted,
        });
      }
    }

    if (section === "recommendations") {
      heading(
        slide,
        C,
        "Key Takeaways & Recommendations",
        "Each point is traceable to a calculated metric",
      );
      addLogo(slide, model);
      model.recommendations.forEach((rec, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const x = 0.6 + col * 4.6;
        const y = 1.7 + row * 1.6;
        slide.addShape("ellipse", {
          x,
          y,
          w: 0.36,
          h: 0.36,
          fill: { color: seriesColor(i) },
        });
        slide.addText(rec.title, {
          x: x + 0.5,
          y: y - 0.04,
          w: 3.7,
          h: 0.4,
          fontSize: 13,
          bold: true,
          color: C.ink,
          fontFace: "Georgia",
        });
        slide.addText(rec.body, {
          x: x + 0.5,
          y: y + 0.36,
          w: 3.7,
          h: 1.1,
          fontSize: 9.5,
          valign: "top",
          color: C.muted,
        });
      });
    }

    if (section === "closing") {
      addLogo(slide, model, true);
      slide.addText(model.config.closingTitle, {
        x: 0,
        y: 2.2,
        w: W,
        h: 0.9,
        fontSize: 40,
        bold: true,
        align: "center",
        color: C.ink,
        fontFace: "Georgia",
      });
      slide.addText(model.config.closingSubtitle, {
        x: 0,
        y: 3.1,
        w: W,
        h: 0.5,
        fontSize: 14,
        align: "center",
        color: C.muted,
      });
    }
  }

  await pptx.writeFile({ fileName: fileName.endsWith(".pptx") ? fileName : `${fileName}.pptx` });
}

export const SLIDE_SIZE = { W, H };
