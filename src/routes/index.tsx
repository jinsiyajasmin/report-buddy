import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Building2, FileText, Plus, Sparkles } from "lucide-react";
import { useState } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { NewReportDialog } from "@/components/NewReportDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { relativeDate } from "@/lib/format";
import { useAppState } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Reportly — Turn training CSVs into board-ready reports" },
      {
        name: "description",
        content:
          "Upload a training CSV, edit the data, and download a branded PowerPoint or PDF performance report in minutes.",
      },
      { property: "og:title", content: "Reportly — Turn training CSVs into board-ready reports" },
      {
        property: "og:description",
        content:
          "Upload, edit, review and download professional training performance reports for every company you manage.",
      },
    ],
  }),
  component: Dashboard,
});

const STEPS = [
  { title: "Select company", body: "Reports are tied to one company, with its own logo." },
  { title: "Upload CSV", body: "Columns are detected and validated automatically." },
  { title: "Review & edit", body: "Fix or change any record — charts update instantly." },
  { title: "Download", body: "Export a branded PowerPoint or PDF." },
];

function Dashboard() {
  const { reports, companies } = useAppState();
  const [open, setOpen] = useState(false);
  const recent = [...reports]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 6);

  return (
    <AppShell>
      <PageHeader
        title="Dashboard"
        description="Turn a training export into a presentation-ready report."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> New report
          </Button>
        }
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatCard label="Companies" value={companies.length} icon={Building2} />
        <StatCard label="Reports" value={reports.length} icon={FileText} />
        <StatCard
          label="Records analysed"
          value={reports.reduce((sum, r) => sum + r.records.length, 0)}
          icon={Sparkles}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section>
          <h2 className="mb-3 font-display text-xl font-semibold">Recent reports</h2>
          {recent.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-start gap-3 p-6">
                <p className="font-medium">Nothing here yet</p>
                <p className="text-sm text-muted-foreground">
                  {companies.length === 0
                    ? "Start by adding the company you report for."
                    : "Create your first report and upload a CSV."}
                </p>
                {companies.length === 0 ? (
                  <Button asChild variant="outline">
                    <Link to="/companies">
                      Add a company <ArrowRight className="ml-1.5 h-4 w-4" />
                    </Link>
                  </Button>
                ) : (
                  <Button onClick={() => setOpen(true)}>
                    <Plus className="mr-1.5 h-4 w-4" /> New report
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {recent.map((r) => {
                const company = companies.find((c) => c.id === r.companyId);
                return (
                  <Link
                    key={r.id}
                    to="/reports/$id"
                    params={{ id: r.id }}
                    className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md"
                  >
                    {company?.logo ? (
                      <img src={company.logo} alt="" className="h-8 w-16 object-contain" />
                    ) : (
                      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-secondary">
                        <FileText className="h-4 w-4 text-secondary-foreground" />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{r.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {company?.name ?? "Unknown"} · {r.records.length} records
                      </p>
                    </div>
                    <span className="text-sm whitespace-nowrap text-muted-foreground">
                      Updated {relativeDate(r.updatedAt)}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 font-display text-xl font-semibold">How it works</h2>
          <Card>
            <CardContent className="space-y-5 p-6">
              {STEPS.map((s, i) => (
                <div key={s.title} className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-medium">{s.title}</p>
                    <p className="text-sm text-muted-foreground">{s.body}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      </div>

      <NewReportDialog open={open} onOpenChange={setOpen} />
    </AppShell>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof Building2;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
          <Icon className="h-5 w-5 text-secondary-foreground" />
        </span>
        <div>
          <p className="font-display text-2xl font-bold">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
