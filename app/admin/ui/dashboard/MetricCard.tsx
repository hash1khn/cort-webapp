import { ArrowDownIcon, ArrowUpIcon, MinusIcon } from "lucide-react";
import { MetricComparison } from "../../../lib/types/admin-dashboard";

interface MetricCardProps {
    label: string;
    metric: MetricComparison;
    type?: "currency" | "number" | "percentage";
    prefix?: string;
    suffix?: string;
}

export function MetricCard({ label, metric, type = "number", prefix = "", suffix = "" }: MetricCardProps) {
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
        ? "text-muted"
        : isPositive
            ? "text-green-600"
            : "text-red-600";

    const bgColor = isNeutral
        ? "bg-zinc-100"
        : isPositive
            ? "bg-green-100"
            : "bg-red-100";

    return (
        <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold tracking-wider text-muted uppercase">{label}</div>
            <div className="mt-2 text-2xl font-bold text-navy">
                {prefix}{formatValue(current)}{suffix}
            </div>
            {metric.previous !== 0 && (
                <div className="mt-3 flex items-center gap-2">
                    <div className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${bgColor} ${trendColor}`}>
                        <TrendIcon className="h-3 w-3" />
                        <span>{Math.abs(percentageChange).toFixed(1)}%</span>
                    </div>
                    <span className="text-xs text-muted">vs last period</span>
                </div>
            )}
        </div>
    );
}
