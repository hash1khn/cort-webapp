"use client";

import { useState } from "react";
import { makeNewCompany, useAdminStore } from "../store/AdminStore";
import type { Company } from "../store/types";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

// -- Components --

function Badge({ children, color = "blue" }: { children: React.ReactNode; color?: "blue" | "green" | "red" | "orange" | "purple" }) {
  const colors = {
    blue: "bg-blue-100 text-blue-700",
    green: "bg-green-100 text-green-700",
    red: "bg-red-100 text-red-700",
    orange: "bg-orange-100 text-orange-800",
    purple: "bg-purple-100 text-purple-700",
  };
  return (
    <span className={cx("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", colors[color])}>
      {children}
    </span>
  );
}

function Modal({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl ring-1 ring-slate-200 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h3 className="text-lg font-bold text-[#0c225e]">{title}</h3>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-100 text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

function CompanyForm({
  company,
  onSave,
  onCancel
}: {
  company: Company | null;
  onSave: (c: Company) => void;
  onCancel: () => void;
}) {
  // If company is null, we are creating a new one (but we usually pass a fresh object)
  // We'll manage local state to avoid updating the store directly until save
  const [formData, setFormData] = useState<Company>(company || makeNewCompany());

  const handleChange = (field: keyof Company, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleServiceToggle = (service: 'shuttle_enabled' | 'chauffeur_enabled') => {
    setFormData(prev => ({
      ...prev,
      services_enabled: {
        ...prev.services_enabled,
        [service]: !prev.services_enabled[service]
      }
    }));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Company Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#f47f00] focus:ring-1 focus:ring-[#f47f00] outline-none"
            placeholder="e.g. Acme Corp"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Email</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => handleChange("email", e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#f47f00] focus:ring-1 focus:ring-[#f47f00] outline-none"
            placeholder="admin@acmecorp.com"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Contact Person</label>
            <input
              type="text"
              value={formData.contact_person}
              onChange={(e) => handleChange("contact_person", e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#f47f00] focus:ring-1 focus:ring-[#f47f00] outline-none"
              placeholder="John Doe"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">NTN</label>
            <input
              type="text"
              value={formData.ntn}
              onChange={(e) => handleChange("ntn", e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#f47f00] focus:ring-1 focus:ring-[#f47f00] outline-none"
              placeholder="1234567-8"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Address</label>
          <input
            type="text"
            value={formData.address}
            onChange={(e) => handleChange("address", e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#f47f00] focus:ring-1 focus:ring-[#f47f00] outline-none"
            placeholder="123 Business Rd, City"
          />
        </div>

        <div className="pt-2 border-t border-gray-100">
          <label className="block text-xs font-semibold uppercase text-slate-500 mb-2">Services</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-100">
              <input
                type="checkbox"
                checked={formData.services_enabled.shuttle_enabled}
                onChange={() => handleServiceToggle('shuttle_enabled')}
                className="accent-[#f47f00] w-4 h-4"
              />
              <span className="text-sm font-medium text-slate-700">Shuttle</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-100">
              <input
                type="checkbox"
                checked={formData.services_enabled.chauffeur_enabled}
                onChange={() => handleServiceToggle('chauffeur_enabled')}
                className="accent-[#f47f00] w-4 h-4"
              />
              <span className="text-sm font-medium text-slate-700">Chauffeur</span>
            </label>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-4">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
        >
          Cancel
        </button>
        <button
          onClick={() => onSave(formData)}
          className="rounded-lg bg-[#f47f00] px-4 py-2 text-sm font-bold text-white hover:bg-[#d97000] shadow-md shadow-orange-500/10"
        >
          Save Company
        </button>
      </div>
    </div>
  );
}

// -- Main Page Definition --

export default function CompaniesPage() {
  const { db, upsertCompany, deleteCompany } = useAdminStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);

  const handleCreateNew = () => {
    setEditingCompany(makeNewCompany());
    setIsModalOpen(true);
  };

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this company? This action cannot be undone.")) {
      deleteCompany(id);
    }
  };

  const handleSave = (company: Company) => {
    upsertCompany(company);
    setIsModalOpen(false);
    setEditingCompany(null);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCompany(null);
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-slate-500">Administration</div>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#0c225e]">Companies</h1>
        </div>
        <button
          type="button"
          onClick={handleCreateNew}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-[#f47f00] px-5 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition-all hover:bg-[#d97000] hover:-translate-y-0.5"
        >
          <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Company
        </button>
      </div>

      {/* Companies Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#f8fafc] text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Company Name</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Services</th>
                <th className="px-6 py-4">Employees</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {db.companies.map((company) => (
                <tr key={company.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-[#0c225e]">{company.name || "Untitled"}</div>
                    <div className="text-xs text-slate-500">{company.address || "No address provided"}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-slate-900">{company.contact_person || "—"}</div>
                    <div className="text-xs text-slate-500">{company.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      {company.services_enabled.shuttle_enabled && <Badge color="blue">Shuttle</Badge>}
                      {company.services_enabled.chauffeur_enabled && <Badge color="purple">Chauffeur</Badge>}
                      {!company.services_enabled.shuttle_enabled && !company.services_enabled.chauffeur_enabled && (
                        <Badge color="red">None</Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-slate-600">{company.employees.length}</span>
                    <span className="text-xs text-slate-400 ml-1">users</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <a
                        href={`/admin/companies/${company.id}`}
                        className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-[#0c225e] transition-colors"
                        title="Manage Employees & Settings"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                      </a>
                      <button
                        onClick={() => handleEdit(company)}
                        className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-[#0c225e] transition-colors"
                        title="Edit Details"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                      </button>
                      <button
                        onClick={() => handleDelete(company.id)}
                        className="rounded-md p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Delete Company"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {db.companies.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <svg className="h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <span className="font-medium">No companies found</span>
                      <button onClick={handleCreateNew} className="text-sm text-[#f47f00] hover:underline">
                        Create your first company
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingCompany?.id === "" || !editingCompany?.created_at ? "Create New Company" : "Edit Company"}
      >
        <CompanyForm
          company={editingCompany}
          onSave={handleSave}
          onCancel={handleCloseModal}
        />
      </Modal>
    </div>
  );
}
