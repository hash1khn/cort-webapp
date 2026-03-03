
import { Skeleton } from "@/app/components/ui/Skeleton";
import { Card } from "./DashboardComponents";

export default function DashboardSkeleton() {
    return (
        <div className="flex flex-col gap-6 pb-12 relative max-w-[1600px] mx-auto animate-in fade-in duration-500">

            {/* Welcome Header Skeleton - Matches existing grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Banner Skeleton */}
                <div className="lg:col-span-2 relative rounded-[2rem] bg-slate-100 p-8 shadow-sm border border-slate-200 overflow-hidden flex flex-col justify-center min-h-[220px]">
                    <div className="flex flex-col gap-4">
                        <Skeleton className="h-4 w-48 bg-slate-300/50" />
                        <Skeleton className="h-10 w-96 bg-slate-300/50" />
                        <Skeleton className="h-6 w-64 bg-slate-300/50" />
                    </div>
                    <div className="absolute top-8 right-8">
                        <Skeleton className="h-12 w-32 rounded-xl bg-slate-300/50" />
                    </div>
                </div>

                {/* Nothing To Do Skeleton */}
                <div className="lg:col-span-1 h-full">
                    <Skeleton className="h-full w-full rounded-[2rem] bg-slate-100" />
                </div>
            </div>

            {/* Outstanding Amount Row Skeleton */}
            <div className="w-full">
                <Card>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                        <div className="flex items-center gap-4 sm:gap-6">
                            <Skeleton className="h-12 w-12 rounded-2xl" />
                            <div className="space-y-2">
                                <Skeleton className="h-3 w-32" />
                                <Skeleton className="h-3 w-44" />
                            </div>
                        </div>
                        <Skeleton className="h-8 w-40 self-start sm:self-auto" />
                    </div>
                </Card>
            </div>

            {/* Value Delivered - Hero Row Skeleton (4 metric cards) */}
            <div className="w-full">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-white/50 p-5 rounded-3xl border border-white/40 shadow-sm flex flex-col justify-between h-[120px]">
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

            {/* Main Analytics Grid Skeleton – matches live layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-fr">

                {/* Taking Care Section */}
                <div className="lg:col-span-1 h-[220px]">
                    <Skeleton className="h-full w-full rounded-3xl" />
                </div>

                {/* Employee Usage */}
                <div className="lg:col-span-1 h-[220px]">
                    <Skeleton className="h-full w-full rounded-3xl" />
                </div>

                {/* Cost Visibility */}
                <div className="lg:col-span-2 h-[260px]">
                    <Skeleton className="h-full w-full rounded-3xl" />
                </div>

                {/* Smart Insights */}
                <div className="lg:col-span-2 h-[260px]">
                    <Skeleton className="h-full w-full rounded-3xl" />
                </div>

                {/* Service Usage */}
                <div className="lg:col-span-1 h-[260px]">
                    <Skeleton className="h-full w-full rounded-3xl" />
                </div>

                {/* Adoption Health */}
                <div className="lg:col-span-1 h-[260px]">
                    <Skeleton className="h-full w-full rounded-3xl" />
                </div>
            </div>
        </div>
    );
}
