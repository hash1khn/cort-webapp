"use client";

import { FleetEfficiencyPanel } from "../components/FleetEfficiencyPanel";

export default function FleetAnalyticsPage() {
    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-[#0c225e]">Fleet Analytics</h1>
                <p className="text-sm text-gray-500 mt-1">Shuttle metrics, fuel variance tracking, and AI-generated fleet insights for your company</p>
            </div>
            <FleetEfficiencyPanel />
        </div>
    );
}
