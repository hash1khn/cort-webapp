"use client";

import { useTranslations } from "next-intl";
import { FleetEfficiencyPanel } from "../components/FleetEfficiencyPanel";
import { PageHeader } from "../components/PageLayout";

export default function FleetAnalyticsPage() {
    const t = useTranslations("company.fleetAnalytics");

    return (
        <div className="flex flex-col gap-6 max-w-[1600px] mx-auto pb-12">
            <PageHeader
                label={t("label")}
                title={t("title")}
                description={t("description")}
            />
            <FleetEfficiencyPanel />
        </div>
    );
}
