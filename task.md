# Training Report Builder — Task Plan

## Source material

**CSV** (`enrolment_completion_report_*.csv`) — 27 data rows, 14 columns:
`Course Name, Participant Name, Completion Status, Score, Date Enrolled, Date Started,
Date completed, Date available from, Date available until, Date grace period ends,
Mode, Department, Username, Email`

- Scores are floats 0–100 (86.67 … 100.0)
- Dates are `d MMM yyyy` (`28 Jul 2026`)
- Status is textual (`Completed`)
- Department doubles as the client/org name

**PowerPoint** (Fujitec deck) — 7 slides:

1. Cover — title, subtitle + period, presenter, prepared-for, logo
2. Executive Summary — 4 large KPI cards (big number + caption)
3. Enrolment Overview — donut chart + course/percentage legend + narrative line
4. What the Numbers Tell Us — 3 insight blocks (heading, big %, paragraph)
5. Assessment Results — highest / lowest / pass rate + score distribution + note
6. Key Takeaways & Recommendations — 4 rule-based recommendation blocks
7. Thank You

Visual language: light grey background, navy serif headings, crimson/navy accents,
rounded cards, logo top-right.

## Data model

Canonical fields (mapped from any CSV header):
`course, participant, status, score, dateEnrolled, dateCompleted, department, email, mode`

- `TrainingRecord` — one normalised row, with stable `id`
- `Company` — name, logo (data URL), address, contact
- `SavedReport` — id, companyId, name, records, mapping, config, timestamps

## Calculation model (`src/calculations`)

Pure functions, no React:
totals, unique participants, enrolments+share by course, completion rate,
assessed/passed/failed, pass rate, highest/lowest/average score, perfect scores,
score distribution buckets (100 / 97–99 / 90–96 / <90), enrolments by month,
by department, by participant, period range, top/low performers.

`insights.ts` derives narrative text and rule-based recommendations, each traceable
to a metric. Nothing hardcoded.

## UI flow

`Company → Upload CSV → Map columns → Edit data → Report settings + live preview → Download`

Nav: Dashboard · Reports · Companies · Settings.
Report workspace: left = data/settings, right = live 16:9 slide preview.

## Export strategy

- **PPTX** — `pptxgenjs`, built from the same report model as the preview (native charts)
- **PDF** — browser print of the preview slides (print stylesheet), so preview and PDF
  are pixel-identical

One source of truth: `records + config → buildReportModel() → preview | pptx | pdf`.

## Testing

Unit tests for the calculation engine (shares, pass rate, distribution, edge cases:
empty, invalid, >100, negative). Manual flow test: edit a row → verify KPIs, charts,
insights and export all change.
