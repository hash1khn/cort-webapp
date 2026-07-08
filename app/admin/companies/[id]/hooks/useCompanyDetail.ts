"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { toast } from "sonner";
import { apiClient, Company, Employee } from "../../../../lib/services/api-client";
import { CompanyFeature, CompanyVendorLink, ExternalVendor } from "../../../../lib/services/types/multi-mode";
import { useAdminAbility } from "../../../../lib/abilities/AdminAbilityProvider";
import { ADMIN_SUBJECTS } from "../../../../lib/abilities/admin-subjects";
import { useAuth } from "../../../../lib/contexts/auth-context";
import { useConfirm } from "../../../../lib/hooks/useConfirm";
import { getPhoneValidationError } from "../../../../lib/utils/phone";

export function useCompanyDetail(id: string) {
  const confirm = useConfirm();
  const ability = useAdminAbility();
  const { hasCrud } = useAuth();
    const canCreate = ability.can("create", ADMIN_SUBJECTS.companies);
    const canUpdate = ability.can("update", ADMIN_SUBJECTS.companies);
    const canViewPricing = hasCrud("pricing", "read");

    const [company, setCompany] = useState<Company | null>(null);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [activeTab, setActiveTab] = useState<"employees" | "services" | "whitelisting">("employees");
    const [linkContext, setLinkContext] = useState<'chauffeur' | 'shuttle' | 'general'>('general');

    // Feature flags state
    const [features, setFeatures] = useState<CompanyFeature[]>([]);
    const [featuresLoading, setFeaturesLoading] = useState(false);
    const [trackerForm, setTrackerForm] = useState({ user_id: '', password: '', phone: '', year: '' });
    const [trackerSaving, setTrackerSaving] = useState(false);
    const [trackerTesting, setTrackerTesting] = useState(false);
    const [trackerTestResult, setTrackerTestResult] = useState<{ count: number; vehicles: string[] } | null>(null);
    const [pendingToggleKeys, setPendingToggleKeys] = useState<string[]>([]);

    // External vendors tab state
    const [companyVendorLinks, setCompanyVendorLinks] = useState<CompanyVendorLink[]>([]);
    const [vendorsLoading, setVendorsLoading] = useState(false);
    const [allVendors, setAllVendors] = useState<ExternalVendor[]>([]);
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [linkSaving, setLinkSaving] = useState(false);
    const [linkForm, setLinkForm] = useState({ vendor_id: 0, serves_chauffeur: false, serves_shuttle: false });

    // Employee Modal
    const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);
    const [newEmpName, setNewEmpName] = useState("");
    const [newEmpEmail, setNewEmpEmail] = useState("");
    const [newEmpPhone, setNewEmpPhone] = useState("");
    const [newEmpPassword, setNewEmpPassword] = useState("");
    const [newEmpHomeAddress, setNewEmpHomeAddress] = useState("");

    // Benchmarks Modal
    const [isBenchmarksModalOpen, setIsBenchmarksModalOpen] = useState(false);
    const [newEmpId, setNewEmpId] = useState("");
    const [newEmpDepartment, setNewEmpDepartment] = useState("");
    const [isCreatingEmp, setIsCreatingEmp] = useState(false);
    const [isUploadingCsv, setIsUploadingCsv] = useState(false);

    // CSV bulk upload modal state
    const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [csvRawText, setCsvRawText] = useState<string>("");
    const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
    const [csvPreviewRows, setCsvPreviewRows] = useState<any[]>([]);
    const [csvSkippedRows, setCsvSkippedRows] = useState<Array<{ row: number; missing: string[] }>>([]);
    const [csvMissingHeaders, setCsvMissingHeaders] = useState<string[]>([]);
    const [csvHasPreview, setCsvHasPreview] = useState(false);

    // Hardcoded for now - list of all possible vehicle models
    const availableVehicleModels = [
        "Toyota Corolla", "Honda Civic", "Suzuki Alto", "Suzuki Cultus", "Kia Sportage", "Hyundai Tucson"
    ];

    const csvRequiredHeaders = useMemo(() => ["full_name", "email"], []);
    const csvOptionalHeaders = useMemo(
        () => ["phone", "employee_id", "department", "home_address"],
        [],
    );
    const csvAllKnownHeaders = useMemo(
        () => [...csvRequiredHeaders, ...csvOptionalHeaders],
        [csvOptionalHeaders, csvRequiredHeaders],
    );

    const resetCsvState = useCallback(() => {
        setCsvFile(null);
        setCsvRawText("");
        setCsvHeaders([]);
        setCsvPreviewRows([]);
        setCsvSkippedRows([]);
        setCsvMissingHeaders([]);
        setCsvHasPreview(false);
    }, []);

    const openCsvModal = useCallback(() => {
        resetCsvState();
        setIsCsvModalOpen(true);
    }, [resetCsvState]);

    const closeCsvModal = useCallback(() => {
        setIsCsvModalOpen(false);
        resetCsvState();
    }, [resetCsvState]);

    const parseCsvForPreview = useCallback(
        async (file: File) => {
            if (!company) return;
            const text = await file.text();
            if (!text) {
                toast.error("CSV file is empty.");
                return;
            }

            const lines = text.split(/\r?\n/);
            const headers = (lines[0] || "")
                .split(",")
                .map((h) => h.trim().toLowerCase())
                .filter(Boolean);

            const missingHeaders = csvRequiredHeaders.filter((h) => !headers.includes(h));

            const previewRows: any[] = [];
            const skipped: Array<{ row: number; missing: string[] }> = [];

            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                const values = line.split(",");
                const emp: any = { company_id: company.id };

                headers.forEach((h, index) => {
                    const val = values[index]?.trim();
                    if (val) emp[h] = val;
                });

                const missingRequired = csvRequiredHeaders.filter(
                    (h) => !emp[h] || String(emp[h]).trim().length === 0,
                );

                if (missingRequired.length > 0) {
                    skipped.push({ row: i + 1, missing: missingRequired });
                }

                previewRows.push(emp);
            }

            setCsvFile(file);
            setCsvRawText(text);
            setCsvHeaders(headers);
            setCsvMissingHeaders(missingHeaders);
            setCsvSkippedRows(skipped);
            setCsvPreviewRows(previewRows);
            setCsvHasPreview(true);
        },
        [company, csvRequiredHeaders],
    );

    const handleCsvFileSelected = useCallback(
        async (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file || !company) return;
            await parseCsvForPreview(file);
        },
        [company, parseCsvForPreview],
    );

    const csvPreviewSummary = useMemo(() => {
        const totalRows = csvPreviewRows.length;
        const missingReqCols = csvMissingHeaders.length;
        const skippedRows = csvSkippedRows.length;
        const canUpload =
            csvHasPreview &&
            missingReqCols === 0 &&
            totalRows > 0 &&
            totalRows - skippedRows > 0;

        return {
            totalRows,
            skippedRows,
            uploadableRows: Math.max(0, totalRows - skippedRows),
            missingReqCols,
            canUpload,
        };
    }, [csvHasPreview, csvMissingHeaders.length, csvPreviewRows.length, csvSkippedRows.length]);

    const fetchCompanyData = async () => {
        try {
            setIsLoading(true);
            const companyRes = await apiClient.getCompany(id);
            setCompany(companyRes.data);

            const employeesRes = await apiClient.getEmployees({ company_id: Number(id), limit: 100 });
            setEmployees(employeesRes.data.data);
            setError(null);
        } catch (err: any) {
            console.error("Failed to load company data:", err);
            setError("Failed to load company details. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCompanyData();
    }, [id]);

    const fetchFeatures = useCallback(async () => {
        setFeaturesLoading(true);
        try {
            const res = await apiClient.getCompanyFeatures(Number(id));
            setFeatures(res.data);
            // Also fetch the saved tracker config to pre-fill the credential form
            try {
                const cfgRes = await apiClient.getTrackerConfig(Number(id));
                const cfg = (cfgRes as any)?.data?.config ?? {};
                if (cfg.user_id || cfg.phone) {
                    setTrackerForm({
                        user_id: (cfg.user_id as string) ?? '',
                        password: (cfg.password as string) ?? '',
                        phone: (cfg.phone as string) ?? '',
                        year: (cfg.year as string) ?? '',
                    });
                }
            } catch {
                // silently ignore — config may not exist yet
            }
        } catch {
            // silently ignore
        } finally {
            setFeaturesLoading(false);
        }
    }, [id]);

    const fetchCompanyVendors = useCallback(async () => {
        setVendorsLoading(true);
        try {
            const res = await apiClient.getCompanyExternalVendors(Number(id));
            setCompanyVendorLinks(res.data);
        } catch {
            // silently ignore
        } finally {
            setVendorsLoading(false);
        }
    }, [id]);

    useEffect(() => {
        if (activeTab === "services") {
            fetchFeatures();
            fetchCompanyVendors();
        }
    }, [activeTab, fetchFeatures, fetchCompanyVendors]);

    const isTogglePending = (key: string) => pendingToggleKeys.includes(key);

    const runWithTogglePending = async (key: string, action: () => Promise<void>) => {
        setPendingToggleKeys((prev) => (prev.includes(key) ? prev : [...prev, key]));
        try {
            await action();
        } finally {
            setPendingToggleKeys((prev) => prev.filter((item) => item !== key));
        }
    };

    const toggleFeature = async (feature_key: string, is_enabled: boolean) => {
        await runWithTogglePending(`feature:${feature_key}`, async () => {
            try {
                await apiClient.upsertCompanyFeature(Number(id), { feature_key, is_enabled });
                setFeatures((prev) => prev.map((f) => f.feature_key === feature_key ? { ...f, is_enabled } : f));
                toast.success(`${feature_key.replace(/_/g, " ")} ${is_enabled ? "enabled" : "disabled"}`);
            } catch (err) {
                toast.error(err instanceof Error ? err.message : "Failed to update feature");
            }
        });
    };

    const saveTrackerConfig = async (e: React.FormEvent) => {
        e.preventDefault();
        setTrackerSaving(true);
        try {
            await apiClient.upsertTrackerConfig(Number(id), {
                config: {
                    user_id: trackerForm.user_id.trim(),
                    password: trackerForm.password.trim(),
                    phone: trackerForm.phone.trim(),
                    year: trackerForm.year.trim(),
                },
            });
            toast.success('TPL Trakker credentials saved');
            setTrackerTestResult(null); // reset test result so user can re-test
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to save tracker config');
        } finally {
            setTrackerSaving(false);
        }
    };

    const testTrackerConnection = async () => {
        setTrackerTesting(true);
        setTrackerTestResult(null);
        try {
            const res = await apiClient.getActiveTrackerVehicles(Number(id));
            const vehicles = (res as any)?.data ?? [];
            const count = Array.isArray(vehicles) ? vehicles.length : 0;
            const plates = Array.isArray(vehicles)
                ? vehicles.slice(0, 5).map((v: any) => v.RegNo ?? '?')
                : [];
            setTrackerTestResult({ count, vehicles: plates });
            toast.success(`Connection successful — ${count} vehicle(s) found`);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Connection test failed');
        } finally {
            setTrackerTesting(false);
        }
    };

    const handleLinkVendor = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!linkForm.vendor_id) return;
        try {
            setLinkSaving(true);
            await apiClient.createVendorLink(linkForm.vendor_id, {
                company_id: Number(id),
                serves_chauffeur: linkForm.serves_chauffeur,
                serves_shuttle: linkForm.serves_shuttle,
            });
            toast.success("Vendor link saved");
            setShowLinkModal(false);
            fetchCompanyVendors();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to link vendor");
        } finally {
            setLinkSaving(false);
        }
    };

    const updateLink = async (linkId: number, dto: { serves_chauffeur?: boolean; serves_shuttle?: boolean; is_active?: boolean }) => {
        try {
            await apiClient.updateVendorLink(linkId, dto);
            fetchCompanyVendors();
            toast.success("Link updated");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to update link");
        }
    };

    const removeLink = async (linkId: number) => {
        const ok = await confirm({ message: "Remove this vendor link?", destructive: true, confirmLabel: "Remove" });
        if (!ok) return;
        try {
            await apiClient.removeVendorLink(linkId);
            fetchCompanyVendors();
            toast.success("Link removed");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to remove link");
        }
    };

    const openLinkModal = (context: 'chauffeur' | 'shuttle' | 'general' = 'general') => {
        setLinkContext(context);
        setLinkForm({
            vendor_id: 0,
            serves_chauffeur: context === 'chauffeur',
            serves_shuttle: context === 'shuttle',
        });
        setShowLinkModal(true);
        // Load vendor list in background — modal is already visible
        apiClient.getExternalVendors({ limit: 100 })
            .then(res => setAllVendors(res.data.data))
            .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load vendors"));
    };

    // -- Handlers --

    const handleCreateEmployee = async () => {
        if (!newEmpName.trim() || !company) return;
        const phoneError = getPhoneValidationError(newEmpPhone);
        if (phoneError) {
            toast.error(phoneError);
            return;
        }
        try {
            setIsCreatingEmp(true);
            await apiClient.createEmployee({
                company_id: company.id,
                full_name: newEmpName,
                email: newEmpEmail,
                phone: newEmpPhone,
                password: newEmpPassword || undefined,
                employee_id: newEmpId || undefined,
                department: newEmpDepartment || undefined,
                home_address: newEmpHomeAddress || undefined,
            });
            await fetchCompanyData(); // Refresh list
            setNewEmpName("");
            setNewEmpEmail("");
            setNewEmpPhone("");
            setNewEmpPassword("");
            setNewEmpPassword("");
            setNewEmpId("");
            setNewEmpDepartment("");
            setNewEmpHomeAddress("");
            setIsEmpModalOpen(false);
        } catch (err: any) {
            toast.error(err.message || "Failed to create employee");
        } finally {
            setIsCreatingEmp(false);
        }
    };

    const uploadCsvFromPreview = useCallback(async () => {
        if (!company) return;
        if (!csvHasPreview || !csvFile) {
            toast.error("Please select a CSV file and preview it first.");
            return;
        }
        if (csvMissingHeaders.length > 0) {
            toast.error(
                `CSV is missing required column(s): ${csvMissingHeaders.join(", ")}.`,
            );
            return;
        }

        // Upload only the rows that have required fields present
        const rowsToUpload = csvPreviewRows.filter((r) =>
            csvRequiredHeaders.every((h) => r[h] && String(r[h]).trim().length > 0),
        );

        if (rowsToUpload.length === 0) {
            toast.error("No valid rows to upload (missing required fields).");
            return;
        }

        setIsUploadingCsv(true);
        try {
            const result = await apiClient.bulkCreateEmployees(rowsToUpload);
            const { successful, failed } = result.data;

            let message =
                `CSV upload finished.\n` +
                `Rows previewed: ${csvPreviewRows.length}\n` +
                `Uploaded: ${rowsToUpload.length}\n` +
                `Successful: ${successful.length}\n` +
                `Failed (API): ${failed.length}\n` +
                `Skipped (missing required): ${csvSkippedRows.length}`;

            if (failed.length > 0) {
                message += `\n\nFailures:\n` + failed.map((f) => `${f.email}: ${f.reason}`).join("\n");
            }

            if (failed.length > 0 || csvSkippedRows.length > 0) toast.error(message);
            else toast.success(message);

            await fetchCompanyData();
            closeCsvModal();
        } catch (err: any) {
            toast.error("Failed to upload CSV: " + (err?.message || "Unknown error"));
        } finally {
            setIsUploadingCsv(false);
        }
    }, [
        closeCsvModal,
        company,
        csvFile,
        csvHasPreview,
        csvMissingHeaders.length,
        csvMissingHeaders,
        csvPreviewRows,
        csvRequiredHeaders,
        csvSkippedRows.length,
        fetchCompanyData,
    ]);

    const handleToggleStatus = async (emp: Employee) => {
        try {
            const nextStatus = emp.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
            // Optimistic update
            setEmployees(employees.map(e => e.id === emp.id ? { ...e, status: nextStatus } : e));
            await apiClient.updateEmployee(emp.id, { status: nextStatus });
        } catch (err: any) {
            console.error("Failed to update status:", err);
            // Revert on error
            setEmployees(employees.map(e => e.id === emp.id ? { ...e, status: emp.status } : e));
            toast.error(err instanceof Error ? err.message : "Failed to update status");
        }
    };

    const handleExportCredentials = () => {
        if (!company) return;
        // This only exports currently loaded employees, basic info.
        // Backend generated passwords are NOT stored in plain text, so we can't export them unless we captured them at creation.
        // Credentials export usually implies recent batch creation. For now, we export what we have.
        const lines = [
            `Company: ${company.name}`,
            `Generated: ${new Date().toLocaleString()}`,
            "",
            "employee_id,full_name,email,phone,department,status",
            ...employees.map(e =>
                [e.employee_id, e.full_name, e.email, e.phone, e.department || "", e.status].join(",")
            )
        ];

        const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `cort-${company.name}-employees.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const toggleService = async (service: 'shuttle' | 'chauffeur') => {
        if (!company) return;
        const key = service === 'shuttle' ? 'is_shuttle_enabled' : 'is_chauffeur_enabled';
        const newVal = !company[key];

        // Optimistic
        setCompany({ ...company, [key]: newVal });

        await runWithTogglePending(`service:${key}`, async () => {
            try {
                await apiClient.updateCompany(company.id, { [key]: newVal });
            } catch (err) {
                setCompany({ ...company, [key]: !newVal }); // Revert
                toast.error(err instanceof Error ? err.message : "Failed to update settings");
            }
        });
    };

    const updateCompanyField = async (field: 'is_cort_managed' | 'is_external_vendor_managed' | 'is_own_pooled_cars_managed', newVal: boolean) => {
        if (!company) return;
        const prev = company[field];
        setCompany({ ...company, [field]: newVal });

        await runWithTogglePending(`company:${field}`, async () => {
            try {
                await apiClient.updateCompany(company.id, { [field]: newVal });
            } catch (err) {
                setCompany({ ...company, [field]: prev }); // Revert
                toast.error(err instanceof Error ? err.message : "Failed to update settings");
            }
        });
    };

    const toggleVehicleModel = async (model: string) => {
        if (!company) return;
        const currentWhitelists = company.vehicle_whitelists || [];
        const currentModels = currentWhitelists.map(w => w.allowed_vehicle_model);
        const exists = currentModels.includes(model);

        const nextModels = exists
            ? currentModels.filter(m => m !== model)
            : [...currentModels, model];

        // Optimistic update locally requires faking the whitelist structure
        // But since API expects models array, we perform API call then refresh or just standard optimistic UI
        // Let's do API call then refresh for safety on complex relations

        try {
            await apiClient.updateCompany(company.id, { allowed_vehicle_models: nextModels });
            // Manually update local state to reflect change without full fetch if possible, or just fetch
            // Construct fake whitelist objects for local state
            const newWhitelists = nextModels.map(m => ({ id: 0, company_id: company.id, allowed_vehicle_model: m }));
            setCompany({ ...company, vehicle_whitelists: newWhitelists });
        } catch (err: any) {
            console.error(err);
            toast.error("Failed to update vehicle whitelist");
        }
    };

    const handleChauffeurCortManagedToggle = async (newVal: boolean) => {
        if (!canUpdate) return;
        await toggleFeature('chauffeur_cort_managed', newVal);
        if (newVal) {
            const appTrackingFeat = features.find(f => f.feature_key === 'tracking_via_app');
            if (!appTrackingFeat?.is_enabled) {
                await toggleFeature('tracking_via_app', true);
                toast.success("App Tracking was auto-enabled for CORT Managed Chauffeur.");
            }
        }
    };

    const handleShuttleCortManagedToggle = async (newVal: boolean) => {
        if (!canUpdate) return;
        await toggleFeature('shuttle_cort_managed', newVal);
        if (newVal) {
            const appTrackingFeat = features.find(f => f.feature_key === 'tracking_via_app');
            if (!appTrackingFeat?.is_enabled) {
                await toggleFeature('tracking_via_app', true);
                toast.success("App Tracking was auto-enabled for CORT Managed Shuttle.");
            }
        }
    };

  const currentModels = (company?.vehicle_whitelists || []).map((w) => w.allowed_vehicle_model);

  return {
    company, employees, isLoading, error, canCreate, canUpdate, canViewPricing,
    activeTab, setActiveTab, linkContext, setLinkContext,
    features, featuresLoading, trackerForm, setTrackerForm, trackerSaving, trackerTesting, trackerTestResult, pendingToggleKeys,
    companyVendorLinks, vendorsLoading, allVendors, showLinkModal, setShowLinkModal, linkSaving, linkForm, setLinkForm,
    isEmpModalOpen, setIsEmpModalOpen, newEmpName, setNewEmpName, newEmpEmail, setNewEmpEmail, newEmpPhone, setNewEmpPhone,
    newEmpPassword, setNewEmpPassword, isBenchmarksModalOpen, setIsBenchmarksModalOpen, newEmpId, setNewEmpId,
    newEmpDepartment, setNewEmpDepartment, newEmpHomeAddress, setNewEmpHomeAddress, isCreatingEmp, isUploadingCsv, availableVehicleModels,
    toggleFeature, saveTrackerConfig, testTrackerConnection, updateLink,
    handleCreateEmployee,
    openCsvModal,
    closeCsvModal,
    isCsvModalOpen,
    handleCsvFileSelected,
    csvRequiredHeaders,
    csvOptionalHeaders,
    csvAllKnownHeaders,
    csvHeaders,
    csvMissingHeaders,
    csvSkippedRows,
    csvPreviewRows,
    csvPreviewSummary,
    uploadCsvFromPreview,
    handleExportCredentials,
    toggleVehicleModel, handleChauffeurCortManagedToggle, handleShuttleCortManagedToggle, currentModels,
    toggleService, openLinkModal, handleLinkVendor, removeLink, handleToggleStatus, isTogglePending,
  };
}
