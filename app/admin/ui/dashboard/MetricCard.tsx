import { ArrowDownIcon, ArrowUpIcon, MinusIcon, TrendingUp, TrendingDown, DollarSign, Activity, Percent, Briefcase } from "lucide-react";
import { MetricComparison } from "../../../lib/types/admin-dashboard";

interface MetricCardProps {
    label: string;
    metric: MetricComparison;
    type?: "currency" | "number" | "percentage";
    prefix?: string;
    suffix?: string;
    overlayContent?: React.ReactNode;
}

export function MetricCard({ label, metric, type = "number", prefix = "", suffix = "", overlayContent }: MetricCardProps) {
    const { current, percentageChange, trend } = metric;

    const formatValue = (val: number) => {
        if (type === "currency") {
            return new Intl.NumberFormat("en-PK", {
                style: "currency",
                currency: "PKR",
                maximumFractionDigits: 0,
            }).format(val);
        }
        if (type === "percentage") {
            return `${val.toFixed(2)}%`;
        }
        return new Intl.NumberFormat("en-US").format(val);
    };

    const isPositive = trend === "up";
    const isNeutral = trend === "neutral";

    const TrendIcon = isNeutral ? MinusIcon : isPositive ? ArrowUpIcon : ArrowDownIcon;

    const trendColor = isNeutral
        ? "text-slate-400"
        : isPositive
            ? "text-emerald-600"
            : "text-rose-600";

    const bgColor = isNeutral
        ? "bg-slate-50"
        : isPositive
            ? "bg-emerald-50"
            : "bg-rose-50";

    const getIcon = () => {
        const lowerLabel = label.toLowerCase();
        if (lowerLabel.includes("revenue") || lowerLabel.includes("price") || lowerLabel.includes("receivable") || lowerLabel.includes("payable")) return <DollarSign className="h-4 w-4 text-navy/70" />;
        if (lowerLabel.includes("margin") || lowerLabel.includes("percentage")) return <Percent className="h-4 w-4 text-navy/70" />;
        if (lowerLabel.includes("profit")) return <TrendingUp className="h-4 w-4 text-navy/70" />;
        if (lowerLabel.includes("ride") || lowerLabel.includes("cost")) return <Activity className="h-4 w-4 text-navy/70" />;
        return <Briefcase className="h-4 w-4 text-navy/70" />;
    };

    return (
        <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] relative group transition-all duration-300 hover:shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_10px_10px_-5px_rgba(0,0,0,0.04)] hover:-translate-y-0.5">
            <div className="flex justify-between items-start mb-4">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 group-hover:bg-navy/5 group-hover:border-navy/10 transition-colors">
                    {getIcon()}
                </div>
                {metric.previous !== 0 && (
                    <div className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${bgColor} ${trendColor} border border-current/10`}>
                        <TrendIcon className="h-3 w-3 stroke-[3]" />
                        <span>{Math.abs(percentageChange).toFixed(1)}%</span>
                    </div>
                )}
            </div>
            
            <div className="space-y-1">
                <div className="text-[13px] font-medium text-slate-500 tracking-tight">{label}</div>
                <div className="text-2xl font-bold text-navy tracking-tight">
                    {prefix}{formatValue(current)}{suffix}
                </div>
            </div>

            {metric.previous !== 0 && (
                <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-medium">Previous Period</span>
                    <span className="text-[11px] text-slate-600 font-semibold">{prefix}{formatValue(metric.previous)}{suffix}</span>
                </div>
            )}
            
            {overlayContent && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 invisible opacity-0 scale-95 transition-all duration-300 group-hover:visible group-hover:opacity-100 group-hover:scale-100 z-50">
                    <div className="relative bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden w-64 md:w-85 max-h-72 flex flex-col">
                        {overlayContent}
                    </div>
                </div>
            )}
        </div>
    );
}
