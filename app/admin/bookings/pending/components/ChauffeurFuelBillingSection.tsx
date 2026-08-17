"use client";

import { useEffect, useMemo, useState } from "react";
import { apiClient } from "../../../../lib/services/api-client";
import type { ChauffeurContract } from "../../../../lib/services/types/pricing";

export type ChauffeurFuelMode = "CONTRACT" | "SELECTED";

type Props = {
  companyId?: number | null;
  vehicleModel?: string | null;
  distanceKm: string;
  fuelMode: ChauffeurFuelMode;
  selectedFuelPrice: string;
  onFuelModeChange: (mode: ChauffeurFuelMode) => void;
  onSelectedFuelPriceChange: (value: string) => void;
};

function parsePositiveNumber(value: string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function calculateAdjustedRate(
  baseRate: number,
  contractBase: number,
  currentPrice: number,
  revisionPercentage: number | null,
): { adjusted: number; willAdjust: boolean; percentChange: number } {
  if (!contractBase) {
    return { adjusted: baseRate, willAdjust: false, percentChange: 0 };
  }
  const percentChange = (currentPrice - contractBase) / contractBase;
  const willAdjust =
    revisionPercentage === null || Math.abs(percentChange) > revisionPercentage;
  return {
    adjusted: willAdjust ? baseRate * (currentPrice / contractBase) : baseRate,
    willAdjust,
    percentChange,
  };
}

export function ChauffeurFuelBillingSection({
  companyId,
  vehicleModel,
  distanceKm,
  fuelMode,
  selectedFuelPrice,
  onFuelModeChange,
  onSelectedFuelPriceChange,
}: Props) {
  const [contract, setContract] = useState<ChauffeurContract | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await apiClient.getChauffeurContracts(companyId);
        const raw: any = res;
        const contracts: ChauffeurContract[] = Array.isArray(raw?.data)
          ? raw.data
          : Array.isArray(raw)
            ? raw
            : Array.isArray(raw?.data?.data)
              ? raw.data.data
              : [];
        if (!cancelled) {
          setContract(contracts[0] ?? null);
          setLoadError(contracts[0] ? null : "No chauffeur contract found for this company.");
        }
      } catch {
        if (!cancelled) setLoadError("Could not load chauffeur contract.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  useEffect(() => {
    if (fuelMode !== "SELECTED" || selectedFuelPrice) return;
    (async () => {
      try {
        const petrol = await apiClient.getSystemSetting("current_fuel_price");
        const value = petrol?.data?.value;
        if (value) onSelectedFuelPriceChange(value);
      } catch {
        // User can type a price.
      }
    })();
  }, [fuelMode, selectedFuelPrice, onSelectedFuelPriceChange]);

  const preview = useMemo(() => {
    if (!contract) return null;
    const petrolBase = parsePositiveNumber(contract.fuel_base_price) ?? 0;
    const revisionRaw = contract.revision_percentage;
    const revision =
      revisionRaw == null || revisionRaw === "" ? null : Number(revisionRaw);
    const safeRevision = revision != null && Number.isFinite(revision) ? revision : null;
    const rate = (contract.chauffeur_contract_rates ?? []).find(
      (r) => r.vehicle_model === vehicleModel,
    );
    const baseCostPerKm = Number(rate?.cost_per_km ?? 0);
    const distance = Number(distanceKm);
    const billedDistance = Number.isFinite(distance) && distance > 0 ? distance : 0;

    const selectedPrice = parsePositiveNumber(selectedFuelPrice);
    const billedPrice = fuelMode === "CONTRACT" ? petrolBase : selectedPrice;
    if (billedPrice == null || petrolBase <= 0 || !rate) return null;

    const fuel = calculateAdjustedRate(baseCostPerKm, petrolBase, billedPrice, safeRevision);
    const effectiveCostPerKm = fuelMode === "CONTRACT" ? baseCostPerKm : fuel.adjusted;
    const roundedCostPerKm = Math.round(effectiveCostPerKm);
    const contractFuelTotal = Math.round(baseCostPerKm) * billedDistance;
    const adjustedFuelTotal = roundedCostPerKm * billedDistance;

    return {
      petrolBase,
      revisionLabel: safeRevision == null ? "No limit (always revises)" : `${(safeRevision * 100).toFixed(1)}%`,
      baseCostPerKm,
      adjustedCostPerKm: effectiveCostPerKm,
      roundedCostPerKm,
      billedDistance,
      percentChange: fuel.percentChange,
      willAdjust: fuelMode === "CONTRACT" ? false : fuel.willAdjust,
      contractFuelTotal,
      adjustedFuelTotal,
      delta: adjustedFuelTotal - contractFuelTotal,
      vehicleModel: rate.vehicle_model,
    };
  }, [contract, vehicleModel, distanceKm, fuelMode, selectedFuelPrice]);

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold text-muted uppercase tracking-wider">
        Fuel Billing
      </h4>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-navy">How to bill fuel for this invoice</span>
        <select
          value={fuelMode}
          onChange={(e) => onFuelModeChange(e.target.value as ChauffeurFuelMode)}
          className="h-9 rounded-md border border-border px-2 text-sm focus:outline-none focus:ring-1 focus:ring-orange bg-white"
        >
          <option value="CONTRACT">Same as contract (no fuel revision)</option>
          <option value="SELECTED">Adjust to selected fuel (this invoice only)</option>
        </select>
        {contract?.fuel_base_price && (
          <p className="text-xs text-muted">
            Contract petrol base: PKR {contract.fuel_base_price}/L
            {contract.revision_percentage != null && contract.revision_percentage !== ""
              ? ` · Threshold: ${(Number(contract.revision_percentage) * 100).toFixed(1)}%`
              : " · Always revises with fuel price"}
          </p>
        )}
        {loadError && <p className="text-xs text-red-600">{loadError}</p>}
      </label>

      {fuelMode === "SELECTED" && (
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-navy">Petrol Price (PKR/L)</span>
          <input
            type="number"
            min={0}
            step="0.01"
            value={selectedFuelPrice}
            onChange={(e) => onSelectedFuelPriceChange(e.target.value)}
            placeholder="e.g. 264.61"
            className="h-9 rounded-md border border-border px-3 text-sm focus:outline-none focus:ring-1 focus:ring-orange"
          />
          <p className="text-xs text-muted">
            Fuel on this invoice is revised against the contract base using this price. Global fuel settings are not changed.
          </p>
        </label>
      )}

      {preview ? (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="px-3 py-2 bg-surface space-y-1">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted">
              Fuel Adjustment Preview
            </div>
            <p className="text-xs text-navy/80">
              {fuelMode === "CONTRACT"
                ? "Fuel will be billed at the contract cost/km with no petrol revision."
                : (
                  <>
                    Contract threshold: {preview.revisionLabel}. Selected petrol is{" "}
                    {preview.percentChange >= 0 ? "+" : ""}
                    {(preview.percentChange * 100).toFixed(1)}% vs contract
                    {preview.willAdjust
                      ? " — cost/km will be revised."
                      : " — within threshold, cost/km stays as contract."}
                  </>
                )}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-surface">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-muted">Vehicle</th>
                  <th className="px-3 py-2 text-right font-semibold text-muted">Contract / km</th>
                  <th className="px-3 py-2 text-right font-semibold text-muted">Billed / km</th>
                  <th className="px-3 py-2 text-right font-semibold text-muted">This invoice fuel</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-border">
                  <td className="px-3 py-2">
                    <div className="font-medium text-navy">{preview.vehicleModel}</div>
                    <div className="text-muted">
                      {preview.billedDistance > 0
                        ? `${preview.billedDistance} km`
                        : "Enter distance to see billed fuel"}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    {preview.baseCostPerKm.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className={`px-3 py-2 text-right font-semibold ${Math.abs(preview.roundedCostPerKm - Math.round(preview.baseCostPerKm)) > 0 ? "text-orange-600" : "text-green-600"}`}>
                    {preview.roundedCostPerKm.toLocaleString("en-PK")}
                  </td>
                  <td className="px-3 py-2 text-right text-navy">
                    {preview.billedDistance > 0
                      ? preview.adjustedFuelTotal.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                      : "—"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          {preview.billedDistance > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-3 py-2 text-xs">
              <span className="text-muted">
                Contract fuel: PKR {preview.contractFuelTotal.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="font-semibold text-navy">
                Billed fuel: PKR {preview.adjustedFuelTotal.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                {Math.abs(preview.delta) >= 0.01 && (
                  <span className={preview.delta > 0 ? " text-orange-600" : " text-green-600"}>
                    {" "}({preview.delta > 0 ? "+" : ""}
                    {preview.delta.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                  </span>
                )}
              </span>
            </div>
          )}
        </div>
      ) : fuelMode === "SELECTED" ? (
        <p className="text-xs text-muted">
          Enter a petrol price to preview the fuel adjustment for this invoice.
        </p>
      ) : null}
    </div>
  );
}
