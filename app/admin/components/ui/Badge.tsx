import React, { memo } from "react";
import { cx } from "./cx";

type BadgeColor = "blue" | "green" | "red" | "orange" | "purple" | "gray";

const colors: Record<BadgeColor, string> = {
    blue: "bg-blue-100 text-blue-700",
    green: "bg-green-100 text-green-700",
    red: "bg-red-100 text-red-700",
    orange: "bg-orange-100 text-orange-800",
    purple: "bg-purple-100 text-purple-700",
    gray: "bg-slate-100 text-slate-700",
};

export const Badge = memo(function Badge({
    children,
    color = "blue",
}: {
    children: React.ReactNode;
    color?: BadgeColor;
}) {
    return (
        <span
            className={cx(
                "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                colors[color]
            )}
        >
            {children}
        </span>
    );
});
