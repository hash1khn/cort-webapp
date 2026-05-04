"use client";

import { FleetEfficiencyPanel } from "../components/FleetEfficiencyPanel";
import { PageHeader } from "../components/PageLayout";

export default function FleetAnalyticsPage() {
    return (
        <div className="flex flex-col gap-6 max-w-[1600px] mx-auto pb-12">
            <PageHeader
                label="Insights"
                title="Fleet Analytics"
                description="Shuttle metrics, fuel variance tracking, and AI-generated fleet insights for your company"
            />
            <FleetEfficiencyPanel />
        </div>
    );
}
