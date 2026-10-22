import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/AppShell";
import { NewReportDialog } from "@/components/NewReportDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { store, useAppState } from "@/lib/store";
import { relativeDate } from "@/lib/format";

export const Route = createFileRoute("/reports/")({
  head: () => ({
    meta: [
      { title: "Reports — Reportly Training Reports" },
      {
        name: "description",
        content: "Every saved training performance report, grouped by company and ready to reopen.",
      },
      { property: "og:title", content: "Reports — Reportly Training Reports" },
      {
        property: "og:description",
        content: "Browse, reopen and export saved training performance reports.",
      },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const { reports, companies } = useAppState();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");

  const visible = reports.filter((r) => {
    if (filter !== "all" && r.companyId !== filter) return false;
    if (!query.trim()) return true;
    const company = companies.find((c) => c.id === r.companyId)?.name ?? "";
    return `${r.name} ${company}`.toLowerCase().includes(query.toLowerCase());
  });

  return (
    <AppShell>
      <PageHeader
        title="Reports"
        description="Saved reports keep their data, settings and branding."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> New report
          </Button>
        }
      />

      <div className="mb-5 flex flex-wrap gap-3">
        <Input
          placeholder="Search reports…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-xs"
        />
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All companies</SelectItem>
            {companies.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {visible.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <FileText className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium">No reports yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Create a report, upload a CSV and a full presentation is generated for you.
            </p>
            <Button className="mt-2" onClick={() => setOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> New report
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((r) => {
            const company = companies.find((c) => c.id === r.companyId);
            return (
              <Card key={r.id} className="transition-shadow hover:shadow-md">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        {company?.name ?? "Unknown company"}
                      </p>
                      <Link
                        to="/reports/$id"
                        params={{ id: r.id }}
                        className="mt-1 block truncate font-display text-lg font-semibold hover:underline"
                      >
                        {r.name}
                      </Link>
                    </div>
                    {company?.logo ? (
                      <img
                        src={company.logo}
                        alt=""
                        className="max-h-8 max-w-20 shrink-0 object-contain"
                      />
                    ) : null}
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {r.records.length} records · updated {relativeDate(r.updatedAt)}
                  </p>
                  <div className="mt-4 flex gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link to="/reports/$id" params={{ id: r.id }}>
                        Open
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground"
                      onClick={() => {
                        if (window.confirm(`Delete "${r.name}"?`)) {
                          store.deleteReport(r.id);
                          toast.success("Report deleted");
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <NewReportDialog open={open} onOpenChange={setOpen} />
    </AppShell>
  );
}
