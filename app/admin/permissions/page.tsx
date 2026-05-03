"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/contexts/auth-context";
import { PermissionsApi, InternalStaffMember, CreateInternalStaffRequest } from "../../lib/services/api-client";
import {
  PERMISSION_KEYS,
  PermissionKey,
  CrudAction,
  SectionCrudPermissions,
  StaffPermissions,
} from "../../lib/types/auth-types";
import {
  emptyStaffPermissions,
  fullStaffPermissions,
  normalizeStaffPermissions,
  sectionHasAnyCrud,
} from "../../lib/utils/staff-permissions";

const PERMISSION_LABELS: Record<PermissionKey, string> = {
  dashboard: "Dashboard",
  companies: "Companies",
  pricing: "Contracts & Pricing",
  vehicles: "Vehicles",
  fuel_records: "Fuel Records",
  maintenance: "Maintenance",
  vendors: "Vendors",
  vendor_logs: "Vendor Trip Logs",
  drivers: "Drivers",
  bookings: "Bookings",
  routes: "Routes",
  ops_shuttle: "Ops: Shuttle",
  ops_chauffeur: "Ops: Chauffeur",
  reports: "Reports",
  expenses: "Expenses",
  invoicing: "Invoicing",
  fixed_contracts: "Fixed-Term Contracts",
  external_vendors: "External Vendors",
  company_features: "Company Features",
  vendor_fleet: "Vendor Fleet",
};

const CRUD_META: { key: CrudAction; short: string; title: string }[] = [
  { key: "create", short: "C", title: "Create" },
  { key: "read", short: "R", title: "Read" },
  { key: "update", short: "U", title: "Update" },
  { key: "delete", short: "D", title: "Delete" },
];

function CrudStrip({
  value,
  onChange,
}: {
  value: SectionCrudPermissions;
  onChange: (next: SectionCrudPermissions) => void;
}) {
  return (
    <div className="flex items-center gap-0.5">
      {CRUD_META.map(({ key, short, title }) => (
        <button
          key={key}
          type="button"
          title={title}
          onClick={() => onChange({ ...value, [key]: !value[key] })}
          className={`h-7 min-w-[1.75rem] rounded px-1 text-[10px] font-bold transition-colors ${
            value[key] ? "bg-navy text-white" : "bg-gray-200 text-gray-500"
          }`}
        >
          {short}
        </button>
      ))}
    </div>
  );
}

function SectionRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: SectionCrudPermissions;
  onChange: (next: SectionCrudPermissions) => void;
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-gray-100 py-2.5 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <CrudStrip value={value} onChange={onChange} />
    </div>
  );
}

