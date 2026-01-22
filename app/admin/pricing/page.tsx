"use client";

import { useEffect, useState } from "react";
import {
  apiClient,
  Company,
  ChauffeurContract,
  ChauffeurContractRate,
  CreateChauffeurContractRequest,
  UpdateChauffeurContractRequest
} from "../../lib/services/api-client";

const Input = ({ label, value, onChange, placeholder = "0", type = "number" }: any) => (
  <label className="flex flex-col gap-1.5">
    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span>
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#f47f00] focus:ring-1 focus:ring-[#f47f00] transition-all"
    />
  </label>
);

export default function PricingPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [contract, setContract] = useState<ChauffeurContract | null>(null);

  // Global settings state
  const [globalSettings, setGlobalSettings] = useState({
    fuelBasePrice: "0",
    revisionPercentage: "0.2"
  });

  // Rates State
  // We include a temporary 'tempId' for new rows to track them before saving
  type RateRow = Partial<ChauffeurContractRate> & { tempId?: string; isNew?: boolean; isDeleted?: boolean };
  const [rateRows, setRateRows] = useState<RateRow[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // System Setting
  const [systemFuelPrice, setSystemFuelPrice] = useState("0");

  // Initial load: Fetch companies & System Settings
  useEffect(() => {
    const init = async () => {
      try {
        const comps = await apiClient.getCompanies({ limit: 100 });
        setCompanies(comps.data.data);
        if (comps.data.data.length > 0) {
          setSelectedCompanyId(String(comps.data.data[0].id));
        }

        const sys = await apiClient.getSystemSetting('fuel_price');
        setSystemFuelPrice(sys.data.value);
      } catch (err) {
        console.error("Init failed", err);
      }
    };
    init();
  }, []);

  // Load Contract Details
  useEffect(() => {
    if (!selectedCompanyId) return;

    const loadDetails = async () => {
      setIsLoading(true);
      try {
        const [compRes, contractsRes] = await Promise.all([
          apiClient.getCompany(selectedCompanyId),
          apiClient.getChauffeurContracts(Number(selectedCompanyId))
        ]);

        setCurrentCompany(compRes.data);

        // Chauffeur Contract logic
        const contracts = contractsRes.data;
        if (contracts && contracts.length > 0) {
          const mainContract = contracts[0];
          setContract(mainContract);
          setGlobalSettings({
            fuelBasePrice: mainContract.fuel_base_price,
            revisionPercentage: mainContract.revision_percentage
          });
          setRateRows(mainContract.chauffeur_contract_rates || []);
        } else {
          setContract(null);
          setGlobalSettings({
            fuelBasePrice: "300",
            revisionPercentage: "0.2"
          });
          setRateRows([]);
        }

      } catch (err) {
        console.error("Failed to load details", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadDetails();
  }, [selectedCompanyId]);

  const [isUpdatingFuel, setIsUpdatingFuel] = useState(false);

  const handleUpdateGlobalFuel = async () => {
    setIsUpdatingFuel(true);
    try {
      await apiClient.updateSystemSetting('fuel_price', systemFuelPrice);
      alert("Global Fuel Price updated. This has triggered auto-revisions for eligible contracts.");

      // Reload contracts to show updated rates
      if (selectedCompanyId) {
        const contractsRes = await apiClient.getChauffeurContracts(Number(selectedCompanyId));
        if (contractsRes.data && contractsRes.data.length > 0) {
          setContract(contractsRes.data[0]);
          setGlobalSettings({
            fuelBasePrice: contractsRes.data[0].fuel_base_price,
            revisionPercentage: contractsRes.data[0].revision_percentage
          });
          setRateRows(contractsRes.data[0].chauffeur_contract_rates || []);
        }
      }
    } catch (err) {
      console.error("Failed to update global fuel price", err);
      alert("Failed to update global fuel price");
    } finally {
      setIsUpdatingFuel(false);
    }
  };

  const handleAddRateRow = () => {
    setRateRows([...rateRows, {
      tempId: Date.now().toString(),
      isNew: true,
      vehicle_model: "",
      rate_spot_5hr: "0",
      rate_spot_10hr: "0",
      rate_spot_24hr: "0",
      rate_monthly_10hr: "0",
      rate_monthly_24hr: "0"
    }]);
  };

  const updateRateRow = (index: number, field: keyof ChauffeurContractRate, value: string) => {
    const newRows = [...rateRows];
    newRows[index] = { ...newRows[index], [field]: value };
    setRateRows(newRows);
  };

  const handleDeleteRateRow = async (index: number) => {
    const row = rateRows[index];
    if (row.isNew) {
      // Just remove from state
      setRateRows(rateRows.filter((_, i) => i !== index));
    } else if (row.id) {
      if (!confirm("Are you sure you want to delete this rate card?")) return;
      try {
        await apiClient.deleteChauffeurRate(row.id);
        // Remove from state
        setRateRows(rateRows.filter((_, i) => i !== index));
      } catch (err: any) {
        alert("Failed to delete rate: " + err.message);
      }
    }
  };

  const handleSave = async () => {
    // ... (rest of handleSave implementation) stays same
    setIsSaving(true);
    try {
      // 1. Save Parent Contract (Global Settings)
      let currentContractId = contract?.id;

      if (currentContractId) {
        await apiClient.updateChauffeurContract(currentContractId, {
          fuelBasePrice: Number(globalSettings.fuelBasePrice),
          revisionPercentage: Number(globalSettings.revisionPercentage)
        });
      } else {
        // Create NEW Parent Contract
        const res = await apiClient.createChauffeurContract({
          companyId: Number(selectedCompanyId),
          fuelBasePrice: Number(globalSettings.fuelBasePrice),
          revisionPercentage: Number(globalSettings.revisionPercentage),
          vehicleModel: ""
        });
        currentContractId = res.data.id;
      }

      // 2. Save Rates
      const promises = rateRows.map(async (row) => {
        if (!row.vehicle_model) return;

        const commonData = {
          vehicleModel: row.vehicle_model,
          rateSpot5hr: Number(row.rate_spot_5hr),
          rateSpot10hr: Number(row.rate_spot_10hr),
          rateSpot24hr: Number(row.rate_spot_24hr),
          rateMonthly10hr: Number(row.rate_monthly_10hr),
          rateMonthly24hr: Number(row.rate_monthly_24hr),
          rateOvertimePerHr: Number(row.rate_overtime_per_hr || 0),
          allowanceOutstation: Number(row.allowance_outstation || 0),
          allowanceAccommodation: Number(row.allowance_accommodation || 0),
          agreedFuelAvgCity: Number(row.agreed_fuel_avg_city || 10),
          agreedFuelAvgHighway: Number(row.agreed_fuel_avg_highway || 12),
        };

        if (row.isNew) {
          await apiClient.createChauffeurContract({
            companyId: Number(selectedCompanyId),
            fuelBasePrice: Number(globalSettings.fuelBasePrice),
            revisionPercentage: Number(globalSettings.revisionPercentage),
            ...commonData
          });
        } else if (row.id) {
          await apiClient.updateChauffeurRate(row.id, commonData);
        }
      });

      await Promise.all(promises);

      // Refresh
      const contractsRes = await apiClient.getChauffeurContracts(Number(selectedCompanyId));
      if (contractsRes.data && contractsRes.data.length > 0) {
        setContract(contractsRes.data[0]);
        setRateRows(contractsRes.data[0].chauffeur_contract_rates || []);
      }
      alert("Saved successfully!");

    } catch (err: any) {
      console.error(err);
      alert("Save failed: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 mx-auto p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#0c225e]">Contracts & Pricing</h1>
          <p className="mt-2 text-slate-500">Manage client-specific rates and contract terms.</p>
        </div>
        <label className="flex flex-col gap-1.5 min-w-[300px]">
          <span className="text-sm font-medium text-slate-700">Select Company</span>
          <select
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium outline-none focus:border-[#f47f00] focus:ring-1 focus:ring-[#f47f00] transition-all"
          >
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
      </div>

      {/* Global Fuel System Setting */}
      <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div>
          <h3 className="text-base font-bold text-[#0c225e]">Global Fuel Configuration</h3>
          <p className="text-sm text-slate-600 mt-1">Updates here trigger auto-revision for all contracts.</p>
        </div>
        <div className="flex items-end gap-3 w-full sm:w-auto">
          <label className="flex-1 sm:w-48">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1 block">Current Fuel Price (PKR)</span>
            <input
              type="number"
              value={systemFuelPrice}
              onChange={(e) => setSystemFuelPrice(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#f47f00] focus:ring-1 focus:ring-[#f47f00]"
            />
          </label>
          <button
            onClick={handleUpdateGlobalFuel}
            className="h-10 px-4 rounded-lg bg-[#0c225e] text-white text-sm font-bold hover:bg-[#0a1a4a] transition-colors disabled:opacity-70"
            disabled={isUpdatingFuel}
          >
            {isUpdatingFuel ? "Updating..." : "Update"}
          </button>
        </div>
      </div>

      {isLoading && <div className="p-12 text-center text-slate-500">Loading...</div>}

      {!isLoading && currentCompany && (
        <>
          {/* Chauffeur Section */}
          {currentCompany.is_chauffeur_enabled ? (
            <div className="flex flex-col gap-6">
              {/* Contract Settings */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-6 border-b border-slate-100 pb-4">
                  <h2 className="text-lg font-bold text-[#0c225e]">Chauffeur Contract Terms</h2>
                  <p className="text-sm text-slate-500">Global settings for this company.</p>
                </div>
                <div className="grid gap-6 sm:grid-cols-2">
                  <Input
                    label="Base Fuel Price (PKR)"
                    value={globalSettings.fuelBasePrice}
                    onChange={(v: string) => setGlobalSettings(s => ({ ...s, fuelBasePrice: v }))}
                  />
                  <Input
                    label="Revision Threshold (%)"
                    value={globalSettings.revisionPercentage}
                    onChange={(v: string) => setGlobalSettings(s => ({ ...s, revisionPercentage: v }))}
                    placeholder="0.2"
                  />
                </div>
              </div>

              {/* Rates Table */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4 flex justify-between items-center">
                  <div>
                    <h2 className="text-base font-bold text-[#0c225e]">Vehicle Rates</h2>
                    <p className="text-xs text-slate-500 mt-1">Manage vehicle-specific rates manually.</p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleAddRateRow}
                      className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 px-3"
                    >
                      + Add Vehicle
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="inline-flex items-center justify-center rounded-lg bg-[#f47f00] px-6 py-2.5 text-sm font-bold text-white shadow-md hover:bg-[#d97000] disabled:opacity-70 transition-all"
                    >
                      {isSaving ? "Saving..." : "Save All Changes"}
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500">
                      <tr>
                        <th className="px-6 py-4 min-w-[200px]">Vehicle Model</th>
                        <th className="px-4 py-4 min-w-[100px]">5Hr Spot</th>
                        <th className="px-4 py-4 min-w-[100px]">10Hr Spot</th>
                        <th className="px-4 py-4 min-w-[100px]">24Hr Spot</th>
                        <th className="px-4 py-4 min-w-[100px]">Mth 10hr</th>
                        <th className="px-4 py-4 min-w-[100px]">Mth 24hr</th>
                        <th className="px-4 py-4 w-[50px]"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rateRows.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                            No rates configured. Click "Add Vehicle" to start.
                          </td>
                        </tr>
                      ) : rateRows.map((row, idx) => (
                        <tr key={row.id || row.tempId} className="hover:bg-slate-50/50">
                          <td className="px-6 py-3">
                            <input
                              className="w-full h-9 rounded border border-slate-200 px-2 text-sm focus:border-blue-500 focus:outline-none placeholder:text-slate-300"
                              value={row.vehicle_model}
                              onChange={e => updateRateRow(idx, 'vehicle_model', e.target.value)}
                              placeholder="e.g. Honda City"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input className="w-full h-9 rounded border border-slate-200 px-2 text-sm" value={row.rate_spot_5hr} onChange={e => updateRateRow(idx, 'rate_spot_5hr', e.target.value)} />
                          </td>
                          <td className="px-4 py-3">
                            <input className="w-full h-9 rounded border border-slate-200 px-2 text-sm" value={row.rate_spot_10hr} onChange={e => updateRateRow(idx, 'rate_spot_10hr', e.target.value)} />
                          </td>
                          <td className="px-4 py-3">
                            <input className="w-full h-9 rounded border border-slate-200 px-2 text-sm" value={row.rate_spot_24hr} onChange={e => updateRateRow(idx, 'rate_spot_24hr', e.target.value)} />
                          </td>
                          <td className="px-4 py-3">
                            <input className="w-full h-9 rounded border border-slate-200 px-2 text-sm" value={row.rate_monthly_10hr} onChange={e => updateRateRow(idx, 'rate_monthly_10hr', e.target.value)} />
                          </td>
                          <td className="px-4 py-3">
                            <input className="w-full h-9 rounded border border-slate-200 px-2 text-sm" value={row.rate_monthly_24hr} onChange={e => updateRateRow(idx, 'rate_monthly_24hr', e.target.value)} />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => handleDeleteRateRow(idx)}
                              className="text-red-400 hover:text-red-600 p-1"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}

          {currentCompany.is_shuttle_enabled && (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center mt-6">
              <h3 className="text-lg font-bold text-[#0c225e]">Shuttle Contracts</h3>
              <p className="text-slate-500 mt-2">Shuttle management coming soon.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
