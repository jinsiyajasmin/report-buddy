import { createFileRoute } from "@tanstack/react-router";
import { Building2, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/AppShell";
import { LogoUpload } from "@/components/LogoUpload";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { store, useAppState } from "@/lib/store";
import type { Company } from "@/types/report";

export const Route = createFileRoute("/companies")({
  head: () => ({
    meta: [
      { title: "Companies — Reportly Training Reports" },
      {
        name: "description",
        content:
          "Manage the companies you report for: names, logos and contact details, each kept separate.",
      },
      { property: "og:title", content: "Companies — Reportly Training Reports" },
      {
        property: "og:description",
        content: "Manage company branding and keep every client's training data isolated.",
      },
    ],
  }),
  component: CompaniesPage,
});

interface Draft {
  id: string | null;
  name: string;
  logo: string | null;
  address: string;
  contact: string;
}

const blank: Draft = { id: null, name: "", logo: null, address: "", contact: "" };

function CompaniesPage() {
  const { companies, reports } = useAppState();
  const [draft, setDraft] = useState<Draft | null>(null);

  const save = () => {
    if (!draft) return;
    if (!draft.name.trim()) {
      toast.error("Company name is required");
      return;
    }
    if (draft.id) {
      store.updateCompany(draft.id, {
        name: draft.name.trim(),
        logo: draft.logo,
        address: draft.address,
        contact: draft.contact,
      });
      toast.success("Company updated");
    } else {
      store.createCompany({
        name: draft.name.trim(),
        logo: draft.logo,
        address: draft.address,
        contact: draft.contact,
      });
      toast.success("Company created");
    }
    setDraft(null);
  };

  const edit = (c: Company) =>
    setDraft({ id: c.id, name: c.name, logo: c.logo, address: c.address, contact: c.contact });

  return (
    <AppShell>
      <PageHeader
        title="Companies"
        description="Each company keeps its own logo, details and reports."
        action={
          <Button onClick={() => setDraft(blank)}>
            <Plus className="mr-1.5 h-4 w-4" /> New company
          </Button>
        }
      />

      {companies.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Building2 className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium">No companies yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Add your first company to start building reports with its own branding.
            </p>
            <Button className="mt-2" onClick={() => setDraft(blank)}>
              <Plus className="mr-1.5 h-4 w-4" /> New company
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {companies.map((c) => {
            const count = reports.filter((r) => r.companyId === c.id).length;
            return (
              <Card key={c.id}>
                <CardContent className="space-y-4 p-5">
                  <div className="flex h-16 items-center">
                    {c.logo ? (
                      <img src={c.logo} alt={`${c.name} logo`} className="max-h-14 max-w-40 object-contain" />
                    ) : (
                      <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                        <Building2 className="h-5 w-5" />
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold">{c.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {count} {count === 1 ? "report" : "reports"}
                      {c.address ? ` · ${c.address}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => edit(c)}>
                      <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground"
                      onClick={() => {
                        if (
                          window.confirm(
                            `Delete ${c.name} and its ${count} ${count === 1 ? "report" : "reports"}?`,
                          )
                        ) {
                          store.deleteCompany(c.id);
                          toast.success("Company deleted");
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

      <Dialog open={draft !== null} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Edit company" : "New company"}</DialogTitle>
          </DialogHeader>
          {draft ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="co-name">Company name</Label>
                <Input
                  id="co-name"
                  value={draft.name}
                  placeholder="Peerless Lifts"
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </div>
              <LogoUpload value={draft.logo} onChange={(logo) => setDraft({ ...draft, logo })} />
              <div className="space-y-1.5">
                <Label htmlFor="co-address">Address (optional)</Label>
                <Textarea
                  id="co-address"
                  rows={2}
                  value={draft.address}
                  onChange={(e) => setDraft({ ...draft, address: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="co-contact">Contact (optional)</Label>
                <Input
                  id="co-contact"
                  value={draft.contact}
                  placeholder="name@company.co.uk"
                  onChange={(e) => setDraft({ ...draft, contact: e.target.value })}
                />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button onClick={save}>Save company</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
