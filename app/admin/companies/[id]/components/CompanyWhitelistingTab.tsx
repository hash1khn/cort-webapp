"use client";

import { cx } from "../../../components/ui/cx";
import { Badge } from "../../../components/ui/Badge";
import { Modal } from "../../../components/ui/Modal";
import { ToggleSwitch } from "../../../components/ToggleSwitch";

import type { useCompanyDetail } from "../hooks/useCompanyDetail";

type Props = { detail: ReturnType<typeof useCompanyDetail> };

export function CompanyWhitelistingTab({ detail: d }: Props) {
  if (!d.company) return null;
  return (
                <div className="animate-in fade-in duration-300">
                    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-[#0c225e]">Vehicle Whitelisting</h3>
                                <div className="text-xs text-slate-500 mt-1">Select vehicle models available for Chauffeur bookings.</div>
                            </div>
                            {!d.company.is_chauffeur_enabled && (
                                <Badge color="red">Disabled (Chauffeur Off)</Badge>
                            )}
                        </div>
                        <div className={cx("grid grid-cols-2 gap-2 sm:grid-cols-3", (!d.company.is_chauffeur_enabled || !d.canUpdate) && "opacity-50 pointer-events-none")}>
                            {d.availableVehicleModels.map(model => {
                                const isAllowed = d.currentModels.includes(model);
                                return (
                                    <button
                                        key={model}
                                        onClick={() => d.toggleVehicleModel(model)}
                                        className={cx(
                                            "flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all border",
                                            isAllowed ? "bg-purple-50 border-purple-200 text-purple-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                        )}
                                    >
                                        <span>{model}</span>
                                        {isAllowed && (
                                            <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
  );
}
