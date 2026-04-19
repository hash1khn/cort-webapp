"use client";

import { Suspense, useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../lib/store/hooks";
import { PermissionGate } from "../components/PermissionGate";
import { AdminCan, useAdminAbility } from "../../lib/abilities/AdminAbilityProvider";
import { ADMIN_SUBJECTS } from "../../lib/abilities/admin-subjects";
import {
  fetchFixedTermContracts,
  createFixedTermContractAsync,
  updateFixedTermContractAsync,
  deleteFixedTermContractAsync,
  selectAdminPricingState,
  resetActionStatus,
} from "../../lib/store/slices/adminPricingSlice";
import { Plus, Trash2, Save, Car, User, DollarSign, Power, PowerOff, Pencil, X } from "lucide-react";

export default function FixedTermContractsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0c225e] border-t-transparent" />
        </div>
      }
    >
      <PermissionGate permission="fixed_contracts">
        <AdminCan I="read" a="FixedContracts">
          <FixedTermContractsContent />
        </AdminCan>
      </PermissionGate>
    </Suspense>
  );
}

function FixedTermContractsContent() {
  const dispatch = useAppDispatch();
  const { fixedTermContracts, status, actionStatus, error } = useAppSelector(selectAdminPricingState);
  const ability = useAdminAbility();
  const canUpdate = ability.can("update", ADMIN_SUBJECTS.pricing);
  const canDelete = ability.can("delete", ADMIN_SUBJECTS.pricing);

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    carDescription: "",
    ownerName: "",
    monthlyAmount: "",
  });

  useEffect(() => {
    dispatch(fetchFixedTermContracts());
  }, [dispatch]);

  useEffect(() => {
    if (actionStatus === "succeeded") {
      dispatch(resetActionStatus());
      setIsAdding(false);
      setEditingId(null);
      setTogglingId(null);
      setFormData({ carDescription: "", ownerName: "", monthlyAmount: "" });
    } else if (actionStatus === "failed" && error) {
      alert("Error: " + error);
      dispatch(resetActionStatus());
      setTogglingId(null);
    }
  }, [actionStatus, error, dispatch]);

  const handleCreate = () => {
    if (!formData.carDescription || !formData.ownerName || !formData.monthlyAmount) {
      alert("Please fill all fields");
      return;
    }
    dispatch(
      createFixedTermContractAsync({
        carDescription: formData.carDescription,
        ownerName: formData.ownerName,
        monthlyAmount: Number(formData.monthlyAmount),
        startDate: new Date().toISOString().split('T')[0], // Today's date
      })
    );
  };

  const handleUpdate = () => {
    if (!editingId) return;
    if (!formData.carDescription || !formData.ownerName || !formData.monthlyAmount) {
      alert("Please fill all fields");
      return;
    }
    dispatch(
      updateFixedTermContractAsync({
        id: editingId,
        data: {
          carDescription: formData.carDescription,
          ownerName: formData.ownerName,
          monthlyAmount: Number(formData.monthlyAmount),
        },
      })
    );
  };

  const handleEditClick = (contract: any) => {
    setEditingId(contract.id);
    setIsAdding(false);
    setFormData({
      carDescription: contract.car_description,
      ownerName: contract.owner_name,
      monthlyAmount: contract.monthly_amount.toString(),
    });
  };

  const handleToggleActive = (contract: any) => {
    setTogglingId(contract.id); // Track toggle specifically
    dispatch(
      updateFixedTermContractAsync({
        id: contract.id,
        data: { isActive: !contract.is_active },
      })
    );
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this contract?")) {
      dispatch(deleteFixedTermContractAsync(id));
    }
  };

  const isLoading = status === "loading";

  return (
    <div className="flex flex-col gap-8 mx-auto p-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#0c225e]">Fixed-Term Monthly Contracts</h1>
          <p className="mt-2 text-slate-500">Manage monthly vendor-independent car contracts. These amounts are automatically included in monthly payables.</p>
        </div>
        <button
          onClick={() => {
            setIsAdding(true);
            setEditingId(null);
            setFormData({ carDescription: "", ownerName: "", monthlyAmount: "" });
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-[#f47f00] px-6 py-3 text-sm font-bold text-white shadow-lg hover:bg-[#d97000] transition-all"
        >
          <Plus size={18} />
          Add New Contract
        </button>
      </div>

      {(isAdding || editingId) && (
        <div className="rounded-2xl border-2 border-[#f47f00]/20 bg-white p-6 shadow-sm animate-in fade-in slide-in-from-top-4">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-[#0c225e]">{editingId ? "Edit Monthly Contract" : "New Monthly Contract"}</h3>
            <button onClick={() => { setIsAdding(false); setEditingId(null); }} className="text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Car Description</span>
              <div className="relative">
                <Car className="absolute left-3 top-2.5 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="e.g. Toyota Corolla (ABC-123)"
                  value={formData.carDescription}
                  onChange={e => setFormData({ ...formData, carDescription: e.target.value })}
                  className="h-10 w-full rounded-lg border border-slate-200 pl-10 pr-3 text-sm outline-none focus:border-[#f47f00] focus:ring-1 focus:ring-[#f47f00]"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Owner Name</span>
              <div className="relative">
                <User className="absolute left-3 top-2.5 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={formData.ownerName}
                  onChange={e => setFormData({ ...formData, ownerName: e.target.value })}
                  className="h-10 w-full rounded-lg border border-slate-200 pl-10 pr-3 text-sm outline-none focus:border-[#f47f00] focus:ring-1 focus:ring-[#f47f00]"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Monthly Amount (PKR)</span>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 text-slate-400" size={18} />
                <input
                  type="number"
                  placeholder="0"
                  value={formData.monthlyAmount}
                  onChange={e => setFormData({ ...formData, monthlyAmount: e.target.value })}
                  className="h-10 w-full rounded-lg border border-slate-200 pl-10 pr-3 text-sm outline-none focus:border-[#f47f00] focus:ring-1 focus:ring-[#f47f00]"
                />
              </div>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={() => { setIsAdding(false); setEditingId(null); }}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={editingId ? handleUpdate : handleCreate}
              disabled={actionStatus === "loading"}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0c225e] px-6 py-2 text-sm font-bold text-white hover:bg-[#0a1a4a] transition-all disabled:opacity-50"
            >
              <Save size={18} />
              {actionStatus === "loading" ? "Saving..." : editingId ? "Update Contract" : "Save Contract"}
            </button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500">
              <tr>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Car Description</th>
                <th className="px-6 py-4">Owner Name</th>
                <th className="px-6 py-4 text-right">Monthly Amount</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#0c225e] border-t-transparent" />
                      <span>Loading contracts...</span>
                    </div>
                  </td>
                </tr>
              ) : fixedTermContracts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No fixed-term contracts found.
                  </td>
                </tr>
              ) : (
                fixedTermContracts.map((contract) => (
                  <tr key={contract.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        contract.is_active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${contract.is_active ? "bg-green-600" : "bg-slate-400"}`} />
                        {contract.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-[#0c225e]">{contract.car_description}</td>
                    <td className="px-6 py-4 text-slate-600">{contract.owner_name}</td>
                    <td className="px-6 py-4 text-right font-bold text-slate-900">
                      PKR {Number(contract.monthly_amount).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEditClick(contract)}
                          disabled={!canUpdate || actionStatus === "loading"}
                          title="Edit Contract"
                          className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          onClick={() => handleToggleActive(contract)}
                          disabled={!canUpdate || actionStatus === "loading"}
                          title={contract.is_active ? "Disable Contract" : "Enable Contract"}
                          className={`p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                            contract.is_active 
                              ? "text-orange-600 hover:bg-orange-50" 
                              : "text-green-600 hover:bg-green-50"
                          }`}
                        >
                          {actionStatus === "loading" && togglingId === contract.id ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          ) : contract.is_active ? (
                            <PowerOff size={18} />
                          ) : (
                            <Power size={18} />
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(contract.id)}
                          disabled={!canDelete || actionStatus === "loading"}
                          title="Delete Contract"
                          className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {!isLoading && fixedTermContracts.length > 0 && (
              <tfoot className="bg-slate-50/50 font-bold">
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-right text-slate-500">Total Monthly Payable (Active):</td>
                  <td className="px-6 py-4 text-right text-[#0c225e]">
                    PKR {fixedTermContracts
                      .filter(c => c.is_active)
                      .reduce((sum, c) => sum + Number(c.monthly_amount), 0)
                      .toLocaleString()}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
