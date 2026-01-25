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

const Input = ({ label, value, onChange, placeholder = "0", type = "number", helperText }: any) => (
  <label className="flex flex-col gap-1.5">
    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span>
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#f47f00] focus:ring-1 focus:ring-[#f47f00] transition-all"
    />
    {helperText && <span className="text-xs text-slate-500">{helperText}</span>}
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
    revisionPercentage: "", // Empty string means NULL (no threshold)
    contractDuration: "",
    contractDate: ""
  });

  // Rates State
  type RateRow = Partial<ChauffeurContractRate> & { tempId?: string; isNew?: boolean; isDeleted?: boolean };
  const [rateRows, setRateRows] = useState<RateRow[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // System Setting
  const [systemFuelPrice, setSystemFuelPrice] = useState("0");
  const [isUpdatingFuel, setIsUpdatingFuel] = useState(false);

  // Preview state
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Initial load: Fetch companies & System Settings
  useEffect(() => {
    const init = async () => {
      try {
        const comps = await apiClient.getCompanies({ limit: 100 });
        setCompanies(comps.data.data);
        if (comps.data.data.length > 0) {
          setSelectedCompanyId(String(comps.data.data[0].id));
        }

        const sys = await apiClient.getSystemSetting('current_fuel_price');
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
            revisionPercentage: mainContract.revision_percentage || "",
            contractDuration: mainContract.contract_duration || "",
            contractDate: mainContract.created_at ? new Date(mainContract.created_at).toISOString().split('T')[0] : ""
          });
          setRateRows(mainContract.chauffeur_contract_rates || []);
        } else {
          setContract(null);
          setGlobalSettings({
            fuelBasePrice: "300",
            revisionPercentage: "",
            contractDuration: "",
            contractDate: ""
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

  const handleUpdateGlobalFuel = async () => {
    setIsUpdatingFuel(true);
    try {
      await apiClient.updateSystemSetting('current_fuel_price', systemFuelPrice);
      alert("Global Fuel Price updated successfully. Use the Preview button to see how rates are affected.");
    } catch (err) {
      console.error("Failed to update global fuel price", err);
      alert("Failed to update global fuel price");
    } finally {
      setIsUpdatingFuel(false);
    }
  };

  const handlePreviewAdjustments = async () => {
    setIsLoadingPreview(true);
    setShowPreview(true);
    try {
      const preview = await apiClient.previewRateAdjustments(
        Number(systemFuelPrice),
        Number(selectedCompanyId)
      );
      setPreviewData(preview.data);
    } catch (err) {
      console.error("Failed to load preview", err);
      alert("Failed to load preview");
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleAddRateRow = () => {
    setRateRows([...rateRows, {
      tempId: Date.now().toString(),
      isNew: true,
      vehicle_model: "",
      cost_per_km: "0",
      rate_spot_5hr: "0",
      rate_spot_10hr: "0",
      rate_spot_24hr: "0",
      rate_monthly_10hr: "0",
      rate_monthly_24hr: "0",
      rate_overtime_per_hr: "0",
      allowance_outstation: "0",
      allowance_accommodation: "0"
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
      setRateRows(rateRows.filter((_, i) => i !== index));
    } else if (row.id) {
      if (!confirm("Are you sure you want to delete this rate card?")) return;
      try {
        await apiClient.deleteChauffeurRate(row.id);
        setRateRows(rateRows.filter((_, i) => i !== index));
      } catch (err: any) {
        alert("Failed to delete rate: " + err.message);
      }
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let currentContractId = contract?.id;

      // Parse revision percentage - empty string becomes null
      const revisionPct = globalSettings.revisionPercentage === "" ? null : Number(globalSettings.revisionPercentage);

      if (currentContractId) {
        await apiClient.updateChauffeurContract(currentContractId, {
          fuelBasePrice: Number(globalSettings.fuelBasePrice),
          revisionPercentage: revisionPct,
          contractDuration: globalSettings.contractDuration,
          contractDate: globalSettings.contractDate
        });
      } else {
        const res = await apiClient.createChauffeurContract({
          companyId: Number(selectedCompanyId),
          fuelBasePrice: Number(globalSettings.fuelBasePrice),
          revisionPercentage: revisionPct,
          contractDuration: globalSettings.contractDuration,
          contractDate: globalSettings.contractDate,
          vehicleModel: ""
        });
        currentContractId = res.data.id;
      }

      // Save Rates
      const promises = rateRows.map(async (row) => {
        if (!row.vehicle_model) return;

        const commonData = {
          vehicleModel: row.vehicle_model,
          costPerKm: Number(row.cost_per_km || 0),
          rateSpot5hr: Number(row.rate_spot_5hr),
          rateSpot10hr: Number(row.rate_spot_10hr),
          rateSpot24hr: Number(row.rate_spot_24hr),
          rateMonthly10hr: Number(row.rate_monthly_10hr),
          rateMonthly24hr: Number(row.rate_monthly_24hr),
          rateOvertimePerHr: Number(row.rate_overtime_per_hr || 0),
          allowanceOutstation: Number(row.allowance_outstation || 0),
          allowanceAccommodation: Number(row.allowance_accommodation || 0),
        };

        if (row.isNew) {
          await apiClient.createChauffeurContract({
            companyId: Number(selectedCompanyId),
            fuelBasePrice: Number(globalSettings.fuelBasePrice),
            revisionPercentage: revisionPct,
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
          <p className="mt-2 text-slate-500">Manage client-specific rates and contract terms with dynamic fuel price adjustments.</p>
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
      <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-6 flex flex-col gap-4">
        <div>
          <h3 className="text-base font-bold text-[#0c225e]">Global Fuel Configuration</h3>
          <p className="text-sm text-slate-600 mt-1">Set the current fuel price. Rates are calculated dynamically during invoice generation.</p>
        </div>
        <div className="flex items-end gap-3 flex-wrap">
          <label className="flex-1 min-w-[200px]">
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
          <button
            onClick={handlePreviewAdjustments}
            className="h-10 px-4 rounded-lg border-2 border-[#f47f00] text-[#f47f00] text-sm font-bold hover:bg-[#f47f00] hover:text-white transition-all disabled:opacity-70"
            disabled={isLoadingPreview}
          >
            {isLoadingPreview ? "Loading..." : "Preview Adjustments"}
          </button>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-bold text-[#0c225e]">Rate Adjustment Preview</h3>
              <p className="text-sm text-slate-600 mt-1">How rates will be adjusted at fuel price: PKR {systemFuelPrice}</p>
            </div>
            <button onClick={() => setShowPreview(false)} className="text-slate-400 hover:text-slate-600">✕</button>
          </div>
          {previewData && previewData.length > 0 && (
            <div className="space-y-4">
              {previewData.map((item: any, idx: number) => (
                <div key={idx} className="bg-white rounded-lg p-4 border border-slate-200">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-bold text-[#0c225e]">{item.company?.name || 'Company'}</h4>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${item.calculation.will_adjust ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                      {item.calculation.will_adjust ? 'Will Adjust' : 'No Adjustment'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                    <div><span className="text-slate-500">Base Fuel Price:</span> <span className="font-semibold">PKR {item.contract.fuel_base_price}</span></div>
                    <div><span className="text-slate-500">Threshold:</span> <span className="font-semibold">{item.contract.revision_percentage ? `${(Number(item.contract.revision_percentage) * 100).toFixed(1)}%` : 'No Limit'}</span></div>
                    <div><span className="text-slate-500">Price Change:</span> <span className="font-semibold text-orange-600">{(Number(item.calculation.percent_change) * 100).toFixed(2)}%</span></div>
                    <div><span className="text-slate-500">Multiplier:</span> <span className="font-semibold">{Number(item.calculation.multiplier).toFixed(4)}x</span></div>
                  </div>
                  {item.rates.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-2 py-2 text-left">Vehicle</th>
                            <th className="px-2 py-2 text-right">Base Cost/KM</th>
                            <th className="px-2 py-2 text-right">Adjusted Cost/KM</th>
                          </tr>
                        </thead>
                        <tbody>
                          {item.rates.map((rate: any, rIdx: number) => (
                            <tr key={rIdx} className="border-t">
                              <td className="px-2 py-2">{rate.vehicle_model}</td>
                              <td className="px-2 py-2 text-right">PKR {Number(rate.base_cost_per_km).toFixed(2)}</td>
                              <td className={`px-2 py-2 text-right font-semibold ${rate.base_cost_per_km !== rate.adjusted_cost_per_km ? 'text-orange-600' : 'text-green-600'}`}>
                                PKR {Number(rate.adjusted_cost_per_km).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
                    helperText="Leave empty to always adjust rates with fuel price changes"
                  />
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Contract Duration</span>
                    <select
                      value={globalSettings.contractDuration}
                      onChange={(e) => setGlobalSettings(s => ({ ...s, contractDuration: e.target.value }))}
                      className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#f47f00] focus:ring-1 focus:ring-[#f47f00] transition-all bg-white"
                    >
                      <option value="">Select Duration</option>
                      <option value="6 Months">6 Months</option>
                      <option value="1 Year">1 Year</option>
                      <option value="2 Years">2 Years</option>
                      <option value="3 Years">3 Years</option>
                      <option value="5 Years">5 Years</option>
                    </select>
                  </label>
                  <Input
                    label="Contract Date"
                    value={globalSettings.contractDate}
                    onChange={(v: string) => setGlobalSettings(s => ({ ...s, contractDate: v }))}
                    type="date"
                  />
                </div>
              </div>

              {/* Rates Table */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4 flex justify-between items-center">
                  <div>
                    <h2 className="text-base font-bold text-[#0c225e]">Vehicle Rates</h2>
                    <p className="text-xs text-slate-500 mt-1">Base rates - actual billing rates calculated dynamically.</p>
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
                        <th className="px-4 py-4 min-w-[120px]">Cost/KM (PKR)</th>
                        <th className="px-4 py-4 min-w-[100px]">5Hr Spot</th>
                        <th className="px-4 py-4 min-w-[100px]">10Hr Spot</th>
                        <th className="px-4 py-4 min-w-[100px]">24Hr Spot</th>
                        <th className="px-4 py-4 min-w-[100px]">Mth 10hr</th>
                        <th className="px-4 py-4 min-w-[100px]">Mth 24hr</th>
                        <th className="px-4 py-4 min-w-[100px]">Overtime/Hr</th>
                        <th className="px-4 py-4 min-w-[100px]">Outstation</th>
                        <th className="px-4 py-4 min-w-[100px]">Accommod.</th>
                        <th className="px-4 py-4 w-[50px]"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rateRows.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="px-6 py-12 text-center text-slate-500">
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
                            <input className="w-full h-9 rounded border border-slate-200 px-2 text-sm" value={row.cost_per_km} onChange={e => updateRateRow(idx, 'cost_per_km', e.target.value)} />
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
                          <td className="px-4 py-3">
                            <input className="w-full h-9 rounded border border-slate-200 px-2 text-sm" value={row.rate_overtime_per_hr} onChange={e => updateRateRow(idx, 'rate_overtime_per_hr', e.target.value)} />
                          </td>
                          <td className="px-4 py-3">
                            <input className="w-full h-9 rounded border border-slate-200 px-2 text-sm" value={row.allowance_outstation} onChange={e => updateRateRow(idx, 'allowance_outstation', e.target.value)} />
                          </td>
                          <td className="px-4 py-3">
                            <input className="w-full h-9 rounded border border-slate-200 px-2 text-sm" value={row.allowance_accommodation} onChange={e => updateRateRow(idx, 'allowance_accommodation', e.target.value)} />
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
