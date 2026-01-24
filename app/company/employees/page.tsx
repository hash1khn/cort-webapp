"use client";

import { useState } from "react";
import { useCompanyStore } from "../store/CompanyStore";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
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

export default function EmployeesPage() {
  const { company, employees, updateEmployee, deactivateEmployee } = useCompanyStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPhone, setEditPhone] = useState<string>("");
  const [editEmail, setEditEmail] = useState<string>("");

  if (!company) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-muted">No company selected</div>
      </div>
    );
  }

  function startEdit(employee: typeof employees[0]) {
    setEditingId(employee.id);
    setEditPhone(employee.phone || "");
    setEditEmail(employee.email);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditPhone("");
    setEditEmail("");
  }

  async function saveEdit(employee: typeof employees[0]) {
    if (!editingId) return;
    await updateEmployee(employee.id, {
      phone: editPhone,
      email: editEmail,
    });
    cancelEdit();
  }

  async function handleDeactivate(employee: typeof employees[0]) {
    const isActive = employee.status.toLowerCase() === "active";
    if (confirm(`Are you sure you want to ${isActive ? "deactivate" : "activate"} ${employee.full_name}?`)) {
      await deactivateEmployee(employee.id, !isActive);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-muted">Employee Management</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-navy">Employees</h1>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-white p-6">
        <div className="mb-4 text-sm text-muted">
          <strong>Note:</strong> This is a read-only view of the roster uploaded by Cort. You can
          edit contact information and deactivate employees who leave the company. You cannot create
          routes or assign bulk users.
        </div>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="min-w-full text-sm">
            <thead className="bg-surface text-xs font-semibold tracking-wider text-muted">
              <tr>
                <th className="px-3 py-2 text-left">Employee ID</th>
                <th className="px-3 py-2 text-left">Full Name</th>
                <th className="px-3 py-2 text-left">Phone</th>
                <th className="px-3 py-2 text-left">Email</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-white">
              {employees.map((e) => {
                const isEditing = editingId === e.id;
                return (
                  <tr key={e.id}>
                    <td className="px-3 py-2 font-mono text-xs">{e.employee_id || "—"}</td>
                    <td className="px-3 py-2 font-medium">{e.full_name}</td>
                    <td className="px-3 py-2">
                      {isEditing ? (
                        <TextInput
                          value={editPhone}
                          onChange={(ev) => setEditPhone(ev.target.value)}
                          placeholder="Phone"
                        />
                      ) : (
                        <span className="text-muted">{e.phone || "—"}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {isEditing ? (
                        <TextInput
                          value={editEmail}
                          onChange={(ev) => setEditEmail(ev.target.value)}
                          placeholder="Email"
                        />
                      ) : (
                        <span className="text-muted">{e.email || "—"}</span>
                      )}
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
                      <div className="flex items-center justify-end gap-2">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={() => saveEdit(e)}
                              className="inline-flex h-8 items-center justify-center rounded-md bg-orange px-3 text-xs font-semibold text-white hover:opacity-95"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-white px-3 text-xs font-semibold text-ink hover:bg-surface"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => startEdit(e)}
                              className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-white px-3 text-xs font-semibold text-ink hover:bg-surface"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeactivate(e)}
                              className={cx(
                                "inline-flex h-8 items-center justify-center rounded-md border px-3 text-xs font-semibold",
                                e.status === "active"
                                  ? "border-danger/30 bg-white text-danger hover:bg-danger/5"
                                  : "border-border bg-white text-ink hover:bg-surface",
                              )}
                            >
                              {e.status === "active" ? "Deactivate" : "Activate"}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {employees.length === 0 ? (
                <tr>
                  <td className="px-3 py-8 text-center text-sm text-muted" colSpan={6}>
                    No employees found. Employees are uploaded by Cort Super Admin.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

