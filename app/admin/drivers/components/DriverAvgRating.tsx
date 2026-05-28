"use client";

import { cx } from "../../components/ui/cx";

type DriverAvgRatingProps = {
    avgRating?: number | null;
    reviewCount?: number;
    className?: string;
};

export function DriverAvgRating({ avgRating, reviewCount = 0, className }: DriverAvgRatingProps) {
    if (avgRating == null || reviewCount === 0) {
        return <span className={cx("text-xs text-slate-400", className)}>No ratings yet</span>;
    }

    const fullStars = Math.floor(avgRating);
    const hasHalf = avgRating - fullStars >= 0.25 && avgRating - fullStars < 0.75;
    const roundUp = avgRating - fullStars >= 0.75;

    return (
        <div className={cx("flex flex-col gap-0.5", className)}>
            <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-0.5" aria-hidden>
                    {[...Array(5)].map((_, i) => {
                        const filled = i < fullStars || (i === fullStars && roundUp);
                        const half = i === fullStars && hasHalf && !roundUp;
                        return (
                            <svg
                                key={i}
                                className={cx(
                                    "h-3.5 w-3.5",
                                    filled ? "text-amber-400 fill-amber-400" : half ? "text-amber-400" : "text-slate-200 fill-slate-200",
                                )}
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                            >
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                        );
                    })}
                </div>
                <span className="text-sm font-semibold text-[#0c225e]">{avgRating.toFixed(1)}</span>
            </div>
            <span className="text-[11px] text-slate-500">
                {reviewCount} review{reviewCount === 1 ? "" : "s"}
            </span>
        </div>
    );
}
