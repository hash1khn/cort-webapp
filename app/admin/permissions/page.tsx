"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/contexts/auth-context";
import { PermissionsApi, InternalStaffMember, CreateInternalStaffRequest } from "../../lib/services/api-client";
import { PERMISSION_KEYS, PermissionKey } from "../../lib/types/auth-types";

// Human-readable labels for each permission key
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
};

const emptyPermissions = (): Record<PermissionKey, boolean> =>
  Object.fromEntries(PERMISSION_KEYS.map((k) => [k, false])) as Record<PermissionKey, boolean>;

export default function PermissionsPage() {
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const router = useRouter();

  const [staff, setStaff] = useState<InternalStaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create staff modal
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CreateInternalStaffRequest & { confirmPassword: string }>({
    email: "",
    password: "",
    confirmPassword: "",
    full_name: "",
    phone: "",
    permissions: emptyPermissions(),
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit permissions modal
  const [editingStaff, setEditingStaff] = useState<InternalStaffMember | null>(null);
  const [editPermissions, setEditPermissions] = useState<Record<PermissionKey, boolean>>(emptyPermissions());
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Redirect non-superadmins
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

  // ── Create Staff ─────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (createForm.password !== createForm.confirmPassword) {
      setCreateError("Passwords do not match");
      return;
    }
    try {
      setCreateLoading(true);
      setCreateError(null);
      const { confirmPassword, ...payload } = createForm;
      void confirmPassword; // suppress unused warning
      await PermissionsApi.createStaff({
        ...payload,
        phone: payload.phone || undefined,
      });
      setShowCreate(false);
      setCreateForm({ email: "", password: "", confirmPassword: "", full_name: "", phone: "", permissions: emptyPermissions() });
      await fetchStaff();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create staff");
    } finally {
      setCreateLoading(false);
    }
  };

  // ── Edit Permissions ──────────────────────────────────────────────────────────
  const openEditPermissions = (member: InternalStaffMember) => {
    setEditingStaff(member);
    setEditPermissions({ ...emptyPermissions(), ...(member.permissions as Record<PermissionKey, boolean>) });
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

  // ── Toggle Active / Inactive ──────────────────────────────────────────────────
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">Staff & Permissions</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage internal staff accounts and control which sections they can access.
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

      {/* Staff Table */}
      <div className="overflow-hidden rounded-lg border border-border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Name / Email</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Permissions granted</th>
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
              const grantedCount = Object.values(member.permissions).filter(Boolean).length;
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
                      {grantedCount} / {PERMISSION_KEYS.length} sections
                    </span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {PERMISSION_KEYS.filter((k) => member.permissions[k]).map((k) => (
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

      {/* ── Create Staff Modal ────────────────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-bold text-navy">New Internal Staff Account</h2>

            {createError && (
              <div className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-600">{createError}</div>
            )}

            <div className="space-y-3">
              {(["full_name", "email", "phone"] as const).map((field) => (
                <div key={field}>
                  <label className="mb-1 block text-xs font-medium text-gray-600 capitalize">
                    {field.replace("_", " ")}
                  </label>
                  <input
                    type={field === "email" ? "email" : "text"}
                    value={(createForm as any)[field]}
                    onChange={(e) => setCreateForm((f) => ({ ...f, [field]: e.target.value }))}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
                  />
                </div>
              ))}
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Password</label>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Confirm Password</label>
                <input
                  type="password"
                  value={createForm.confirmPassword}
                  onChange={(e) => setCreateForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
                />
              </div>

              {/* Initial Permissions */}
              <div>
                <label className="mb-2 block text-xs font-medium text-gray-600">Initial Permissions</label>
                <div className="grid grid-cols-2 gap-1.5 rounded-md border border-gray-200 bg-gray-50 p-3">
                  {PERMISSION_KEYS.map((key) => (
                    <label key={key} className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!!(createForm.permissions as any)?.[key]}
                        onChange={(e) =>
                          setCreateForm((f) => ({
                            ...f,
                            permissions: { ...(f.permissions as any), [key]: e.target.checked },
                          }))
                        }
                        className="h-3.5 w-3.5 rounded accent-navy"
                      />
                      <span className="text-xs text-gray-700">{PERMISSION_LABELS[key]}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setShowCreate(false)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={createLoading}
                className="rounded-md bg-navy px-4 py-2 text-sm text-white hover:bg-navy/90 disabled:opacity-50"
              >
                {createLoading ? "Creating…" : "Create Account"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Permissions Modal ────────────────────────────────────────────── */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-1 text-lg font-bold text-navy">Edit Permissions</h2>
            <p className="mb-4 text-sm text-gray-500">
              {editingStaff.full_name} ({editingStaff.email})
            </p>

            {editError && (
              <div className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-600">{editError}</div>
            )}

            {/* Select All / None helpers */}
            <div className="mb-2 flex gap-3 text-xs">
              <button
                onClick={() =>
                  setEditPermissions(Object.fromEntries(PERMISSION_KEYS.map((k) => [k, true])) as Record<PermissionKey, boolean>)
                }
                className="text-navy underline"
              >
                Select all
              </button>
              <button
                onClick={() => setEditPermissions(emptyPermissions())}
                className="text-gray-500 underline"
              >
                Deselect all
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1.5 rounded-md border border-gray-200 bg-gray-50 p-3">
              {PERMISSION_KEYS.map((key) => (
                <label key={key} className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editPermissions[key]}
                    onChange={(e) =>
                      setEditPermissions((p) => ({ ...p, [key]: e.target.checked }))
                    }
                    className="h-3.5 w-3.5 rounded accent-navy"
                  />
                  <span className="text-xs text-gray-700">{PERMISSION_LABELS[key]}</span>
                </label>
              ))}
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setEditingStaff(null)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePermissions}
                disabled={editLoading}
                className="rounded-md bg-navy px-4 py-2 text-sm text-white hover:bg-navy/90 disabled:opacity-50"
              >
                {editLoading ? "Saving…" : "Save Permissions"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
