import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { hex, paletteFor, seriesColor, type Palette } from "@/reports/theme";

export interface ChartDatum {
  label: string;
  count: number;
  pct: number;
}

const fallback = paletteFor(null);

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: ChartDatum }[];
}) {
  const datum = payload?.[0]?.payload;
  if (!active || !datum) return null;
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-popover-foreground">{datum.label}</p>
      <p className="text-muted-foreground">
        {datum.count} {datum.count === 1 ? "enrolment" : "records"} · {datum.pct}%
      </p>
    </div>
  );
}

export function ShareChart({
  data,
  variant,
  palette = fallback,
  colors,
}: {
  data: ChartDatum[];
  variant: "donut" | "pie" | "bar";
  palette?: Palette;
  colors?: string[];
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center slide-body">No data to chart</div>
    );
  }

  if (variant === "bar") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="label"
            width={150}
            tick={{ fontSize: 11, fill: hex(palette.colors.muted) }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(127,127,127,0.12)" }} />
          <Bar dataKey="count" radius={[0, 6, 6, 0]}>
            {data.map((d, i) => (
              <Cell key={d.label} fill={colors?.[i] ?? hex(seriesColor(i, palette.series))} />
            ))}
            <LabelList
              dataKey="count"
              position="right"
              style={{ fontSize: 11, fill: hex(palette.colors.ink) }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="label"
          innerRadius={variant === "donut" ? "55%" : 0}
          outerRadius="88%"
          paddingAngle={data.length > 1 ? 0.5 : 0}
          stroke={hex(palette.colors.bg)}
          strokeWidth={data.length > 1 ? 2 : 0}
          isAnimationActive={false}
        >
          {data.map((d, i) => (
            <Cell key={d.label} fill={colors?.[i] ?? hex(seriesColor(i, palette.series))} />
          ))}
        </Pie>
        <Tooltip content={<ChartTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function DistributionChart({
  data,
  variant,
  palette = fallback,
}: {
  data: ChartDatum[];
  variant: "bar" | "donut";
  palette?: Palette;
}) {
  if (data.every((d) => d.count === 0)) {
    return (
      <div className="flex h-full items-center justify-center slide-body">
        No scores recorded yet
      </div>
    );
  }
  if (variant === "donut") return <ShareChart data={data} variant="donut" palette={palette} />;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ left: 0, right: 8, top: 16, bottom: 0 }}>
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: hex(palette.colors.muted) }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis hide />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(127,127,127,0.12)" }} />
        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={d.label} fill={hex(seriesColor(i, palette.series))} />
          ))}
          <LabelList
            dataKey="count"
            position="top"
            style={{ fontSize: 11, fill: hex(palette.colors.ink) }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Enrolments over time — area/trend line. */
export function TrendChart({
  data,
  palette = fallback,
}: {
  data: ChartDatum[];
  palette?: Palette;
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center slide-body">No dated records</div>
    );
  }
  const accent = hex(palette.colors.accent);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ left: 0, right: 8, top: 16, bottom: 0 }}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity={0.45} />
            <stop offset="100%" stopColor={accent} stopOpacity={0.04} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: hex(palette.colors.muted) }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis hide />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: accent, strokeOpacity: 0.3 }} />
        <Area
          type="monotone"
          dataKey="count"
          stroke={accent}
          strokeWidth={2.5}
          fill="url(#trendFill)"
          isAnimationActive={false}
        >
          <LabelList
            dataKey="count"
            position="top"
            style={{ fontSize: 11, fill: hex(palette.colors.ink) }}
          />
        </Area>
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Horizontal score bars (0–100) — used for participant averages. */
export function ScoreBarChart({
  data,
  palette = fallback,
}: {
  data: { label: string; count: number; pct: number }[];
  palette?: Palette;
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center slide-body">No scores recorded</div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 34, top: 4, bottom: 4 }}>
        <XAxis type="number" domain={[0, 100]} hide />
        <YAxis
          type="category"
          dataKey="label"
          width={140}
          tick={{ fontSize: 11, fill: hex(palette.colors.muted) }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(127,127,127,0.12)" }} />
        <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={12}>
          {data.map((d, i) => (
            <Cell key={d.label} fill={hex(seriesColor(i, palette.series))} />
          ))}
          <LabelList
            dataKey="count"
            position="right"
            formatter={(v: number) => `${v}%`}
            style={{ fontSize: 11, fill: hex(palette.colors.ink) }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
