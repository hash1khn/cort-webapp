"use client";

import { useMemo, useState } from "react";
import { makeNewCompany, makeNewEmployee, useAdminStore } from "../store/AdminStore";
import type { Company, Employee } from "../store/types";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-semibold tracking-wider text-muted">{label}</span>
      {children}
    </label>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cx(
        "h-10 rounded-md border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40",
        props.className,
      )}
    />
  );
}

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-border bg-surface p-3">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-ink">{label}</div>
        {description ? <div className="mt-0.5 text-xs text-muted">{description}</div> : null}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cx(
          "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border border-border transition-colors",
          checked ? "bg-success/20" : "bg-white",
        )}
        aria-pressed={checked}
      >
        <span
          className={cx(
            "inline-block h-6 w-6 rounded-full bg-white shadow-sm transition-transform",
            checked ? "translate-x-5" : "translate-x-0.5",
          )}
        />
      </button>
    </div>
  );
}

function parseCsv(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const header = lines[0]!.split(",").map((h) => h.trim().toLowerCase());
  const rows = lines.slice(1);

  function idx(name: string) {
    return header.indexOf(name);
  }

  const iName = idx("full name");
  const iPhone = idx("phone");
  const iEmail = idx("email");
  const iEmp = idx("employee_id");

  return rows.map((row) => {
    const cols = row.split(",").map((c) => c.trim());
    return {
      full_name: cols[iName] ?? "",
      phone: cols[iPhone] ?? "",
      email: cols[iEmail] ?? "",
      employee_id: cols[iEmp] ?? "",
    };
  });
}

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function CompanyListItem({
  company,
  active,
  onSelect,
}: {
  company: Company;
  active: boolean;
  onSelect: () => void;
}) {
  const badge = company.services_enabled.shuttle_enabled && company.services_enabled.chauffeur_enabled
    ? "Shuttle + Chauffeur"
    : company.services_enabled.shuttle_enabled
      ? "Shuttle"
      : company.services_enabled.chauffeur_enabled
        ? "Chauffeur"
        : "No services";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cx(
        "flex w-full flex-col gap-1 rounded-lg border px-3 py-3 text-left transition-colors",
        active ? "border-blue bg-blue/5" : "border-border bg-white hover:bg-surface",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="truncate text-sm font-semibold text-ink">{company.name || "Untitled Company"}</div>
        <div className="shrink-0 rounded-full bg-navy/10 px-2 py-0.5 text-[11px] font-semibold text-navy">
          {badge}
        </div>
      </div>
      <div className="truncate text-xs text-muted">{company.email || "—"}</div>
      <div className="text-[11px] text-muted">{company.employees.length} employees</div>
    </button>
  );
}

