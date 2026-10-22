import { ArrowDownUp, Copy, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { emptyRecord, newId, parseScore, sanitiseCell } from "@/lib/csv";
import { cn } from "@/lib/utils";
import type { RowIssue, TrainingRecord } from "@/types/report";

type ColKey = keyof Omit<TrainingRecord, "id">;

const COLUMNS: { key: ColKey; label: string; width: string; type: "text" | "number" | "date" }[] = [
  { key: "course", label: "Course", width: "min-w-56", type: "text" },
  { key: "participant", label: "Participant", width: "min-w-44", type: "text" },
  { key: "status", label: "Status", width: "min-w-32", type: "text" },
  { key: "score", label: "Score", width: "w-24", type: "number" },
  { key: "dateEnrolled", label: "Enrolled", width: "w-40", type: "date" },
  { key: "dateCompleted", label: "Completed", width: "w-40", type: "date" },
  { key: "department", label: "Department", width: "min-w-52", type: "text" },
  { key: "email", label: "Email", width: "min-w-52", type: "text" },
];

export function DataEditor({
  records,
  issues,
  onChange,
}: {
  records: TrainingRecord[];
  issues: RowIssue[];
  onChange: (records: TrainingRecord[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [sort, setSort] = useState<{ key: ColKey; dir: "asc" | "desc" } | null>(null);

  const courses = useMemo(
    () => [...new Set(records.map((r) => r.course).filter(Boolean))].sort(),
    [records],
  );

  const issueMap = useMemo(() => {
    const map = new Map<string, RowIssue[]>();
    for (const i of issues) {
      const list = map.get(i.rowId);
      if (list) list.push(i);
      else map.set(i.rowId, [i]);
    }
    return map;
  }, [issues]);

  const view = useMemo(() => {
    let rows = records;
    if (courseFilter !== "all") rows = rows.filter((r) => r.course === courseFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      rows = rows.filter((r) =>
        [r.course, r.participant, r.status, r.department, r.email, String(r.score ?? "")]
          .join(" ")
          .toLowerCase()
          .includes(q),
      );
    }
    if (sort) {
      rows = [...rows].sort((a, b) => {
        const av = a[sort.key];
        const bv = b[sort.key];
        if (av == null) return 1;
        if (bv == null) return -1;
        const cmp =
          typeof av === "number" && typeof bv === "number"
            ? av - bv
            : String(av).localeCompare(String(bv));
        return sort.dir === "asc" ? cmp : -cmp;
      });
    }
    return rows;
  }, [records, courseFilter, query, sort]);

  const patch = (id: string, key: ColKey, raw: string) => {
    onChange(
      records.map((r) => {
        if (r.id !== id) return r;
        if (key === "score") return { ...r, score: parseScore(raw) };
        if (key === "dateEnrolled" || key === "dateCompleted") {
          return { ...r, [key]: raw || null };
        }
        return { ...r, [key]: sanitiseCell(raw) };
      }),
    );
  };

  const toggleSort = (key: ColKey) =>
    setSort((s) =>
      s?.key === key ? (s.dir === "asc" ? { key, dir: "desc" } : null) : { key, dir: "asc" },
    );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search records…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-xs"
        />
        <Select value={courseFilter} onValueChange={setCourseFilter}>
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All courses</SelectItem>
            {courses.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {view.length} of {records.length} rows
        </span>
        <Button
          size="sm"
          variant="outline"
          className="ml-auto"
          onClick={() => onChange([...records, emptyRecord()])}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Add row
        </Button>
      </div>

      <div className="max-h-[540px] overflow-auto rounded-lg border border-border bg-card">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-secondary">
            <tr>
              {COLUMNS.map((c) => (
                <th
                  key={c.key}
                  className={cn(
                    "border-b border-border px-3 py-2 text-left font-medium whitespace-nowrap",
                    c.width,
                  )}
                >
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 hover:text-primary"
                    onClick={() => toggleSort(c.key)}
                  >
                    {c.label}
                    <ArrowDownUp
                      className={cn(
                        "h-3 w-3",
                        sort?.key === c.key ? "text-primary" : "text-muted-foreground/50",
                      )}
                    />
                  </button>
                </th>
              ))}
              <th className="border-b border-border px-3 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {view.map((r) => {
              const rowIssues = issueMap.get(r.id) ?? [];
              const hasError = rowIssues.some((i) => i.severity === "error");
              return (
                <tr
                  key={r.id}
                  className={cn(
                    "border-b border-border/60 last:border-0",
                    hasError && "bg-destructive/5",
                  )}
                >
                  {COLUMNS.map((c) => {
                    const fieldIssue = rowIssues.find((i) => i.field === c.key);
                    const value =
                      c.key === "score"
                        ? r.score == null
                          ? ""
                          : String(r.score)
                        : ((r[c.key] as string | null) ?? "");
                    return (
                      <td key={c.key} className="px-1 py-1">
                        <Input
                          type={c.type === "number" ? "number" : c.type === "date" ? "date" : "text"}
                          value={value}
                          title={fieldIssue?.message}
                          onChange={(e) => patch(r.id, c.key, e.target.value)}
                          className={cn(
                            "h-8 border-transparent bg-transparent px-2 shadow-none focus-visible:border-ring focus-visible:bg-background",
                            fieldIssue?.severity === "error" && "border-destructive/60",
                            fieldIssue?.severity === "warning" && "border-warning/60",
                          )}
                        />
                      </td>
                    );
                  })}
                  <td className="px-2 py-1 text-right whitespace-nowrap">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      title="Duplicate row"
                      onClick={() => {
                        const idx = records.findIndex((x) => x.id === r.id);
                        const copy = { ...r, id: newId() };
                        const next = [...records];
                        next.splice(idx + 1, 0, copy);
                        onChange(next);
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground"
                      title="Delete row"
                      onClick={() => onChange(records.filter((x) => x.id !== r.id))}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              );
            })}
            {view.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length + 1} className="px-4 py-10 text-center text-muted-foreground">
                  No rows match your search.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {issues.length > 0 ? (
        <div className="space-y-1.5 rounded-lg border border-border bg-card p-4">
          <p className="text-sm font-medium">
            {issues.filter((i) => i.severity === "error").length} errors ·{" "}
            {issues.filter((i) => i.severity === "warning").length} warnings
          </p>
          <div className="flex flex-wrap gap-1.5">
            {[...new Set(issues.map((i) => i.message))].slice(0, 8).map((msg) => (
              <Badge key={msg} variant="secondary" className="font-normal">
                {msg} ({issues.filter((i) => i.message === msg).length})
              </Badge>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
