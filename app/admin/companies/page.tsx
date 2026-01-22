"use client";

import { useEffect, useState } from "react";
import { apiClient, Company, CreateCompanyRequest, UpdateCompanyRequest } from "../../lib/services/api-client";
import { uploadFile } from "../../lib/supabase";

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

function CredentialsModal({
  isOpen,
  onClose,
  email,
  password,
}: {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  password?: string;
}) {
  if (!isOpen) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    // Could add toast here
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Company Credentials">
      <div className="space-y-4">
        <div className="rounded-lg bg-green-50 p-4 text-sm text-green-700">
          Company created successfully! Please share these credentials with the company administrator.
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Email</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-slate-100 px-3 py-2 text-sm text-slate-900">{email}</code>
              <button
                onClick={() => handleCopy(email)}
                className="p-2 text-slate-400 hover:text-[#0c225e]"
                title="Copy Email"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Password</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-slate-100 px-3 py-2 text-sm text-slate-900 font-mono">
                {password || "• • • • • • • •"}
              </code>
              {password && (
                <button
                  onClick={() => handleCopy(password)}
                  className="p-2 text-slate-400 hover:text-[#0c225e]"
                  title="Copy Password"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                </button>
              )}
            </div>
            {!password && <p className="text-xs text-slate-500 mt-1">Password was not returned from server.</p>}
          </div>
        </div>
        <div className="flex justify-end pt-4">
          <button
            onClick={onClose}
            className="rounded-lg bg-[#0c225e] px-4 py-2 text-sm font-bold text-white hover:bg-[#0a1b4d]"
          >
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
}

type CompanyFormData = CreateCompanyRequest;

const initialFormData: CompanyFormData = {
  name: "",
  email: "",
  password: "", // Added password
  contact_person: "",
  ntn_number: "",
  address: "",
  logo_url: "",
  is_shuttle_enabled: false,
  is_chauffeur_enabled: false,
};

