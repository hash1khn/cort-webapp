
import { Skeleton } from "@/app/components/ui/Skeleton";
import { Card } from "./DashboardComponents";

export default function DashboardSkeleton() {
    return (
        <div className="flex flex-col gap-6 pb-12 relative max-w-[1600px] mx-auto animate-in fade-in duration-500">

            {/* Welcome Header Skeleton - Matches existing grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Banner Skeleton */}
                <div className="lg:col-span-2 relative rounded-[2rem] bg-[var(--surface-muted)] p-8 shadow-sm border border-[var(--border-light)] overflow-hidden flex flex-col justify-center min-h-[220px]">
                    <div className="flex flex-col gap-4">
                        <Skeleton className="h-4 w-48 bg-[var(--border-light)]" />
                        <Skeleton className="h-10 w-96 bg-[var(--border-light)]" />
                        <Skeleton className="h-6 w-64 bg-[var(--border-light)]" />
                    </div>
                    <div className="absolute top-8 right-8">
                        <Skeleton className="h-12 w-32 rounded-xl bg-[var(--border-light)]" />
                    </div>
                </div>

                {/* Nothing To Do Skeleton */}
                <div className="lg:col-span-1 h-full">
                    <Skeleton className="h-full w-full rounded-[2rem] bg-[var(--surface-muted)]" />
                </div>
            </div>

            {/* Value Delivered - Hero Row Skeleton (4 metric cards) */}
            <div className="w-full">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-[var(--surface-muted)] p-5 rounded-[2rem] border border-[var(--border-light)] shadow-sm flex flex-col justify-between h-[120px]">
                            <div className="flex justify-between">
                                <Skeleton className="h-3 w-24" />
                                <Skeleton className="h-4 w-4 rounded-full" />
                            </div>
                            <div>
                                <Skeleton className="h-8 w-32 mb-2" />
                                <Skeleton className="h-3 w-20" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Live Mobility Command Center Skeleton */}
            <div className="w-full">
                <div className="bg-[var(--surface-muted)] rounded-[2rem] border border-[var(--border-light)] shadow-sm p-0 overflow-hidden min-h-[600px] flex flex-col">
                    {/* Header */}
                    <div className="m-4 mb-0 p-6 bg-[var(--border-light)] rounded-[2rem]">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <Skeleton className="h-3 w-3 rounded-full bg-[var(--surface-muted)]" />
                                <div className="space-y-1">
                                    <Skeleton className="h-5 w-64 bg-[var(--surface-muted)]" />
                                    <Skeleton className="h-3 w-48 bg-[var(--surface-muted)]" />
                                </div>
                            </div>
                            <div className="space-y-1 text-right">
                                <Skeleton className="h-3 w-24 bg-[var(--surface-muted)]" />
                                <Skeleton className="h-4 w-20 bg-[var(--surface-muted)]" />
                            </div>
                        </div>
                    </div>
                    
                    {/* Stats Grid */}
                    <div className="m-4 mt-5 p-6 bg-[var(--border-light)] rounded-[2rem] grid grid-cols-2 md:grid-cols-5 gap-4">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Skeleton className="h-4 w-4 rounded bg-[var(--surface-muted)]" />
                                    <Skeleton className="h-3 w-16 bg-[var(--surface-muted)]" />
                                </div>
                                <Skeleton className="h-6 w-8 bg-[var(--surface-muted)]" />
                            </div>
                        ))}
                    </div>
                    
                    {/* Map Area */}
                    <div className="flex-1 p-4">
                        <Skeleton className="h-full w-full rounded-[2rem] bg-[var(--border-light)]" />
                    </div>
                </div>
            </div>

            {/* Main Analytics Grid Skeleton – matches live layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-fr">

                {/* Taking Care Section */}
                <div className="lg:col-span-1 h-[220px]">
                    <Skeleton className="h-full w-full rounded-[2rem] bg-[var(--border-light)]" />
                </div>

                {/* Employee Usage */}
                <div className="lg:col-span-1 h-[220px]">
                    <Skeleton className="h-full w-full rounded-[2rem] bg-[var(--border-light)]" />
                </div>

                {/* Cost Visibility */}
                <div className="lg:col-span-2 h-[260px]">
                    <Skeleton className="h-full w-full rounded-[2rem] bg-[var(--border-light)]" />
                </div>

                {/* Smart Insights */}
                <div className="lg:col-span-2 h-[260px]">
                    <Skeleton className="h-full w-full rounded-[2rem] bg-[var(--border-light)]" />
                </div>

                {/* Service Usage */}
                <div className="lg:col-span-1 h-[260px]">
                    <Skeleton className="h-full w-full rounded-[2rem] bg-[var(--border-light)]" />
                </div>

                {/* Adoption Health */}
                <div className="lg:col-span-1 h-[260px]">
                    <Skeleton className="h-full w-full rounded-[2rem] bg-[var(--border-light)]" />
                </div>
            </div>
        </div>
    );
}
