import { useSyncExternalStore } from "react";
import { newId } from "@/lib/csv";
import { defaultConfig, type Company, type SavedReport } from "@/types/report";

const KEY = "trb.state.v1";

interface AppState {
  companies: Company[];
  reports: SavedReport[];
  activeCompanyId: string | null;
}

const empty: AppState = { companies: [], reports: [], activeCompanyId: null };

let state: AppState = empty;
let loaded = false;
const listeners = new Set<() => void>();

function load(): AppState {
  if (typeof window === "undefined") return empty;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return {
      companies: parsed.companies ?? [],
      reports: parsed.reports ?? [],
      activeCompanyId: parsed.activeCompanyId ?? null,
    };
  } catch {
    return empty;
  }
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* quota exceeded — keep working in memory */
  }
}

function emit() {
  persist();
  listeners.forEach((l) => l());
}

function ensureLoaded() {
  if (!loaded && typeof window !== "undefined") {
    state = load();
    loaded = true;
  }
}

function subscribe(listener: () => void) {
  ensureLoaded();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): AppState {
  ensureLoaded();
  return state;
}

function getServerSnapshot(): AppState {
  return empty;
}

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

function set(next: AppState) {
  state = next;
  emit();
}

export const store = {
  get: getSnapshot,

  createCompany(input: Partial<Company> & { name: string }): Company {
    const company: Company = {
      id: newId("co"),
      name: input.name,
      logo: input.logo ?? null,
      address: input.address ?? "",
      contact: input.contact ?? "",
      createdAt: new Date().toISOString(),
    };
    set({
      ...getSnapshot(),
      companies: [...getSnapshot().companies, company],
      activeCompanyId: getSnapshot().activeCompanyId ?? company.id,
    });
    return company;
  },

  updateCompany(id: string, patch: Partial<Company>) {
    const s = getSnapshot();
    set({
      ...s,
      companies: s.companies.map((c) => (c.id === id ? { ...c, ...patch, id: c.id } : c)),
    });
  },

  deleteCompany(id: string) {
    const s = getSnapshot();
    set({
      ...s,
      companies: s.companies.filter((c) => c.id !== id),
      reports: s.reports.filter((r) => r.companyId !== id),
      activeCompanyId: s.activeCompanyId === id ? null : s.activeCompanyId,
    });
  },

  setActiveCompany(id: string | null) {
    set({ ...getSnapshot(), activeCompanyId: id });
  },

  createReport(companyId: string, name: string): SavedReport {
    const report: SavedReport = {
      id: newId("rep"),
      companyId,
      name,
      sourceFileName: "",
      records: [],
      mapping: {},
      config: defaultConfig(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const s = getSnapshot();
    set({ ...s, reports: [report, ...s.reports] });
    return report;
  },

  updateReport(id: string, patch: Partial<SavedReport>) {
    const s = getSnapshot();
    set({
      ...s,
      reports: s.reports.map((r) =>
        r.id === id ? { ...r, ...patch, id: r.id, updatedAt: new Date().toISOString() } : r,
      ),
    });
  },

  deleteReport(id: string) {
    const s = getSnapshot();
    set({ ...s, reports: s.reports.filter((r) => r.id !== id) });
  },
};

/** Company data is scoped by id — a report only ever reads its own company. */
export function reportsForCompany(s: AppState, companyId: string | null): SavedReport[] {
  if (!companyId) return [];
  return s.reports.filter((r) => r.companyId === companyId);
}
