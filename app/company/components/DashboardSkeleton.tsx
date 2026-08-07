
import { Skeleton } from "@/app/components/ui/Skeleton";

export default function DashboardSkeleton() {
    return (
        <div className="flex flex-col gap-4 sm:gap-6 pb-12 relative max-w-[1600px] mx-auto animate-in fade-in duration-500 w-full min-w-0">

            {/* Welcome Header Skeleton - Matches existing grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                {/* Banner Skeleton */}
                <div className="lg:col-span-2 relative rounded-[1.5rem] sm:rounded-[2rem] bg-[var(--surface-muted)] p-5 sm:p-8 shadow-sm border border-[var(--border-light)] overflow-hidden flex flex-col justify-center min-h-[180px] sm:min-h-[220px]">
                    <div className="flex flex-col gap-3 sm:gap-4 max-w-full">
                        <Skeleton className="h-4 w-32 sm:w-48 max-w-full bg-[var(--border-light)]" />
                        <Skeleton className="h-8 sm:h-10 w-full max-w-xs sm:max-w-md bg-[var(--border-light)]" />
                        <Skeleton className="h-5 sm:h-6 w-3/4 max-w-sm bg-[var(--border-light)]" />
                    </div>
                    <div className="absolute top-5 end-5 sm:top-8 sm:end-8 hidden sm:block">
                        <Skeleton className="h-12 w-28 sm:w-32 rounded-xl bg-[var(--border-light)]" />
                    </div>
                </div>

                {/* Nothing To Do Skeleton */}
                <div className="lg:col-span-1 h-full min-h-[140px]">
                    <Skeleton className="h-full w-full min-h-[140px] rounded-[1.5rem] sm:rounded-[2rem] bg-[var(--surface-muted)]" />
                </div>
            </div>

            {/* Value Delivered - Hero Row Skeleton (4 metric cards) */}
            <div className="w-full min-w-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-[var(--surface-muted)] p-4 sm:p-5 rounded-[1.5rem] sm:rounded-[2rem] border border-[var(--border-light)] shadow-sm flex flex-col justify-between h-[110px] sm:h-[120px]">
                            <div className="flex justify-between">
                                <Skeleton className="h-3 w-20 sm:w-24" />
                                <Skeleton className="h-4 w-4 rounded-full" />
                            </div>
                            <div>
                                <Skeleton className="h-7 sm:h-8 w-24 sm:w-32 max-w-full mb-2" />
                                <Skeleton className="h-3 w-16 sm:w-20" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Live Mobility Command Center Skeleton */}
            <div className="w-full min-w-0">
                <div className="bg-[var(--surface-muted)] rounded-[1.5rem] sm:rounded-[2rem] border border-[var(--border-light)] shadow-sm p-0 overflow-hidden min-h-[400px] sm:min-h-[520px] lg:min-h-[600px] flex flex-col">
                    {/* Header */}
                    <div className="m-2 sm:m-4 mb-0 p-4 sm:p-6 bg-[var(--border-light)] rounded-[1.5rem] sm:rounded-[2rem]">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                            <div className="flex items-center gap-3 sm:gap-4 min-w-0 w-full sm:w-auto">
                                <Skeleton className="h-3 w-3 rounded-full bg-[var(--surface-muted)] shrink-0" />
                                <div className="space-y-1 min-w-0 flex-1">
                                    <Skeleton className="h-5 w-full max-w-[200px] sm:max-w-xs bg-[var(--surface-muted)]" />
                                    <Skeleton className="h-3 w-3/4 max-w-[160px] bg-[var(--surface-muted)]" />
                                </div>
                            </div>
                            <div className="space-y-1 text-end shrink-0">
                                <Skeleton className="h-3 w-20 sm:w-24 bg-[var(--surface-muted)]" />
                                <Skeleton className="h-4 w-16 sm:w-20 bg-[var(--surface-muted)]" />
                            </div>
                        </div>
                    </div>
                    
                    {/* Stats Grid */}
                    <div className="m-2 sm:m-4 mt-3 sm:mt-5 p-4 sm:p-6 bg-[var(--border-light)] rounded-[1.5rem] sm:rounded-[2rem] grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Skeleton className="h-4 w-4 rounded bg-[var(--surface-muted)] shrink-0" />
                                    <Skeleton className="h-3 w-12 sm:w-16 bg-[var(--surface-muted)]" />
                                </div>
                                <Skeleton className="h-6 w-8 bg-[var(--surface-muted)]" />
                            </div>
                        ))}
                    </div>
                    
                    {/* Map Area */}
                    <div className="flex-1 p-2 sm:p-4 min-h-[200px]">
                        <Skeleton className="h-full w-full min-h-[200px] rounded-[1.5rem] sm:rounded-[2rem] bg-[var(--border-light)]" />
                    </div>
                </div>
            </div>

            {/* Main Analytics Grid Skeleton – matches live layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 auto-rows-fr">

                {/* Taking Care Section */}
                <div className="lg:col-span-1 min-h-[180px] sm:h-[220px]">
                    <Skeleton className="h-full w-full rounded-[1.5rem] sm:rounded-[2rem] bg-[var(--border-light)]" />
                </div>

                {/* Employee Usage */}
                <div className="lg:col-span-1 min-h-[180px] sm:h-[220px]">
                    <Skeleton className="h-full w-full rounded-[1.5rem] sm:rounded-[2rem] bg-[var(--border-light)]" />
                </div>

                {/* Cost Visibility */}
                <div className="lg:col-span-2 min-h-[200px] sm:h-[260px]">
                    <Skeleton className="h-full w-full rounded-[1.5rem] sm:rounded-[2rem] bg-[var(--border-light)]" />
                </div>

                {/* Smart Insights */}
                <div className="lg:col-span-2 min-h-[200px] sm:h-[260px]">
                    <Skeleton className="h-full w-full rounded-[1.5rem] sm:rounded-[2rem] bg-[var(--border-light)]" />
                </div>

                {/* Service Usage */}
                <div className="lg:col-span-1 min-h-[200px] sm:h-[260px]">
                    <Skeleton className="h-full w-full rounded-[1.5rem] sm:rounded-[2rem] bg-[var(--border-light)]" />
                </div>

                {/* Adoption Health */}
                <div className="lg:col-span-1 min-h-[200px] sm:h-[260px]">
                    <Skeleton className="h-full w-full rounded-[1.5rem] sm:rounded-[2rem] bg-[var(--border-light)]" />
                </div>
            </div>
        </div>
    );
}