function CompanyForm({
  company,
  onSave,
  onCancel,
  isSaving
}: {
  company: Company | null;
  onSave: (data: CompanyFormData) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const [formData, setFormData] = useState<CompanyFormData>(
    company
      ? {
        name: company.name,
        email: company.email,
        contact_person: company.contact_person || "",
        ntn_number: company.ntn_number || "",
        address: company.address || "",
        logo_url: company.logo_url || "",
        is_shuttle_enabled: company.is_shuttle_enabled,
        is_chauffeur_enabled: company.is_chauffeur_enabled,
      }
      : initialFormData
  );

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(company?.logo_url || null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const handleChange = (field: keyof CompanyFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let pass = "";
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    handleChange("password", pass);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        alert('File size must be less than 2MB');
        return;
      }
      setLogoFile(file);
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    handleChange("logo_url", "");
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
            disabled={isSaving}
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
            disabled={isSaving}
          />
        </div>

        {/* Password Field - Only show when creating new company */}
        {!company && (
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
              Password <span className="text-slate-400 font-normal">(Optional, auto-generated if empty)</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.password || ""}
                onChange={(e) => handleChange("password", e.target.value)}
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#f47f00] focus:ring-1 focus:ring-[#f47f00] outline-none font-mono"
                placeholder="Leave empty to auto-generate"
                disabled={isSaving}
              />
              <button
                type="button"
                onClick={generatePassword}
                className="px-3 py-2 text-xs font-bold text-[#f47f00] border border-[#f47f00] rounded-lg hover:bg-orange-50 disabled:opacity-50"
                disabled={isSaving}
              >
                Generate
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Contact Person</label>
            <input
              type="text"
              value={formData.contact_person}
              onChange={(e) => handleChange("contact_person", e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#f47f00] focus:ring-1 focus:ring-[#f47f00] outline-none"
              placeholder="John Doe"
              disabled={isSaving}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">NTN</label>
            <input
              type="text"
              value={formData.ntn_number}
              onChange={(e) => handleChange("ntn_number", e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#f47f00] focus:ring-1 focus:ring-[#f47f00] outline-none"
              placeholder="1234567-8"
              disabled={isSaving}
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
            disabled={isSaving}
          />
        </div>

        {/* Logo Upload */}
        <div>
          <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Company Logo</label>
          <div className="space-y-3">
            {logoPreview ? (
              <div className="relative inline-block">
                <img
                  src={logoPreview}
                  alt="Company logo preview"
                  className="h-24 w-24 object-cover rounded-lg border-2 border-slate-200"
                />
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  disabled={isSaving || isUploadingLogo}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                    disabled={isSaving || isUploadingLogo}
                  />
                  <div className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#f47f00] border border-[#f47f00] rounded-lg hover:bg-orange-50 disabled:opacity-50">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="17 8 12 3 7 8"></polyline>
                      <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                    Upload Logo
                  </div>
                </label>
                <span className="text-xs text-slate-500">Max 2MB, PNG/JPG</span>
              </div>
            )}
          </div>
        </div>

        <div className="pt-2 border-t border-gray-100">
          <label className="block text-xs font-semibold uppercase text-slate-500 mb-2">Services</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-100">
              <input
                type="checkbox"
                checked={formData.is_shuttle_enabled}
                onChange={(e) => handleChange('is_shuttle_enabled', e.target.checked)}
                className="accent-[#f47f00] w-4 h-4"
                disabled={isSaving}
              />
              <span className="text-sm font-medium text-slate-700">Shuttle</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-100">
              <input
                type="checkbox"
                checked={formData.is_chauffeur_enabled}
                onChange={(e) => handleChange('is_chauffeur_enabled', e.target.checked)}
                className="accent-[#f47f00] w-4 h-4"
                disabled={isSaving}
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
          disabled={isSaving || isUploadingLogo}
        >
          Cancel
        </button>
        <button
          onClick={async () => {
            try {
              let finalData = { ...formData };

              // Upload logo if a new file is selected
              if (logoFile) {
                setIsUploadingLogo(true);
                const fileName = `${Date.now()}-${logoFile.name}`;
                const logoUrl = await uploadFile('company-logos', fileName, logoFile);
                finalData.logo_url = logoUrl;
              }

              onSave(finalData);
            } catch (error: any) {
              console.error('Failed to upload logo:', error);
              alert(error.message || 'Failed to upload logo');
            } finally {
              setIsUploadingLogo(false);
            }
          }}
          className="rounded-lg bg-[#f47f00] px-4 py-2 text-sm font-bold text-white hover:bg-[#d97000] shadow-md shadow-orange-500/10 disabled:opacity-50"
          disabled={isSaving || isUploadingLogo}
        >
          {isUploadingLogo ? "Uploading Logo..." : isSaving ? "Saving..." : "Save Company"}
        </button>
      </div>
    </div>
  );
}

// -- Main Page Definition --

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Credentials Modal State
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string, password?: string } | null>(null);

  const fetchCompanies = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.getCompanies({ limit: 100 });
      setCompanies(response.data.data);
      setError(null);
    } catch (err: any) {
      console.error("Failed to fetch companies:", err);
      setError("Failed to load companies. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Debounced Search and Filter Effect
  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleCreateNew = () => {
    setEditingCompany(null);
    setIsModalOpen(true);
  };

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this company? This action cannot be undone.")) {
      try {
        await apiClient.deleteCompany(id);
        await fetchCompanies();
      } catch (err: any) {
        console.error("Failed to delete company:", err);
        alert(err.message || "Failed to delete company");
      }
    }
  };

  const handleSave = async (data: CompanyFormData) => {
    try {
      setIsSaving(true);
      if (editingCompany) {
        await apiClient.updateCompany(editingCompany.id, data);
      } else {
        const response = await apiClient.createCompany(data);
        // Show credentials modal with returned password or formatted one
        setCreatedCredentials({
          email: data.email,
          password: response.data.generatedPassword || data.password
        });
      }
      await fetchCompanies();
      setIsModalOpen(false);
      setEditingCompany(null);
    } catch (err: any) {
      console.error("Failed to save company:", err);
      alert(err.message || "Failed to save company");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCompany(null);
  };

  return (
    <div className="flex flex-col gap-6 p-6 mx-auto">
      {/* Page Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
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
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">Loading companies...</td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-red-500">{error}</td>
                </tr>
              ) : companies.map((company) => (
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
                      {company.is_shuttle_enabled && <Badge color="blue">Shuttle</Badge>}
                      {company.is_chauffeur_enabled && <Badge color="purple">Chauffeur</Badge>}
                      {!company.is_shuttle_enabled && !company.is_chauffeur_enabled && (
                        <Badge color="red">None</Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-slate-600">{company._count?.users ?? 0}</span>
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
              {!isLoading && companies.length === 0 && (
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
        title={!editingCompany ? "Create New Company" : "Edit Company"}
      >
        <CompanyForm
          company={editingCompany}
          onSave={handleSave}
          onCancel={handleCloseModal}
          isSaving={isSaving}
        />
      </Modal>

      {/* Credentials Display Modal */}
      {createdCredentials && (
        <CredentialsModal
          isOpen={!!createdCredentials}
          onClose={() => setCreatedCredentials(null)}
          email={createdCredentials.email}
          password={createdCredentials.password}
        />
      )}
    </div>
  );
}
