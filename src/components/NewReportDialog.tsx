import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { store, useAppState } from "@/lib/store";

export function NewReportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { companies } = useAppState();
  const navigate = useNavigate();
  const [companyId, setCompanyId] = useState("");
  const [name, setName] = useState("Training Performance Report");

  useEffect(() => {
    if (open && !companyId && companies[0]) setCompanyId(companies[0].id);
  }, [open, companyId, companies]);

  const create = () => {
    if (!companyId) {
      toast.error("Select a company first");
      return;
    }
    const report = store.createReport(companyId, name.trim() || "Untitled report");
    onOpenChange(false);
    void navigate({ to: "/reports/$id", params: { id: report.id } });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a new report</DialogTitle>
          <DialogDescription>
            Pick the company this report belongs to, then upload its CSV.
          </DialogDescription>
        </DialogHeader>
        {companies.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Add a company first — reports are always attached to one company so data never mixes.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Company</Label>
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a company" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rep-name">Report name</Label>
              <Input id="rep-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={create} disabled={companies.length === 0}>
            Create report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