export default function CompaniesPage() {
  const { db, upsertCompany, deleteCompany, vehicleModels, upsertEmployee } = useAdminStore();
  const [selectedId, setSelectedId] = useState<string>(db.companies[0]?.id ?? "");
  const [csvPreview, setCsvPreview] = useState<Array<Partial<Employee>>>([]);

  const selected = useMemo(
    () => db.companies.find((c) => c.id === selectedId) ?? null,
    [db.companies, selectedId],
  );

  function saveCompany(next: Company) {
    upsertCompany(next);
    setSelectedId(next.id);
  }

  function addCompany() {
    const c = makeNewCompany();
    c.services_enabled = { shuttle_enabled: false, chauffeur_enabled: true };
    saveCompany(c);
  }

  function onUploadCsv(file: File, company: Company) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const parsed = parseCsv(text);
      const employees = parsed.map((row) => {
        const e = makeNewEmployee(row.full_name || "Employee");
        e.full_name = row.full_name || e.full_name;
        e.phone = row.phone || "";
        e.email = row.email || "";
        e.employee_id = row.employee_id || "";
        return e;
      });
      setCsvPreview(employees);

      // Auto-create accounts immediately (mock).
      const updated: Company = {
        ...company,
        employees: [...employees, ...company.employees],
      };
      saveCompany(updated);
    };
    reader.readAsText(file);
  }

  function exportCredentials(company: Company) {
    const lines = [
      `Company: ${company.name}`,
      `Generated: ${new Date().toLocaleString()}`,
      "",
      "employee_id,full_name,username,password,email,phone,route_id,stop_id,status",
      ...company.employees.map((e) =>
        [
          e.employee_id,
          e.full_name,
          e.username,
          e.password,
          e.email,
          e.phone,
          e.route_id ?? "",
          e.stop_id ?? "",
          e.status,
        ].join(","),
      ),
    ];
    downloadText(`cort-${company.name || "company"}-credentials.csv`, lines.join("\n"));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-muted">Company (Client) Management</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-navy">Companies</h1>
        </div>
        <button
          type="button"
          onClick={addCompany}
          className="inline-flex h-10 items-center justify-center rounded-md bg-orange px-4 text-sm font-semibold text-white hover:opacity-95"
        >
          Create Company
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <section className="flex flex-col gap-3">
          <div className="rounded-xl border border-border bg-white p-4">
            <div className="text-sm font-semibold text-navy">Company List</div>
            <div className="mt-3 flex flex-col gap-2">
              {db.companies.map((c) => (
                <CompanyListItem
                  key={c.id}
                  company={c}
                  active={c.id === selectedId}
                  onSelect={() => setSelectedId(c.id)}
                />
              ))}
              {db.companies.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border bg-surface p-4 text-sm text-muted">
                  No companies yet. Click “Create Company”.
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="min-w-0">
          {!selected ? (
            <div className="rounded-xl border border-border bg-white p-6 text-sm text-muted">
              Select a company to edit.
            </div>
          ) : (
            <div className="flex min-w-0 flex-col gap-6">
              <div className="rounded-xl border border-border bg-white p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold tracking-wider text-muted">
                      ONBOARDING
                    </div>
                    <div className="mt-1 text-lg font-semibold text-navy">
                      {selected.name || "Untitled Company"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => exportCredentials(selected)}
                      className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-white px-4 text-sm font-semibold text-ink hover:bg-surface"
                    >
                      Export Credentials
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm("Delete this company? (mock)")) {
                          deleteCompany(selected.id);
                          setSelectedId(db.companies[0]?.id ?? "");
                        }
                      }}
                      className="inline-flex h-10 items-center justify-center rounded-md border border-danger/30 bg-white px-4 text-sm font-semibold text-danger hover:bg-danger/5"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <Field label="Company Name">
                    <TextInput
                      value={selected.name}
                      onChange={(e) => saveCompany({ ...selected, name: e.target.value })}
                      placeholder="Company Name"
                    />
                  </Field>
                  <Field label="Company Email">
                    <TextInput
                      value={selected.email}
                      onChange={(e) => saveCompany({ ...selected, email: e.target.value })}
                      placeholder="company@example.com"
                    />
                  </Field>
                  <Field label="Address">
                    <TextInput
                      value={selected.address}
                      onChange={(e) => saveCompany({ ...selected, address: e.target.value })}
                      placeholder="Address"
                    />
                  </Field>
                  <Field label="NTN">
                    <TextInput
                      value={selected.ntn}
                      onChange={(e) => saveCompany({ ...selected, ntn: e.target.value })}
                      placeholder="NTN"
                    />
                  </Field>
                  <Field label="Contact Person">
                    <TextInput
                      value={selected.contact_person}
                      onChange={(e) => saveCompany({ ...selected, contact_person: e.target.value })}
                      placeholder="Contact Person"
                    />
                  </Field>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-white p-6">
                <div className="text-xs font-semibold tracking-wider text-muted">
                  SERVICE SUBSCRIPTION (TOGGLES)
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Toggle
                    checked={selected.services_enabled.shuttle_enabled}
                    onChange={(v) =>
                      saveCompany({
                        ...selected,
                        services_enabled: { ...selected.services_enabled, shuttle_enabled: v },
                      })
                    }
                    label="Enable Shuttle Service"
                    description="If off, shuttle features are hidden for this company in the client portal."
                  />
                  <Toggle
                    checked={selected.services_enabled.chauffeur_enabled}
                    onChange={(v) =>
                      saveCompany({
                        ...selected,
                        services_enabled: { ...selected.services_enabled, chauffeur_enabled: v },
                        allowed_vehicle_models: v ? selected.allowed_vehicle_models : [],
                      })
                    }
                    label="Enable Chauffeur Service"
                    description="Controls booking + chauffeur reports for this company."
                  />
                </div>
              </div>

              <div className="rounded-xl border border-border bg-white p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold tracking-wider text-muted">
                      VEHICLE WHITELISTING (CHAUFFEUR ONLY)
                    </div>
                    <div className="mt-1 text-sm text-muted">
                      Allowed models appear in the Company Admin booking dropdown.
                    </div>
                  </div>
                  {!selected.services_enabled.chauffeur_enabled ? (
                    <div className="rounded-full bg-danger/10 px-3 py-1 text-xs font-semibold text-danger">
                      Disabled (chauffeur is off)
                    </div>
                  ) : null}
                </div>

                <div
                  className={cx(
                    "mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3",
                    !selected.services_enabled.chauffeur_enabled && "opacity-50 pointer-events-none",
                  )}
                >
                  {vehicleModels.map((model) => {
                    const checked = selected.allowed_vehicle_models.includes(model);
                    return (
                      <button
                        key={model}
                        type="button"
                        onClick={() => {
                          const allowed = checked
                            ? selected.allowed_vehicle_models.filter((m) => m !== model)
                            : [...selected.allowed_vehicle_models, model].sort((a, b) =>
                                a.localeCompare(b),
                              );
                          saveCompany({ ...selected, allowed_vehicle_models: allowed });
                        }}
                        className={cx(
                          "flex items-center justify-between rounded-lg border px-3 py-2 text-sm font-medium",
                          checked ? "border-purple bg-purple/5 text-purple" : "border-border bg-white text-ink",
                        )}
                      >
                        <span>{model}</span>
                        <span className={cx("text-xs", checked ? "text-purple" : "text-muted")}>
                          {checked ? "Allowed" : "—"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-white p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold tracking-wider text-muted">
                      MANAGE EMPLOYEES (BULK ROSTER)
                    </div>
                    <div className="mt-1 text-sm text-muted">
                      Upload CSV: Full Name, Phone, Email, Employee_ID
                    </div>
                  </div>
                  <label className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md bg-orange px-4 text-sm font-semibold text-white hover:opacity-95">
                    Upload CSV
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) onUploadCsv(file, selected);
                        e.currentTarget.value = "";
                      }}
                    />
                  </label>
                </div>

                {csvPreview.length ? (
                  <div className="mt-4 rounded-lg border border-border bg-surface p-3">
                    <div className="text-xs font-semibold tracking-wider text-muted">
                      LAST IMPORT (PREVIEW)
                    </div>
                    <div className="mt-2 text-xs text-muted">
                      Created {csvPreview.length} accounts (mock). Use “Export Credentials” to download.
                    </div>
                  </div>
                ) : null}

                <div className="mt-4 overflow-x-auto rounded-lg border border-border">
                  <table className="min-w-full text-sm">
                    <thead className="bg-surface text-xs font-semibold tracking-wider text-muted">
                      <tr>
                        <th className="px-3 py-2 text-left">Employee_ID</th>
                        <th className="px-3 py-2 text-left">Name</th>
                        <th className="px-3 py-2 text-left">Phone</th>
                        <th className="px-3 py-2 text-left">Email</th>
                        <th className="px-3 py-2 text-left">Route / Stop</th>
                        <th className="px-3 py-2 text-left">Status</th>
                        <th className="px-3 py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-white">
                      {selected.employees.map((e) => (
                        <tr key={e.id}>
                          <td className="px-3 py-2 font-mono text-xs">{e.employee_id || "—"}</td>
                          <td className="px-3 py-2">{e.full_name}</td>
                          <td className="px-3 py-2 text-muted">{e.phone || "—"}</td>
                          <td className="px-3 py-2 text-muted">{e.email || "—"}</td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap gap-2">
                              <select
                                value={e.route_id ?? ""}
                                onChange={(ev) => {
                                  const routeId = ev.target.value || undefined;
                                  const updated: Employee = { ...e, route_id: routeId, stop_id: undefined };
                                  upsertEmployee(selected.id, updated);
                                }}
                                className="h-8 rounded-md border border-border bg-white px-2 text-xs outline-none focus:ring-2 focus:ring-blue/40"
                              >
                                <option value="">Unassigned</option>
                                {db.shuttle_routes
                                  .filter((r) => r.company_id === selected.id)
                                  .map((r) => (
                                    <option key={r.id} value={r.id}>
                                      {r.name}
                                    </option>
                                  ))}
                              </select>

                              <select
                                value={e.stop_id ?? ""}
                                onChange={(ev) => {
                                  const stopId = ev.target.value || undefined;
                                  const updated: Employee = { ...e, stop_id: stopId };
                                  upsertEmployee(selected.id, updated);
                                }}
                                disabled={!e.route_id}
                                className="h-8 rounded-md border border-border bg-white px-2 text-xs outline-none focus:ring-2 focus:ring-blue/40 disabled:opacity-50"
                              >
                                <option value="">Stop</option>
                                {(() => {
                                  const route = db.shuttle_routes.find((r) => r.id === e.route_id);
                                  return (route?.stops ?? []).map((s) => (
                                    <option key={s.id} value={s.id}>
                                      {s.name}
                                    </option>
                                  ));
                                })()}
                              </select>
                            </div>
                            <div className="mt-1 text-[11px] text-muted">
                              Cort Ops assigns routes/stops; CSV import does not set them.
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={cx(
                                "rounded-full px-2 py-0.5 text-xs font-semibold",
                                e.status === "active"
                                  ? "bg-success/10 text-success"
                                  : "bg-danger/10 text-danger",
                              )}
                            >
                              {e.status}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                const updated: Employee = {
                                  ...e,
                                  status: e.status === "active" ? "inactive" : "active",
                                };
                                upsertEmployee(selected.id, updated);
                              }}
                              className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-white px-3 text-xs font-semibold text-ink hover:bg-surface"
                            >
                              {e.status === "active" ? "Deactivate" : "Activate"}
                            </button>
                          </td>
                        </tr>
                      ))}
                      {selected.employees.length === 0 ? (
                        <tr>
                          <td className="px-3 py-8 text-center text-sm text-muted" colSpan={7}>
                            No employees yet. Upload a CSV to bulk create users.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}


