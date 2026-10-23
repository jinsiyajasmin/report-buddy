import { RotateCcw } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { ReportModel } from "@/reports/model";
import { THEME_LIST } from "@/reports/theme";
import {
  SECTION_LABELS,
  type ReportConfig,
  type SectionKey,
  type EnrolmentChartType,
  type DistributionChartType,
  type ReportTheme,
} from "@/types/report";

export function ReportSettingsPanel({
  config,
  model,
  onChange,
}: {
  config: ReportConfig;
  model: ReportModel;
  onChange: (patch: Partial<ReportConfig>) => void;
}) {
  const field = (
    id: keyof ReportConfig,
    label: string,
    placeholder = "",
  ) => (
    <div className="space-y-1.5">
      <Label htmlFor={String(id)}>{label}</Label>
      <Input
        id={String(id)}
        value={String(config[id] ?? "")}
        placeholder={placeholder}
        onChange={(e) => onChange({ [id]: e.target.value } as Partial<ReportConfig>)}
      />
    </div>
  );

  return (
    <Accordion type="multiple" defaultValue={["style", "details", "sections"]} className="w-full">
      <AccordionItem value="style">
        <AccordionTrigger>Style</AccordionTrigger>
        <AccordionContent className="space-y-3 pt-1">
          <div className="grid gap-2">
            {THEME_LIST.map((theme) => {
              const active = (config.theme ?? "corporate") === theme.key;
              return (
                <button
                  key={theme.key}
                  type="button"
                  onClick={() => onChange({ theme: theme.key as ReportTheme })}
                  className={
                    "flex items-center gap-3 rounded-lg border p-3 text-left transition-colors " +
                    (active ? "border-primary ring-1 ring-primary" : "border-border hover:bg-muted/50")
                  }
                >
                  <span className="flex shrink-0 gap-1">
                    {[theme.colors.bg, theme.colors.ink, theme.colors.accent].map((c) => (
                      <span
                        key={c}
                        className="h-6 w-3 rounded-sm border border-border"
                        style={{ backgroundColor: `#${c}` }}
                      />
                    ))}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{theme.label}</span>
                    <span className="block text-xs text-muted-foreground">{theme.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="details">
        <AccordionTrigger>Report details</AccordionTrigger>
        <AccordionContent className="space-y-4 pt-1">
          {field("title", "Title")}
          {field("subtitle", "Subtitle")}
          {field("periodOverride", "Reporting period", model.metrics.periodLabel || "Auto")}
          {field("preparedFor", "Prepared for")}
          {field("presenter", "Presenter name")}
          <div className="space-y-1.5">
            <Label htmlFor="passMark">Pass threshold (%)</Label>
            <Input
              id="passMark"
              type="number"
              min={0}
              max={100}
              value={config.passMark}
              onChange={(e) => onChange({ passMark: Number(e.target.value) || 0 })}
            />
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="sections">
        <AccordionTrigger>Pages</AccordionTrigger>
        <AccordionContent className="space-y-3 pt-1">
          {(Object.keys(SECTION_LABELS) as SectionKey[]).map((key) => (
            <div key={key} className="flex items-center justify-between gap-3">
              <Label htmlFor={`sec-${key}`} className="font-normal">
                {SECTION_LABELS[key]}
              </Label>
              <Switch
                id={`sec-${key}`}
                checked={config.sections[key] !== false}
                onCheckedChange={(checked) =>
                  onChange({ sections: { ...config.sections, [key]: checked } })
                }
              />
            </div>
          ))}
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="charts">
        <AccordionTrigger>Charts & headings</AccordionTrigger>
        <AccordionContent className="space-y-4 pt-1">
          {field("summaryStrap", "Executive summary strapline")}
          {field("enrolmentTitle", "Enrolment page heading")}
          <div className="space-y-1.5">
            <Label>Enrolment chart</Label>
            <Select
              value={config.enrolmentChart}
              onValueChange={(v) => onChange({ enrolmentChart: v as EnrolmentChartType })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="donut">Donut</SelectItem>
                <SelectItem value="pie">Pie</SelectItem>
                <SelectItem value="bar">Bar</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {field("assessmentTitle", "Assessment page heading")}
          <div className="space-y-1.5">
            <Label>Score distribution chart</Label>
            <Select
              value={config.distributionChart}
              onValueChange={(v) => onChange({ distributionChart: v as DistributionChartType })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bar">Bar</SelectItem>
                <SelectItem value="donut">Donut</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {field("closingTitle", "Closing heading")}
          {field("closingSubtitle", "Closing subtitle")}
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="wording">
        <AccordionTrigger>Wording</AccordionTrigger>
        <AccordionContent className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="narrative">Enrolment narrative</Label>
              {config.narrativeOverride != null ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => onChange({ narrativeOverride: null })}
                >
                  <RotateCcw className="mr-1 h-3 w-3" /> Auto
                </Button>
              ) : null}
            </div>
            <Textarea
              id="narrative"
              rows={3}
              value={config.narrativeOverride ?? model.narrative}
              onChange={(e) => onChange({ narrativeOverride: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Recommendations</Label>
              {config.recommendationsOverride != null ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => onChange({ recommendationsOverride: null })}
                >
                  <RotateCcw className="mr-1 h-3 w-3" /> Auto
                </Button>
              ) : null}
            </div>
            {model.recommendations.map((rec, i) => (
              <div key={rec.title} className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">{rec.title}</p>
                <Textarea
                  rows={3}
                  value={config.recommendationsOverride?.[i] ?? rec.body}
                  onChange={(e) => {
                    const base =
                      config.recommendationsOverride ?? model.recommendations.map((r) => r.body);
                    const next = [...base];
                    next[i] = e.target.value;
                    onChange({ recommendationsOverride: next });
                  }}
                />
              </div>
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
