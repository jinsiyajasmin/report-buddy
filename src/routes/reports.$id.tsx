import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Building2,
  Download,
  FileDown,
  Redo2,
  Table2,
  Undo2,
  UploadCloud,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { LogoUpload } from "@/components/LogoUpload";
import { DataEditor } from "@/components/report/DataEditor";
import { ReportDeck } from "@/components/report/ReportDeck";
import { ReportSettingsPanel } from "@/components/report/ReportSettingsPanel";
import { UploadStep } from "@/components/report/UploadStep";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { validateRecords } from "@/lib/csv";
import { store, useAppState } from "@/lib/store";
import { exportPdf } from "@/export/pdf";
import { exportPptx } from "@/export/pptx";
import { buildReportModel } from "@/reports/model";
import { defaultConfig, type ColumnMapping, type ReportConfig, type TrainingRecord } from "@/types/report";

export const Route = createFileRoute("/reports/$id")({
  head: () => ({
    meta: [
      { title: "Report workspace — Reportly" },
      {
        name: "description",
        content:
          "Upload data, edit records and watch the training performance report update live before exporting.",
      },
      { property: "og:title", content: "Report workspace — Reportly" },
      {
        property: "og:description",
        content: "Edit training data and export a branded PowerPoint or PDF report.",
      },
    ],
  }),
  component: ReportWorkspace,
});

function ReportWorkspace() {
  const { id } = Route.useParams();
  const state = useAppState();
  const report = state.reports.find((r) => r.id === id);
  const company = report ? (state.companies.find((c) => c.id === report.companyId) ?? null) : null;

  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [config, setConfig] = useState<ReportConfig>(defaultConfig());
  const [tab, setTab] = useState("upload");
  const [hydrated, setHydrated] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const history = useRef<{ past: TrainingRecord[][]; future: TrainingRecord[][] }>({
    past: [],
    future: [],
  });

  useEffect(() => {
    if (report && !hydrated) {
      setRecords(report.records);
      setConfig(report.config);
      setTab(report.records.length > 0 ? "report" : "upload");
      setHydrated(true);
    }
  }, [report, hydrated]);

  // Persist edits back to the saved report (debounced).
  useEffect(() => {
    if (!hydrated || !report) return;
    const t = window.setTimeout(() => {
      store.updateReport(report.id, { records, config });
    }, 400);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records, config, hydrated]);

  const commit = useCallback((next: TrainingRecord[]) => {
    setRecords((prev) => {
      history.current.past = [...history.current.past.slice(-49), prev];
      history.current.future = [];
      return next;
    });
  }, []);

  const undo = () => {
    const prev = history.current.past.pop();
    if (!prev) return;
    setRecords((current) => {
      history.current.future = [current, ...history.current.future.slice(0, 49)];
      return prev;
    });
  };

  const redo = () => {
    const [next, ...rest] = history.current.future;
    if (!next) return;
    history.current.future = rest;
    setRecords((current) => {
      history.current.past = [...history.current.past, current];
      return next;
    });
  };

  const issues = useMemo(() => validateRecords(records), [records]);
  const model = useMemo(
    () => buildReportModel(records, config, company),
    [records, config, company],
  );

  const applyUpload = (
    next: TrainingRecord[],
    mapping: ColumnMapping,
    fileName: string,
  ) => {
    commit(next);
    if (report) store.updateReport(report.id, { mapping, sourceFileName: fileName });
    setTab("data");
    toast.success(`${next.length} records ready to review`);
  };

  const downloadPptx = async () => {
    try {
      await exportPptx(model, `${report?.name ?? "training-report"}.pptx`);
      toast.success("PowerPoint downloaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    }
  };

  if (!report) {
    return (
      <AppShell>
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="font-medium">Report not found</p>
            <Button asChild variant="outline">
              <Link to="/reports">Back to reports</Link>
            </Button>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  const hasData = records.length > 0;

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="min-w-0">
          <Link to="/reports" className="text-sm text-muted-foreground hover:underline">
            ← All reports
          </Link>
          <div className="mt-1 flex items-center gap-3">
            <Input
              value={report.name}
              onChange={(e) => store.updateReport(report.id, { name: e.target.value })}
              className="h-auto max-w-md border-0 bg-transparent px-0 font-display text-2xl font-bold shadow-none focus-visible:ring-0"
            />
          </div>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Building2 className="h-3.5 w-3.5" />
            {company?.name ?? "No company"}
            {model.period ? ` · ${model.period}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => exportPdf(report.name)} disabled={!hasData}>
            <FileDown className="mr-1.5 h-4 w-4" /> Download PDF
          </Button>
          <Button onClick={() => void downloadPptx()} disabled={!hasData}>
            <Download className="mr-1.5 h-4 w-4" /> Download PowerPoint
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="print:hidden">
        <TabsList className="mb-6">
          <TabsTrigger value="upload">
            <UploadCloud className="mr-1.5 h-4 w-4" /> 1 · Upload
          </TabsTrigger>
          <TabsTrigger value="data" disabled={!hasData}>
            <Table2 className="mr-1.5 h-4 w-4" /> 2 · Edit data
          </TabsTrigger>
          <TabsTrigger value="report" disabled={!hasData}>
            <FileDown className="mr-1.5 h-4 w-4" /> 3 · Report
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload">
          <UploadStep onApply={applyUpload} />
        </TabsContent>

        <TabsContent value="data" className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={undo} disabled={history.current.past.length === 0}>
              <Undo2 className="mr-1.5 h-3.5 w-3.5" /> Undo
            </Button>
            <Button variant="outline" size="sm" onClick={redo} disabled={history.current.future.length === 0}>
              <Redo2 className="mr-1.5 h-3.5 w-3.5" /> Redo
            </Button>
            <span className="text-sm text-muted-foreground">
              Every edit recalculates the report instantly.
            </span>
            <Button size="sm" className="ml-auto" onClick={() => setTab("report")}>
              Review report →
            </Button>
          </div>
          <DataEditor records={records} issues={issues} onChange={commit} />
        </TabsContent>

        <TabsContent value="report">
          <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
            <div className="space-y-6">
              {company ? (
                <Card>
                  <CardContent className="p-5">
                    <LogoUpload
                      value={company.logo}
                      label={`${company.name} logo`}
                      onChange={(logo) => store.updateCompany(company.id, { logo })}
                    />
                  </CardContent>
                </Card>
              ) : null}
              <Card>
                <CardContent className="p-5">
                  <ReportSettingsPanel
                    config={config}
                    model={model}
                    onChange={(patch) => setConfig((c) => ({ ...c, ...patch }))}
                  />
                </CardContent>
              </Card>
            </div>
            <div>
              <ReportDeck model={model} />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Hidden print copy — the browser renders this for "Download PDF",
          so the PDF is identical to the preview above. */}
      {hasData && mounted
        ? createPortal(
            <div id="print-host" className="pointer-events-none fixed top-0 -left-[400vw] w-[297mm]">
              <ReportDeck model={model} printable />
            </div>,
            document.body,
          )
        : null}
    </AppShell>
  );
}
