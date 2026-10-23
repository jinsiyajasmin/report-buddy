import { AlertTriangle, CheckCircle2, FileSpreadsheet, UploadCloud } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  autoDetectMapping,
  buildRecords,
  missingRequiredFields,
  parseCsvFile,
  validateRecords,
  type ParsedCsv,
} from "@/lib/csv";
import { computeMetrics } from "@/calculations/metrics";
import { cn } from "@/lib/utils";
import {
  CANONICAL_FIELDS,
  FIELD_LABELS,
  REQUIRED_FIELDS,
  type ColumnMapping,
  type TrainingRecord,
} from "@/types/report";

const NONE = "__none__";

export function UploadStep({
  onApply,
}: {
  onApply: (records: TrainingRecord[], mapping: ColumnMapping, fileName: string) => void;
}) {
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!/\.csv$/i.test(file.name) && file.type !== "text/csv") {
      toast.error("Please upload a .csv file");
      return;
    }
    setBusy(true);
    try {
      const result = await parseCsvFile(file);
      if (result.rows.length === 0) {
        toast.error("That CSV has no data rows.");
        setParsed(null);
        return;
      }
      setParsed(result);
      setMapping(autoDetectMapping(result.headers));
      toast.success(`${result.rows.length} rows read from ${result.fileName}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read that file");
    } finally {
      setBusy(false);
    }
  };

  const missing = missingRequiredFields(mapping);
  const preview = parsed ? buildRecords(parsed, mapping) : [];
  const issues = validateRecords(preview);
  const metrics = computeMetrics(preview);
  const errorCount = issues.filter((i) => i.severity === "error").length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create a new report</CardTitle>
          <CardDescription>Upload the training export as a CSV file to begin.</CardDescription>
        </CardHeader>
        <CardContent>
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              void handleFile(e.dataTransfer.files?.[0]);
            }}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/40 px-6 py-14 text-center transition-colors",
              dragging && "border-primary bg-primary/5",
            )}
          >
            <UploadCloud className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="font-medium">
                {busy ? "Reading file…" : "Drag a CSV here, or click to browse"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">Maximum 8 MB</p>
            </div>
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                void handleFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
        </CardContent>
      </Card>

      {parsed ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Match your columns</CardTitle>
              <CardDescription>
                We matched these automatically — change any that look wrong.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {CANONICAL_FIELDS.map((field) => (
                <div key={field} className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    {FIELD_LABELS[field]}
                    {REQUIRED_FIELDS.includes(field) ? (
                      <span className="text-xs text-accent">required</span>
                    ) : null}
                  </Label>
                  <Select
                    value={mapping[field] ?? NONE}
                    onValueChange={(v) =>
                      setMapping((m) => ({ ...m, [field]: v === NONE ? null : v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Not used" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Not used</SelectItem>
                      {parsed.headers.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>What we found</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-1.5 text-sm">
                <Line ok>{parsed.rows.length} records imported</Line>
                <Line ok>{metrics.completed} completed</Line>
                <Line ok>{metrics.notCompleted} not completed</Line>
                <Line ok>{parsed.headers.length} columns detected</Line>
                <Line ok={metrics.courseCount > 0}>
                  {metrics.courseCount} training {metrics.courseCount === 1 ? "course" : "courses"}{" "}
                  detected
                </Line>
                <Line ok={!!metrics.periodLabel}>
                  {metrics.periodLabel ? `${metrics.periodLabel} detected` : "No dates detected"}
                </Line>
                <Line ok={metrics.assessed > 0}>
                  {metrics.assessed} scored {metrics.assessed === 1 ? "assessment" : "assessments"}
                </Line>
                {missing.length > 0 ? (
                  <Line ok={false}>
                    Missing required {missing.length === 1 ? "field" : "fields"}:{" "}
                    {missing.map((f) => FIELD_LABELS[f]).join(", ")}
                  </Line>
                ) : null}
                {errorCount > 0 ? (
                  <Line ok={false}>
                    {errorCount} {errorCount === 1 ? "row needs" : "rows need"} attention — you can
                    fix them in the next step
                  </Line>
                ) : null}
              </ul>

              <div className="max-h-64 overflow-auto rounded-lg border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-secondary">
                    <tr>
                      {parsed.headers.slice(0, 8).map((h) => (
                        <th key={h} className="px-3 py-2 font-medium whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.rows.slice(0, 8).map((row, i) => (
                      <tr key={i} className="border-t border-border/60">
                        {parsed.headers.slice(0, 8).map((h) => (
                          <td
                            key={h}
                            className="max-w-48 truncate px-3 py-1.5 text-muted-foreground"
                          >
                            {row[h]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  disabled={missing.length > 0}
                  onClick={() => onApply(preview, mapping, parsed.fileName)}
                >
                  <FileSpreadsheet className="mr-1.5 h-4 w-4" /> Use this data
                </Button>
                {missing.length > 0 ? (
                  <span className="text-sm text-muted-foreground">
                    Map the required fields to continue.
                  </span>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}

function Line({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      {ok ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
      ) : (
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
      )}
      <span className={ok ? "" : "text-muted-foreground"}>{children}</span>
    </li>
  );
}
