import PptxGenJS from "pptxgenjs";
import {
  coursePages,
  coursesText,
  formatScore,
  participantPages,
  rowUnits,
  scoresText,
  statusPages,
  STATUS_LABELS,
  STATUS_ORDER,
  type StatusKey,
} from "@/calculations/metrics";
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

function heading(slide: PptxGenJS.Slide, C: PaletteColors, title: string, subtitle?: string) {
  // Long titles step down a size so they stay on one line above the subtitle.
  const size = title.length > 40 ? 20 : title.length > 30 ? 23 : 28;
  slide.addText(title, {
    x: 0.5,
    y: 0.32,
    w: 7.6,
    h: 0.6,
    fontSize: size,
    bold: true,
    color: C.ink,
    fontFace: "Georgia",
    valign: "middle",
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

/** Builds the deck in memory. Kept separate from the download so it can be tested. */
export function buildPptx(model: ReportModel): PptxGenJS {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9";
  pptx.author = model.company?.name ?? "Training Report Builder";
  pptx.title = model.config.title;

  const m = model.metrics;
  const C = model.palette.colors;
  const SERIES = model.palette.series;
  const seriesColor = (i: number) => SERIES[i % SERIES.length] ?? SERIES[0]!;
  const bg = { color: C.bg };
  const S = model.palette.status;
  const soft = (key: StatusKey) => S[`${key}Soft`];
  const footerText = [model.company?.name, model.config.title].filter(Boolean).join("  ·  ");
  const addFooter = (target: PptxGenJS.Slide) => {
    target.addShape("line", {
      x: 0.5,
      y: 5.27,
      w: 9,
      h: 0,
      line: { color: C.card, width: 0.75 },
    });
    target.addText(footerText, {
      x: 0.5,
      y: 5.29,
      w: 7,
      h: 0.25,
      fontSize: 8,
      color: C.muted,
    });
    target.slideNumber = {
      x: 9.0,
      y: 5.29,
      w: 0.5,
      h: 0.25,
      fontSize: 8,
      color: C.muted,
      align: "right",
    };
  };
  /** Extra slide for a section that runs over one page. */
  const continuationSlide = () => {
    const extra = pptx.addSlide();
    extra.background = bg;
    addFooter(extra);
    return extra;
  };
  const pageSuffix = (index: number, total: number) =>
    total > 1 ? `  ·  page ${index + 1} of ${total}` : "";
  const headCell = (
    text: string,
    align: "left" | "right" | "center" = "left",
  ): PptxGenJS.TableCell => ({
    text,
    options: {
      fontSize: 9,
      bold: true,
      color: C.white,
      fill: { color: C.ink },
      align,
      valign: "middle",
    },
  });
  const bodyCell = (
    text: string,
    row: number,
    opts: PptxGenJS.TableCellProps = {},
  ): PptxGenJS.TableCell => ({
    text,
    options: {
      fontSize: 9,
      color: C.muted,
      valign: "middle",
      fill: { color: row % 2 === 0 ? C.bg : C.card },
      ...opts,
    },
  });
  const tableBorder: PptxGenJS.BorderProps = { type: "solid", pt: 0.5, color: C.card };
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
    if (section !== "cover" && section !== "closing") addFooter(slide);

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
      slide.addText(`${model.config.subtitle}${model.period ? ` — ${model.period}` : ""}`, {
        x: 0.6,
        y: 3.4,
        w: 8.4,
        h: 0.5,
        fontSize: 16,
        color: C.muted,
      });
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
      const gap = 0.2;
      model.kpis.forEach((kpi, i) => {
        const x = 0.5 + i * (cardW + gap);
        const tint = kpi.tone === "neutral" ? C.card : soft(kpi.tone);
        const strong = kpi.tone === "neutral" ? C.ink : S[kpi.tone];
        slide.addShape("roundRect", {
          x,
          y: 1.5,
          w: cardW,
          h: 1.8,
          fill: { color: tint },
          line: { color: tint },
          rectRadius: 0.1,
        });
        slide.addShape("rect", {
          x: x + 0.22,
          y: 1.72,
          w: 0.5,
          h: 0.06,
          fill: { color: strong },
          line: { color: strong },
        });
        slide.addText(kpi.value, {
          x: x + 0.15,
          y: 1.85,
          w: cardW - 0.3,
          h: 0.7,
          fontSize: 34,
          bold: true,
          color: C.ink,
          fontFace: "Georgia",
          valign: "middle",
        });
        slide.addText(kpi.label, {
          x: x + 0.15,
          y: 2.55,
          w: cardW - 0.3,
          h: 0.3,
          fontSize: 11,
          bold: true,
          color: C.ink,
        });
        slide.addText(kpi.caption, {
          x: x + 0.15,
          y: 2.84,
          w: cardW - 0.3,
          h: 0.3,
          fontSize: 9.5,
          color: C.muted,
        });
      });

      slide.addText("Overall assignment status", {
        x: 0.5,
        y: 3.5,
        w: 9,
        h: 0.35,
        fontSize: 13,
        bold: true,
        color: C.ink,
        fontFace: "Georgia",
      });
      const barY = 3.92;
      const barH = 0.4;
      if (m.totalEnrolments === 0) {
        slide.addShape("rect", {
          x: 0.5,
          y: barY,
          w: 9,
          h: barH,
          fill: { color: C.card },
          line: { color: C.card },
        });
      } else {
        let x = 0.5;
        for (const part of m.completionSplit) {
          if (part.count === 0) continue;
          const w = (9 * part.count) / m.totalEnrolments;
          slide.addShape("rect", {
            x,
            y: barY,
            w,
            h: barH,
            fill: { color: S[part.key] },
            line: { color: S[part.key] },
          });
          if (w >= 0.6) {
            slide.addText(`${part.pct}%`, {
              x,
              y: barY,
              w,
              h: barH,
              fontSize: 10,
              bold: true,
              align: "center",
              valign: "middle",
              color: C.white,
            });
          }
          x += w;
        }
      }
      m.completionSplit.forEach((part, i) => {
        const x = 0.5 + i * 3;
        slide.addShape("rect", {
          x,
          y: 4.56,
          w: 0.16,
          h: 0.16,
          fill: { color: S[part.key] },
          line: { color: S[part.key] },
        });
        slide.addText(
          [
            { text: `${part.count} `, options: { bold: true, color: C.ink } },
            { text: `${part.label} (${part.pct}%)`, options: { color: C.muted } },
          ],
          { x: x + 0.24, y: 4.47, w: 2.7, h: 0.34, fontSize: 11, valign: "middle" },
        );
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
        slide.addChart(chartType, [{ name: "Enrolments", labels, values }], {
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
        } as PptxGenJS.IChartOpts);

        const rows: PptxGenJS.TableRow[] = m.courses.slice(0, 7).map((c, i) => [
          { text: "■", options: { fontSize: 11, color: seriesColor(i) } },
          {
            text: c.course,
            options: { fontSize: 11, color: C.muted },
          },
          {
            text: String(c.count),
            options: { fontSize: 11, align: "right" as const, color: C.muted },
          },
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

    if (section === "courses") {
      const pages = coursePages(m);
      if (pages.length === 0) pages.push([]);
      pages.forEach((rows, pageIndex) => {
        const target = pageIndex === 0 ? slide : continuationSlide();
        heading(
          target,
          C,
          "Course Breakdown",
          `Status of ${m.totalEnrolments} course assignments across ${m.courseCount} ${
            m.courseCount === 1 ? "course" : "courses"
          }${pageSuffix(pageIndex, pages.length)}`,
        );
        addLogo(target, model);

        const num = (value: number, row: number, key?: StatusKey): PptxGenJS.TableCell =>
          bodyCell(String(value), row, {
            align: "center",
            bold: key != null && value > 0,
            color: key != null && value > 0 ? S[key] : C.muted,
          });
        const table: PptxGenJS.TableRow[] = [
          [
            headCell("Course"),
            headCell("Assigned", "center"),
            headCell("Completed", "center"),
            headCell("In progress", "center"),
            headCell("Not completed", "center"),
            headCell("Completion rate", "center"),
            headCell("Avg score", "center"),
          ],
          ...rows.map((c, i) => [
            bodyCell(c.course, i, { bold: true, color: C.ink }),
            num(c.count, i),
            num(c.completed, i, "completed"),
            num(c.inProgress, i, "inProgress"),
            num(c.notCompleted, i, "notCompleted"),
            bodyCell(`${c.completionRate}%`, i, { align: "center", bold: true, color: C.ink }),
            bodyCell(formatScore(c.avgScore), i, { align: "center" }),
          ]),
        ];
        if (pageIndex === pages.length - 1 && m.courses.length > 0) {
          const total = (
            text: string,
            align: "left" | "center" = "center",
          ): PptxGenJS.TableCell => ({
            text,
            options: {
              fontSize: 9,
              bold: true,
              color: C.ink,
              fill: { color: C.card },
              align,
              valign: "middle",
            },
          });
          table.push([
            total("Total", "left"),
            total(String(m.totalEnrolments)),
            total(String(m.completed)),
            total(String(m.inProgress)),
            total(String(m.notCompleted)),
            total(`${m.completionRate}%`),
            total(formatScore(m.average)),
          ]);
        }
        target.addTable(table, {
          x: 0.5,
          y: 1.45,
          w: 9,
          colW: [2.7, 0.9, 1.0, 1.0, 1.15, 1.2, 1.05],
          rowH: 0.27,
          border: tableBorder,
          fontFace: "Calibri",
        });

        if (rows.length > 0) {
          target.addChart(
            pptx.ChartType.bar,
            STATUS_ORDER.map((key) => ({
              name: STATUS_LABELS[key],
              labels: rows.map((c) => c.course),
              values: rows.map((c) => c[key]),
            })),
            {
              x: 0.5,
              y: 3.42,
              w: 9,
              h: 1.82,
              barDir: "bar",
              barGrouping: "stacked",
              barOverlapPct: 100,
              barGapWidthPct: 55,
              chartColors: [S.completed, S.inProgress, S.notCompleted],
              showLegend: true,
              legendPos: "b",
              legendFontSize: 9,
              legendColor: C.muted,
              showValue: true,
              dataLabelColor: C.white,
              dataLabelFontSize: 9,
              dataLabelFormatCode: "0;-0;;",
              catAxisOrientation: "maxMin",
              catAxisLabelColor: C.muted,
              catAxisLabelFontSize: 9,
              catAxisLineShow: false,
              catGridLine: { style: "none" },
              valGridLine: { style: "none" },
              valAxisHidden: true,
              valAxisLineShow: false,
            } as unknown as PptxGenJS.IChartOpts,
          );
        }
      });
    }

    if (section === "completion") {
      heading(
        slide,
        C,
        "Training Status Overview",
        `${m.completed} completed  ·  ${m.inProgress} in progress  ·  ${m.notCompleted} not completed`,
      );
      addLogo(slide, model);
      const slices = m.completionSplit.filter((item) => item.count > 0);
      if (slices.length > 0) {
        slide.addChart(
          pptx.ChartType.doughnut,
          [
            {
              name: "Status",
              labels: slices.map((item) => item.label),
              values: slices.map((item) => item.count),
            },
          ],
          {
            x: 0.5,
            y: 1.45,
            w: 4.1,
            h: 3.7,
            holeSize: 60,
            showLegend: false,
            showValue: false,
            showPercent: true,
            dataLabelColor: C.white,
            dataLabelFontSize: 11,
            dataLabelFontBold: true,
            chartColors: slices.map((item) => S[item.key]),
            dataBorder: { pt: 1.5, color: C.bg },
          } as PptxGenJS.IChartOpts,
        );
      } else {
        slide.addText("No assignments", {
          x: 0.5,
          y: 2.9,
          w: 4.1,
          h: 0.6,
          fontSize: 16,
          align: "center",
          color: C.muted,
        });
      }
      m.statusGroups.forEach((group, i) => {
        const y = 1.6 + i * 1.18;
        slide.addShape("roundRect", {
          x: 4.9,
          y,
          w: 4.6,
          h: 1.02,
          fill: { color: soft(group.key) },
          line: { color: soft(group.key) },
          rectRadius: 0.08,
        });
        slide.addShape("rect", {
          x: 4.9,
          y: y + 0.14,
          w: 0.07,
          h: 0.74,
          fill: { color: S[group.key] },
          line: { color: S[group.key] },
        });
        slide.addText(group.label, {
          x: 5.15,
          y: y + 0.14,
          w: 2.4,
          h: 0.38,
          fontSize: 14,
          bold: true,
          color: C.ink,
          fontFace: "Georgia",
          valign: "middle",
        });
        slide.addText(
          `${group.users.length} ${group.users.length === 1 ? "employee" : "employees"}  ·  ${group.pct}% of assignments`,
          { x: 5.15, y: y + 0.52, w: 2.9, h: 0.3, fontSize: 9.5, color: C.muted, valign: "middle" },
        );
        slide.addText(String(group.assignments), {
          x: 8.0,
          y: y + 0.11,
          w: 1.3,
          h: 0.8,
          fontSize: 30,
          bold: true,
          align: "right",
          valign: "middle",
          color: S[group.key],
          fontFace: "Georgia",
        });
      });

      const ROW = 0.27;
      for (const page of statusPages(m)) {
        const target = continuationSlide();
        heading(
          target,
          C,
          "Training Status Details",
          `Each employee is listed once per status, with their courses grouped on one row${pageSuffix(page.index, page.total)}`,
        );
        addLogo(target, model);
        let y = 1.42;
        for (const block of page.blocks) {
          const { group } = block;
          const withScore = group.key === "completed";
          target.addShape("roundRect", {
            x: 0.5,
            y,
            w: 2.4,
            h: 0.3,
            fill: { color: soft(group.key) },
            line: { color: soft(group.key) },
            rectRadius: 0.04,
          });
          target.addShape("rect", {
            x: 0.5,
            y,
            w: 0.06,
            h: 0.3,
            fill: { color: S[group.key] },
            line: { color: S[group.key] },
          });
          target.addText(`${group.label}${block.continued ? " (continued)" : ""}`, {
            x: 0.65,
            y,
            w: 2.25,
            h: 0.3,
            fontSize: 11.5,
            bold: true,
            color: C.ink,
            valign: "middle",
          });
          target.addText(
            `${group.assignments} course ${group.assignments === 1 ? "assignment" : "assignments"}  |  ${group.users.length} ${group.users.length === 1 ? "employee" : "employees"}`,
            { x: 3.05, y, w: 5, h: 0.3, fontSize: 9.5, color: C.muted, valign: "middle" },
          );

          const head: PptxGenJS.TableRow = [
            headCell("#", "center"),
            headCell("Employee"),
            headCell(withScore ? "Course(s) completed" : "Course(s) in this status"),
            ...(withScore ? [headCell("Score", "center")] : []),
          ];
          const heights = [ROW];
          const body: PptxGenJS.TableRow[] = [];
          if (block.rows.length === 0) {
            body.push([
              bodyCell("", 0),
              {
                text: "No course assignments in this status",
                options: {
                  fontSize: 9,
                  italic: true,
                  color: C.muted,
                  colspan: withScore ? 3 : 2,
                  valign: "middle",
                },
              },
            ]);
            heights.push(ROW);
          }
          block.rows.forEach((user, i) => {
            const text = coursesText(user);
            body.push([
              bodyCell(String(block.start + i + 1), i, { align: "center" }),
              bodyCell(user.participant, i, { bold: true, color: C.ink }),
              bodyCell(text, i),
              ...(withScore
                ? [
                    bodyCell(scoresText(user), i, {
                      align: "center",
                      bold: true,
                      color: S.completed,
                    }),
                  ]
                : []),
            ]);
            heights.push(ROW * rowUnits(user));
          });
          target.addTable([head, ...body], {
            x: 0.5,
            y: y + 0.36,
            w: 9,
            colW: withScore ? [0.45, 2.3, 4.85, 1.4] : [0.45, 2.3, 6.25],
            rowH: heights,
            border: tableBorder,
            fontFace: "Calibri",
          });
          y += 0.36 + heights.reduce((a, b) => a + b, 0) + 0.16;
        }
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
          x: 0.5,
          y: 1.45,
          w: 4.3,
          h: 0.3,
          fontSize: 11,
          bold: true,
          color: C.ink,
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
            x: 0.4,
            y: 1.8,
            w: 4.5,
            h: 3.2,
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
          x: 5.2,
          y: 1.45,
          w: 4.3,
          h: 0.3,
          fontSize: 11,
          bold: true,
          color: C.ink,
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
            x: 5.1,
            y: 1.8,
            w: 4.5,
            h: 3.2,
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
        [formatScore(m.highest), "Highest score"],
        [formatScore(m.lowest), "Lowest score"],
        [formatScore(m.average), "Average score"],
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
          `Note: lowest result is ${low.participant} at ${formatScore(low.score)} in ${low.course} — flagged for a short refresher.`,
          { x: 5.1, y: 4.6, w: 4.4, h: 0.6, fontSize: 9.5, italic: true, color: C.muted },
        );
      }
    }

    if (section === "participants") {
      const pages = participantPages(m);
      if (pages.length === 0) pages.push([]);
      let offset = 0;
      pages.forEach((rows, pageIndex) => {
        const target = pageIndex === 0 ? slide : continuationSlide();
        heading(
          target,
          C,
          "Employee Training Overview",
          `${m.uniqueParticipants} ${m.uniqueParticipants === 1 ? "employee" : "employees"}, each shown once with all assigned courses${pageSuffix(pageIndex, pages.length)}`,
        );
        addLogo(target, model);
        const num = (value: number, row: number, key?: StatusKey): PptxGenJS.TableCell =>
          bodyCell(String(value), row, {
            align: "center",
            bold: key != null && value > 0,
            color: key != null && value > 0 ? S[key] : C.muted,
          });
        const start = offset;
        target.addTable(
          [
            [
              headCell("#", "center"),
              headCell("Employee"),
              headCell("Assigned", "center"),
              headCell("Completed", "center"),
              headCell("In progress", "center"),
              headCell("Not completed", "center"),
              headCell("Completion", "center"),
              headCell("Avg score", "center"),
            ],
            ...rows.map((p, i) => [
              bodyCell(String(start + i + 1), i, { align: "center" }),
              bodyCell(p.participant, i, { bold: true, color: C.ink }),
              num(p.enrolments, i),
              num(p.completed, i, "completed"),
              num(p.inProgress, i, "inProgress"),
              num(p.notCompleted, i, "notCompleted"),
              bodyCell(`${Math.round((p.completed / Math.max(p.enrolments, 1)) * 100)}%`, i, {
                align: "center",
              }),
              bodyCell(formatScore(p.avgScore), i, { align: "center", bold: true, color: C.ink }),
            ]),
          ],
          {
            x: 0.5,
            y: 1.45,
            w: 9,
            colW: [0.45, 2.75, 0.95, 1.05, 1.05, 1.2, 0.8, 0.75],
            rowH: 0.29,
            border: tableBorder,
            fontFace: "Calibri",
          },
        );
        offset += rows.length;
      });
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

  return pptx;
}

export async function exportPptx(model: ReportModel, fileName: string): Promise<void> {
  const pptx = buildPptx(model);
  await pptx.writeFile({ fileName: fileName.endsWith(".pptx") ? fileName : `${fileName}.pptx` });
}

export const SLIDE_SIZE = { W, H };
