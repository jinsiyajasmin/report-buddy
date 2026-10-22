import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { store, useAppState } from "@/lib/store";
import { defaultConfig } from "@/types/report";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Reportly Training Reports" },
      {
        name: "description",
        content: "Set report defaults such as the pass threshold, and manage stored data.",
      },
      { property: "og:title", content: "Settings — Reportly Training Reports" },
      {
        property: "og:description",
        content: "Set the default pass mark and manage locally stored companies and reports.",
      },
    ],
  }),
  component: SettingsPage,
});

const PASS_KEY = "trb.defaultPassMark";

function SettingsPage() {
  const { companies, reports } = useAppState();
  const [passMark, setPassMark] = useState(() => {
    if (typeof window === "undefined") return String(defaultConfig().passMark);
    return window.localStorage.getItem(PASS_KEY) ?? String(defaultConfig().passMark);
  });

  return (
    <AppShell>
      <PageHeader title="Settings" description="Defaults applied to new reports." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Default pass threshold</CardTitle>
            <CardDescription>
              Scores at or above this value count as a pass in every new report.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-end gap-3">
            <div className="w-32 space-y-1.5">
              <Label htmlFor="pass">Pass mark (%)</Label>
              <Input
                id="pass"
                type="number"
                min={0}
                max={100}
                value={passMark}
                onChange={(e) => setPassMark(e.target.value)}
              />
            </div>
            <Button
              onClick={() => {
                const n = Number(passMark);
                if (!Number.isFinite(n) || n < 0 || n > 100) {
                  toast.error("Pass mark must be between 0 and 100");
                  return;
                }
                window.localStorage.setItem(PASS_KEY, String(n));
                toast.success("Default pass mark saved");
              }}
            >
              Save
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stored data</CardTitle>
            <CardDescription>
              Companies and reports are stored in this browser only — nothing is uploaded.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {companies.length} {companies.length === 1 ? "company" : "companies"} ·{" "}
              {reports.length} {reports.length === 1 ? "report" : "reports"}
            </p>
            <Button
              variant="outline"
              onClick={() => {
                if (window.confirm("Delete all companies and reports from this browser?")) {
                  store.get().companies.forEach((c) => store.deleteCompany(c.id));
                  store.get().reports.forEach((r) => store.deleteReport(r.id));
                  toast.success("All data cleared");
                }
              }}
            >
              Clear all data
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

export function readDefaultPassMark(): number {
  if (typeof window === "undefined") return defaultConfig().passMark;
  const raw = window.localStorage.getItem(PASS_KEY);
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : defaultConfig().passMark;
}