export default function PermissionsPage() {
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const router = useRouter();

  const [staff, setStaff] = useState<InternalStaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CreateInternalStaffRequest & { confirmPassword: string }>({
    email: "",
    password: "",
    confirmPassword: "",
    full_name: "",
    phone: "",
    permissions: emptyStaffPermissions(),
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editingStaff, setEditingStaff] = useState<InternalStaffMember | null>(null);
  const [editPermissions, setEditPermissions] = useState<StaffPermissions>(emptyStaffPermissions());
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isSuperAdmin) {
      router.replace("/admin");
    }
  }, [authLoading, isSuperAdmin, router]);

  const fetchStaff = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await PermissionsApi.listStaff();
      setStaff(res.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load staff");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isSuperAdmin) fetchStaff();
  }, [isSuperAdmin, fetchStaff]);

  const handleCreate = async () => {
    if (createForm.password !== createForm.confirmPassword) {
      setCreateError("Passwords do not match");
      return;
    }
    try {
      setCreateLoading(true);
      setCreateError(null);
      const { confirmPassword, ...payload } = createForm;
      void confirmPassword;
      await PermissionsApi.createStaff({
        ...payload,
        phone: payload.phone || undefined,
        permissions: payload.permissions,
      });
      setShowCreate(false);
      setCreateForm({
        email: "",
        password: "",
        confirmPassword: "",
        full_name: "",
        phone: "",
        permissions: emptyStaffPermissions(),
      });
      await fetchStaff();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create staff");
    } finally {
      setCreateLoading(false);
    }
  };

  const openEditPermissions = (member: InternalStaffMember) => {
    setEditingStaff(member);
    setEditPermissions(normalizeStaffPermissions(member.permissions));
    setEditError(null);
  };

  const handleSavePermissions = async () => {
    if (!editingStaff) return;
    try {
      setEditLoading(true);
      setEditError(null);
      await PermissionsApi.updatePermissions(editingStaff.id, editPermissions);
      setEditingStaff(null);
      await fetchStaff();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update permissions");
    } finally {
      setEditLoading(false);
    }
  };

  const handleToggleStatus = async (member: InternalStaffMember) => {
    try {
      if (member.status === "ACTIVE") {
        await PermissionsApi.deactivate(member.id);
      } else {
        await PermissionsApi.reactivate(member.id);
      }
      await fetchStaff();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-navy border-t-transparent" />
      </div>
    );
  }

  if (!isSuperAdmin) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">Staff & Permissions</h1>
          <p className="mt-1 text-sm text-gray-500">
            Per-section Create, Read, Update, Delete — enforced on the API and in the admin UI.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy/90"
        >
          + New Staff Account
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="overflow-hidden rounded-lg border border-border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Name / Email</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Sections with access</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {staff.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                  No internal staff accounts yet.
                </td>
              </tr>
            )}
            {staff.map((member) => {
              const sectionsOn = PERMISSION_KEYS.filter((k) => sectionHasAnyCrud(member.permissions, k));
              return (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-navy">{member.full_name}</p>
                    <p className="text-xs text-gray-500">{member.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        member.status === "ACTIVE"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {member.status ?? "UNKNOWN"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-700">
                      {sectionsOn.length} / {PERMISSION_KEYS.length} sections
                    </span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {sectionsOn.map((k) => (
                        <span
                          key={k}
                          className="rounded bg-navy/10 px-1.5 py-0.5 text-[10px] text-navy"
                        >
                          {PERMISSION_LABELS[k]}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditPermissions(member)}
                        className="rounded bg-navy px-3 py-1 text-xs text-white hover:bg-navy/90"
                      >
                        Edit Permissions
                      </button>
                      <button
                        onClick={() => handleToggleStatus(member)}
                        className={`rounded px-3 py-1 text-xs ${
                          member.status === "ACTIVE"
                            ? "bg-red-100 text-red-700 hover:bg-red-200"
                            : "bg-green-100 text-green-700 hover:bg-green-200"
                        }`}
                      >
                        {member.status === "ACTIVE" ? "Deactivate" : "Reactivate"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white p-10 shadow-2xl">
            <h2 className="mb-8 text-2xl font-bold text-navy">New Internal Staff Account</h2>

            {createError && (
              <div className="mb-6 rounded-md border border-red-100 bg-red-50 p-4 text-sm text-red-600">{createError}</div>
            )}

            <div className="grid grid-cols-1 gap-12 lg:grid-cols-5">
              <div className="space-y-5 lg:col-span-2">
                {(["full_name", "email", "phone"] as const).map((field) => (
                  <div key={field}>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-700">
                      {field.replace("_", " ")}
                    </label>
                    <input
                      type={field === "email" ? "email" : "text"}
                      value={createForm[field]}
                      onChange={(e) => setCreateForm((f) => ({ ...f, [field]: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm transition-all focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
                      placeholder={`Enter ${field.replace("_", " ")}`}
                    />
                  </div>
                ))}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Password
                  </label>
                  <input
                    type="password"
                    value={createForm.password}
                    onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm transition-all focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={createForm.confirmPassword}
                    onChange={(e) => setCreateForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm transition-all focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="flex flex-col lg:col-span-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-700">
                  Initial permissions (C · R · U · D)
                </p>
                <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4">
                  <div className="max-h-[min(52vh,420px)] space-y-0 overflow-y-auto pr-1">
                    {PERMISSION_KEYS.map((key) => (
                      <SectionRow
                        key={key}
                        label={PERMISSION_LABELS[key]}
                        value={createForm.permissions?.[key] ?? emptyStaffPermissions()[key]}
                        onChange={(next) =>
                          setCreateForm((f) => ({
                            ...f,
                            permissions: { ...(f.permissions ?? emptyStaffPermissions()), [key]: next },
                          }))
                        }
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10 flex justify-end gap-3 border-t pt-8">
              <button
                onClick={() => setShowCreate(false)}
                className="rounded-lg border border-gray-300 px-8 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={createLoading}
                className="rounded-lg bg-navy px-10 py-3 text-sm font-semibold text-white transition-all hover:bg-navy/90 hover:shadow-lg disabled:opacity-50"
              >
                {createLoading ? "Creating…" : "Create Account"}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-8 shadow-2xl">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-navy">Edit Permissions</h2>
              <div className="mt-2 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                <p className="text-sm font-medium text-gray-600">
                  {editingStaff.full_name} <span className="mx-1 text-gray-400">•</span> {editingStaff.email}
                </p>
              </div>
            </div>

            {editError && (
              <div className="mb-4 rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-600">{editError}</div>
            )}

            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b pb-4">
              <span className="text-sm font-semibold uppercase tracking-wider text-gray-900">CRUD per section</span>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setEditPermissions(fullStaffPermissions())}
                  className="text-xs font-bold text-navy hover:underline"
                >
                  Enable all actions
                </button>
                <button
                  type="button"
                  onClick={() => setEditPermissions(emptyStaffPermissions())}
                  className="text-xs font-bold text-gray-500 hover:underline"
                >
                  Disable all
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50/30 p-4">
              <div className="max-h-[min(60vh,480px)] space-y-0 overflow-y-auto pr-1">
                {PERMISSION_KEYS.map((key) => (
                  <SectionRow
                    key={key}
                    label={PERMISSION_LABELS[key]}
                    value={editPermissions[key]}
                    onChange={(next) => setEditPermissions((p) => ({ ...p, [key]: next }))}
                  />
                ))}
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3 border-t pt-6">
              <button
                onClick={() => setEditingStaff(null)}
                className="rounded-xl border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePermissions}
                disabled={editLoading}
                className="rounded-xl bg-navy px-8 py-2.5 text-sm font-semibold text-white transition-all hover:bg-navy/90 hover:shadow-lg disabled:opacity-50"
              >
                {editLoading ? "Saving Changes…" : "Update Permissions"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
