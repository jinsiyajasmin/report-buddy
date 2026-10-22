import type { ReportTheme } from "@/types/report";

/**
 * Report document palettes.
 *
 * These are literal hex values on purpose: the same constants drive the on-screen
 * preview (SVG charts), the printed PDF and the generated PowerPoint, so preview
 * and export can never drift apart. App chrome uses the semantic CSS tokens.
 */
export interface PaletteColors {
  bg: string;
  card: string;
  ink: string;
  muted: string;
  accent: string;
  white: string;
}

export interface Palette {
  key: ReportTheme;
  label: string;
  description: string;
  colors: PaletteColors;
  series: string[];
}

export const THEMES: Record<ReportTheme, Palette> = {
  corporate: {
    key: "corporate",
    label: "Corporate Navy",
    description: "Light grey canvas, navy serif headings, crimson accent",
    colors: {
      bg: "F2F3F7",
      card: "E9EAF0",
      ink: "1B2A63",
      muted: "4A5568",
      accent: "C8102E",
      white: "FFFFFF",
    },
    series: ["C8102E", "1F2E63", "3B4E9B", "7183C4", "A7B3DC", "C9CEDF", "E4573D"],
  },
  midnight: {
    key: "midnight",
    label: "Midnight Teal",
    description: "Dark executive deck with luminous teal data",
    colors: {
      bg: "0F1B2D",
      card: "1B2A44",
      ink: "F4F8FF",
      muted: "A9BBD6",
      accent: "2FD3B6",
      white: "0F1B2D",
    },
    series: ["2FD3B6", "4C8DF6", "8B7BF0", "F2B33D", "6FE0C4", "9CC2FF", "E4657A"],
  },
  sandstone: {
    key: "sandstone",
    label: "Warm Sandstone",
    description: "Cream paper, terracotta accents, editorial feel",
    colors: {
      bg: "FBF6EF",
      card: "F1E6D8",
      ink: "3B2A21",
      muted: "7A6558",
      accent: "B85042",
      white: "FFFFFF",
    },
    series: ["B85042", "A7754A", "6F7F5C", "D89B5B", "8C5A4A", "C9B49A", "5C6E63"],
  },
};

const DEFAULT_THEME = THEMES["corporate"]!;

export const THEME_LIST: Palette[] = [
  DEFAULT_THEME,
  THEMES["midnight"]!,
  THEMES["sandstone"]!,
];

export function paletteFor(key?: ReportTheme | null): Palette {
  return (key ? THEMES[key] : undefined) ?? DEFAULT_THEME;
}

export const REPORT_COLORS = DEFAULT_THEME.colors;
export const SERIES = DEFAULT_THEME.series;

export const hex = (v: string) => `#${v}`;

export function seriesColor(i: number, series: string[] = SERIES): string {
  return series[i % series.length] ?? series[0]!;
}
